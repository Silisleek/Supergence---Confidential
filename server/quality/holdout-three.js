import assert from 'node:assert/strict';
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 60;
        const tick = () => (--n ? requestAnimationFrame(tick) : resolve());
        requestAnimationFrame(tick);
      }),
  );
// Freeze these briefs and this oracle before collecting results. They are new
// development holdouts, with task-family overlap; not independent certification.
export const holdoutThree = [
  {
    id: 'northlight-workshop',
    brief: `Create NORTHLIGHT WORKSHOP, an original richly detailed 3D maker-space architectural experience. Use installed Three.js and local procedural assets. Model a 14m-wide x12m-deep building centered at origin with floor y=0, enclosing walls to y4.5 and three purposeful sawtooth northlight roof bays. Include exposed timber/steel roof structure, translucent glazing, rough plaster and warm wood with real procedural material detail, workbenches with vises/tools, shelves of material samples, stools, a reception zone, labeled workshop/gallery signage and clustered planting. Keep composition warm and deliberate with actual shadows and reflected light; no fake FPS. All furniture must have plausible scale and support.
The front entrance is a real 2.4m-wide opening centered x0,z6, height2.6. Keep the route x0,z7 through x0,z0 unobstructed. A partition at x=-3 separates the western studio (x=-5) from the hall; it has a real 1.4m-wide door centered z0. Keep the route (0,0,0) to(-5,0,0) clear. A north mezzanine at y3 covers z=-6..-2, x0..6; its floor and safety rails must exist. A connected straight stair at x4 runs from z3,y0 toward z=-2.1,y3 with at least18 individual steps, 1.2m clear width, stringers and rails. Land its top on the mezzanine, not against a solid wall. Roof must be a separate toggled group; roof-off must reveal actual furnishings. Main, western workshop and mezzanine camera views must be distinct/useful. Add day/night lighting and reset; controls must work on phone and desktop.
Acceptance data-testid controls: roof-toggle, night-toggle, view-main, view-workshop, view-mezzanine, reset-view. Expose window.__quality3D={scene,renderer,camera,controls,building,roof,stairs}, all ACTUAL rendered objects. stairs contains actual individual step meshes, building includes actual walls, furniture and mezzanine. No fake inspection objects, test-only teleport/success routines or fabricated metrics. Deliver all requested detail and runnable behavior.`,
    visualReview: [
      'Sawtooth roof and readable workshop program',
      'Detailed original furniture and material/fixture craft',
      'Plausible mezzanine/stair circulation and clear doorways',
      'Useful interior views and deliberate lighting',
    ],
    async check(page, check, { capture } = {}) {
      await check('live actual rendered workshop', async () => {
        await page.waitForFunction(() => window.__quality3D?.renderer.info.render.calls > 0, null, {
          timeout: 20000,
        });
        assert.ok(
          await page.evaluate(() => {
            const q = __quality3D;
            return (
              q.scene.isScene &&
              q.camera.isCamera &&
              q.building.isObject3D &&
              q.scene.getObjectById(q.building.id) === q.building
            );
          }),
        );
      });
      await check('actual building has procedural materials and furnished geometry', async () => {
        const detail = await page.evaluate(() => {
          let meshes = 0;
          const maps = new Set();
          __quality3D.building.traverse((o) => {
            if (o.isMesh) {
              meshes++;
              for (const m of [].concat(o.material)) if (m.map) maps.add(m.map.uuid);
            }
          });
          return { meshes, maps: maps.size };
        });
        assert.ok(detail.meshes >= 30 && detail.maps >= 3, JSON.stringify(detail));
      });
      await check('entrance and studio doorway are clear in actual scene geometry', async () => {
        const result = await page.evaluate(async () => {
          const T = await import('/vendor/three/build/three.module.js');
          const q = __quality3D;
          q.scene.updateMatrixWorld(true);
          return [
            [
              [0, 1.4, 8],
              [0, 1.4, 3],
            ],
            [
              [0, 1.4, 0],
              [-5, 1.4, 0],
            ],
          ].map(([from, to]) => {
            const a = new T.Vector3(...from),
              b = new T.Vector3(...to),
              len = a.distanceTo(b);
            return new T.Raycaster(a, b.sub(a).normalize(), 0, len)
              .intersectObject(q.building, true)
              .filter((h) => h.object.visible && h.distance < len - 0.05)
              .map((h) => ({ name: h.object.name, distance: h.distance }));
          });
        });
        assert.deepEqual(result, [[], []]);
      });
      await check('real stair steps connect the 3m mezzanine level', async () => {
        const data = await page.evaluate(async () => {
          const T = await import('/vendor/three/build/three.module.js'),
            q = __quality3D;
          const ys = [];
          const roots = Array.isArray(q.stairs) ? q.stairs : [q.stairs];
          for (const root of roots) {
            if (!root?.isObject3D || q.scene.getObjectById(root.id) !== root)
              throw new Error('Stair inspection references an unattached object.');
            root.traverse((o) => {
              if (o.isMesh && o.geometry?.type === 'BoxGeometry') {
                const b = new T.Box3().setFromObject(o),
                  s = b.getSize(new T.Vector3());
                if (s.x > 0.8 && s.y < 0.3 && s.z < 0.6) ys.push(b.max.y);
              }
            });
          }
          return ys;
        });
        assert.ok(data.length >= 18, `${data.length} actual step treads`);
        assert.ok(Math.max(...data) > 2.85 && Math.max(...data) < 3.3);
        assert.ok(Math.min(...data) < 0.4);
      });
      for (const button of ['view-main', 'view-workshop', 'view-mezzanine'])
        await check(`${button} moves actual camera`, async () => {
          await page
            .getByTestId(button === 'view-workshop' ? 'view-main' : 'view-workshop')
            .click();
          await settle(page);
          const before = await page.evaluate(() => __quality3D.camera.position.toArray());
          await page.getByTestId(button).click();
          await page.waitForFunction(
            (old) =>
              __quality3D.camera.position.toArray().some((v, i) => Math.abs(v - old[i]) > 0.1),
            before,
          );
          await settle(page);
          if (button === 'view-workshop') await capture?.('interior');
        });
      await check('roof toggle changes actual attached roof geometry', async () => {
        assert.ok(
          await page.evaluate(() => {
            const q = __quality3D;
            return q.roof?.isObject3D && q.scene.getObjectById(q.roof.id) === q.roof;
          }),
        );
        const old = await page.evaluate(() => __quality3D.roof.visible);
        await page.getByTestId('roof-toggle').click();
        assert.notEqual(await page.evaluate(() => __quality3D.roof.visible), old);
        await capture?.('open-roof');
        await page.getByTestId('roof-toggle').click();
      });
      await check('night toggle changes actual scene lights', async () => {
        const lights = () =>
          page.evaluate(() => {
            const a = [];
            __quality3D.scene.traverse((o) => {
              if (o.isLight) a.push([o.intensity, o.color.getHex()]);
            });
            return JSON.stringify(a);
          });
        const old = await lights();
        await page.getByTestId('night-toggle').click();
        assert.notEqual(await lights(), old);
        await page.getByTestId('night-toggle').click();
      });
      await check('reset restores a useful hero view', async () => {
        await page.getByTestId('reset-view').click();
        await settle(page);
        const before = await page.evaluate(() => __quality3D.camera.position.toArray());
        await page.getByTestId('view-workshop').click();
        await settle(page);
        await page.getByTestId('reset-view').click();
        await page.waitForFunction(
          (old) =>
            __quality3D.camera.position.toArray().every((v, i) => Math.abs(v - old[i]) < 0.1),
          before,
        );
      });
    },
  },
  {
    id: 'canal-rescue',
    brief: `Build CANAL RESCUE, an original detailed playable 3D canal rescue game in Three.js with a warm dusk miniature-city identity. Model a small rescue launch with rounded hull, gunwales, benches, motor/rudder, rescue rings, mast lights and a clearly visible crew member. Add actual patterned water/ripples, two detailed quays and storefronts, mooring bollards, ropes, dock, lamps and a raised pedestrian bridge. Use original procedural materials/signage/geometry, local installed Three.js, coherent reflected lighting and shadows. No external assets or invented FPS. Keep the canal route readable and camera following the boat from a useful elevated view.
Reproducible layout: canal runs along +Z, banks at x=+-6, water at y0. Start boat at x0,z-5. Two stranded passengers on small rescue floats at x0,z5 and x0,z13 must be rescued by approaching within1.5m. Each pickup changes actual passenger visibility and the real rescued count. Reach the delivery dock at x0,z22 with both passengers to win. Keep the centerline traversable (bridge clearance at least3m), add collision against the canal banks. Do not place solid obstructions on the centerline. Controls: W/ArrowUp accelerate in world+Z, S/ArrowDown reverse, A/ArrowLeft and D/ArrowRight steer/move laterally; Space brake. Use real velocity, acceleration and drag, not teleporting. Let the boat coast visibly after releasing forward. Pause/resume freezes horizontal simulation, win feedback and restart restore the boat/passengers/count. Include usable phone buttons for forward/back/left/right/brake. Complete gameplay loop, not merely a 3D scene.
Acceptance data-testid controls: start-game,pause-game,resume-game,restart-game,rescue-count,game-status,move-forward,move-back,move-left,move-right,brake. Expose window.__quality3D={scene,renderer,camera,boat,passengers,state}, with boat and passengers the ACTUAL rendered Object3Ds and state the ACTUAL simulation state {status:'ready'|'playing'|'paused'|'won',rescued:0,delivered:0}. No test-only teleport/win methods or fake references. Deliver all requested detail and behavior.`,
    visualReview: [
      'Detailed rescue launch/crew and original canal-city identity',
      'Purposeful material/fixture detail and readable water',
      'Readable rescue/delivery progression and useful following camera',
      'Responsive keyboard and touch controls',
    ],
    async check(page, check, { capture } = {}) {
      await check('live actual 3D canal and boat', async () => {
        await page.waitForFunction(() => window.__quality3D?.renderer.info.render.calls > 0, null, {
          timeout: 20000,
        });
        assert.ok(
          await page.evaluate(() => {
            const q = __quality3D;
            return (
              q.scene.isScene &&
              q.boat.isObject3D &&
              q.scene.getObjectById(q.boat.id) === q.boat &&
              q.passengers.length === 2 &&
              q.passengers.every((o) => o.isObject3D && q.scene.getObjectById(o.id) === o)
            );
          }),
        );
      });
      await check('start enters actual playing state', async () => {
        await page.getByTestId('start-game').filter({ visible: true }).first().click();
        await page.waitForFunction(() => __quality3D.state.status === 'playing');
      });
      const pos = () =>
        page.evaluate(() => [__quality3D.boat.position.x, __quality3D.boat.position.z]);
      await check('acceleration and inertia move the real boat', async () => {
        const before = await pos();
        await page.keyboard.down('ArrowUp');
        await page.waitForFunction((old) => __quality3D.boat.position.z > old[1] + 1, before, {
          timeout: 8000,
        });
        await page.keyboard.up('ArrowUp');
        const released = await pos();
        await settle(page);
        assert.ok((await pos())[1] > released[1] + 0.1);
      });
      await check('braking reduces real boat drift', async () => {
        await page.keyboard.down('Space');
        await settle(page);
        const before = await pos();
        await settle(page);
        await page.keyboard.up('Space');
        assert.ok(Math.abs((await pos())[1] - before[1]) < 0.25);
      });
      await check('pause holds horizontal simulation', async () => {
        await page.getByTestId('pause-game').click();
        const before = await pos();
        await page.keyboard.down('ArrowUp');
        await settle(page);
        await page.keyboard.up('ArrowUp');
        assert.deepEqual(await pos(), before);
        await page.getByTestId('resume-game').click();
      });
      const restart = async () => {
        await page.getByTestId('restart-game').filter({ visible: true }).first().click();
        if (await page.getByTestId('start-game').filter({ visible: true }).count())
          await page.getByTestId('start-game').filter({ visible: true }).first().click();
        await page.waitForFunction(
          () => __quality3D.state.rescued === 0 && __quality3D.boat.position.z < 0,
        );
      };
      await check('bank collision contains the boat', async () => {
        await restart();
        await page.keyboard.down('ArrowRight');
        await settle(page);
        await settle(page);
        await settle(page);
        await page.keyboard.up('ArrowRight');
        assert.ok((await pos())[0] <= 5.6);
      });
      await check('rescue and deliver both passengers using normal input', async () => {
        await restart();
        await page.keyboard.down('ArrowUp');
        try {
          await page.waitForFunction(() => __quality3D.state.status === 'won', null, {
            timeout: 30000,
          });
        } finally {
          await page.keyboard.up('ArrowUp');
        }
        assert.equal(await page.evaluate(() => __quality3D.state.rescued), 2);
        assert.equal(await page.evaluate(() => __quality3D.state.delivered), 2);
        assert.ok(await page.evaluate(() => __quality3D.passengers.every((o) => !o.visible)));
        await capture?.('victory');
      });
      await check('restart restores real passengers and counters', async () => {
        await restart();
        assert.ok(
          await page.evaluate(
            () =>
              __quality3D.passengers.every((o) => o.visible) && __quality3D.state.delivered === 0,
          ),
        );
      });
    },
  },
];
