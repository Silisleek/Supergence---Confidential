import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

/** Register page aliases in one place, keeping existing bookmarks working. */
export function registerPageRoutes(app) {
  // Handle silisleek.com host routing and virtual host redirects
  app.use((req, res, next) => {
    const host = (req.headers.host || '').toLowerCase();
    if (host.includes('silisleek.com')) {
      if (req.path === '/' || req.path === '/supergence' || req.path === '/supergence/') {
        return res.sendFile(path.join(projectRoot, 'client/silisleek-supergence.html'));
      }
    }
    next();
  });

  const pages = [
    [['/', '/classic', '/classic.html', '/classic-ui', '/liquid-glass'], 'client/index.html'],
    [
      [
        '/silisleek/supergence',
        '/supergence-silisleek',
        '/silisleek/supergence.html',
        '/sleek/supergence',
      ],
      'client/silisleek-supergence.html',
    ],
    [
      ['/silisleek', '/silisleek.html'],
      'client/silisleek.html',
    ],
    [
      [
        '/installer',
        '/installer.html',
        '/download',
        '/download.html',
        '/downloads',
        '/install',
        '/install.html',
      ],
      'client/installer.html',
    ],
    [['/guide', '/guide.html', '/docs', '/documentation'], 'client/guide.html'],
    [
      [
        '/workbench',
        '/workbench.html',
        '/supergence-workbench',
        '/supergence-workbench.html',
        '/supergence-test',
        '/supergence-test.html',
        '/test-ui',
      ],
      'client/supergence-workbench.html',
    ],
    [
      [
        '/verification',
        '/verification.html',
        '/verify',
        '/verify.html',
        '/outputs',
        '/outputs.html',
      ],
      'client/verification.html',
    ],
    [
      ['/projects', '/projects.html', '/showcase', '/showcase.html', '/project-showcase'],
      'workspace/sis_projects_showcase.html',
    ],
    [
      [
        '/jarvis',
        '/jarvis.html',
        '/jarvis-ui',
        '/jarvis-ui.html',
        '/tactical',
        '/tactical.html',
        '/futuristic',
        '/futuristic.html',
        '/hologram',
      ],
      'demos/legacy/jarvis-ui.html',
    ],
    [['/newfrontend.html'], 'demos/legacy/newfrontend.html'],
    [['/systemfaces.html'], 'demos/legacy/systemfaces.html'],
    [
      ['/SupergenceUI.html', '/supergence', '/supergenceui'],
      'demos/supergence-ui/SupergenceUI.html',
    ],
    [['/SupergenceUI.css'], 'demos/supergence-ui/SupergenceUI.css'],
    [['/SupergenceUI.js'], 'demos/supergence-ui/SupergenceUI.js'],
  ];

  for (const [aliases, file] of pages) {
    app.get(aliases, (_request, response) => response.sendFile(path.join(projectRoot, file)));
  }

  app.use('/demos', express.static(path.join(projectRoot, 'demos')));
}
