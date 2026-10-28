import assert from 'node:assert/strict';
import { threeBenchmarks } from './three-benchmarks.js';
import { holdoutThree } from './holdout-three.js';

export const creationBenchmarks = [
  ...threeBenchmarks,
  ...holdoutThree,
  {
    id: 'invoice',
    brief: `Build a polished, accessible freelance invoice editor for a small design studio. Start with no line items. Users add/remove items, enter description, nonnegative decimal quantity and rate, edit tax percentage, and see accurate subtotal, tax and grand total formatted to two decimals. Reject invalid numeric inputs without NaN or negative totals. Persist edits to localStorage and restore on reload. Export a CSV containing the actual line items and totals. Use coherent typography, restrained colors, responsive layout, focus states and semantic form labels. No dependencies or network. Deliver complete runnable HTML/CSS/JS, no placeholder buttons.
Acceptance selectors (data-testid): add-line, line (each row), description/quantity/rate/remove-line (within each row), tax-rate, subtotal, tax-total, grand-total, export-csv. Totals' text must contain the formatted numeric amount. These selectors identify controls; behavior must be fully implemented.`,
    visualReview: [
      'Invoice looks usable at desktop and phone sizes',
      'Hierarchy makes totals and editable fields clear',
      'States for empty, invalid, and edited inputs are understandable',
    ],
    async check(page, check) {
      const rows = page.getByTestId('line');
      await check('empty initial invoice', async () => assert.equal(await rows.count(), 0));
      await check('add editable line items', async () => {
        await page.getByTestId('add-line').filter({ visible: true }).first().click();
        await page.getByTestId('add-line').filter({ visible: true }).first().click();
        assert.equal(await rows.count(), 2);
        await rows.nth(0).getByTestId('description').fill('Identity design');
        await rows.nth(0).getByTestId('quantity').fill('2.5');
        await rows.nth(0).getByTestId('rate').fill('80');
        await rows.nth(1).getByTestId('description').fill('Print preparation');
        await rows.nth(1).getByTestId('quantity').fill('3');
        await rows.nth(1).getByTestId('rate').fill('19.95');
        await page.getByTestId('tax-rate').fill('8.25');
        await page.getByTestId('tax-rate').blur();
      });
      const expectAmount = async (id, value) => {
        const actual = await page.getByTestId(id).innerText();
        assert.ok(
          actual.replaceAll(',', '').includes(value),
          `${id}: expected ${value}, saw ${actual}`,
        );
      };
      await check('decimal subtotal', () => expectAmount('subtotal', '259.85'));
      await check('tax rounding', () => expectAmount('tax-total', '21.44'));
      await check('grand total', () => expectAmount('grand-total', '281.29'));
      await check('live recalculation', async () => {
        await rows.nth(0).getByTestId('quantity').fill('1');
        await rows.nth(0).getByTestId('quantity').blur();
        await expectAmount('grand-total', '151.39');
      });
      await check('CSV exports actual invoice', async () => {
        const downloadPromise = page.waitForEvent('download');
        await page.getByTestId('export-csv').click();
        const download = await downloadPromise;
        const stream = await download.createReadStream();
        let csv = '';
        for await (const chunk of stream) csv += chunk;
        assert.match(csv, /Identity design/);
        assert.match(csv, /Print preparation/);
        assert.match(csv, /151\.39/);
      });
      await check('edits survive reload', async () => {
        await page.reload({ waitUntil: 'load' });
        assert.equal(await rows.count(), 2);
        assert.equal(await rows.nth(0).getByTestId('quantity').inputValue(), '1');
        await expectAmount('grand-total', '151.39');
      });
      await check('remove line recalculates totals', async () => {
        await rows.nth(1).getByTestId('remove-line').click();
        await rows.nth(1).waitFor({ state: 'detached' });
        assert.equal(await rows.count(), 1);
        await expectAmount('grand-total', '86.60');
      });
      await check('invalid numeric values do not corrupt totals', async () => {
        await rows.nth(0).getByTestId('quantity').fill('-2');
        await rows.nth(0).getByTestId('quantity').blur();
        const actual = await page.getByTestId('grand-total').innerText();
        assert.doesNotMatch(actual, /NaN|Infinity|-\s*\d/);
      });
    },
  },
  {
    id: 'articulated-lamp',
    brief: `Build an interactive 3D product configurator of a brass articulated desk lamp on a walnut desk. The actual subject must be a desk lamp with a weighted base, two separate arms, visibly articulated elbow, conical shade, bulb, joint hardware, realistic material contrast, and purposeful studio lighting. No spaceship, combat, flight HUD, stock game, or unrelated scene. Use the installed Three.js ES module at /vendor/three/build/three.module.js (local addons supported); no CDN. Model lamp proportions carefully. Add functional elbow-angle and dimmer sliders, front/side camera views, and reset. Materials must include a locally generated visible procedural wood grain texture on the desk. Use semantic labeled controls, responsive polished layout, and keyboard-operable form inputs. All controls must change the actual 3D scene.
Acceptance selectors (data-testid): elbow-angle (range), dimmer (range), view-front, view-side, reset. Expose window.__qualityScene = {scene, renderer, camera, joint, lampLight} referencing the ACTUAL Three.js objects used to render; joint is the movable elbow pivot and lampLight the bulb's light. This is an inspection hook, not fabricated telemetry. Deliver complete runnable HTML/CSS/JS.`,
    visualReview: [
      'Silhouette and proportions read as an articulated desk lamp',
      'Brass, wood, bulb and background have distinct convincing material response',
      'Joint changes are physically coherent and do not separate the arms',
      'Lighting and camera make details legible, controls remain usable on phone',
    ],
    async check(page, check) {
      await check('real WebGL rendering', async () => {
        await page.waitForFunction(
          () => window.__qualityScene?.renderer?.info?.render?.calls > 0,
          {},
          { timeout: 20000 },
        );
        assert.equal(await page.evaluate(() => !!window.__qualityScene.scene.isScene), true);
        assert.ok(await page.locator('canvas').first().isVisible());
      });
      await check('nontrivial subject geometry', async () => {
        const meshes = await page.evaluate(() => {
          let count = 0;
          window.__qualityScene.scene.traverse((o) => {
            if (o.isMesh) count++;
          });
          return count;
        });
        assert.ok(meshes >= 8, `Only ${meshes} mesh objects; inspect subject detail manually.`);
      });
      await check('real texture bound to rendered geometry', async () => {
        assert.equal(
          await page.evaluate(() => {
            let found = false;
            window.__qualityScene.scene.traverse((o) => {
              for (const m of [].concat(o.material || [])) {
                if (m.map?.isTexture && m.map.image?.width >= 64) found = true;
              }
            });
            return found;
          }),
          true,
        );
      });
      const pose = () =>
        page.evaluate(() => window.__qualityScene.joint.matrixWorld.elements.slice());
      await check('elbow slider changes actual articulation', async () => {
        const before = await pose();
        const slider = page.getByTestId('elbow-angle');
        await slider.focus();
        await slider.press('Home');
        await slider.press('ArrowRight');
        await page.waitForFunction(
          (old) =>
            JSON.stringify(window.__qualityScene.joint.matrixWorld.elements) !==
            JSON.stringify(old),
          before,
          { timeout: 5000 },
        );
      });
      await check('dimmer changes actual light intensity', async () => {
        const before = await page.evaluate(() => window.__qualityScene.lampLight.intensity);
        await page.getByTestId('dimmer').focus();
        await page.getByTestId('dimmer').press('Home');
        await page.waitForFunction(
          (old) => window.__qualityScene.lampLight.intensity !== old,
          before,
          { timeout: 5000 },
        );
      });
      await check('camera presets change actual camera', async () => {
        await page.getByTestId('view-front').click();
        const before = await page.evaluate(() => window.__qualityScene.camera.position.toArray());
        await page.getByTestId('view-side').click();
        await page.waitForFunction(
          (old) =>
            JSON.stringify(window.__qualityScene.camera.position.toArray()) !== JSON.stringify(old),
          before,
          { timeout: 5000 },
        );
      });
      await check('reset restores elbow', async () => {
        await page.getByTestId('reset').click();
        const before = await pose();
        await page.getByTestId('elbow-angle').focus();
        await page.getByTestId('elbow-angle').press('End');
        await page.waitForFunction(
          (old) =>
            JSON.stringify(window.__qualityScene.joint.matrixWorld.elements) !==
            JSON.stringify(old),
          before,
          { timeout: 5000 },
        );
        await page.getByTestId('reset').click();
        await page.waitForFunction(
          (old) =>
            JSON.stringify(window.__qualityScene.joint.matrixWorld.elements) ===
            JSON.stringify(old),
          before,
          { timeout: 5000 },
        );
      });
    },
  },
];
