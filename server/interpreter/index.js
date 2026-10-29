// SIS 1.0 — Universal Data Interpreter & Transmuter (Media + Data Transmutation)
// Pillar 9: Universal conversion and transmutation between any data representations

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import shortTermMemory from '../memory/short-term.js';
import { resolveWithinRoot } from '../utils/path-confinement.js';
import { randomUUID } from 'node:crypto';

// ─── PART A: Media Processing (Original) ───

/**
 * Create visual effects and a ZIP bundle without implying measured temperature or depth.
 */
export async function processImage(imagePath) {
  const filename = path.basename(imagePath);
  const parent = path.dirname(path.resolve(imagePath));
  let temporaryZip;

  try {
    const input = resolveWithinRoot(parent, filename);
    const outputDir = resolveWithinRoot(parent, `${filename}_analysis`);
    fs.mkdirSync(outputDir, { recursive: true });
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(input).metadata();

    const warmTintPath = resolveWithinRoot(outputDir, 'warm-tint.png');
    await sharp(input)
      .greyscale()
      .modulate({ brightness: 1.2 })
      .tint({ r: 255, g: 100, b: 0 })
      .toFile(warmTintPath);

    const invertedBlurPath = resolveWithinRoot(outputDir, 'inverted-blur.png');
    await sharp(input).greyscale().blur(3).negate().normalize().toFile(invertedBlurPath);

    // 3. Copy original
    const originalPath = resolveWithinRoot(outputDir, 'original.png');
    await sharp(input).png().toFile(originalPath);

    // 4. Package into .zip bundle per foundation prompt specification
    const zipPath = resolveWithinRoot(outputDir, `${path.parse(filename).name}_bundle.zip`);
    temporaryZip = resolveWithinRoot(outputDir, `.bundle-${randomUUID()}.tmp`);
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(temporaryZip, { flags: 'wx' });
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', reject);
      archive.pipe(output);
      archive.file(warmTintPath, { name: 'warm_tint.png' });
      archive.file(invertedBlurPath, { name: 'inverted_blur.png' });
      archive.file(originalPath, { name: 'original.png' });
      archive.finalize();
    });
    resolveWithinRoot(outputDir, path.basename(zipPath));
    fs.renameSync(temporaryZip, zipPath);

    const analysis = {
      filename,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      warmTintPath,
      invertedBlurPath,
      originalPath,
      zipPath,
      analysisDir: outputDir,
      limitation:
        'The warm tint and inverted blur are visual effects; neither measures temperature or depth.',
    };

    shortTermMemory.store(
      ['interpreter', 'images'],
      {
        content: JSON.stringify(analysis),
        type: 'image-analysis',
        tags: ['image', 'interpreter', filename],
        metadata: analysis,
      },
      'interpreter',
    );

    return analysis;
  } catch (e) {
    console.error('[Interpreter] Image processing error:', e.message);
    const analysis = { filename, error: e.message, path: imagePath };
    shortTermMemory.store(
      ['interpreter', 'images'],
      {
        content: `Image: ${filename} (processing failed: ${e.message})`,
        type: 'image-reference',
        tags: ['image', filename],
      },
      'interpreter',
    );
    return analysis;
  } finally {
    try {
      if (temporaryZip && fs.existsSync(temporaryZip)) fs.unlinkSync(temporaryZip);
    } catch (_) {}
  }
}

/**
 * Process a video file — extract key frames and generate descriptions
 */
export async function processVideo(videoPath) {
  const filename = path.basename(videoPath);
  const analysis = {
    filename,
    path: videoPath,
    type: 'video',
    description: `Video file: ${filename}. Frame-by-frame analysis requires FFmpeg. Storing reference for AI parts.`,
    frames: [],
    timeline: [],
  };

  shortTermMemory.store(
    ['interpreter', 'videos'],
    {
      content: JSON.stringify(analysis),
      type: 'video-analysis',
      tags: ['video', 'interpreter', filename],
      metadata: analysis,
    },
    'interpreter',
  );

  return analysis;
}

/**
 * Auto-detect and process media files
 */
export async function processMedia(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'];
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];

  if (imageExts.includes(ext)) return processImage(filePath);
  if (videoExts.includes(ext)) return processVideo(filePath);

  return { error: `Unsupported media type: ${ext}` };
}

// ─── PART B: Universal Data Transmuter ───

/**
 * Universal Data Transmutation Engine
 * Converts data bidirectionally between JSON, YAML, CSV, TSV, XML, SQL, Markdown, TypeScript, Python, Mermaid, KaTeX
 */
