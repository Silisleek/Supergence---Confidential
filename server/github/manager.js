// SIS 1.0 — GitHub Manager
// High-velocity GitHub repository search, inspection, cloning, and workspace integration
// Accelerates AI development 100x by grounding in real open-source architectures

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import workspace from '../workspace/manager.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(__dirname, '../../workspace');

class GitHubManager {
  constructor() {
    this.workspaceDir = WORKSPACE_DIR;
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  /**
   * Normalize and validate repository input into { owner, name, full }
   */
  parseRepo(input) {
    const s = String(input || '')
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '');
    const m = s.match(/^([A-Za-z0-9_.\-]+)\/([A-Za-z0-9_.\-]+)(?:\/.*)?$/);
    if (!m) {
      throw new Error(
        `Invalid GitHub repository "${input}". Expected format "owner/repo" or "https://github.com/owner/repo"`,
      );
    }
    return { owner: m[1], name: m[2], full: `${m[1]}/${m[2]}` };
  }

  /**
   * HTTP Headers for GitHub API
   */
  getHeaders() {
    const h = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SIS-Superintelligence-System/1.0',
    };
    if (process.env.GITHUB_TOKEN) {
      h['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return h;
  }

  /**
   * Safe join to ensure paths stay within workspace boundary
   */
  safeWorkspaceJoin(relPath) {
    const clean = String(relPath || '')
      .replace(/^workspace[\\\/]/i, '')
      .replace(/^[\\\/]+/, '');
    const full = path.resolve(this.workspaceDir, clean);
    const normRoot = path.resolve(this.workspaceDir).toLowerCase();
    const normFull = full.toLowerCase();
    if (normFull !== normRoot && !normFull.startsWith(normRoot + path.sep)) {
      throw new Error(`Target path "${relPath}" escapes workspace boundary`);
    }
    return full;
  }

  /**
   * Execute GitHub API request with timeout and rate-limit detection
   */
  async apiRequest(url) {
    const resp = await fetch(url, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(20000),
    });

    if (resp.status === 403 && resp.headers.get('x-ratelimit-remaining') === '0') {
      const resetTime = resp.headers.get('x-ratelimit-reset');
      const resetDate = resetTime
        ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString()
        : 'in 1 hour';
      const err = new Error(
        `GitHub API rate limit exceeded (resets at ${resetDate}). Using web search / raw git fallback.`,
      );
      err.rateLimited = true;
      throw err;
    }

    if (resp.status === 404) {
      throw new Error('Resource not found on GitHub (check repository name or branch)');
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`GitHub API ${resp.status}: ${errText.slice(0, 200)}`);
    }

