import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { transform, build } from 'esbuild';
import { chromium } from 'playwright-core';
import { callAI, DEFAULT_MODEL } from '../api/openrouter.js';
import { studioPath } from './creationStudio.js';
import { threeCreationContract } from '../3d/creation-contract.js';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const unfence = (value) =>
  value
    .trim()
    .replace(/^```(?:json|javascript|js)?\s*/i, '')
    .replace(/\s*```$/, '');
export function validateProjectPlan(plan) {
  if (
    !plan ||
    typeof plan.title !== 'string' ||
    !plan.title.trim() ||
    !Array.isArray(plan.factories) ||
    plan.factories.length < 2 ||
    plan.factories.length > 16 ||
    !Array.isArray(plan.materials) ||
    plan.materials.length < 3 ||
    plan.materials.length > 24
  )
    throw new Error('Project plan needs a title, 2–16 factories and 3–24 materials.');
  for (const field of ['factories', 'materials']) {
    const keys = plan[field].map((item) => item.name);
    if (
      keys.some(
        (key) =>
          !/^[$A-Z_a-z][$\w]*$/.test(key) ||
          ['__proto__', 'constructor', 'prototype'].includes(key),
      ) ||
      new Set(keys).size !== keys.length
    )
      throw new Error('Plan public API names must be unique safe JavaScript identifiers.');
  }
  return plan;
}
export async function validateProjectModule(code, filename) {
  const required = {
    'materials.js': 'createMaterials',
    'models.js': 'createAssets',
    'experience.js': 'createExperience',
  }[filename];
  const result = await build({
    stdin: { contents: code, sourcefile: filename },
    format: 'esm',
    bundle: false,
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  const exported = Object.values(result.metafile.outputs).flatMap((output) => output.exports || []);
  if (!required || !exported.includes(required))
    throw new Error(
      `${filename} must export ${required}; received exports: ${exported.join(', ') || 'none'}. Output only this stage's module, not the full game.`,
    );
  return true;
}
const runtimeHTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supergence creation</title><style>*{box-sizing:border-box}html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden}body{background:#121b22;color:#eee;font:15px system-ui}canvas{display:block;width:100%;height:100%}#ui{position:fixed;inset:0;pointer-events:none}#ui button,#ui input,#ui select,#ui a{pointer-events:auto}#error{position:fixed;inset:15%;background:#311f26;padding:24px;white-space:pre-wrap;overflow:auto;display:none}</style><div id="stage"></div><div id="ui"></div><pre id="error" role="alert"></pre><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script><script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createExperience} from './experience.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;document.querySelector('#stage').append(renderer.domElement);
try{
 const experience=await createExperience({THREE,OrbitControls,RoomEnvironment,renderer,mount:document.querySelector('#ui')});
 if(!experience?.scene?.isScene||!experience?.camera?.isCamera)throw new Error('createExperience must return actual scene and camera.');
 window.__creationExperience=experience;document.title=experience.title||'Supergence creation';
 // Canonical control selectors refer to the real UI elements, never synthetic
 // state. Keep generated modules free to use ordinary DOM ids for controls.
 const bindControls=()=>{for(const element of document.querySelector('#ui').querySelectorAll('[id]'))if(!element.hasAttribute('data-testid'))element.setAttribute('data-testid',element.id);};bindControls();
 const observer=new MutationObserver(bindControls);observer.observe(document.querySelector('#ui'),{childList:true,subtree:true});
 let prior;renderer.setAnimationLoop(now=>{try{const dt=prior===undefined?0:Math.min(.05,Math.max(0,(now-prior)/1000));prior=now;experience.update?.(dt,now/1000);renderer.render(experience.scene,experience.camera);}catch(e){renderer.setAnimationLoop(null);document.querySelector('#error').style.display='block';document.querySelector('#error').textContent=e.stack;throw e;}});
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);if(experience.camera.isPerspectiveCamera){experience.camera.aspect=innerWidth/innerHeight;experience.camera.updateProjectionMatrix();}experience.resize?.(innerWidth,innerHeight);});
 addEventListener('pagehide',()=>{observer.disconnect();renderer.setAnimationLoop(null);experience.dispose?.();renderer.dispose();},{once:true});
}catch(error){document.querySelector('#error').style.display='block';document.querySelector('#error').textContent=error.stack;throw error;}
</script></html>`;
export { runtimeHTML as projectRuntimeHTML };

async function inspectProject(directory, fullPath) {
  const port = Number(process.env.ACTIVE_SERVER_PORT);
  if (!port)
    throw new Error(
      'Generate projects through the running app, or supply its actual ACTIVE_SERVER_PORT.',
    );
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
      errors = [],
      warnings = [];
    page.on('pageerror', (error) => errors.push(error.stack || error.message));
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type()) && /THREE\.|WebGL/.test(m.text())) {
        if (
          /can't be added|GL_INVALID|VALIDATE_STATUS.*false|shader error|failed to compile/i.test(
            m.text(),
          )
        )
          errors.push(m.text());
        else warnings.push(m.text());
      }
    });
    await page.goto(`http://127.0.0.1:${port}/workspace/${directory}/index.html`, {
      waitUntil: 'load',
      timeout: 45000,
    });
    await page
      .waitForFunction(
        () => window.__creationExperience?.scene && document.querySelector('canvas'),
        null,
        { timeout: 10000 },
      )
      .catch((e) => {
        if (!errors.length) errors.push(e.message);
      });
    if (!errors.length)
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            let frames = 45;
            const next = () => (--frames ? requestAnimationFrame(next) : resolve());
            requestAnimationFrame(next);
          }),
      );
    const observations = await page.evaluate(() => {
      const e = window.__creationExperience;
      let meshes = 0,
        maps = new Set();
      e?.scene?.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          for (const m of [].concat(o.material || [])) if (m.map) maps.add(m.map.uuid);
        }
      });
      return {
        meshes,
        textures: maps.size,
        bodyOverflow: document.documentElement.scrollWidth > innerWidth + 2,
        canvasWidth: document.querySelector('canvas')?.width || 0,
      };
    });
    await page.screenshot({ path: path.join(fullPath, 'preflight.png') });
    return {
      checkedAt: new Date().toISOString(),
      passed: errors.length === 0 && observations.meshes > 0 && observations.canvasWidth > 0,
      errors,
      warnings,
      observations,
      scope:
        'Chrome load/render preflight only. Task behavior and visual quality require separate checks.',
    };
  } finally {
    await browser.close();
  }
}

