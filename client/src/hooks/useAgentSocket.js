// JARVIS HUD - WebSocket Hook for Real-Time System Telemetry
// Manages WebSocket connection and state synchronization with backend

import { state } from '../state/store.js';

const DEFAULT_OPTIONS = {
  url: null,
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

export function useAgentSocket(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const stateObj = {
    connected: false,
    connecting: false,
    latency: 0,
    lastMessage: null,
    error: null,
    reconnectAttempts: 0,
    ws: null,
  };

  function getWsUrl() {
    if (opts.url && (opts.url.startsWith('ws://') || opts.url.startsWith('wss://'))) {
      return opts.url;
    }

    // The server handles WebSocket upgrades on the main HTTP server, not a separate /ws path
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${host}${port}/ws`;
  }

  function handleMessage(msg) {
    stateObj.lastMessage = msg;

    if (msg.type === 'pong') {
      stateObj.latency = msg.payload?.latency || 0;
      return;
    }

    if (msg.type === 'heartbeat') {
      stateObj.connected = true;
      stateObj.reconnectAttempts = 0;
      return;
    }

    // Apply state update
    state.applyStateUpdate({
      type: msg.type.replace(/\./g, '_').toUpperCase(),
      payload: msg.payload,
    });
  }

  function connect() {
    if (stateObj.ws && stateObj.ws.readyState === WebSocket.OPEN) {
      return;
    }

    stateObj.connecting = true;
    stateObj.error = null;

    try {
      const ws = new WebSocket(getWsUrl());
      stateObj.ws = ws;

      ws.onopen = () => {
        stateObj.connected = true;
        stateObj.connecting = false;
        stateObj.reconnectAttempts = 0;
        state.applyStateUpdate({ type: 'WS_CONNECTED', payload: true });
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        stateObj.error = e;
      };

      ws.onclose = () => {
        stateObj.connected = false;
        stateObj.connecting = false;
        state.applyStateUpdate({ type: 'WS_CONNECTED', payload: false });

        if (opts.autoReconnect && stateObj.reconnectAttempts < opts.maxReconnectAttempts) {
          stateObj.reconnectAttempts++;
          const delay = opts.reconnectDelay * Math.pow(2, stateObj.reconnectAttempts - 1);
          setTimeout(connect, delay);
        }
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      stateObj.error = e;
    }
  }

  function disconnect() {
    if (stateObj.ws) {
      stateObj.ws.close();
      stateObj.ws = null;
    }
    stateObj.connected = false;
    stateObj.connecting = false;
    state.applyStateUpdate({ type: 'WS_CONNECTED', payload: false });
  }

  function send(data) {
    if (stateObj.ws && stateObj.ws.readyState === WebSocket.OPEN) {
      try {
        stateObj.ws.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Send error:', e);
        return false;
      }
    }
    return false;
  }

  function restart() {
    disconnect();
    setTimeout(connect, 100);
  }

  return {
    get connected() {
      return stateObj.connected;
    },
    get connecting() {
      return stateObj.connecting;
    },
    get latency() {
      return stateObj.latency;
    },
    get lastMessage() {
      return stateObj.lastMessage;
    },
    get error() {
      return stateObj.error;
    },
    connect,
    disconnect,
    restart,
    send,
    get state() {
      return stateObj;
    },
  };
}

export default useAgentSocket;
