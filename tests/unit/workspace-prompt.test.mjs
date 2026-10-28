import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkspacePrompt,
  completedToolArgumentsForContext,
  compactFileObservations,
  compactCompletedSources,
  inferWithSourcePaging,
  PROJECT_SOURCE_CONTEXT_CHARS,
} from '../../server/services/workspacePrompt.js';
import { sourceInterface } from '../../server/services/sourceInterface.js';

test('multi-module project observations coexist until actual provider capacity recovery is needed', () => {
  const messages = [];
  const bodies = [];
  for (let index = 0; index < 5; index++) {
    const body = JSON.stringify({
      content: `export function dependency${index}() {}\n` + '/* observed source */\n'.repeat(700),
    });
    bodies.push(body);
    messages.push(
      {
        role: 'assistant',
        tool_calls: [
          { function: { arguments: JSON.stringify({ filepath: `city/module-${index}.js` }) } },
        ],
      },
      { role: 'tool', name: 'read_file', content: body },
    );
  }
  compactFileObservations(messages, PROJECT_SOURCE_CONTEXT_CHARS);
  assert.deepEqual(
    messages.filter((m) => m.role === 'tool').map((m) => m.content),
    bodies,
  );
  compactFileObservations(messages, PROJECT_SOURCE_CONTEXT_CHARS, 'city/module-2.js');
  assert.match(messages[5].content, /stale/);
  assert.equal(messages[1].content, bodies[0]);
  assert.equal(messages[9].content, bodies[4]);
});

test('the newest bounded source stays in working context until superseded; failed writes remain recoverable', () => {
  const args = { filepath: 'city/build.mjs', content: 'source-body\n'.repeat(250) };
  const fresh = completedToolArgumentsForContext(
    'write_file',
    args,
    { success: true },
    { retainSource: true },
  );
  assert.equal(fresh.content, args.content);
  const call = (id) => ({
    role: 'assistant',
    tool_calls: [{ id, function: { name: 'write_file', arguments: JSON.stringify(args) } }],
  });
  const old = call('saved');
  const failed = call('failed');
  compactCompletedSources([
    old,
    { role: 'tool', tool_call_id: 'saved', content: '{"success":true}' },
    failed,
    { role: 'tool', tool_call_id: 'failed', content: '{"error":"Disk full"}' },
  ]);
  assert.equal(JSON.parse(old.tool_calls[0].function.arguments).content, undefined);
  assert.equal(JSON.parse(failed.tool_calls[0].function.arguments).content, args.content);
});

test('completed source retains parsed APIs without retaining bodies or treating comments as exports', () => {
  const source = `// export function invented() {}
import { Scene } from 'three';
export function createCity(scene, { seed = 42 } = {}) { return new Scene(); }
export class Builder { constructor(materials) { this.materials = materials; } addBox(size, position) { return 'body'; } }
export const heightAt = (x, z) => x + z;
export const SPAWN = { x: -2, z: 14, yaw: 0 };
export function materialLibrary() { return { lib, litKeys, textures }; }
export { heightAt as groundHeight };
`;
  const api = sourceInterface(source);
  assert.match(api.excerpts, /createCity\(scene, \{ seed = 42 \} = \{\}\)/);
  assert.match(api.excerpts, /constructor\(materials\)/);
  assert.match(api.excerpts, /addBox\(size, position\)/);
  assert.match(api.excerpts, /heightAt = \(x, z\) =>/);
  assert.match(api.excerpts, /groundHeight/);
  assert.match(api.excerpts, /declared object keys: x, z, yaw/);
  assert.match(api.excerpts, /observed object return keys: lib, litKeys, textures/);
  assert.doesNotMatch(api.excerpts, /invented|return new Scene|this.materials|x \+ z/);
  assert.equal(sourceInterface('export function broken('), null);
  const args = { filepath: 'project/core.js', content: source.repeat(12) };
  // Use a valid single module of sufficient length for completed-call paging.
  args.content = source + '\n/*' + 'padding'.repeat(400) + '*/';
  const compact = completedToolArgumentsForContext('write_file', args, { success: true });
  assert.match(compact.completedSource.interface.excerpts, /createCity/);
  assert.equal(compact.content, undefined);
});

test('a source write invalidates only that file and retains unrelated observations', () => {
  const call = (filepath) => ({
    role: 'assistant',
    tool_calls: [{ function: { arguments: JSON.stringify({ filepath }) } }],
  });
  const changed = { role: 'tool', name: 'read_file', content: 'old implementation' };
  const dependency = {
    role: 'tool',
    name: 'read_file',
    content: 'valid dependency source\n'.repeat(100),
  };
  const messages = [call('project/a.js'), changed, call('project/b.js'), dependency];
  compactFileObservations(messages, 6000, 'project\\a.js');
  assert.match(changed.content, /stale/);
  assert.equal(dependency.content, 'valid dependency source\n'.repeat(100));
});

