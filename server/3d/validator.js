// SIS 1.0 — 3D Scene Quality Gate
// Deterministic validator for generated Three.js HTML: structure, budgets, game wiring.
// Returns { passed, score, checks[], errors[], warnings[], stats } — no AI calls.

import vm from 'vm';

const BUDGETS = {
  maxMeshes: 600,
  minMeshes: 3,
  maxSphereW: 32,
  maxSphereH: 24,
  maxCylinderSeg: 32,
  maxTorusRS: 24,
  maxTorusTS: 32,
  maxBytes: 1500 * 1024,
};

function check(name, ok, detail = '', critical = false) {
  return { name, ok, detail, critical };
}

export function validateSceneHTML(html = '', opts = {}) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const { expectGameLogic = false, expectAnatomy = false } = opts;

  const push = (c) => {
    checks.push(c);
    if (!c.ok && c.critical) errors.push(`${c.name}: ${c.detail}`);
    else if (!c.ok) warnings.push(`${c.name}: ${c.detail}`);
  };

  // ─── Structure (critical) ───
  push(
    check(
      'doctype/html-root',
      /<!DOCTYPE html>/i.test(html) && /<html/i.test(html),
      'missing <!DOCTYPE html> or <html>',
      true,
    ),
  );
  const hasThreeImport =
    /three(\.module\.js|@|\/build\/three)/i.test(html) || /from\s+['"]three['"]/.test(html);
  push(check('three-loaded', hasThreeImport, 'missing Three.js import or script reference', true));
  push(
    check('module-script', /<script(\s+type="module")?>/i.test(html), 'missing script tag', true),
  );

  const hasCameraNav =
    /OrbitControls/i.test(html) ||
    /camera\.position/i.test(html) ||
    /camera\.lookAt/i.test(html) ||
    /PointerLockControls/i.test(html);
  push(check('camera-nav', hasCameraNav, 'missing camera navigation or position update', true));
  push(
    check(
      'resize-handler',
      /window\.addEventListener\(\s*['"]resize['"]/.test(html),
      'missing resize handler',
      false,
    ),
  );
  push(check('render-loop', /requestAnimationFrame/.test(html), 'missing render loop', true));

  const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/i);
  const js = scriptMatch ? scriptMatch[1] : '';

  // ─── Module Script Syntax Verification (CRITICAL) ───
  let syntaxOk = false;
  let syntaxError = '';
  if (js) {
    const executableJs = js.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// [import]');
    try {
      new vm.Script(executableJs, { filename: 'scene.js' });
      syntaxOk = true;
    } catch (err) {
      syntaxError = err.message;
    }
  }
  push(check('script-syntax', syntaxOk, `JavaScript module syntax error: ${syntaxError}`, true));

  // ─── Geometry pipeline ───
  const meshCount = (js.match(/new\s+THREE\.Mesh/g) || []).length;
  const sceneAdds = (js.match(/scene\.add\(/g) || []).length;
  // Anatomy pipeline legitimately builds ~100 tiny primitives; cap is for general scenes.
  const budgetOk = expectAnatomy
    ? meshCount >= 20 && meshCount <= 250
    : meshCount >= BUDGETS.minMeshes && meshCount <= BUDGETS.maxMeshes;
  push(
    check(
      'mesh-budget',
      budgetOk,
      `meshes=${meshCount} (want ${expectAnatomy ? '20-250' : `${BUDGETS.minMeshes}-${BUDGETS.maxMeshes}`})`,
      meshCount < 3,
    ),
  );
  push(
    check(
      'scene-adds',
      sceneAdds >= Math.min(meshCount, BUDGETS.minMeshes),
      `scene.add calls=${sceneAdds} for ${meshCount} meshes`,
      false,
    ),
  );

  const unnamedMeshes = meshCount - (js.match(/\.name\s*=/g) || []).length;
  push(
    check(
      'mesh-naming',
      unnamedMeshes <= Math.ceil(meshCount / 2),
      `${unnamedMeshes}/${meshCount} meshes unnamed (tooltips suffer)`,
      false,
    ),
  );

  // ─── Retopology budgets (warnings — optimizer clamps, validator confirms) ───
  // Skipped for anatomy: its prompt mandates exact segments on tiny primitives (negligible cost).
  if (!expectAnatomy) {
    const sphereViolations = [
      ...js.matchAll(/SphereGeometry\(\s*[\d.]+\s*,\s*(\d+)\s*,\s*(\d+)/g),
    ].filter((m) => +m[1] > BUDGETS.maxSphereW || +m[2] > BUDGETS.maxSphereH).length;
    push(
      check(
        'sphere-segments',
        sphereViolations === 0,
        `${sphereViolations} SphereGeometry over 16x12`,
        false,
      ),
    );

    const cylViolations = [
      ...js.matchAll(/CylinderGeometry\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*(\d+)/g),
    ].filter((m) => +m[1] > BUDGETS.maxCylinderSeg).length;
    push(
      check(
        'cylinder-segments',
        cylViolations === 0,
        `${cylViolations} CylinderGeometry over 20 radial segs`,
        false,
      ),
    );

    const torusViolations = [
      ...js.matchAll(/TorusGeometry\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*(\d+)\s*,\s*(\d+)/g),
    ].filter((m) => +m[1] > BUDGETS.maxTorusRS || +m[2] > BUDGETS.maxTorusTS).length;
    push(
      check(
        'torus-segments',
        torusViolations === 0,
        `${torusViolations} TorusGeometry over 12x20`,
        false,
      ),
    );
  }

  // ─── Cleanliness ───
  const hasTruePlaceholders =
    /\/\/\s*(?:TODO|PLACEHOLDER|logic here|\.\.\.)\b|\/\*\s*(?:TODO|PLACEHOLDER|logic here|\.\.\.)\s*\*\//i.test(
      js,
    );
  push(check('no-placeholders', !hasTruePlaceholders, 'TODO/placeholder comment found', false));
  push(
    check(
      'no-conversational-leak',
      !/\[commentary\]/.test(js) || (js.match(/\[commentary\]/g) || []).length < 5,
      'excessive commented-out model chatter',
      false,
    ),
  );
  const bytes = Buffer.byteLength(html, 'utf8');
  push(
    check('file-size', bytes <= BUDGETS.maxBytes, `${(bytes / 1024).toFixed(0)}KB > 500KB`, false),
  );

  // ─── Pipeline-specific ───
  if (expectAnatomy) {
    const fns = [
      'buildAxialSkeleton',
      'buildUpperLimbs',
      'buildLowerLimbsAndPelvis',
      'buildOrganSystem',
      'buildVascularAndMuscularSystem',
      'initExplosionController',
    ];
    const missing = fns.filter((f) => !js.includes(`function ${f}`));
    push(check('anatomy-5-part', missing.length === 0, `missing: ${missing.join(', ')}`, true));
    const piecePushes = (js.match(/pieces\.push\(/g) || []).length;
    push(
      check(
        'anatomy-pieces',
        piecePushes >= 20,
        `pieces.push calls=${piecePushes} (want 20+)`,
        piecePushes < 10,
      ),
    );
    push(
      check(
        'explode-slider',
        /explode-slider/.test(html) && /btn-explode/.test(html) && /btn-assemble/.test(html),
        'missing exploded-view controls',
        false,
      ),
    );
  } else {
    // Hand-built scenes (no pipeline fns) are fine if they directly create enough meshes.
    const hasDirectMeshes = meshCount >= BUDGETS.minMeshes && sceneAdds >= BUDGETS.minMeshes;
    push(
      check(
        'objects-fn',
        js.includes('function buildSceneObjects') || hasDirectMeshes,
        'missing buildSceneObjects and too few direct meshes',
        !hasDirectMeshes,
      ),
    );
    push(
      check(
        'animate-fn',
        js.includes('function animateScene') || /requestAnimationFrame/.test(js),
        'missing animateScene and no render loop',
        !/requestAnimationFrame/.test(js),
      ),
    );
  }

  if (expectGameLogic) {
    push(
      check(
        'game-fn',
        js.includes('function buildGameLogic'),
        'missing buildGameLogic for game request',
        true,
      ),
    );
    push(
      check(
        'game-update',
        /\.update\s*\(/.test(js) && /getScore/.test(js) && /hasWon/.test(js),
        'game API must expose update/getScore/hasWon',
        true,
      ),
    );
    push(
      check(
        'game-input',
        /keydown|touchstart|pointerdown/.test(js),
        'no keyboard/touch input listeners',
        false,
      ),
    );
    push(
      check(
        'game-hud',
        /hud-score|hud-win|btn-restart/.test(html),
        'missing game HUD (score/win/restart)',
        false,
      ),
    );
  }

  const criticalFailed = checks.filter((c) => !c.ok && c.critical).length;
  const totalFailed = checks.filter((c) => !c.ok).length;
  const score = Math.max(
    0,
    Math.min(1, 1 - criticalFailed * 0.25 - (totalFailed - criticalFailed) * 0.04),
  );

  return {
    passed: criticalFailed === 0,
    score: Math.round(score * 100) / 100,
    checks,
    errors,
    warnings,
    stats: { meshCount, sceneAdds, bytes, expectGameLogic, expectAnatomy },
  };
}

export { BUDGETS };
export default { validateSceneHTML, BUDGETS };
