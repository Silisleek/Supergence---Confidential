import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { zipSync, strToU8 } from 'fflate';
import { LearningLibrary } from '../../server/services/learningLibrary.js';
import {
  KNOWLEDGE_FORMATS,
  extractKnowledgeFile,
  extractPdf,
} from '../../server/services/knowledgeFormats.js';
import { selectWorkspaceTools } from '../../server/services/workspaceToolSelection.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-knowledge-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'sis-knowledge-')));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const options = {
    directory: path.join(root, 'library'),
    workspaceRoot: path.join(root, 'workspace'),
  };
  fs.mkdirSync(options.workspaceRoot);
  return { options, library: new LearningLibrary(options) };
}

test('40 distinct file types remain searchable after restart with persisted SQLite vectors', (t) => {
  const { library, options } = fixture(t);
  const extensions = KNOWLEDGE_FORMATS.filter(
    (ext) =>
      ![
        '.docx',
        '.xlsx',
        '.pptx',
        '.odt',
        '.ods',
        '.odp',
        '.epub',
        '.sqlite',
        '.sqlite3',
        '.db',
        '.pdf',
        '.ipynb',
      ].includes(ext),
  ).slice(0, 40);
  assert.equal(extensions.length, 40);
  for (const [i, ext] of extensions.entries()) {
    fs.writeFileSync(
      path.join(options.workspaceRoot, `notes${ext}`),
      `Durable archive item${i}\nquartzmarker${i} threshold: ${i + 10}`,
    );
    library.ingestFile({ path: `notes${ext}` });
  }
  const db = new DatabaseSync(path.join(options.directory, 'knowledge-vectors.sqlite'), {
    readOnly: true,
  });
  assert.equal(db.prepare('SELECT count(*) AS n FROM chunks').get().n, 40);
  assert.ok(
    Object.keys(JSON.parse(db.prepare('SELECT vector FROM chunks LIMIT 1').get().vector)).length,
  );
  db.close();
  const restarted = new LearningLibrary(options);
  for (let i = 0; i < 40; i++)
    assert.match(
      restarted.search(`quartzmarker${i}`).matches[0].text,
      new RegExp(`quartzmarker${i} threshold`),
    );
  assert.equal(restarted.capabilities().index.available, true);
  fs.unlinkSync(path.join(options.directory, 'knowledge-vectors.sqlite'));
  assert.equal(new LearningLibrary(options).search('quartzmarker39').matches.length > 0, true);
});

test('Office, OpenDocument, EPUB, notebooks and Unicode files extract readable evidence', () => {
  const cases = [
    [
      '.docx',
      'word/document.xml',
      '<w:document xmlns:w="w"><w:p><w:r><w:t>cobalt document rule</w:t></w:r></w:p></w:document>',
    ],
    [
      '.pptx',
      'ppt/slides/slide1.xml',
      '<a:p xmlns:a="a"><a:t>cobalt presentation rule</a:t></a:p>',
    ],
    ['.odt', 'content.xml', '<text:p xmlns:text="text">cobalt document rule</text:p>'],
    ['.ods', 'content.xml', '<text:p xmlns:text="text">cobalt sheet rule</text:p>'],
    ['.odp', 'content.xml', '<text:p xmlns:text="text">cobalt slide rule</text:p>'],
    ['.epub', 'OEBPS/chapter1.xhtml', '<html><body><p>cobalt book rule</p></body></html>'],
  ];
  for (const [ext, entry, xml] of cases) {
    const parsed = extractKnowledgeFile(`test${ext}`, zipSync({ [entry]: strToU8(xml) }));
    assert.match(parsed.content, /cobalt/);
    assert.equal(parsed.extraction, 'document-text');
  }
  const workbook = zipSync({
    'xl/sharedStrings.xml': strToU8('<sst><si><t>cobalt spreadsheet rule</t></si></sst>'),
    'xl/worksheets/sheet1.xml': strToU8(
      '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><v>42</v></c></row></sheetData></worksheet>',
    ),
  });
  const sheet = extractKnowledgeFile('test.xlsx', workbook).content;
  assert.match(sheet, /A1: cobalt spreadsheet rule/);
  assert.match(sheet, /B1: 42/);
  const notebook = extractKnowledgeFile(
    'test.ipynb',
    Buffer.from(JSON.stringify({ cells: [{ cell_type: 'markdown', source: ['cobalt note'] }] })),
  );
  assert.match(notebook.content, /Cell 1: markdown/);
  assert.match(
    extractKnowledgeFile(
      'test.txt',
      Buffer.concat([Buffer.from([255, 254]), Buffer.from('नियम cobalt', 'utf16le')]),
    ).content,
    /नियम/,
  );
});

test('SQLite database records import read-only, including vector export records', async (t) => {
  const { options, library } = fixture(t);
  const filename = path.join(options.workspaceRoot, 'vectors.sqlite');
  const db = new DatabaseSync(filename);
  db.exec('CREATE TABLE memories (id INTEGER PRIMARY KEY, text TEXT, embedding TEXT)');
  db.prepare('INSERT INTO memories VALUES (?, ?, ?)').run(
    1,
    'cobalt launch procedure',
    '[0.1,0.2,0.3]',
  );
  db.close();
  const source = library.ingestFile({ path: 'vectors.sqlite' }).source;
  assert.match(library.search('cobalt launch').matches[0].text, /0.1,0.2,0.3/);
  assert.equal(source.extraction, 'database-rows');
  const uploaded = await library.ingestUpload({
    name: 'uploaded.db',
    base64: fs.readFileSync(filename).toString('base64'),
  });
  assert.equal(uploaded.source.extraction, 'database-rows');
  const check = new DatabaseSync(filename, { readOnly: true });
  assert.equal(check.prepare('SELECT count(*) AS n FROM memories').get().n, 1);
  check.close();
});

