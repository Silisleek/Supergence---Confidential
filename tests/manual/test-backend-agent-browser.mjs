import agentBrowserManager from '../../server/services/agentBrowserManager.js';

async function testBackend() {
  console.log('Testing Agent Browser Manager Backend...');

  agentBrowserManager.setBroadcast((type, data) => {
    console.log(
      `[Broadcast Event] ${type}:`,
      typeof data === 'object' ? Object.keys(data).join(', ') : data,
    );
  });

  // 1. Get all agents
  const all = agentBrowserManager.getAllSessions();
  console.log(`Found ${all.length} agents in browser matrix.`);
  const bio = all.find((a) => a.id === 'agent-biology');
  console.log('Agent Bio-SIS config:', bio.name, bio.color, bio.currentUrl);

  // 2. Open session for Bio-SIS
  console.log('Opening personal browser for Bio-SIS...');
  const session = await agentBrowserManager.getOrCreateSession('agent-biology');
  console.log(`Bio-SIS initial URL: ${session.currentUrl}, Title: ${session.pageTitle}`);

  // 3. Navigate
  console.log('Navigating Bio-SIS to wikipedia.org...');
  const navRes = await agentBrowserManager.navigate(
    'agent-biology',
    'https://en.wikipedia.org/wiki/CRISPR',
  );
  console.log('Navigation result success:', navRes.success, 'title:', navRes.title);

  // 4. Test cursor movement & click
  console.log('Testing cursor movement & click...');
  const clickRes = await agentBrowserManager.click(
    'agent-biology',
    { x: 300, y: 250 },
    { label: 'Bio-SIS 🧬 [Testing Link Click]' },
  );
  console.log(
    'Click result success:',
    clickRes.success,
    'coords:',
    clickRes.clickX,
    clickRes.clickY,
  );

  // 5. Test scroll
  console.log('Testing scroll...');
  const scrollRes = await agentBrowserManager.scroll('agent-biology', 300);
  console.log('Scroll result success:', scrollRes.success, 'deltaY:', scrollRes.deltaY);

  // 6. Inspect state
  const state = agentBrowserManager.getSessionState('agent-biology');
  console.log(
    `Final state: Title="${state.pageTitle}", URL=${state.currentUrl}, Cursor=(${state.cursor.x}, ${state.cursor.y}), hasScreenshot=${!!state.lastScreenshot}`,
  );

  await agentBrowserManager.shutdown();
  console.log('✓ Backend test completed successfully!');
  process.exit(0);
}

testBackend().catch((err) => {
  console.error('Backend test failure:', err);
  process.exit(1);
});
