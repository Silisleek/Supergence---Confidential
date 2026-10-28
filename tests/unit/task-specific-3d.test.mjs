import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildTaskGenerationPrompt,
  inspectGeneratedGame,
  synthesizeTaskDocument,
} from '../../server/3d/split-game-generator.js';

const html =
  '<!DOCTYPE html><html><body><script type="module">const subject = "coral reef";</script></body></html>';
const options = {
  prompt: 'Create a coral reef with translucent anemones and swimming fish.',
  plan: { title: 'Reef', environmentTheme: 'shallow water', mechanics: ['orbit'] },
  referenceRequirements: 'Reference shows branching coral, warm sand and rippled blue caustics.',
};

test('scene synthesis carries the original brief and reference detail into actual code generation', async () => {
  const calls = [];
  const output = await synthesizeTaskDocument(options, async (...args) => {
    calls.push(args);
    return html;
  });
  assert.equal(output, html);
  assert.equal(calls.length, 1);
  assert.ok(calls[0][1].includes(options.prompt));
  assert.ok(calls[0][1].includes(options.referenceRequirements));
  assert.ok(calls[0][1].includes('shallow water'));
  assert.match(buildTaskGenerationPrompt(options), /normal\/bump and roughness/);
  assert.match(buildTaskGenerationPrompt(options), /\/vendor\/three\/build\/three\.module\.js/);
  assert.match(buildTaskGenerationPrompt(options), /\/vendor\/three\/examples\/jsm\//);
  assert.doesNotMatch(buildTaskGenerationPrompt(options), /https:\/\/cdn|three@0\.166/);
});

test('syntax repair is bounded and never substitutes a stock scene on failure', async () => {
  let calls = 0;
  await assert.rejects(
    synthesizeTaskDocument(options, async () => {
      calls++;
      return '<html>truncated';
    }),
    /Task-specific generation failed syntax checks/,
  );
  assert.equal(calls, 2);
});

test('document validation skips import maps but rejects broken executable scripts', () => {
  assert.equal(
    inspectGeneratedGame(
      html.replace('<body>', '<body><script type="importmap">{"imports":{}}</script>'),
    ).valid,
    true,
  );
  assert.equal(
    inspectGeneratedGame(html.replace('const subject = "coral reef";', 'const subject = ;')).valid,
    false,
  );
  assert.equal(inspectGeneratedGame('<!DOCTYPE html><html></html>').valid, false);
});
