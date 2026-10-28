import fs from 'node:fs/promises';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const baseURL = process.env.SIS_BASE_URL;
if (!baseURL) throw new Error('Set actual SIS_BASE_URL.');
const mode = process.argv.includes('--soak')
  ? 'soak'
  : process.argv.includes('--public')
    ? 'public'
    : 'geometry';
const out = 'workspace/supergence/quality/3d';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = {
  checkedAt: new Date().toISOString(),
  mode,
  browser: browser.version(),
  checks: [],
  captures: {},
};
const check = async (name, work) => {
  try {
    const observed = await work();
    report.checks.push({ name, passed: true, ...(observed ? { observed } : {}) });
  } catch (e) {
    report.checks.push({ name, passed: false, error: e.message });
  }
};
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 60;
        const frame = () => (--n ? requestAnimationFrame(frame) : resolve());
        requestAnimationFrame(frame);
      }),
  );
const save = async (page, name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  report.captures[name] = `/workspace/supergence/quality/3d/${name}.png`;
};
try {
  if (mode === 'geometry') {
    report.sourceHashes = {};
    for (const file of [
      '3d-depth-20261023/courtyard-museum/detailed/index.html',
      '3d-depth-20261023/skyline-courier/detailed/index.html',
      'artist-refined/northlight-workshop/experience.js',
    ])
      report.sourceHashes[file] = createHash('sha256')
        .update(await fs.readFile(`workspace/supergence/benchmarks/${file}`))
        .digest('hex');
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.goto(
      `${baseURL}/workspace/supergence/benchmarks/3d-depth-20261023/courtyard-museum/detailed/index.html`,
    );
    await page.waitForFunction(() => window.__quality3D?.renderer.info.render.calls > 0);
    await check('actual museum furnishings remain attached after batching', () =>
      page.evaluate(() => {
        const q = __quality3D;
        const groups = [];
        q.building.traverse((o) => {
          if (o.name === 'gallery-furnishings') groups.push(o);
        });
        if (
          groups.length !== 2 ||
          groups.some((g) => g.children.length === 0 || q.scene.getObjectById(g.id) !== g)
        )
          throw new Error('Missing actual furnishing assemblies.');
        let art = 0,
          textures = new Set(),
          batchCount = 0;
        groups.forEach((g) =>
          g.traverse((o) => {
            if (o.isMesh) {
              if (o.material.map) textures.add(o.material.map.uuid);
              if (o.name === 'original-artwork') art++;
              if (o.name === 'static-detail-batch') batchCount++;
            }
          }),
        );
        if (art < 16 || textures.size < 16 || batchCount < 2)
          throw new Error('Detailed geometry/materials missing.');
        return {
          actualArtworkMeshes: art,
          uniqueTextureMaps: textures.size,
          actualBatches: batchCount,
        };
      }),
    );
    await check('lower doorway and upper stair doorway are physically clear', () =>
      page.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js');
        const q = __quality3D;
        q.scene.updateMatrixWorld(true);
        const paths = [
          [
            [5.1, 1.4, 0],
            [6.2, 1.4, 0],
          ],
          [
            [5.1, 4.4, 0],
            [6.2, 4.4, 0],
          ],
        ];
        const hits = paths.map(([from, to]) => {
          const a = new T.Vector3(...from),
            b = new T.Vector3(...to),
            length = a.distanceTo(b);
          return new T.Raycaster(a, b.sub(a).normalize(), 0, length)
            .intersectObject(q.walls, true)
            .filter((h) => h.distance < length - 0.02).length;
        });
        if (hits.some(Boolean))
          throw new Error('Actual wall or furnishing blocks a required doorway: ' + hits);
        return { rayObstructions: hits };
      }),
    );
    await check('stair upper landing reaches actual upper floor', () =>
      page.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js'),
          q = __quality3D;
        let stair;
        q.stairs.traverse((o) => {
          if (o.userData.landings?.length) stair = o;
        });
        if (!stair) throw new Error('No real return stair landings.');
        const landing = stair.userData.landings[1],
          b = new T.Box3().setFromObject(landing),
          ray = new T.Raycaster(new T.Vector3(6.2, 5, 0), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(q.walls, true)[0];
        if (
          !hit ||
          Math.abs(hit.point.y - b.max.y) > 0.001 ||
          b.min.z > 0 ||
          b.max.z < 0 ||
          b.max.x < 5.5
        )
          throw new Error('Stair landing does not meet the doorway/floor.');
        return {
          landingTop: b.max.y,
          actualFloorY: hit.point.y,
          verticalGap: Math.abs(hit.point.y - b.max.y),
          treads: stair.userData.steps.length,
        };
      }),
    );
    await check('rear bridge floor connects both actual upper gallery floors', () =>
      page.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js'),
          q = __quality3D;
        q.scene.updateMatrixWorld(true);
        const heights = [-9, -5.6, 0, 5.6, 9].map((x) => {
          const hit = new T.Raycaster(
            new T.Vector3(x, 4, -8),
            new T.Vector3(0, -1, 0),
            0,
            2,
          ).intersectObject(q.walls, true)[0];
          if (!hit) throw new Error('Missing floor at bridge route x=' + x);
          return hit.point.y;
        });
        if (Math.max(...heights) - Math.min(...heights) > 0.001)
          throw new Error('Bridge has an excessive floor discontinuity: ' + heights);
        return {
          routeFloorHeights: heights,
          maxDiscontinuityMetres: Math.max(...heights) - Math.min(...heights),
        };
      }),
    );
    await page.getByTestId('view-interior').click();
    await page.waitForFunction(() => Math.abs(__quality3D.camera.position.x + 8.5) < 0.1);
    await settle(page);
    await save(page, 'museum-gallery-detail');
    report.museumDrawCalls = await page.evaluate(() => __quality3D.renderer.info.render.calls);
    await page.close();
    const game = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await game.goto(
      `${baseURL}/workspace/supergence/benchmarks/3d-depth-20261023/skyline-courier/detailed/index.html`,
    );
    await game.waitForFunction(() => window.__quality3D?.state);
    await game.getByTestId('start-game').click();
    await check(
      'batched rooftop details are actually attached and animated fans rotate',
      async () => {
        const before = await game.evaluate(() => {
          const q = __quality3D,
            g = q.scene.getObjectByName('roof-craft-details'),
            fan = q.scene.getObjectByName('hvac-fan');
          if (!g || !fan || !g.children.length)
            throw new Error('Craft geometry missing from rendered scene.');
          return { rotation: fan.rotation.z, batching: g.userData.batching };
        });
        await settle(game);
        const after = await game.evaluate(
          () => __quality3D.scene.getObjectByName('hvac-fan').rotation.z,
        );
        assert.notEqual(after, before.rotation);
        assert.ok(before.batching.reducedDrawObjects > 0);
        return before.batching;
      },
    );
    await check('camera presets reveal actual robot and city detail', async () => {
      const before = await game.evaluate(() => __quality3D.camera.position.toArray());
      await game.getByTestId('camera-view').click();
      await settle(game);
      assert.notDeepEqual(await game.evaluate(() => __quality3D.camera.position.toArray()), before);
      await save(game, 'game-wide-detail');
      await game.getByTestId('camera-view').click();
      await settle(game);
      await save(game, 'game-robot-detail');
    });
    report.gameDrawCalls = await game.evaluate(() => __quality3D.renderer.info.render.calls);
    await game.close();
    const workshop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await workshop.goto(
      `${baseURL}/workspace/supergence/benchmarks/artist-refined/northlight-workshop/index.html`,
    );
    await workshop.waitForFunction(() => window.__quality3D?.renderer.info.render.calls > 0);
    await check('three sawtooth pitches meet actual wall and clerestory elevations', () =>
      workshop.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js'),
          q = __quality3D;
        q.scene.updateMatrixWorld(true);
        const panels = [];
        q.roof.traverse((o) => {
          if (o.name === 'roof-panel') panels.push(o);
        });
        if (panels.length !== 3) throw new Error('Expected three real roof panels.');
        const endpoints = panels.map((p) => {
          const half = p.geometry.parameters.width / 2;
          const low = p.localToWorld(new T.Vector3(-half, 0, 0)),
            high = p.localToWorld(new T.Vector3(half, 0, 0));
          if (Math.abs(low.y - 4.5) > 0.001 || Math.abs(high.y - 6.3) > 0.001 || high.x <= low.x)
            throw new Error('Roof pitch has floating or reversed endpoints.');
          return { low: low.toArray(), high: high.toArray() };
        });
        return { actualPanels: panels.length, endpoints };
      }),
    );
    await check('mezzanine floor meets last real stair and the rail leaves a clear entry', () =>
      workshop.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js'),
          q = __quality3D;
        const stairs = q.stairs,
          mezz = q.scene.getObjectByName('mezzanine');
        if (!mezz || !Array.isArray(stairs))
          throw new Error('Missing actual stair/mezzanine references.');
        q.scene.updateMatrixWorld(true);
        const last = stairs.reduce((a, b) =>
          new T.Box3().setFromObject(a).max.y > new T.Box3().setFromObject(b).max.y ? a : b,
        );
        const stepBox = new T.Box3().setFromObject(last);
        const floorHit = new T.Raycaster(
          new T.Vector3(4, 3.5, -2.3),
          new T.Vector3(0, -1, 0),
          0,
          1,
        ).intersectObject(mezz, true)[0];
        const hits = new T.Raycaster(
          new T.Vector3(4, 3.7, -1.6),
          new T.Vector3(0, 0, -1),
          0,
          1.2,
        ).intersectObject(mezz, true);
        if (!floorHit || Math.abs(stepBox.max.y - floorHit.point.y) > 0.001 || hits.length)
          throw new Error('Floor/step discontinuity or rail blocks stair entry.');
        return {
          lastStepTop: stepBox.max.y,
          actualFloorTop: floorHit.point.y,
          verticalGap: Math.abs(stepBox.max.y - floorHit.point.y),
          entryRayObstructions: hits.length,
        };
      }),
    );
    await check('stair stringers and handrails follow the actual ascending flight', () =>
      workshop.evaluate(async () => {
        const T = await import('/vendor/three/build/three.module.js'),
          q = __quality3D;
        const assembly = q.scene.getObjectByName('stairs');
        const members = assembly.children.filter(
          (o) => o.isMesh && (o.geometry.parameters.depth > 5 || o.geometry.parameters.height > 5),
        );
        if (members.length !== 4) throw new Error('Missing two stringers and two handrails.');
        return {
          members: members.map((o) => {
            const p = o.geometry.parameters,
              isRail = o.geometry.type === 'CylinderGeometry',
              length = isRail ? p.height : p.depth;
            const a = o.localToWorld(
              isRail ? new T.Vector3(0, -length / 2, 0) : new T.Vector3(0, 0, length / 2),
            );
            const b = o.localToWorld(
              isRail ? new T.Vector3(0, length / 2, 0) : new T.Vector3(0, 0, -length / 2),
            );
            const offset = isRail ? 0.9 : 0;
            if (
              Math.abs(a.y - offset) > 0.001 ||
              Math.abs(a.z - 3) > 0.001 ||
              Math.abs(b.y - 3 - offset) > 0.001 ||
              Math.abs(b.z + 2.1) > 0.001
            )
              throw new Error('Sloping member misses flight endpoints.');
            return {
              type: isRail ? 'handrail' : 'stringer',
              lower: a.toArray(),
              upper: b.toArray(),
            };
          }),
        };
      }),
    );
    await settle(workshop);
    await save(workshop, 'workshop-refined-hero');
    await workshop.getByTestId('roof-toggle').click();
    await workshop.getByTestId('view-mezzanine').click();
    await settle(workshop);
    await save(workshop, 'workshop-refined-mezzanine');
    await workshop.getByTestId('view-workshop').click();
    await settle(workshop);
    await save(workshop, 'workshop-refined-interior');
    await workshop.close();
    for (const [file, before] of Object.entries(report.sourceHashes))
      assert.equal(
        createHash('sha256')
          .update(await fs.readFile(`workspace/supergence/benchmarks/${file}`))
          .digest('hex'),
        before,
        'Measured source must remain unchanged.',
      );
  } else if (mode === 'soak') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(
      `${baseURL}/workspace/supergence/benchmarks/3d-depth-20261023/skyline-courier/detailed/index.html`,
    );
    await page.waitForFunction(() => window.__quality3D?.state);
    await page.getByTestId('start-game').click();
    await settle(page);
    report.hardware = {
      platform: os.platform(),
      cpu: os.cpus()[0]?.model,
      totalMemoryBytes: os.totalmem(),
      gpu: await page.evaluate(() => {
        const gl = __quality3D.renderer.getContext(),
          ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext
          ? {
              vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
              renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
            }
          : { unavailable: true };
      }),
    };
    report.scope =
      '120 seconds of real elapsed Chrome animation cadence on this desktop. No injected clock. Frame intervals include browser/CPU/GPU scheduling and are not GPU-only timings. This is not a physical-phone test or a leak proof.';
    const sampling = page.evaluate(
      () =>
        new Promise((resolve) => {
          const start = performance.now(),
            intervals = [],
            samples = [];
          let prior = start,
            mark = start;
          const initial = { ...__quality3D.renderer.info.memory };
          const frame = (now) => {
            intervals.push(now - prior);
            prior = now;
            if (now - mark > 1000) {
              mark = now;
              samples.push({
                elapsedMs: now - start,
                drawCalls: __quality3D.renderer.info.render.calls,
                triangles: __quality3D.renderer.info.render.triangles,
                ...__quality3D.renderer.info.memory,
                heapBytes: performance.memory?.usedJSHeapSize ?? null,
              });
            }
            if (now - start >= 120000) {
              const sorted = intervals.slice(1).sort((a, b) => a - b);
              resolve({
                elapsedMs: now - start,
                observedFrames: sorted.length,
                medianFrameMs: sorted[Math.floor(sorted.length * 0.5)],
                p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
                initialMemory: initial,
                finalMemory: { ...__quality3D.renderer.info.memory },
                samples,
              });
            } else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
    for (let cycle = 0; cycle < 6; cycle++) {
      await page.keyboard.down('d');
      try {
        await page.waitForFunction(() => __quality3D.state.status === 'won', null, {
          timeout: 30000,
        });
      } finally {
        await page.keyboard.up('d');
      }
      assert.equal(await page.evaluate(() => __quality3D.state.collected), 3);
      await page.getByTestId('restart-game').filter({ visible: true }).last().click();
      if (await page.getByTestId('start-game').isVisible())
        await page.getByTestId('start-game').click();
      console.log('Completed real gameplay cycle ' + (cycle + 1));
    }
    report.performance = await sampling;
    report.errors = errors;
    report.completedCycles = 6;
    report.checks.push({
      name: 'six complete delivery/restart cycles during 120-second desktop soak',
      passed: errors.length === 0,
    });
  } else {
    report.scope =
      'Observed public creator deployments, different tasks/workflows. Creator model labels are not authenticated model transcripts; these are references, not a parity ranking.';
    for (const [id, url, source] of [
      [
        'opus-pelican',
        'https://games.xdullboy.com/pelican/',
        'https://github.com/xiiyioozzz/opus55-3d-games',
      ],
      [
        'astra-paperroute',
        'https://www.paperroute.lol/play/',
        'https://www.paperroute.lol/devlog/',
      ],
    ]) {
      await check('public deployed reference ' + id, async () => {
        const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
        try {
          const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
          await page.locator('canvas').first().waitFor({ timeout: 30000 });
          if (id === 'astra-paperroute') {
            try {
              await page.waitForFunction(
                () => !document.body.innerText.includes('Loading your neighbourhood'),
                null,
                { timeout: 55000 },
              );
            } catch {
              /* A loading capture is evidence of loading, not gameplay. */
            }
          }
          await settle(page);
          await save(page, id);
          return {
            url,
            source,
            status: response.status(),
            htmlSha256: createHash('sha256')
              .update(await response.body())
              .digest('hex'),
            title: await page.title(),
            visibleText: (await page.locator('body').innerText()).slice(0, 1800),
            canvasCount: await page.locator('canvas').count(),
            gameplayVerified: false,
            captureOnly: true,
            loadingScreen: (await page.locator('body').innerText()).includes(
              'Loading your neighbourhood',
            ),
          };
        } finally {
          await page.close();
        }
      });
    }
  }
} catch (e) {
  report.checks.push({ name: 'extended execution', passed: false, error: e.message });
} finally {
  await browser.close();
  await fs.writeFile(`${out}/extended-${mode}.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (report.checks.some((c) => !c.passed)) process.exitCode = 1;