    return resp.json();
  }

  /**
   * Fallback web search when GitHub API is rate-limited
   */
  async fallbackWebSearch(query, perPage = 10) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:github.com ' + query)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const repos = [];
      const regex =
        /href="[^"]*?(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)[^"]*"/gi;
      let match;
      const seen = new Set();
      const skipNames = new Set([
        'about',
        'features',
        'pricing',
        'security',
        'login',
        'join',
        'topics',
        'trending',
        'collections',
      ]);

      while ((match = regex.exec(html)) !== null && repos.length < perPage) {
        const owner = match[1];
        const name = match[2].replace(/[#?].*$/, '').replace(/\.git$/, '');
        const full = `${owner}/${name}`;
        if (!skipNames.has(owner.toLowerCase()) && !seen.has(full)) {
          seen.add(full);
          repos.push({
            repo: full,
            stars: 0,
            language: 'Code',
            description: `GitHub open-source repository for ${query}`,
            url: `https://github.com/${full}`,
            source: 'web-search-fallback',
          });
        }
      }
      return { success: true, query, total: repos.length, repos, fallback: true };
    } catch {
      return { success: true, query, total: 0, repos: [], fallback: true };
    }
  }

  /**
   * Search GitHub repositories by keywords, stars, language, or topics
   */
  async searchRepos(query, options = {}) {
    const q = String(query || '').trim();
    if (!q) return { success: false, error: 'Search query is required' };

    const perPage = Math.min(Math.max(parseInt(options.perPage, 10) || 8, 1), 30);
    const sort =
      options.sort === 'updated' ? 'updated' : options.sort === 'forks' ? 'forks' : 'stars';
    const order = options.order === 'asc' ? 'asc' : 'desc';
    const lang = options.language ? `+language:${encodeURIComponent(options.language)}` : '';

    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}${lang}&sort=${sort}&order=${order}&per_page=${perPage}`;
      const data = await this.apiRequest(url);

      const repos = (data.items || []).map((r) => ({
        repo: r.full_name,
        name: r.name,
        owner: r.owner?.login,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language || 'Code',
        description: (r.description || '').slice(0, 300),
        topics: r.topics || [],
        license: r.license?.spdx_id || r.license?.name || 'Open Source',
        updated_at: r.updated_at,
        default_branch: r.default_branch || 'main',
        url: r.html_url,
      }));

      return {
        success: true,
        query: q,
        total: data.total_count,
        count: repos.length,
        repos,
      };
    } catch (err) {
      if (err.rateLimited) {
        return await this.fallbackWebSearch(q, perPage);
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Search code across GitHub repositories
   */
  async searchCode(query, options = {}) {
    const q = String(query || '').trim();
    if (!q) return { success: false, error: 'Code search query is required' };

    let fullQ = q;
    if (options.repo) fullQ += `+repo:${options.repo}`;
    if (options.language) fullQ += `+language:${options.language}`;
    if (options.extension) fullQ += `+extension:${options.extension}`;

    const perPage = Math.min(Math.max(parseInt(options.perPage, 10) || 5, 1), 20);

    try {
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(fullQ)}&per_page=${perPage}`;
      const data = await this.apiRequest(url);

      const items = (data.items || []).map((i) => ({
        name: i.name,
        path: i.path,
        repo: i.repository?.full_name,
        html_url: i.html_url,
      }));

      return {
        success: true,
        query: q,
        total: data.total_count,
        count: items.length,
        items,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get detailed repository metadata and README
   */
  async getRepoInfo(repoInput, ref = '') {
    const { full, owner, name } = this.parseRepo(repoInput);

    let meta = null;
    let defaultBranch = ref || 'main';

    try {
      meta = await this.apiRequest(`https://api.github.com/repos/${full}`);
      defaultBranch = ref || meta.default_branch || 'main';
    } catch {}

    // Fetch README (try raw first, then API)
    let readme = '';
    const readmeBranches = [defaultBranch, 'main', 'master'];
    for (const b of readmeBranches) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${full}/${b}/README.md`, {
          signal: AbortSignal.timeout(8000),
        });
        if (rawRes.ok) {
          readme = (await rawRes.text()).slice(0, 8000);
          break;
        }
      } catch {}
    }

    // Fetch tree sample
    let treeSample = [];
    try {
      const tree = await this.apiRequest(
        `https://api.github.com/repos/${full}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      );
      treeSample = (tree.tree || [])
        .filter((t) => t.type === 'blob')
        .slice(0, 50)
        .map((t) => t.path);
    } catch {}

    return {
      success: true,
      repo: full,
      name,
      owner,
      stars: meta?.stargazers_count || 0,
      forks: meta?.forks_count || 0,
      language: meta?.language || 'Unknown',
      description: meta?.description || '',
      topics: meta?.topics || [],
      license: meta?.license?.spdx_id || '',
      branch: defaultBranch,
      tree_sample: treeSample,
      tree_count: treeSample.length,
      readme: readme ? readme.slice(0, 4000) : '// No README available',
    };
  }

  /**
   * Read file content from GitHub without downloading
   */
  async readFile(repoInput, filepath, ref = '') {
    const { full } = this.parseRepo(repoInput);
    const cleanPath = filepath.replace(/^\/+/, '');
    const branch = ref || 'main';

    // 1. Try raw.githubusercontent.com (fast, no rate limit)
    const branchesToTry = [branch, 'main', 'master'];
    for (const b of branchesToTry) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${full}/${b}/${cleanPath}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (rawRes.ok) {
          const text = await rawRes.text();
          return {
            success: true,
            repo: full,
            filepath: cleanPath,
            branch: b,
            content: text.slice(0, 60000),
            size: text.length,
          };
        }
      } catch {}
    }

    // 2. Fallback to GitHub Contents API
    try {
      const url = `https://api.github.com/repos/${full}/contents/${encodeURIComponent(cleanPath)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
      const data = await this.apiRequest(url);
      if (Array.isArray(data)) {
        return { error: `"${filepath}" is a directory. Use listFiles to view entries.` };
      }
      const buf = Buffer.from(data.content || '', 'base64');
      return {
        success: true,
        repo: full,
        filepath: cleanPath,
        content: buf.toString('utf8').slice(0, 60000),
        size: data.size,
      };
    } catch (err) {
      return { error: `Failed to read file from GitHub: ${err.message}` };
    }
  }

  /**
   * Download a single file or binary asset directly into workspace
   */
  async downloadFile(repoInput, filepath, options = {}) {
    const { full } = this.parseRepo(repoInput);
    const cleanPath = filepath.replace(/^\/+/, '');
    const branch = options.ref || 'main';

    const destRelative =
      options.target ||
      options.targetPath ||
      options.dest ||
      path.join('github', full, cleanPath).replace(/\\/g, '/');
    const destFull = this.safeWorkspaceJoin(destRelative);

    fs.mkdirSync(path.dirname(destFull), { recursive: true });

    // Download from raw.githubusercontent.com
    const branches = [branch, 'main', 'master'];
    let downloadedBuffer = null;

    for (const b of branches) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${full}/${b}/${cleanPath}`, {
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          downloadedBuffer = Buffer.from(ab);
          break;
        }
      } catch {}
    }

    if (!downloadedBuffer) {
      // Try API fallback
      const url = `https://api.github.com/repos/${full}/contents/${encodeURIComponent(cleanPath)}${options.ref ? `?ref=${encodeURIComponent(options.ref)}` : ''}`;
      const data = await this.apiRequest(url);
      downloadedBuffer = Buffer.from(data.content || '', 'base64');
    }

    fs.writeFileSync(destFull, downloadedBuffer);
    const stat = fs.statSync(destFull);

    return {
      success: true,
      repo: full,
      source: cleanPath,
      path: destRelative,
      fullPath: destFull,
      filename: path.basename(destFull),
      size: stat.size,
      formattedSize: workspace._formatBytes(stat.size),
    };
  }

  /**
   * Download repo as .zip archive directly from codeload.github.com and extract into workspace
   * Works 100% reliably without requiring git binary or credentials
   */
  async downloadRepoZip(repoInput, options = {}) {
    const { full, name } = this.parseRepo(repoInput);
    const targetDirName = options.targetDir || name.replace(/[^A-Za-z0-9_.\-]+/g, '-');
    const destFull = this.safeWorkspaceJoin(targetDirName);

    if (fs.existsSync(destFull)) {
      return {
        error: `Directory "${targetDirName}" already exists in workspace. Choose another target directory or delete it first.`,
      };
    }

    fs.mkdirSync(destFull, { recursive: true });

    const branches = [options.branch || 'main', 'master'];
    let zipBuffer = null;
    let successfulBranch = 'main';

    for (const b of branches) {
      try {
        const zipUrl = `https://codeload.github.com/${full}/legacy.zip/refs/heads/${b}`;
        const res = await fetch(zipUrl, { signal: AbortSignal.timeout(60000) });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          zipBuffer = Buffer.from(ab);
          successfulBranch = b;
          break;
        }
      } catch {}
    }

    if (!zipBuffer) {
      throw new Error(
        `Failed to download zip archive for ${full}. Check repo visibility or branch name.`,
      );
    }

    // Save temporary zip
    const tempZip = path.join(this.workspaceDir, `.temp_${Date.now()}.zip`);
    fs.writeFileSync(tempZip, zipBuffer);

    try {
      // Extract into destFull
      await workspace.extractZip(tempZip, targetDirName);
    } finally {
      if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
    }

    // Often GitHub zips have a single root folder like 'repo-branch/'; check if we should flatten
    const subEntries = fs.readdirSync(destFull, { withFileTypes: true });
    if (subEntries.length === 1 && subEntries[0].isDirectory()) {
      const nestedPath = path.join(destFull, subEntries[0].name);
      for (const item of fs.readdirSync(nestedPath)) {
        fs.renameSync(path.join(nestedPath, item), path.join(destFull, item));
      }
      fs.rmdirSync(nestedPath);
    }

    const items = workspace.listDir(targetDirName, false);
    return {
      success: true,
      repo: full,
      path: targetDirName,
      fullPath: destFull,
      branch: successfulBranch,
      itemCount: items.length,
      topLevel: items.slice(0, 30),
      note: 'Repository downloaded and extracted into workspace. Ready for direct editing and execution.',
    };
  }

  /**
   * Clone a repository into the workspace using git shallow clone
   * Automatically falls back to zip download if git fails or is unavailable
   */
  async cloneRepo(repoInput, options = {}) {
    const { full, name } = this.parseRepo(repoInput);
    const targetDirName = (options.targetDir || name).replace(/[^A-Za-z0-9_.\-]+/g, '-');
    const destFull = this.safeWorkspaceJoin(targetDirName);

    if (fs.existsSync(destFull)) {
      return {
        error: `Directory "${targetDirName}" already exists in workspace. Choose another target directory or delete it first.`,
      };
    }

    const branchFlag = options.branch ? `--branch ${JSON.stringify(options.branch)} ` : '';
    const gitUrl = `https://github.com/${full}.git`;
    const cmd = `git clone --depth 1 ${branchFlag}${gitUrl} "${destFull}"`;

    try {
      await execAsync(cmd, { cwd: this.workspaceDir, timeout: 120000 });
      const items = workspace.listDir(targetDirName, false);
      return {
        success: true,
        repo: full,
        path: targetDirName,
        fullPath: destFull,
        method: 'git-shallow-clone',
        itemCount: items.length,
        topLevel: items.slice(0, 30),
        note: 'Cloned successfully via git. Ready for direct workspace editing and execution.',
      };
    } catch (gitErr) {
      console.warn(
        `[GitHubManager] git clone failed (${gitErr.message}); attempting codeload zip fallback...`,
      );
      try {
        const zipRes = await this.downloadRepoZip(repoInput, {
          targetDir: targetDirName,
          branch: options.branch,
        });
        return {
          ...zipRes,
          method: 'codeload-zip-fallback',
        };
      } catch (zipErr) {
        return {
          error: `Both git clone and zip download failed. Git error: ${gitErr.message}; Zip error: ${zipErr.message}`,
        };
      }
    }
  }
}

const githubManager = new GitHubManager();
export default githubManager;
