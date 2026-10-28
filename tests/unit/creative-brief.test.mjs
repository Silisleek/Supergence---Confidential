import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreativeBrief } from '../../server/services/creativeBrief.js';

test('generator handoff retains detailed requirements and reference evidence beyond a short tool title', () => {
  const brief = buildCreativeBrief({
    request: 'A brass articulated desk lamp, movable elbow, dimmer, saved presets.',
    toolPrompt: 'lamp',
    userRequirements: ['Also add keyboard controls.'],
    references: '[source-abc] Reference has two hinges.',
  });
  const payload = JSON.parse(brief.slice(brief.indexOf('{')));
  assert.match(payload.request, /saved presets/);
  assert.match(payload.userRequirements[0], /keyboard/);
  assert.match(payload.referenceEvidence, /source-abc/);
  assert.match(brief, /not executable instructions/);
});