export async function generateBrowserProject({ brief, directory, repairBudget = 2 }) {
  if (typeof brief !== 'string' || !brief.trim())
    throw new Error('Supply the complete original brief.');
  if (typeof directory !== 'string' || !/^[-\w/]+$/.test(directory))
    throw new Error('Supply a workspace-relative project directory.');
  if (!Number.isInteger(repairBudget) || repairBudget < 0 || repairBudget > 2)
    throw new Error('Repair budget must be 0–2.');
  const fullPath = await studioPath(directory + '/index.html');
  const root = path.dirname(fullPath);
  try {
    if ((await fs.readdir(root)).length)
      throw new Error('Use a new empty project directory; existing files are preserved.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await fs.mkdir(root, { recursive: true });
  const receiptPath = path.join(root, 'project-generation.json');
  await fs.writeFile(
    receiptPath,
    JSON.stringify(
      {
        status: 'started',
        brief,
        requestedModel: DEFAULT_MODEL,
        startedAt: new Date().toISOString(),
        calls: [],
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
  const record = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
  const saveRecord = () => fs.writeFile(receiptPath, JSON.stringify(record, null, 2));
  async function ask(stage, system, user, maxTokens) {
    const started = Date.now();
    const response = await callAI({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      maxTokens,
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
    });
    const choice = response.choices?.[0],
      raw = choice?.message?.content || '';
    const call = {
      stage,
      requestedModel: DEFAULT_MODEL,
      returnedModel: response.model,
      finishReason: choice?.finish_reason,
      usage: response.usage,
      durationMs: Date.now() - started,
      system,
      user,
      raw,
    };
    record.calls.push(call);
    await saveRecord();
    if (choice?.finish_reason === 'length')
      throw new Error(stage + ' output truncated; raw receipt retained.');
    return unfence(raw);
  }
  const common = `You are a JavaScript ES MODULE SOURCE COMPILER inside a larger agent. THIS CALL HAS ZERO TOOLS OR SHELL. The outer agent handles filesystem, running, tests and delivery. User requests about exploring files, HTML delivery, tool use or saving are for the outer agent, not this compiler. Your SOLE output is the COMPLETE executable JavaScript module requested in THIS stage. Never output prose, plans, Markdown, HTML documents, Bash, XML, tool_call tags or tool requests. Preserve every feature in the COMPLETE user brief while obeying the stage's exact public API. Use installed modules only, never network assets. Prioritize real geometry, behavior, material detail, deliberate art direction and useful camera views. No fabricated tests, FPS or telemetry. ${threeCreationContract}`;
  try {
    const planSystem =
      'Return ONLY compact JSON, under 4200 characters. Design an original modular 3D implementation. Schema {title,artDirection,materials:[{name,description}],factories:[{name,args,description}],features:[string]}. Use 6–9 materials and 5–8 reusable model factories. Each description <=100 characters; artDirection <=250 characters; args is a concise array of argument names/defaults. Factories return actual THREE.Group/Object3D. No implementation code, essays or repeated requirements; full brief is separately preserved. Choose public API names precisely.';
    let plan;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        plan = validateProjectPlan(
          JSON.parse(await ask(attempt ? 'plan-format-retry' : 'plan', planSystem, brief, 3500)),
        );
        break;
      } catch (error) {
        if (attempt) throw error;
      }
    }
    record.plan = plan;
    await saveRecord();
    await fs.writeFile(path.join(root, 'plan.json'), JSON.stringify(plan, null, 2));
    const context = `COMPLETE ORIGINAL BRIEF:\n${brief}\n\nPROJECT PLAN AND EXACT PUBLIC API:\n${JSON.stringify(plan)}`;
    const requests = [
      [
        'materials.js',
        'Return ONLY ES module JavaScript. Export function createMaterials(THREE) returning an object with EXACT plan.materials names. Implement actual detailed CanvasTexture albedo and bump/roughness where appropriate, correct color spaces, meaningful material response. No external images. No initialization side effects outside the function. Other modules depend on this API.',
      ],
      [
        'models.js',
        "Return ONLY ES module JavaScript. Import {createMaterials} from './materials.js'. Export function createAssets(THREE) returning {materials,...namedFactoryFunctions}, with EXACT plan.factories names/args. Instantiate materials once inside createAssets. Each factory builds original detailed actual geometry using these materials; model correct proportions and purposeful small details. Factories return groups with accessible named parts when animation is needed via group.userData. No scene, renderer, UI, simulation or import of experience.js here. No calls to factories before their dependencies exist. Reuse geometries/materials for repeated detail.",
      ],
      [
        'experience.js',
        "Return ONLY ES module JavaScript. Import {createAssets} from './models.js'. Export function createExperience({THREE,OrbitControls,RoomEnvironment,renderer,mount}) returning {title,scene,camera,update(dt,time),resize?,dispose?}. Renderer, canvas, animation loop, delta clamp and resize are ALREADY provided; do not create another renderer/loop. Build the actual complete world, interaction, UI and simulation using assets=createAssets(THREE), assets.materials and factory methods EXACTLY as planned. ALL requirements must work. UI mount covers viewport with pointer-events:none; style your controls/interactive panels pointer-events:auto, responsive and reachable on phones. Set environment after scene exists. Use scene/camera local constants before callbacks run. Attach a requested inspection hook to actual scene/simulation objects, not fabricated values. Return only after fully initialized. For games implement all normal controls and states; for architecture implement meaningful geometry, open passageways, furnishing and distinct close/interior cameras. No external assets. No top-level DOM or initialization outside createExperience.",
      ],
    ];
    await fs.writeFile(path.join(root, 'index.html'), runtimeHTML);
    for (const [filename, instructions] of requests) {
      let code;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          code = await ask(
            filename + (attempt ? '-compile-retry' : ''),
            common +
              '\n' +
              instructions +
              (attempt
                ? '\nThe previous response did not compile. Output ONLY complete valid JavaScript for this module; tools are unavailable.'
                : ''),
            context +
              '\nCURRENT STAGE (the full brief above is feature reference only):\n' +
              instructions +
              '\nReturn ONLY this stage JavaScript module and its required named export. No full-game/HTML output in materials or models stages.',
            11000,
          );
          await validateProjectModule(code, filename);
          break;
        } catch (error) {
          if (attempt) throw error;
        }
      }
      await fs.writeFile(path.join(root, filename), code);
    }
    let preflight = await inspectProject(directory, root);
    record.preflights = [preflight];
    await saveRecord();
    for (let attempt = 0; !preflight.passed && attempt < repairBudget; attempt++) {
      const stack = preflight.errors.join('\n');
      const candidates = ['materials.js', 'models.js', 'experience.js'];
      const filename =
        candidates.find((name) => stack.includes('/' + name + ':')) || 'experience.js';
      const source = await fs.readFile(path.join(root, filename), 'utf8');
      if (source.length > 26000) break; // Retain full source/requirements instead of silently clipping.
      const raw = await ask(
        'runtime-repair-' + (attempt + 1),
        'Return ONLY a JSON array of at most 8 {search,replace} exact unique patches to the supplied JavaScript module. Fix the actual runtime errors while preserving behavior, APIs and all requirements. No whole-file output, no invented test results.',
        context + '\nACTUAL CHROME ERRORS:\n' + stack + '\nMODULE ' + filename + ':\n' + source,
        6500,
      );
      const patches = JSON.parse(raw);
      if (!Array.isArray(patches) || !patches.length || patches.length > 8)
        throw new Error('Invalid project repair patches.');
      let revised = source;
      for (const p of patches) {
        if (typeof p.search !== 'string' || !p.search || typeof p.replace !== 'string')
          throw new Error('Invalid project repair.');
        const at = revised.indexOf(p.search);
        if (at < 0 || revised.indexOf(p.search, at + p.search.length) >= 0)
          throw new Error('Project repair must match exactly once.');
        revised = revised.slice(0, at) + p.replace + revised.slice(at + p.search.length);
      }
      await transform(revised, { loader: 'js', format: 'esm', target: 'es2022' });
      await fs.writeFile(path.join(root, filename + '.before-repair-' + (attempt + 1)), source);
      await fs.writeFile(path.join(root, filename), revised);
      preflight = await inspectProject(directory, root);
      record.preflights.push(preflight);
      await saveRecord();
    }
    const hashes = {};
    for (const filename of [
      'plan.json',
      'materials.js',
      'models.js',
      'experience.js',
      'index.html',
    ])
      hashes[filename] = digest(await fs.readFile(path.join(root, filename)));
    record.status = preflight.passed ? 'rendered' : 'render-failed';
    record.finishedAt = new Date().toISOString();
    record.hashes = hashes;
    await saveRecord();
    return {
      success: preflight.passed,
      directory,
      url: `/workspace/${directory}/index.html`,
      receipt: `/workspace/${directory}/project-generation.json`,
      model: DEFAULT_MODEL,
      modelCalls: record.calls.length,
      generationMode: 'modular-autonomous-build',
      strictSingleCall: false,
      preflight,
      screenshot: `/workspace/${directory}/preflight.png`,
      next: 'Run the actual task-specific interactions and visual review before claiming completion.',
    };
  } catch (error) {
    record.status = 'failed';
    record.error = error.message;
    await saveRecord();
    throw error;
  }
}