export class DataTransmuter {
  /**
   * Main transmutation entrypoint
   */
  transmute(input, options = {}) {
    const fromFormat = (options.from || this.detectFormat(input)).toLowerCase();
    const toFormat = (options.to || 'json').toLowerCase();
    const tableName = options.tableName || 'data_records';

    // Step 1: Parse input into normalized JavaScript data structure
    const parsedData = this.parse(input, fromFormat);

    // Step 2: Render normalized structure into destination format
    const output = this.render(parsedData, toFormat, { tableName, ...options });

    return {
      success: true,
      from: fromFormat,
      to: toFormat,
      itemCount: Array.isArray(parsedData) ? parsedData.length : 1,
      output,
    };
  }

  detectFormat(input) {
    if (typeof input !== 'string') return 'object';
    const trimmed = input.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      return 'json';
    }
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return 'xml';
    }
    if (trimmed.includes('|') && trimmed.includes('\n') && /\|\s*---+\s*\|/.test(trimmed)) {
      return 'markdown-table';
    }
    if (trimmed.includes(',') && trimmed.includes('\n')) {
      return 'csv';
    }
    if (trimmed.includes('\t') && trimmed.includes('\n')) {
      return 'tsv';
    }
    if (/^[a-zA-Z0-9_\-]+:\s*.+/m.test(trimmed)) {
      return 'yaml';
    }
    return 'raw';
  }

  parse(input, format) {
    if (typeof input !== 'string') return input;
    const clean = input.trim();

    switch (format) {
      case 'json':
        try {
          return JSON.parse(clean);
        } catch (e) {
          throw new Error(`Invalid JSON: ${e.message}`, { cause: e });
        }

      case 'csv':
      case 'tsv': {
        const sep = format === 'tsv' ? '\t' : ',';
        const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return [];
        const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''));
        return lines.slice(1).map((line) => {
          const vals = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const row = {};
          headers.forEach((h, i) => {
            row[h] = this._coerceValue(vals[i]);
          });
          return row;
        });
      }

      case 'markdown-table': {
        const lines = clean.split(/\r?\n/).filter((l) => l.includes('|'));
        if (lines.length < 2) return [];
        const headers = lines[0]
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        const dataLines = lines.slice(2); // Skip header and separator
        return dataLines.map((line) => {
          const cells = line
            .split('|')
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = this._coerceValue(cells[i] || '');
          });
          return obj;
        });
      }

      case 'yaml': {
        // Lightweight deterministic YAML key-value parser
        const lines = clean.split(/\r?\n/);
        const obj = {};
        for (const line of lines) {
          const m = line.match(/^([a-zA-Z0-9_\-]+):\s*(.*)$/);
          if (m) {
            obj[m[1].trim()] = this._coerceValue(m[2].trim());
          }
        }
        return obj;
      }

      case 'xml': {
        // Tag extractor for simple XML
        const records = [];
        const itemMatches = clean.match(/<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/\1>/g) || [];
        for (const item of itemMatches) {
          const innerMatch = item.match(/^<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/\1>$/);
          if (innerMatch) {
            const inner = innerMatch[2];
            const fieldMatches = inner.match(/<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/\1>/g) || [];
            if (fieldMatches.length > 0) {
              const record = {};
              for (const fm of fieldMatches) {
                const parts = fm.match(/^<([a-zA-Z0-9_\-]+)>(.*?)<\/\1>$/);
                if (parts) record[parts[1]] = this._coerceValue(parts[2]);
              }
              records.push(record);
            }
          }
        }
        return records.length > 0 ? records : { raw: clean };
      }

      default:
        try {
          return JSON.parse(clean);
        } catch {
          return { text: clean };
        }
    }
  }

  render(data, format, options = {}) {
    const items = Array.isArray(data) ? data : [data];
    const keys =
      items.length > 0 && typeof items[0] === 'object' && items[0] !== null
        ? Object.keys(items[0])
        : [];

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'yaml':
        return this._toYaml(data);

      case 'csv':
        return this._toDelimited(items, keys, ',');

      case 'tsv':
        return this._toDelimited(items, keys, '\t');

      case 'markdown-table':
      case 'markdown':
        return this._toMarkdownTable(items, keys);

      case 'sql':
        return this._toSQL(items, keys, options.tableName || 'records');

      case 'typescript':
      case 'ts':
        return this._toTypeScript(items[0] || {}, options.interfaceName || 'DataRecord');

      case 'python':
      case 'pydantic':
        return this._toPython(items[0] || {}, options.className || 'DataRecord');

      case 'mermaid':
        return this._toMermaid(items[0] || {}, options.entityName || 'Entity');

      case 'katex':
      case 'latex':
        return this._toKaTeXMatrix(items);

      case 'xml':
        return this._toXML(data, options.rootTag || 'dataset', options.itemTag || 'item');

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  _coerceValue(val) {
    if (val === undefined || val === null || val === '') return null;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(val) && val.trim() !== '') return Number(val);
    return val;
  }

  _toDelimited(items, keys, sep) {
    if (keys.length === 0) return '';
    const header = keys.join(sep);
    const rows = items.map((item) =>
      keys
        .map((k) => {
          const v = item[k];
          const str = v === null || v === undefined ? '' : String(v);
          return str.includes(sep) || str.includes('\n') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(sep),
    );
    return [header, ...rows].join('\n');
  }

  _toMarkdownTable(items, keys) {
    if (keys.length === 0) return 'No structured table data';
    const header = `| ${keys.join(' | ')} |`;
    const divider = `| ${keys.map(() => '---').join(' | ')} |`;
    const rows = items.map((item) => `| ${keys.map((k) => String(item[k] ?? '')).join(' | ')} |`);
    return [header, divider, ...rows].join('\n');
  }

  _toYaml(data, indent = 0) {
    const pad = '  '.repeat(indent);
    if (Array.isArray(data)) {
      return data.map((item) => `${pad}- ${this._toYaml(item, indent + 1).trimStart()}`).join('\n');
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return `${pad}${k}:\n${this._toYaml(v, indent + 1)}`;
          }
          return `${pad}${k}: ${JSON.stringify(v)}`;
        })
        .join('\n');
    }
    return `${pad}${JSON.stringify(data)}`;
  }

  _toSQL(items, keys, tableName) {
    if (keys.length === 0) return `-- No columns to create table ${tableName}`;
    const colDefs = keys
      .map((k) => {
        const sample = items.find((it) => it[k] !== null && it[k] !== undefined)?.[k];
        let type = 'VARCHAR(255)';
        if (typeof sample === 'number')
          type = Number.isInteger(sample) ? 'INTEGER' : 'DECIMAL(10,4)';
        if (typeof sample === 'boolean') type = 'BOOLEAN';
        return `  \`${k}\` ${type}`;
      })
      .join(',\n');

    const createTable = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n${colDefs}\n);\n`;

    const inserts = items
      .map((it) => {
        const vals = keys
          .map((k) => {
            const v = it[k];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');
        return `INSERT INTO \`${tableName}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${vals});`;
      })
      .join('\n');

    return `${createTable}\n${inserts}`;
  }

  _toTypeScript(sample, ifaceName) {
    const fields = Object.entries(sample)
      .map(([k, v]) => {
        let t = 'any';
        if (typeof v === 'string') t = 'string';
        else if (typeof v === 'number') t = 'number';
        else if (typeof v === 'boolean') t = 'boolean';
        else if (Array.isArray(v)) t = 'any[]';
        else if (typeof v === 'object' && v !== null) t = 'Record<string, any>';
        return `  ${k}: ${t};`;
      })
      .join('\n');

    return `export interface ${ifaceName} {\n${fields}\n}`;
  }

  _toPython(sample, className) {
    const fields = Object.entries(sample)
      .map(([k, v]) => {
        let t = 'Any';
        if (typeof v === 'string') t = 'str';
        else if (typeof v === 'number') t = Number.isInteger(v) ? 'int' : 'float';
        else if (typeof v === 'boolean') t = 'bool';
        else if (Array.isArray(v)) t = 'list';
        else if (typeof v === 'object' && v !== null) t = 'dict';
        return `    ${k}: ${t}`;
      })
      .join('\n');

    return `from dataclasses import dataclass\nfrom typing import Any\n\n@dataclass\nclass ${className}:\n${fields || '    pass'}`;
  }

  _toMermaid(sample, entityName) {
    const fields = Object.entries(sample)
      .map(([k, v]) => {
        let t = 'string';
        if (typeof v === 'number') t = 'number';
        if (typeof v === 'boolean') t = 'boolean';
        return `    +${t} ${k}`;
      })
      .join('\n');

    return `classDiagram\n  class ${entityName} {\n${fields}\n  }`;
  }

  _toKaTeXMatrix(items) {
    if (!Array.isArray(items) || items.length === 0) return '$$\\begin{bmatrix} \\end{bmatrix}$$';
    const rows = items.map((it) => {
      const vals = typeof it === 'object' && it !== null ? Object.values(it) : [it];
      return vals.map((v) => String(v ?? '0')).join(' & ');
    });
    return `$$\\begin{bmatrix}\n${rows.join(' \\\\\n')}\n\\end{bmatrix}$$`;
  }

  _toXML(data, rootTag, itemTag) {
    const items = Array.isArray(data) ? data : [data];
    const xmlItems = items
      .map((it) => {
        if (typeof it !== 'object' || it === null) return `  <${itemTag}>${it}</${itemTag}>`;
        const fields = Object.entries(it)
          .map(([k, v]) => `    <${k}>${v ?? ''}</${k}>`)
          .join('\n');
        return `  <${itemTag}>\n${fields}\n  </${itemTag}>`;
      })
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${xmlItems}\n</${rootTag}>`;
  }
}

export const transmuter = new DataTransmuter();
export const transmuteData = (input, options) => transmuter.transmute(input, options);

export default {
  processImage,
  processVideo,
  processMedia,
  transmuter,
  transmuteData,
};
