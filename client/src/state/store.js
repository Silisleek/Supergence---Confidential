// JARVIS HUD - State Store for Real-time System Telemetry
// Lightweight state management for the autonomous AI agent system

// ─── State Types (JSDoc) ───

/**
 * @typedef {Object} SystemStatus
 * @property {Object} cpu
 * @property {number} cpu.usage - 0-100 percentage
 * @property {number} cpu.cores
 * @property {number} cpu.frequency - MHz
 * @property {number} cpu.temperature - Celsius
 * @property {number[]} cpu.loadAverage - 1m, 5m, 15m
 * @property {Object} memory
 * @property {number} memory.total - bytes
 * @property {number} memory.used - bytes
 * @property {number} memory.free - bytes
 * @property {number} memory.usagePercent - 0-100
 * @property {Object} storage
 */

/**
 * @typedef {Object} AgentActivity
 * @property {string} currentTask
 * @property {number} taskProgress - 0-100
 * @property {string} cycleState - 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'error'
 */

/**
 * @typedef {Object} AudioState
 * @property {Object} mic
 * @property {boolean} mic.active
 * @property {number} mic.level - 0-1 normalized
 * @property {boolean} mic.noiseGate
 * @property {Object} speaking
 * @property {boolean} speaking.active
 * @property {string} speaking.text
 */

/**
 * @typedef {Object} RadarContact
 * @property {string} id
 * @property {number} angle - 0-360 degrees
 * @property {number} distance - 0-1 normalized
 * @property {number} strength - 0-1
 * @property {string} type - 'friendly' | 'hostile' | 'neutral' | 'unknown'
 * @property {string} label
 */

/**
 * @typedef {Object} StateUpdateEvent
 * @property {string} type
 * @property {*} payload
 */

// ─── Default State ───

const defaultState = {
  systemStatus: null,
  agentActivity: null,
  agentThinking: null,
  audioState: {
    mic: {
      active: false,
      level: 0,
      noiseGate: true,
    },
    speaking: {
      active: false,
      text: '',
    },
  },
  radarContacts: [],
  notifications: [],
  wsConnected: false,
  lastWsMessage: 0,
};

// ─── Listener Management ───

const listeners = new Map();

function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);

  return () => listeners.get(key).delete(callback);
}

function notify(key, value) {
  const subs = listeners.get(key);
  if (subs) {
    subs.forEach((cb) => cb(value));
  }
}

// ─── State Object with Getters/Setters ───

const state = {
  _data: { ...defaultState },

  get(key) {
    return this._data[key];
  },

  set(key, value) {
    const oldValue = this._data[key];
    this._data[key] = value;
    notify(key, value);
    return oldValue;
  },

  update(updater) {
    const oldData = { ...this._data };
    Object.assign(this._data, typeof updater === 'function' ? updater(this._data) : updater);
    notify('__change__', oldData);
  },

  subscribe(key, callback) {
    return subscribe(key, callback);
  },

  applyStateUpdate(event) {
    switch (event.type) {
      case 'SYSTEM_STATUS_UPDATE':
        this.set('systemStatus', event.payload);
        break;
      case 'AGENT_ACTIVITY_UPDATE':
        this.update((data) => ({
          ...data,
          agentActivity: { ...data.agentActivity, ...event.payload, updatedAt: Date.now() },
        }));
        break;
      case 'AGENT_CYCLE_STATE_CHANGE':
        this.update((data) => ({
          ...data,
          agentActivity: {
            ...(data.agentActivity || { currentTask: '', taskProgress: 0 }),
            cycleState: event.payload,
            updatedAt: Date.now(),
          },
        }));
        break;
      case 'AGENT_THINKING_UPDATE':
        this.update((data) => ({
          ...data,
          agentThinking: { ...data.agentThinking, ...event.payload },
        }));
        break;
      case 'AUDIO_STATE_UPDATE':
        this.update((data) => ({
          ...data,
          audioState: { ...data.audioState, ...event.payload },
        }));
        break;
      case 'RADAR_CONTACT_UPDATE':
        this.set('radarContacts', event.payload);
        break;
      case 'NOTIFICATION_ADD':
        this.update((data) => ({
          ...data,
          notifications: [event.payload, ...data.notifications].slice(0, 100),
        }));
        break;
      case 'WS_CONNECTED':
        this.update((data) => ({
          ...data,
          wsConnected: event.payload,
          lastWsMessage: event.payload ? Date.now() : data.lastWsMessage,
        }));
        break;
    }
  },

  reset() {
    this._data = { ...defaultState };
    listeners.clear();
  },
};

// ─── Selectors ───

function selectSystemStatus() {
  return state.get('systemStatus');
}

function selectAgentActivity() {
  return state.get('agentActivity');
}

function selectAgentCycleState() {
  const activity = state.get('agentActivity');
  return activity?.cycleState || 'idle';
}

function selectAudioState() {
  return state.get('audioState');
}

function selectRadarContacts() {
  return state.get('radarContacts');
}

function selectWsConnected() {
  return state.get('wsConnected');
}

// ─── Export ───

export {
  state,
  subscribe,
  notify,
  selectSystemStatus,
  selectAgentActivity,
  selectAgentCycleState,
  selectAudioState,
  selectRadarContacts,
  selectWsConnected,
  defaultState,
};
