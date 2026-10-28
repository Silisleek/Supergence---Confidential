import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import fs from 'node:fs';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyConversationScroll() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP}\\chrome_cdp_verify_${Date.now()}`,
    '--remote-debugging-port=9224',
    '--window-size=1920,1080',
    'http://localhost:5173/',
  ]);

  let debuggerUrl = null;
  for (let i = 0; i < 30; i++) {
    await delay(400);
    try {
      const res = await fetch('http://localhost:9224/json');
      const list = await res.json();
      const page = list.find((p) => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        debuggerUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!debuggerUrl) {
    chromeProcess.kill();
    throw new Error('Chrome did not start on port 9224');
  }

  const ws = new WebSocket(debuggerUrl);
  await new Promise((r) => ws.on('open', r));

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === msgId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.off?.('message', handler);
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('[Verify] Waiting for boot...');
  await delay(4500);

  const loadResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        if (window.switchConversation) {
          await window.switchConversation('undefined', true);
        } else {
          const items = Array.from(document.querySelectorAll('.sidebar-item'));
          const targetItem = items.find(el => el.dataset.id === 'undefined') || items[0];
          if (targetItem) targetItem.click();
        }
        await new Promise(r => setTimeout(r, 1500));

        const cm = document.getElementById('chat-messages');
        const scrollHeight = cm.scrollHeight;
        const clientHeight = cm.clientHeight;
        const count = cm.querySelectorAll('.message').length;

        cm.scrollTop = 0;
        const top = cm.scrollTop;
        cm.scrollTop = Math.floor(scrollHeight / 2);
        const mid = cm.scrollTop;
        cm.scrollTop = scrollHeight;
        const bottom = cm.scrollTop;

        return {
          messagesRendered: count,
          scrollHeight,
          clientHeight,
          isScrollable: scrollHeight > clientHeight,
          top,
          mid,
          bottom,
          canScroll: bottom > clientHeight
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log('[Verify] Conversation Scroll Test Result:', loadResult.result?.value);

  await send('Runtime.evaluate', {
    expression:
      "(() => { const cm = document.getElementById('chat-messages'); cm.scrollTop = Math.floor(cm.scrollHeight * 0.35); })()",
  });
  await delay(500);

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tests/conversation_scrolled.png', Buffer.from(screenshot.data, 'base64'));
  console.log('[Verify] Saved tests/conversation_scrolled.png');

  ws.close();
  chromeProcess.kill();
}

verifyConversationScroll().catch(console.error);
