import { spawn } from 'node:child_process';
import WebSocket from 'ws';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function inspectLayout() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${process.env.TEMP}\\chrome_cdp_inspect`,
    '--remote-debugging-port=9223',
    '--window-size=1920,1080',
    'http://localhost:5173/',
  ]);

  let debuggerUrl = null;
  for (let i = 0; i < 30; i++) {
    await delay(400);
    try {
      const res = await fetch('http://localhost:9223/json');
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
    throw new Error('Chrome did not start');
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
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  await send('Console.enable');

  console.log('[Layout] Waiting 4.5s for boot screen...');
  await delay(4500);

  const check = await send('Runtime.evaluate', {
    expression: `({
      hasAddMessage: typeof window.addMessageToUI,
      chatMessagesExists: !!document.getElementById('chat-messages'),
      title: document.title
    })`,
    returnByValue: true,
  });
  console.log('[Layout] Page check:', check);

  const result = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        if (typeof window.addMessageToUI !== 'function') {
          return JSON.stringify({ error: 'addMessageToUI not available: ' + typeof window.addMessageToUI });
        }
        const chatMessages = document.getElementById('chat-messages');
        const welcomeCard = document.getElementById('welcome-hud-card');
        if (welcomeCard) welcomeCard.remove();

        // 1. Add user message
        window.addMessageToUI('user', 'Explain how the Conscious and Subconscious layers coordinate in SIS 1.0');

        // 2. Add partial stream before tool
        const partial1 = "The user is asking me to explain how the Conscious and Subconscious layers coordinate in SIS 1.0. This is a theoretical/architectural question about the system I'm running as. Let me look at the context I have:\\n\\nFrom the system prompt and context, I can see:\\n- I am SIS (Superintelligence System)\\n- There's a Conscious layer (me, the output streamer)";
        window.addMessageToUI('assistant', partial1);

        // 3. Add tool call & result
        window.renderToolCallInChat({ id: 't1', tool: 'query_omni_memory', arguments: { query: 'Conscious Subconscious layers coordination' } });
        window.renderToolResultInChat({ id: 't1', tool: 'query_omni_memory', result: { success: true } });

        // 4. Add huge assistant response
        const bigResponse = "Here is the full coordination analysis:\\n\\n" + Array(50).fill("### Architectural Layer Dynamics\\nSIS 1.0 coordinates through 5 distinct pathways between conscious reasoning and subconscious matrix.\\n\\n").join('\\n');
        window.addMessageToUI('assistant', bigResponse);

        const msgElements = Array.from(chatMessages.querySelectorAll('.message, .chat-tool-card'));
        const debugData = {
          appBody: {
            clientHeight: document.querySelector('.app-body')?.clientHeight,
            offsetHeight: document.querySelector('.app-body')?.offsetHeight,
            scrollHeight: document.querySelector('.app-body')?.scrollHeight,
          },
          mainContent: {
            clientHeight: document.querySelector('.main-content')?.clientHeight,
            offsetHeight: document.querySelector('.main-content')?.offsetHeight,
            scrollHeight: document.querySelector('.main-content')?.scrollHeight,
          },
          chatPanel: {
            clientHeight: document.querySelector('.chat-panel')?.clientHeight,
            offsetHeight: document.querySelector('.chat-panel')?.offsetHeight,
            scrollHeight: document.querySelector('.chat-panel')?.scrollHeight,
          },
          chatMessages: {
            clientHeight: chatMessages.clientHeight,
            offsetHeight: chatMessages.offsetHeight,
            scrollHeight: chatMessages.scrollHeight,
            overflowY: window.getComputedStyle(chatMessages).overflowY,
            flex: window.getComputedStyle(chatMessages).flex,
            minHeight: window.getComputedStyle(chatMessages).minHeight,
            maxHeight: window.getComputedStyle(chatMessages).maxHeight,
          },
          msgElements: msgElements.map(el => ({
            tag: el.className,
            clientHeight: el.clientHeight,
            scrollHeight: el.scrollHeight,
            offsetHeight: el.offsetHeight,
            computedHeight: window.getComputedStyle(el).height,
            overflow: window.getComputedStyle(el).overflow,
            overflowY: window.getComputedStyle(el).overflowY,
            flexShrink: window.getComputedStyle(el).flexShrink,
          }))
        };

        // Test Scrolling
        const initialScrollTop = chatMessages.scrollTop;
        chatMessages.scrollTop = 1200;
        const midScrollTop = chatMessages.scrollTop;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        const endScrollTop = chatMessages.scrollTop;

        return JSON.stringify({
          debugData,
          scrollTest: {
            initialScrollTop,
            midScrollTop,
            endScrollTop,
            canScrollMid: midScrollTop > 0,
            canScrollEnd: endScrollTop > midScrollTop
          }
        }, null, 2);
      })()
    `,
    awaitPromise: true,
  });

  const parsed = JSON.parse(result.result.value);
  console.log('Scroll Test Result:\n', parsed.scrollTest);

  // Scroll to middle and capture screenshot
  await send('Runtime.evaluate', {
    expression: "document.getElementById('chat-messages').scrollTop = 600;",
  });
  await delay(500);

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  import('node:fs').then((fs) => {
    fs.writeFileSync('tests/chat_scrolled.png', Buffer.from(screenshot.data, 'base64'));
    console.log('[Layout] Saved tests/chat_scrolled.png');
  });

  await delay(500);
  ws.close();
  chromeProcess.kill();
}
inspectLayout().catch(console.error);
