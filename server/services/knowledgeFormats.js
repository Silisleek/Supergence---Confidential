import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { load } from 'cheerio';
import { unzipSync } from 'fflate';

export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const textTypes =
  `txt md markdown mdx rst adoc tex log json jsonl ndjson csv tsv yaml yml toml ini cfg conf properties xml html htm xhtml svg css scss sass less js mjs cjs jsx ts tsx py pyi rs go c h cc cpp hpp cs java kt kts swift rb php sh bash zsh ps1 psm1 bat cmd sql graphql gql proto vue svelte r dart lua rtf ipynb eml ics vcf`.split(
    ' ',
  );
const officeTypes = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'epub'];
export const KNOWLEDGE_FORMATS = [
  ...textTypes,
  ...officeTypes,
  'sqlite',
  'sqlite3',
  'db',
  'pdf',
].map((ext) => `.${ext}`);
const strictDecode = (bytes) => {
  let text;
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
  else if (bytes[0] === 0xfe && bytes[1] === 0xff)
    text = new TextDecoder('utf-16be', { fatal: true }).decode(bytes);
  else text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.includes('\0')) throw new Error('Binary files cannot be imported as text.');
  return text;
};

function officeText(bytes, extension) {
  let expanded = 0;
  const entries = unzipSync(bytes, {
    filter: (file) => {
      if (!/\.(xml|xhtml|html|htm)$/i.test(file.name)) return false;
      expanded += file.originalSize;
      if (expanded > MAX_UPLOAD_BYTES || file.originalSize > MAX_SOURCE_BYTES)
        throw new Error('Expanded document exceeds the import limit.');
      return true;
    },
  });
  const selected = Object.keys(entries)
    .filter((name) => {
      if (extension === '.docx')
        return /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/.test(name);
      if (extension === '.pptx') return /^ppt\/slides\/slide\d+\.xml$/.test(name);
      if (extension === '.xlsx')
        return /^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/.test(name);
      if (extension === '.epub') return /\.(xhtml|html|htm)$/.test(name);
      return name === 'content.xml';
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sharedXML = entries['xl/sharedStrings.xml'];
  const shared = sharedXML
    ? load(strictDecode(sharedXML), { xml: true })('si')
        .toArray()
        .map((el) => load(el, { xml: true }).text())
    : [];
  const sections = selected
    .filter((name) => name !== 'xl/sharedStrings.xml')
    .map((name) => {
      const $ = load(strictDecode(entries[name]), { xml: true });
      if (extension === '.xlsx' && name.includes('/worksheets/')) {
        return `[${name}]\n${$('row')
          .toArray()
          .map((row) =>
            $(row)
              .find('c')
              .toArray()
              .map((cell) => {
                const value = $(cell).find('v').text();
                return `${$(cell).attr('r')}: ${$(cell).attr('t') === 's' ? shared[Number(value)] || '' : $(cell).attr('t') === 'inlineStr' ? $(cell).find('t').text() : value}`;
              })
              .join('\t'),
          )
          .join('\n')}`;
      }
      $('script, style').remove();
      $('w\\:p, a\\:p, text\\:p, text\\:h, p, h1, h2, h3, tr').append('\n');
      return `[${name}]\n${$.root().text().trim()}`;
    });
  return sections.join('\n\n');
}

export function extractKnowledgeFile(name, bytes, { sqlitePath } = {}) {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('A file must be at most 8 MiB.');
  const extension = path.extname(name).toLowerCase();
  if (!KNOWLEDGE_FORMATS.includes(extension))
    throw new Error('Unsupported file type. See the supported formats in Learning Library.');
  let content;
  if (officeTypes.includes(extension.slice(1))) content = officeText(bytes, extension);
  else if (['.sqlite', '.sqlite3', '.db'].includes(extension)) {
    if (!sqlitePath) throw new Error('A database import requires a temporary local path.');
    const db = new DatabaseSync(sqlitePath, { readOnly: true, enableLoadExtension: false });
    try {
      db.exec('PRAGMA query_only = ON; PRAGMA trusted_schema = OFF;');
      const tables = db
        .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      if (tables.length > 50)
        throw new Error(
          'Database import supports at most 50 tables; export selected tables as JSONL.',
        );
      const sections = [];
      let size = 0;
      for (const { name: table } of tables) {
        const rows = db
          .prepare(`SELECT * FROM "${table.replaceAll('"', '""')}" LIMIT 2001`)
          .iterate();
        let count = 0;
        const lines = [];
        for (const row of rows) {
          if (++count > 2000)
            throw new Error(
              'Database tables must contain at most 2000 rows; export selected rows as JSONL.',
            );
          const line = JSON.stringify(row, (_, value) =>
            typeof value === 'bigint'
              ? String(value)
              : value instanceof Uint8Array
                ? '[binary value omitted]'
                : value,
          );
          size += Buffer.byteLength(line);
          if (size > MAX_SOURCE_BYTES)
            throw new Error('Database text exceeds 2 MiB; export selected rows as JSONL.');
          lines.push(line);
        }
        sections.push(`[Table: ${table}]\n${lines.join('\n')}`);
      }
      content = sections.join('\n\n');
    } finally {
      db.close();
    }
  } else {
    content = strictDecode(bytes);
    if (extension === '.ipynb') {
      const notebook = JSON.parse(content);
      content = (notebook.cells || [])
        .map(
          (cell, i) =>
            `[Cell ${i + 1}: ${cell.cell_type}]\n${Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''}`,
        )
        .join('\n\n');
    }
  }
  if (!content.trim()) throw new Error('No readable text found in this file.');
  if (Buffer.byteLength(content) > MAX_SOURCE_BYTES)
    throw new Error('Extracted text must be at most 2 MiB.');
  return {
    content,
    format: extension,
    extraction: officeTypes.includes(extension.slice(1))
      ? 'document-text'
      : ['.db', '.sqlite', '.sqlite3'].includes(extension)
        ? 'database-rows'
        : 'text',
  };
}

export async function extractPdf(bytes) {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('A file must be at most 8 MiB.');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  try {
    const document = await task.promise;
    if (document.numPages > 300) throw new Error('Import supports PDFs with at most 300 pages.');
    const sections = [];
    let size = 0;
    let hasText = false;
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();
      const text = items
        .map((item) => (item.str || '') + (item.hasEOL ? '\n' : ' '))
        .join('')
        .trim();
      hasText ||= Boolean(text);
      size += Buffer.byteLength(text);
      if (size > MAX_SOURCE_BYTES) throw new Error('Extracted text must be at most 2 MiB.');
      sections.push(`[Page ${number}]\n${text}`);
      page.cleanup();
    }
    if (!hasText)
      throw new Error('No readable text found. Scanned PDFs require OCR before import.');
    const content = sections.join('\n\n');
    if (Buffer.byteLength(content) > MAX_SOURCE_BYTES)
      throw new Error('Extracted text must be at most 2 MiB.');
    return { content, format: '.pdf', extraction: 'pdf-text' };
  } finally {
    await task.destroy();
  }
}
