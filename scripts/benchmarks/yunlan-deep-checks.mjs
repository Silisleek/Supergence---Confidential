import path from 'node:path';

// External acceptance oracles: UI events, observed transforms and raycasts.
// Physics-loop checks are labelled separately from actual keyboard input.
export async function deepChecks(page, output, prefix) {
  const result = { checks: [], captures: [], passed: false };
  const check = async (name, run) => {
    try {
      result.checks.push({ name, ...(await run()) });
    } catch (error) {
      result.checks.push({ name, passed: false, error: error.message });
    }
  };
  const frames = () => page.evaluate(() => window.YUNLAN.frames);
  const advance = async (n = 5) => {
    const before = await frames();
    await page.waitForFunction((target) => window.YUNLAN.frames >= target, before + n, {
      timeout: 60000,
      polling: 100,
    });
  };
  const capture = async (name) => {
    const file = path.join(output, `${prefix}-${name}.png`);
    await page.screenshot({ path: file });
    result.captures.push({ name, file });
  };
  const view = async (name) => {
    const before = await page.evaluate(() => window.YUNLAN.camera.position.toArray());
    await page.locator(`[data-view="${name}"]`).click();
    await page.waitForFunction(
      (old) => {
        const app = window.YUNLAN;
        const p = app.camera.position;
        return (
          app.controls.orbit.flyT >= 1 && Math.hypot(p.x - old[0], p.y - old[1], p.z - old[2]) > 0.1
        );
      },
      before,
      { timeout: 60000, polling: 100 },
    );
    await capture(name);
    return {
      passed: true,
      camera: await page.evaluate(() => window.YUNLAN.camera.position.toArray()),
    };
  };
  for (const name of ['historic', 'shopping', 'residential', 'cbd', 'riverside', 'bridge']) {
    await check(`view.${name}`, () => view(name));
    if (!result.checks.at(-1).passed) return result;
  }

  await check('traffic.pauseResume', async () => {
    const pose = () =>
      page.evaluate(() =>
        window.YUNLAN.traffic.vehicles.slice(0, 4).map((v) => v.mesh.position.toArray()),
      );
    await page.locator('#btn-pause').click();
    const paused = await page.evaluate(() => window.YUNLAN.traffic.paused);
    const a = await pose();
    await advance();
    const b = await pose();
    await page.locator('#btn-pause').click();
    await advance(10);
    const c = await pose();
    const delta = (left, right) =>
      Math.max(...left.map((p, i) => Math.hypot(...p.map((v, k) => v - right[i][k]))));
    return {
      passed: paused && delta(a, b) < 0.00001 && delta(b, c) > 0.05,
      pausedDelta: delta(a, b),
      resumedDelta: delta(b, c),
    };
  });

  await check('keyboard.walkOnBridge', async () => {
    await page.locator('#btn-walk').click();
    await advance(3);
    const start = await page.evaluate(() => window.YUNLAN.controls.walker.pos.toArray());
    try {
      await page.keyboard.down('w');
      await page.waitForFunction(
        (p) => {
          const v = window.YUNLAN.controls.walker.pos;
          return Math.hypot(v.x - p[0], v.z - p[2]) > 0.6;
        },
        start,
        { timeout: 15000, polling: 100 },
      );
    } finally {
      await page.keyboard.up('w');
    }
    const end = await page.evaluate(() => window.YUNLAN.controls.walker.pos.toArray());
    await capture('street-walk');
    return { passed: Math.hypot(end[0] - start[0], end[2] - start[2]) > 0.6, start, end };
  });

  await check('bridges.physicsAndRenderedSurface', async () => {
    const bridges = await page.evaluate(() => {
      const app = window.YUNLAN,
        walker = app.controls.walker,
        T = app.THREE;
      const surfaces = [];
      app.scene.updateMatrixWorld(true);
      app.scene.traverse((o) => {
        if (
          o.isMesh &&
          /^batch-(?:\d+,\d+-)?(?:asphalt|concrete|stone\w*|paving|white)(?:-(?:struct|detail|far|near))?$/.test(
            o.name,
          )
        )
          surfaces.push(o);
      });
      const ray = new T.Raycaster(),
        down = new T.Vector3(0, -1, 0);
      const data = [];
      for (const bridge of app.bridges) {
        const samples = [];
        for (let i = 1; i < 8; i++) {
          const z = bridge.z0 + ((bridge.z3 - bridge.z0) * i) / 8;
          walker.placeAt(bridge.cx, z, Math.PI);
          ray.set(new T.Vector3(bridge.cx, 100, z), down);
          const hit = ray.intersectObjects(surfaces, false)[0];
          samples.push({
            z,
            feet: walker.pos.y,
            surface: hit?.point.y,
            gap: hit ? hit.point.y - walker.pos.y : null,
          });
        }
        walker.placeAt(bridge.cx, bridge.z0 - 5, Math.PI);
        walker.keys.clear();
        walker.keys.add('KeyW');
        walker.setEnabled(true);
        let steps = 0;
        // Budget from crossing length at a conservative 2.5 m/s. The old
        // 3000 steps allowed only 50 seconds for a >210 m walk at 3.5 m/s.
        const maxSteps = Math.ceil(((bridge.z3 + 3 - (bridge.z0 - 5)) / 2.5) * 60) + 180;
        for (; steps < maxSteps && walker.pos.z < bridge.z3 + 3; steps++) walker.update(1 / 60);
        walker.keys.clear();
        data.push({
          id: bridge.id,
          kind: 'controlled physics-loop crossing',
          steps,
          maxSteps,
          end: walker.pos.toArray(),
          crossed: walker.pos.z >= bridge.z3 + 3,
          samples,
        });
      }
      return data;
    });
    return {
      passed:
        bridges.length === 2 &&
        bridges.every(
          (b) => b.crossed && b.samples.every((s) => s.gap !== null && Math.abs(s.gap) < 0.18),
        ),
      bridges,
    };
  });

  await check('interiors.physicsEntry', async () => {
    const entries = await page.evaluate(() => {
      const app = window.YUNLAN,
        w = app.controls.walker;
      return app.controls.ENTRY_ZONES.map((zone) => {
        const a = zone.approach,
          t = zone.inside;
        if (!a || !t)
          return { id: zone.id, reached: false, error: 'Missing declared approach or target' };
        w.placeAt(a.x, a.z, Math.atan2(-(t.x - a.x), -(t.z - a.z)));
        w.keys.clear();
        w.keys.add('KeyW');
        w.setEnabled(true);
        let steps = 0;
        for (; steps < 1800 && Math.hypot(w.pos.x - t.x, w.pos.z - t.z) > 1.2; steps++)
          w.update(1 / 60);
        w.keys.clear();
        return {
          id: zone.id,
          reached: Math.hypot(w.pos.x - t.x, w.pos.z - t.z) <= 1.2,
          steps,
          end: w.pos.toArray(),
        };
      });
    });
    return { passed: entries.length >= 2 && entries.every((e) => e.reached), entries };
  });

  await check('walkSpawn.hasNavigableNeighbor', async () => {
    await page.locator('#btn-orbit').click();
    await view('overview');
    await page.locator('#btn-walk').click();
    await advance(3);
    const state = await page.evaluate(() => {
      const w = window.YUNLAN.controls.walker,
        p = w.pos;
      return {
        pos: p.toArray(),
        directions: [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].map(([x, z]) => w.tryMove(p.x + x, p.z + z)),
      };
    });
    return { passed: state.directions.some(Boolean), ...state };
  });

  await check('night.visiblePreset', async () => {
    await page.locator('#btn-orbit').click();
    await view('historic');
    await page.locator('#btn-night').click();
    await page.waitForFunction(() => document.body.classList.contains('night'));
    await advance(5);
    await capture('night-historic');
    return {
      passed: await page.locator('#btn-night').evaluate((el) => el.classList.contains('on')),
    };
  });
  result.passed = result.checks.every((item) => item.passed);
  return result;
}
