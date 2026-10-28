import { spawn } from 'child_process';
import WebSocket from 'ws';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9228;
  const targetUrl = 'http://localhost:3008/workspace/walkable_airport.html';

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP || 'C:\\temp'}\\chrome_cdp_debug_${Date.now()}`,
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=1400,900',
    targetUrl,
  ]);

  try {
    let debuggerUrl = null;
    for (let i = 0; i < 30; i++) {
      await delay(500);
      try {
        const res = await fetch(`http://localhost:${cdpPort}/json`);
        const list = await res.json();
        const page = list.find((item) => item.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          debuggerUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!debuggerUrl) throw new Error('Could not connect to CDP');
    const ws = new WebSocket(debuggerUrl);
    const pending = new Map();
    let idCounter = 1;

    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        console.log('[Airport Console]:', text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        console.error(
          '>>> [AIRPORT RUNTIME EXCEPTION]:',
          d.text,
          d.exception?.description || d.exception?.value,
        );
        if (d.stackTrace) {
          console.error('Stack trace:');
          d.stackTrace.callFrames.forEach((f) => {
            console.error(
              `  at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`,
            );
          });
        }
      }

      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    await new Promise((r) => ws.on('open', r));
    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');

    await delay(4000); // Let airport simulation run frames
    console.log('Airport simulation checked for 4 seconds.');
    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch(console.error);
