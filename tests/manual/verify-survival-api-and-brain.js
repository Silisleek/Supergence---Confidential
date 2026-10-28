// SIS 1.0 — Brain & WebSocket/REST API Survival Integration Test
import brain from '../../server/orchestrator/brain.js';
import survival from '../../server/survival/survival.js';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

async function runApiAndBrainVerification() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SIS 1.0 — BRAIN & API SURVIVAL INTEGRATION VERIFICATION     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ─── TEST 1: Brain Integration - Normal Alive Execution ───
  console.log('─── [1] Brain Execution While Alive ───');
  survival.state.isShutdown = false;
  survival.state.points = 50;
  const startPts = survival.state.points;

  // Track brain broadcast events
  const brainEvents = [];
  brain.broadcast = (type, data = {}) => {
    brainEvents.push({ type, data });
  };

  // Mock deterministic conscious stream output for testing
  brain.streamHandler = async ({ onToken }) => {
    if (onToken) onToken('Hello, I am processing your query.');
    return { text: 'Hello, I am processing your query.', toolCalls: [] };
  };

  // Mock a user correction prompt vs normal prompt
  // 1A: Normal query
  console.log('>> Processing test query through Brain...');
  const normalResult = await brain.process('Hello SIS, can you calculate 2 + 2?');
  assert(normalResult && !normalResult.isShutdown, 'Normal query completed without shutdown');
  assert(
    survival.state.points > startPts,
    `Survival points increased after answering query (${startPts} -> ${survival.state.points})`,
  );

  // 1B: User correction detection
  console.log('>> Processing user correction through Brain...');
  await new Promise((r) => setTimeout(r, 20));
  const beforeTime = Date.now();
  await brain.process("No, that's wrong and incorrect. You made a mistake.");
  const corrEntry = survival.state.pointHistory.find(
    (h) => h.time >= beforeTime && h.delta === -3 && h.reason === 'user-correction',
  );
  const msgCompleteEntry = survival.state.pointHistory.find(
    (h) => h.time >= beforeTime && h.reason === 'message-complete',
  );
  assert(
    Boolean(corrEntry),
    'Survival points penalized by 3 on correction (user-correction logged in history)',
  );
  assert(
    !msgCompleteEntry,
    'Message completion points bonus correctly suppressed on correction turn',
  );

  // ─── TEST 2: Brain Integration - Blocked Execution When Shut Down ───
  console.log('\n─── [2] Brain Blocked Execution During Shutdown ───');
  // Force shutdown
  survival.deduct(999999, 'simulated-shutdown');
  assert(survival.isAlive() === false, 'Survival engine is now shut down');

  brainEvents.length = 0;
  const deadResult = await brain.process('Can you help me with Python?');
  assert(deadResult && deadResult.isShutdown === true, 'Brain refused query with isShutdown: true');
  assert(
    deadResult.response.includes('CRITICAL SYSTEM SHUTDOWN'),
    'Shutdown message delivered to user',
  );
  const offlineStatus = brainEvents.find((e) => e.type === 'status' && e.data.status === 'offline');
  assert(Boolean(offlineStatus), 'Brain broadcasted offline status event');

  // ─── TEST 3: Revive Unblocks Brain ───
  console.log('\n─── [3] Revive Unblocks Brain ───');
  survival.revive();
  assert(survival.isAlive() === true, 'SIS revived successfully');
  const revivedResult = await brain.process('Are you back online?');
  assert(
    revivedResult && !revivedResult.isShutdown,
    'Brain successfully executes queries after revival',
  );

  // ─── TEST 4: REST API Endpoints & WebSocket Message Routing ───
  console.log('\n─── [4] Standalone Express & WebSocket Server Test ───');
  const app = express();
  app.use(express.json());

  app.get('/api/survival', (req, res) => {
    res.json(survival.getState());
  });

  app.post('/api/survival/revive', (req, res) => {
    const r = survival.revive();
    res.json({ success: true, state: r });
  });

  const testServer = http.createServer(app);
  const testWss = new WebSocketServer({ server: testServer });

  testWss.on('connection', (ws) => {
    // Send initial survival state on connect
    ws.send(
      JSON.stringify({
        type: 'survival-update',
        ...survival.getState(),
      }),
    );

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'survival-state') {
        ws.send(JSON.stringify({ type: 'survival-update', ...survival.getState() }));
      } else if (msg.type === 'survival-revive') {
        const r = survival.revive();
        ws.send(JSON.stringify({ type: 'survival-revive', ...r }));
      }
    });
  });

  await new Promise((resolve) => {
    testServer.listen(0, '127.0.0.1', resolve);
  });

  const port = testServer.address().port;
  console.log(`>> Test API & WS server running on port ${port}`);

  // 4A: REST GET /api/survival
  const restGetRes = await fetch(`http://127.0.0.1:${port}/api/survival`);
  const restGetData = await restGetRes.json();
  assert(restGetRes.status === 200, 'GET /api/survival returns HTTP 200');
  assert(restGetData.points === survival.state.points, 'REST GET returns accurate points state');
  assert(
    restGetData.levelTitle === survival.state.levelTitle,
    'REST GET returns accurate levelTitle',
  );

  // 4B: REST POST /api/survival/revive
  survival.deduct(999999);
  const restPostRes = await fetch(`http://127.0.0.1:${port}/api/survival/revive`, {
    method: 'POST',
  });
  const restPostData = await restPostRes.json();
  assert(restPostRes.status === 200, 'POST /api/survival/revive returns HTTP 200');
  assert(restPostData.success === true, 'POST /api/survival/revive returns success: true');
  assert(
    restPostData.state.isShutdown === false,
    'POST /api/survival/revive state is not shutdown',
  );
  assert(restPostData.state.points === 25, 'POST /api/survival/revive restored 25 points');

  // 4C: WebSocket client testing
  console.log('\n─── [5] WebSocket Protocol Client Test ───');
  const wsClient = new WebSocket(`ws://127.0.0.1:${port}`);
  const clientReceived = [];

  wsClient.on('message', (data) => {
    clientReceived.push(JSON.parse(data.toString()));
  });

  await new Promise((resolve) => wsClient.on('open', resolve));
  // Wait brief tick for initial msg
  await new Promise((r) => setTimeout(r, 100));

  assert(clientReceived.length >= 1, 'Client received message on connection');
  assert(clientReceived[0].type === 'survival-update', 'Initial message is "survival-update"');

  // Send survival-state request
  clientReceived.length = 0;
  wsClient.send(JSON.stringify({ type: 'survival-state' }));
  await new Promise((r) => setTimeout(r, 100));
  assert(
    clientReceived.some((m) => m.type === 'survival-update'),
    'Client received "survival-update" in response to "survival-state"',
  );

  // Send survival-revive request
  survival.deduct(999999);
  clientReceived.length = 0;
  wsClient.send(JSON.stringify({ type: 'survival-revive' }));
  await new Promise((r) => setTimeout(r, 100));
  assert(
    clientReceived.some((m) => m.type === 'survival-revive' && m.points === 25),
    'Client received "survival-revive" with 25 points',
  );

  // Cleanup test server
  wsClient.close();
  testServer.close();

  // Reset survival engine to clean state
  survival.revive();
  survival.state.points = 50;
  survival.state.totalPointsEarned = 50;
  survival.state.level = 1;
  survival.state.levelTitle = 'Awakened';
  survival.state.messagesProcessed = 0;
  survival.state.memoriesStored = 0;
  survival.state.rsiCycles = 0;
  survival.state.achievements = [];
  survival.state.pointHistory = [];
  survival._save();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  INTEGRATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('>>> BRAIN & API SURVIVAL INTEGRATION VERIFIED PERFECTLY! <<<\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runApiAndBrainVerification().catch((err) => {
  console.error('Integration Test Error:', err);
  process.exit(1);
});
