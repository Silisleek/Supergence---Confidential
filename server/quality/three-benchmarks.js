import assert from 'node:assert/strict';

const liveScene = async (page) => {
  await page.waitForFunction(() => window.__quality3D?.renderer?.info?.render?.calls > 0, null, {
    polling: 50,
    timeout: 20000,
  });
  assert.ok(
    await page.evaluate(() => {
      const q = window.__quality3D;
      return (
        q.scene.isScene &&
        q.camera.isCamera &&
        q.renderer.domElement === document.querySelector('canvas')
      );
    }),
  );
};
const camera = (page) => page.evaluate(() => window.__quality3D.camera.position.toArray());
const changedCamera = async (page, button) => {
  const before = await camera(page);
  await page.getByTestId(button).click();
  await page.waitForFunction(
    (old) => JSON.stringify(__quality3D.camera.position.toArray()) !== JSON.stringify(old),
    before,
    { polling: 50 },
  );
};
export const threeBenchmarks = [
  {
    id: 'courtyard-museum',
    brief: `Build CEDAR COURT, a polished interactive 3D architectural presentation of an original two-storey courtyard museum. Use a coherent modern warm-climate design: pale limestone/concrete slabs and walls, cedar screens, bronze details, transparent glazing, roof overhangs and railings. Compose two wings around a clearly open planted courtyard with a reflecting pool, a rear bridge/gallery on the upper storey, and a real two-flight staircase with at least twelve individually modelled steps and a landing connecting the ground and upper levels (about 3.2 metres apart). Doorways must be actual openings, not opaque wall textures. Add trees, paving, seating and carefully scaled architectural details. Maintain believable human proportions, wall/slab thickness and connected structural geometry. Model a recognisable complete building, not a few unrelated boxes.
Make the initial exterior three-quarter view publication-quality in composition: full subject framed with margins, clear courtyard/stair silhouette, purposeful daylight, cast shadows, reflected surroundings for metal/glass, and at least two material-specific procedural textures. Use local installed Three.js/OrbitControls only, no remote assets. Add functional Courtyard, Aerial and Interior camera presets, roof visibility toggle, section/cutaway toggle, day/night lighting toggle and reset. Controls must operate on real scene objects. Desktop and phone layouts must work, with orbit drag/zoom over the canvas.
Acceptance selectors (data-testid): view-court, view-aerial, view-interior, roof-toggle, section-toggle, night-toggle, reset-view. Expose window.__quality3D={scene,renderer,camera,controls,building,roof,walls,stairs,pool}, referencing ACTUAL rendered THREE objects; walls is the cutaway group, roof the toggled roof group, stairs contains the actual individual steps, building the structural group, pool the actual pool mesh/group. No fake telemetry or test-only objects. Deliver a complete self-contained runnable HTML document.`,
    visualReview: [
      'Recognisable coherent two-storey architecture, open courtyard, bridge and connected stair',
      'Convincing proportions, openings, railings, slabs and material separation',
      'Purposeful hero composition, readable interior/courtyard, convincing reflected light and shadows',
      'Usable camera/section/lighting controls on desktop and phone',
    ],
    async check(page, check) {
      await check('actual rendered WebGL scene', () => liveScene(page));
      await check('hero camera frames actual building bounds', async () => {
        const framed = await page.evaluate(async () => {
          const THREE = await import('/vendor/three/build/three.module.js');
          const q = __quality3D,
            b = new THREE.Box3().setFromObject(q.building);
          q.camera.updateMatrixWorld();
          for (const x of [b.min.x, b.max.x])
            for (const y of [b.min.y, b.max.y])
              for (const z of [b.min.z, b.max.z]) {
                const p = new THREE.Vector3(x, y, z).project(q.camera);
                if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z < -1 || p.z > 1) return false;
              }
          return true;
        });
        assert.ok(framed, 'Building bounds are clipped by the initial camera.');
      });
      await check('inspection references actual building geometry', async () => {
        const result = await page.evaluate(() => {
          const q = __quality3D;
          let meshes = 0;
          q.building.traverse((o) => {
            if (o.isMesh) meshes++;
          });
          return {
            meshes,
            attached: ['building', 'roof', 'walls', 'stairs', 'pool'].every(
              (k) => q[k]?.isObject3D && q.scene.getObjectById(q[k].id) === q[k],
            ),
          };
        });
        assert.ok(result.attached);
        assert.ok(result.meshes >= 25, JSON.stringify(result));
      });
      await check('stair geometry rises between storeys', async () => {
        const steps = await page.evaluate(() => {
          const values = [];
          __quality3D.stairs.updateWorldMatrix(true, true);
          __quality3D.stairs.traverse((o) => {
            if (o.isMesh) values.push(o.matrixWorld.elements[13]);
          });
          return values;
        });
        assert.ok(steps.length >= 12, `${steps.length} stair meshes`);
        assert.ok(
          Math.max(...steps) - Math.min(...steps) > 2.5,
          'Stair geometry does not rise a storey.',
        );
      });
      await check('multiple actual procedural surface textures', async () => {
        const count = await page.evaluate(() => {
          const maps = new Set();
          __quality3D.scene.traverse((o) => {
            for (const m of [].concat(o.material || []))
              if (m.map?.image?.width >= 64) maps.add(m.map.uuid);
          });
          return maps.size;
        });
        assert.ok(count >= 2, `${count} distinct textures`);
      });
      for (const button of ['view-court', 'view-aerial', 'view-interior'])
        await check(`${button} changes actual camera`, () => changedCamera(page, button));
      for (const [button, key] of [
        ['roof-toggle', 'roof'],
        ['section-toggle', 'walls'],
      ])
        await check(`${button} changes actual geometry visibility`, async () => {
          const before = await page.evaluate((key) => __quality3D[key].visible, key);
          await page.getByTestId(button).click();
          assert.notEqual(await page.evaluate((key) => __quality3D[key].visible, key), before);
          await page.getByTestId(button).click();
        });
      await check('day/night changes actual lighting', async () => {
        const lights = () =>
          page.evaluate(() => {
            const a = [];
            __quality3D.scene.traverse((o) => {
              if (o.isLight) a.push([o.intensity, o.color.getHex()]);
            });
            return JSON.stringify(a);
          });
        const before = await lights();
        await page.getByTestId('night-toggle').click();
        assert.notEqual(await lights(), before);
        await page.getByTestId('night-toggle').click();
      });
      await check('reset restores hero camera', async () => {
        await page.getByTestId('reset-view').click();
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              let n = 90;
              const frame = () => (--n ? requestAnimationFrame(frame) : resolve());
              requestAnimationFrame(frame);
            }),
        );
        const initial = await camera(page);
        await changedCamera(page, 'view-aerial');
        await page.getByTestId('reset-view').click();
        await page.waitForFunction(
          (old) =>
            __quality3D.camera.position.toArray().every((v, i) => Math.abs(v - old[i]) < 0.05),
          initial,
          { polling: 50 },
        );
      });
      await check('canvas drag orbits actual camera', async () => {
        const box = await page.locator('canvas').boundingBox(),
          before = await camera(page);
        await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6, { steps: 12 });
        await page.mouse.up();
        await page.waitForFunction(
          (old) => JSON.stringify(__quality3D.camera.position.toArray()) !== JSON.stringify(old),
          before,
          { polling: 50 },
        );
        await page.getByTestId('reset-view').click();
      });
    },
  },
  {
    id: 'skyline-courier',
    brief: `Build SKYLINE COURIER, a complete original third-person 3D rooftop delivery platformer with a polished coherent visual identity. An expressive little courier robot must collect three glowing parcel beacons across three connected rooftop terraces, then reach the illuminated exit. Model a layered city skyline, distinct rooftop materials, railings, planters, vents and readable navigation cues. Use attractive daylight/blue-hour lighting, shadows and material-specific procedural surface detail. No stock space shooter, unrelated scene or fake FPS.
Gameplay: keyboard WASD/arrow movement in world X/Z, Space jump with real gravity and landing, collision against solid rooftop props, gaps/edges that cause falling, automatic respawn at the current checkpoint after falling, visible parcel count, pause/resume, win state after all three deliveries and reaching the exit, and restart that restores parcels/checkpoint/count. Include usable touch controls on phones. Use local installed Three.js only; no network assets. Start screen explains controls. Frame the playable area clearly with a following camera; do not trap input behind an overlay.
For a reproducible level, arrange three rooftop platforms along +X, centred at x=0,10,20 and z=0, each about 8x8 metres with top surface y=0. Connect their edges with narrow 2m bridges across the gaps. Put parcel beacons on each roof near x=1,10,19 z=0; put exit near x=22 z=0. Start robot near x=-2,z=0. Keep the centreline route traversable; place props/obstacles off that route so keyboard completion can be tested while optional exploration, jumping and falling remain real. The game should be enjoyable and readable, with actual pickup effects and clear victory/retry feedback, not just a rendering demo.
Acceptance selectors (data-testid): start-game, pause-game, resume-game, restart-game, parcel-count, game-status; touch buttons move-left, move-right, move-forward, move-back, jump. Expose window.__quality3D={scene,renderer,camera,player,state,platforms,pickups}, with player the ACTUAL rendered robot Object3D, platforms/pickups the ACTUAL scene objects, and state the ACTUAL simulation state object {status,collected,deaths} using status ready/playing/paused/won. These references are read-only inspection targets; do not add test-only win/teleport methods. Deliver complete self-contained runnable HTML.`,
    visualReview: [
      'Recognisable courier character and coherent rooftop city, readable route and collectibles',
      'Material detail, character silhouette, environmental depth and purposeful lighting',
      'Clear start, play, pause and victory states; camera follows without clipping',
      'Enjoyable responsive input, fair falling/respawn, usable phone controls',
    ],
    async check(page, check, { capture } = {}) {
      await check('actual rendered 3D game', () => liveScene(page));
      await check('actual player and level objects attached to rendered scene', async () => {
        assert.ok(
          await page.evaluate(() => {
            const q = __quality3D;
            return (
              q.player?.isObject3D &&
              q.scene.getObjectById(q.player.id) === q.player &&
              q.platforms.length >= 3 &&
              q.pickups.length >= 3 &&
              [...q.platforms, ...q.pickups].every((o) => q.scene.getObjectById(o.id) === o)
            );
          }),
        );
      });
      await check('start enters actual playing state', async () => {
        await page.getByTestId('start-game').click();
        await page.waitForFunction(() => __quality3D.state.status === 'playing', null, {
          polling: 50,
        });
      });
      const position = () => page.evaluate(() => __quality3D.player.position.toArray());
      const advance = async (frames) =>
        page.evaluate(
          (n) =>
            new Promise((resolve) => {
              const tick = () => (--n ? requestAnimationFrame(tick) : resolve());
              requestAnimationFrame(tick);
            }),
          frames,
        );
      await check('normal keyboard movement moves actual robot', async () => {
        const before = await position();
        await page.keyboard.down('d');
        await advance(24);
        await page.keyboard.up('d');
        assert.ok((await position())[0] > before[0] + 0.3);
      });
      await check('jump rises then returns under gravity', async () => {
        const before = await position();
        await page.keyboard.down('Space');
        await advance(12);
        await page.keyboard.up('Space');
        assert.ok((await position())[1] > before[1] + 0.15);
        await advance(90);
        assert.ok(Math.abs((await position())[1] - before[1]) < 0.3);
      });
      await check('pause holds actual simulation position', async () => {
        await page.getByTestId('pause-game').click();
        const before = await position();
        await page.keyboard.down('d');
        await advance(30);
        await page.keyboard.up('d');
        assert.deepEqual(await position(), before);
        await page.getByTestId('resume-game').click();
        assert.equal(await page.evaluate(() => __quality3D.state.status), 'playing');
      });
      await check('falling triggers actual respawn and increments deaths', async () => {
        const before = await page.evaluate(() => __quality3D.state.deaths);
        await page.keyboard.down('w');
        try {
          await page.waitForFunction((old) => __quality3D.state.deaths > old, before, {
            polling: 50,
            timeout: 12000,
          });
        } finally {
          await page.keyboard.up('w');
        }
        await advance(10);
        assert.ok(Math.abs((await position())[2]) < 4);
      });
      await check('restart restores real simulation and pickups', async () => {
        await page.getByTestId('restart-game').filter({ visible: true }).first().click();
        if (await page.getByTestId('start-game').isVisible())
          await page.getByTestId('start-game').click();
        await page.waitForFunction(() => __quality3D.state.collected === 0, null, { polling: 50 });
        assert.ok((await position())[0] < 0);
      });
      await check('complete the route using normal keyboard input', async () => {
        await page.keyboard.down('d');
        try {
          await page.waitForFunction(() => __quality3D.state.status === 'won', null, {
            polling: 50,
            timeout: 20000,
          });
        } finally {
          await page.keyboard.up('d');
        }
        assert.equal(await page.evaluate(() => __quality3D.state.collected), 3);
        assert.match(await page.getByTestId('parcel-count').innerText(), /3/);
        await capture?.('victory');
      });
      await check('restart after victory restores actual pickups', async () => {
        await page.getByTestId('restart-game').filter({ visible: true }).last().click();
        if (await page.getByTestId('start-game').isVisible())
          await page.getByTestId('start-game').click();
        await page.waitForFunction(() => __quality3D.state.collected === 0, null, { polling: 50 });
        assert.ok(await page.evaluate(() => __quality3D.pickups.every((o) => o.visible)));
      });
    },
  },
];