test('input-capacity recovery pages source once while retaining requirements and failed checks', async () => {
  const messages = [
    { role: 'user', content: 'Repair the roof, preserve the mezzanine and verify all controls.' },
    {
      role: 'assistant',
      tool_calls: [
        {
          function: {
            arguments: JSON.stringify({ filepath: 'models.js', start_line: 50, end_line: 150 }),
          },
        },
      ],
    },
    {
      role: 'tool',
      name: 'read_file',
      content: 'const actualGeometry = new THREE.BoxGeometry();\n'.repeat(150),
    },
    {
      role: 'tool',
      name: 'verify_workspace_code_task',
      content: 'Failed: buildingGroup is not defined',
    },
  ];
  let calls = 0;
  const result = await inferWithSourcePaging(messages, async () => {
    if (++calls === 1)
      throw new Error('Input tokens quota (ITPM) exceeded: requested 7328, limit 7000');
    assert.match(messages[0].content, /preserve the mezzanine/);
    assert.match(messages[2].content, /models.js/);
    assert.match(messages[2].content, /sourceSha256/);
    assert.match(messages[3].content, /buildingGroup is not defined/);
    return { content: 'Continue the repair.' };
  });
  assert.equal(calls, 2);
  assert.equal(result.content, 'Continue the repair.');
  const listing = [
    {
      role: 'tool',
      name: 'list_files',
      content: JSON.stringify({
        files: Array.from({ length: 80 }, (_, i) => ({
          name: `actual-capture-${i}.png`,
          size: 10000 + i,
        })),
      }),
    },
  ];
  let listed = 0;
  await inferWithSourcePaging(listing, async () => {
    if (++listed === 1) throw new Error('ITPM input tokens limit exceeded');
    assert.match(listing[0].content, /paged out/);
  });
  assert.equal(listed, 2);
  for (const message of [
    'Output tokens quota exceeded',
    'Network unavailable',
    'Input tokens quota exceeded',
  ]) {
    let attempts = 0;
    await assert.rejects(
      inferWithSourcePaging([], async () => {
        attempts++;
        throw new Error(message);
      }),
      new RegExp(message),
    );
    assert.equal(attempts, 1);
  }
  let attempts = 0;
  await assert.rejects(
    inferWithSourcePaging(
      [{ role: 'tool', name: 'read_file', content: 'source'.repeat(500) }],
      async () => {
        attempts++;
        throw new Error('Input tokens quota exceeded');
      },
    ),
    /Input tokens/,
  );
  assert.equal(attempts, 2, 'recovery is bounded to one retry');
});
test('focused runtime prompt preserves complete supplied requirements and cited evidence', () => {
  const reference =
    'reference-start\n' +
    'observed geometry and material detail\n'.repeat(250) +
    'reference-END-49';
  const prompt = buildWorkspacePrompt({
    persona: 'Supergence',
    access: 'Terminal disabled.',
    conversation: 'User requires export and accessible controls.',
    creation: 'Build and test.',
    references: reference,
    userMemory: 'Use metric dimensions.',
    evolution: 'Approved rule: preserve exports.',
  });
  assert.ok(prompt.includes(reference));
  assert.match(prompt, /Terminal disabled/);
  assert.match(prompt, /User requires export/);
  assert.match(prompt, /preserve exports/);
  assert.doesNotMatch(prompt, /cdnjs|MANDATORY 3D|ZERO BROKEN/);
});
test('source paging preserves the request, newest source and failed-check evidence', () => {
  const request = {
    role: 'user',
    content: 'Preserve CSV export, microphone input and complete original brief.',
  };
  const failedCheck = {
    role: 'tool',
    name: 'verify_workspace_code_task',
    content: 'Reset failed: lowerPivot is undefined',
  };
  const old = { role: 'tool', name: 'read_file', content: 'earlier source\n'.repeat(250) };
  const recent = { role: 'tool', name: 'read_file', content: 'needed edit region\n'.repeat(250) };
  const messages = [request, old, failedCheck, recent];
  compactFileObservations(messages);
  assert.equal(messages[0], request);
  assert.equal(failedCheck.content, 'Reset failed: lowerPivot is undefined');
  assert.equal(recent.content, 'needed edit region\n'.repeat(250));
  assert.match(old.content, /paged out/);
  assert.match(old.content, /sourceSha256/);
});
test('completed file source is referenced by digest while failed writes retain recoverable arguments', () => {
  const args = { filepath: 'project/index.html', content: 'articulated-lamp-code'.repeat(200) };
  const compact = completedToolArgumentsForContext('write_file', args, { success: true });
  assert.equal(compact.filepath, args.filepath);
  assert.equal(
    compact.content,
    undefined,
    'A historical content marker must not look like a new write argument.',
  );
  assert.match(compact.completedSource.sha256, /^[a-f0-9]{64}$/);
  assert.match(compact.completedSource.note, /not file content/);
  assert.equal(
    completedToolArgumentsForContext('write_file', args, { error: 'Disk write failed' }),
    args,
  );
  assert.equal(args.content, 'articulated-lamp-code'.repeat(200));
});

test('task documents survive source paging and duplicate reads retain one complete copy', () => {
  const brief = 'Complete requirements, native export, streets and 400 actual buildings.\n'.repeat(
    100,
  );
  const call = {
    role: 'assistant',
    tool_calls: [
      { function: { arguments: JSON.stringify({ filepath: 'project/assignment.md' }) } },
    ],
  };
  const messages = [
    call,
    { role: 'tool', name: 'read_file', content: brief },
    call,
    { role: 'tool', name: 'read_file', content: brief },
    { role: 'tool', name: 'read_file', content: 'large source\n'.repeat(600) },
  ];
  compactFileObservations(messages, 0);
  assert.equal(messages[3].content, brief);
  assert.match(messages[1].content, /already retained in full/);
  assert.match(messages[4].content, /paged out/);
});