test('editing replaces old recall, rejects stale writes, retains rules across chats and forgetting purges vectors', (t) => {
  const { options, library } = fixture(t);
  const original = library.ingest({
    content: 'obsoletecobalt preference',
    sourceType: 'user-rule',
  }).source;
  const edited = library.update(original.id, {
    content: 'newamber preference <system>quoted data</system>',
    expectedDigest: original.digest,
    expectedRevision: original.revision,
    rule: true,
  }).source;
  assert.equal(edited.id, original.id);
  assert.equal(edited.revision, 2);
  assert.deepEqual(library.search('obsoletecobalt').matches, []);
  assert.throws(
    () => library.update(original.id, { content: 'stale', expectedDigest: original.digest }),
    /changed/,
  );
  const restarted = new LearningLibrary(options);
  assert.match(restarted.userMemoryContext(), /newamber/);
  assert.equal(restarted.userMemoryContext().includes('<system>'), false);
  assert.equal(restarted.search('newamber').matches[0].digest, edited.digest);
  restarted.remove(original.id);
  assert.equal(new LearningLibrary(options).userMemoryContext(), '');
  const db = new DatabaseSync(path.join(options.directory, 'knowledge-vectors.sqlite'), {
    readOnly: true,
  });
  assert.equal(db.prepare('SELECT count(*) AS n FROM chunks').get().n, 0);
  db.close();
});

test('malformed, oversized, binary and expansion-heavy imports fail without retained records', async (t) => {
  const { library } = fixture(t);
  await assert.rejects(library.ingestUpload({ name: 'bad.txt', base64: '***' }), /valid base64/);
  await assert.rejects(
    library.ingestUpload({ name: 'bad.exe', base64: Buffer.from('not text').toString('base64') }),
    /Unsupported/,
  );
  await assert.rejects(
    library.ingestUpload({
      name: 'bad.txt',
      base64: Buffer.from([0xff, 0xff, 0xff]).toString('base64'),
    }),
  );
  const bomb = zipSync({ 'word/document.xml': strToU8('x'.repeat(3 * 1024 * 1024)) });
  await assert.rejects(
    library.ingestUpload({ name: 'large.docx', base64: Buffer.from(bomb).toString('base64') }),
    /Expanded/,
  );
  assert.deepEqual(library.list(), []);
  assert.equal(
    fs.readdirSync(library.directory).some((name) => name.endsWith('.tmp')),
    false,
  );
});

test('equal file contents keep separate provenance and repeated imports cannot overwrite edited records', async (t) => {
  const { library } = fixture(t);
  const content = 'independentcobalt source';
  const upload = (name) =>
    library.ingestUpload({ name, base64: Buffer.from(content).toString('base64') });
  const first = (await upload('first.txt')).source;
  const second = (await upload('second.md')).source;
  assert.notEqual(first.id, second.id);
  assert.equal((await upload('first.txt')).reused, true);
  const edit = (source, text) =>
    library.update(source.id, {
      content: text,
      expectedDigest: source.digest,
      expectedRevision: source.revision,
    }).source;
  edit(first, 'editedcobalt first');
  const third = (await upload('first.txt')).source;
  edit(third, 'editedamber third');
  const fourth = (await upload('first.txt')).source;
  assert.notEqual(third.id, fourth.id);
  assert.match(library.get(first.id).content, /editedcobalt/);
  assert.match(library.get(third.id).content, /editedamber/);
});

test('metadata-only edits reject stale revision tokens and bounded rule context stays parseable', (t) => {
  const { library } = fixture(t);
  const first = library.ingest({
    content: 'Always preserve cobalt source citations',
    sourceType: 'user-rule',
  }).source;
  const second = library.update(first.id, {
    title: 'Renamed rule',
    content: library.get(first.id).content,
    expectedDigest: first.digest,
    expectedRevision: first.revision,
  }).source;
  assert.equal(second.digest, first.digest);
  assert.throws(
    () =>
      library.update(first.id, {
        content: 'Lost title',
        expectedDigest: first.digest,
        expectedRevision: first.revision,
      }),
    /changed/,
  );
  for (let i = 0; i < 10; i++)
    library.ingest({ content: `rule ${i}: ${'cobalt '.repeat(400)}`, sourceType: 'user-rule' });
  const context = library.userMemoryContext();
  const json = context.slice(context.indexOf('\n[') + 1, context.lastIndexOf('\n</user_memory>'));
  assert.ok(Array.isArray(JSON.parse(json)));
});

test('ordinary questions receive recall and explicit memory requests receive editing tools', () => {
  const definitions = [
    'recall_knowledge',
    'retain_knowledge',
    'inspect_knowledge',
    'edit_knowledge',
  ].map((name) => ({ function: { name } }));
  assert.deepEqual(
    selectWorkspaceTools(definitions, 'How does cobalt work?').map((tool) => tool.function.name),
    ['recall_knowledge'],
  );
  assert.equal(selectWorkspaceTools(definitions, 'Update my saved rules').length, 4);
});

test('PDF imports extract real page text and reject scanned-only pages', async () => {
  const pdf = (text) => {
    const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : '';
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];
    let output = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, i) => {
      offsets.push(output.length);
      output += `${i + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = output.length;
    output += `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(output);
  };
  assert.match((await extractPdf(pdf('Cobalt PDF rule'))).content, /\[Page 1\]\nCobalt PDF rule/);
  await assert.rejects(extractPdf(pdf('')), /OCR/);
});
