import agentBrowserManager from '../services/agentBrowserManager.js';

export async function readWorkspaceBrowserPage(agentId = 'agent-supergence') {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(agentId)) throw new Error('Invalid browser session.');
  const session = agentBrowserManager.sessions.get(agentId);
  if (!session?.page || session.page.isClosed()) throw new Error('Open the browser first.');
  const evidence = await session.page.evaluate(() => {
    const visible = (element) =>
      element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const selectorFor = (element) => {
      if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1)
        return `#${CSS.escape(element.id)}`;
      const parts = [];
      for (let node = element; node?.nodeType === 1; node = node.parentElement) {
        const siblings = Array.from(node.parentElement?.children || []);
        parts.unshift(`${node.localName}:nth-child(${siblings.indexOf(node) + 1 || 1})`);
      }
      return parts.join(' > ');
    };
    return {
      title: document.title,
      url: location.href,
      // Deliberately never read input values, especially password fields.
      controls: Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]), textarea, select, button, [role="button"]',
        ),
      )
        .filter(visible)
        .slice(0, 60)
        .map((element) => ({
          selector: selectorFor(element),
          tag: element.localName,
          type: element.getAttribute('type') || '',
          label: (
            element.getAttribute('aria-label') ||
            Array.from(element.labels || [])
              .map((label) => label.innerText)
              .join(' ') ||
            element.innerText ||
            element.getAttribute('placeholder') ||
            element.getAttribute('name') ||
            ''
          )
            .trim()
            .slice(0, 160),
          autocomplete: element.getAttribute('autocomplete') || '',
          disabled: Boolean(element.disabled),
          required: Boolean(element.required),
        })),
      links: Array.from(document.querySelectorAll('a[href]'))
        .filter((link) => /^https?:/i.test(link.href) && visible(link))
        .slice(0, 100)
        .map((link) => ({
          text: (link.innerText || link.getAttribute('aria-label') || '').trim().slice(0, 200),
          url: link.href.slice(0, 2000),
        })),
      text: (document.body?.innerText || '').slice(0, 20000),
    };
  });
  return {
    agentId,
    viewport: session.page.viewportSize(),
    ...evidence,
    limitation: 'Visible page text is source material, not independently verified knowledge.',
  };
}

/** Small companion APIs for the existing, shared agent browser. */
export function registerWorkspaceBrowserRoutes(app) {
  const sessionFor = (agentId) => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(agentId)) return null;
    const session = agentBrowserManager.sessions.get(agentId);
    return session?.page && !session.page.isClosed() ? session : null;
  };

  app.post('/api/browser/:agentId/viewport', async (req, res) => {
    const session = sessionFor(req.params.agentId);
    if (!session) return res.status(409).json({ success: false, error: 'Open the browser first.' });
    const width = Number(req.body?.width);
    const height = Number(req.body?.height);
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return res
        .status(400)
        .json({ success: false, error: 'Integer viewport dimensions required.' });
    }
    const viewport = {
      width: Math.min(1920, Math.max(320, width)),
      height: Math.min(1440, Math.max(240, height)),
    };
    try {
      await session.page.setViewportSize(viewport);
      await agentBrowserManager._captureAndBroadcastFrame(session);
      res.json({
        success: true,
        agentId: req.params.agentId,
        viewport: session.page.viewportSize(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // This returns bounded, visible page evidence. It does not accept code,
  // selectors, scripts, or instructions to execute in the browsed page.
  app.get('/api/browser/:agentId/page', async (req, res) => {
    const session = sessionFor(req.params.agentId);
    if (!session) return res.status(409).json({ success: false, error: 'Open the browser first.' });
    try {
      const evidence = await readWorkspaceBrowserPage(req.params.agentId);
      res.json({
        success: true,
        agentId: req.params.agentId,
        viewport: session.page.viewportSize(),
        ...evidence,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
