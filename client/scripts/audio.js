// SIS 1.0 — Advanced Sci-Fi Audio Engine
// Procedural tactical sounds using Web Audio API for an authentic JARVIS experience

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.12;
    this.lastTokenSound = 0;
  }

  _init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
    }
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this._init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sis-audio-pulse', { detail: { type, level: 0.8 } }));
      }

      switch (type) {
        case 'boot':
          this._boot();
          break;
        case 'send':
          this._send();
          break;
        case 'thinking':
          this._thinking();
          break;
        case 'complete':
          this._complete();
          break;
        case 'click':
          this._click();
          break;
        case 'key':
          this._key();
          break;
        case 'tab':
          this._tab();
          break;
        case 'artifact':
          this._artifact();
          break;
        case 'token':
          this._token();
          break;
        case 'unlock':
          this._unlock();
          break;
        case 'error':
          this._error();
          break;
        case 'levelup':
          this._levelup();
          break;
        case 'shutdown':
          this._shutdown();
          break;
        case 'revive':
          this._revive();
          break;
        case 'achievement':
          this._achievement();
          break;
        case 'critical':
          this._critical();
          break;
      }
    } catch (e) {}
  }

  _createOsc(freq, type = 'sine', duration = 0.08, gainVal = this.volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _boot() {
    [260, 390, 520, 780, 1040].forEach((f, i) => {
      setTimeout(() => this._createOsc(f, 'sine', 0.25, 0.1), i * 70);
    });
  }

  _send() {
    // Upward tactical chirps
    this._createOsc(480, 'sine', 0.06, 0.15);
    setTimeout(() => this._createOsc(880, 'sine', 0.08, 0.12), 40);
  }

  _thinking() {
    this._createOsc(220, 'triangle', 0.12, 0.06);
  }

  _token() {
    // Throttle token chatter to max once per 120ms
    const now = Date.now();
    if (now - this.lastTokenSound < 120) return;
    this.lastTokenSound = now;
    const freq = 1200 + Math.random() * 400;
    this._createOsc(freq, 'sine', 0.02, 0.03);
  }

  _complete() {
    this._createOsc(640, 'sine', 0.08, 0.12);
    setTimeout(() => this._createOsc(960, 'sine', 0.12, 0.14), 70);
    setTimeout(() => this._createOsc(1280, 'sine', 0.16, 0.16), 140);
  }

  _click() {
    this._createOsc(1400, 'sine', 0.02, 0.08);
  }

  _key() {
    this._createOsc(900 + Math.random() * 200, 'sine', 0.015, 0.02);
  }

  _tab() {
    this._createOsc(440, 'sine', 0.04, 0.08);
    setTimeout(() => this._createOsc(660, 'sine', 0.06, 0.09), 35);
  }

  _artifact() {
    // 3D holographic generation sound
    [300, 450, 600, 900, 1200].forEach((f, i) => {
      setTimeout(() => this._createOsc(f, 'triangle', 0.18, 0.1), i * 50);
    });
  }

  _unlock() {
    // Triumphant Sci-Fi Power-Up Arpeggio: 440Hz -> 554Hz -> 659Hz -> 880Hz -> 1108Hz -> 1320Hz
    const freqs = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this._createOsc(f, 'sine', 0.22, 0.15);
        this._createOsc(f * 1.5, 'triangle', 0.18, 0.08);
      }, i * 65);
    });
  }

  _error() {
    this._createOsc(240, 'sawtooth', 0.15, 0.15);
    setTimeout(() => this._createOsc(180, 'sawtooth', 0.2, 0.15), 80);
  }

  _levelup() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
      setTimeout(() => this._createOsc(freq, 'triangle', 0.25, 0.22), idx * 75);
    });
  }

  _achievement() {
    [587.33, 880.0, 1174.66].forEach((freq, idx) => {
      setTimeout(() => this._createOsc(freq, 'sine', 0.2, 0.2), idx * 90);
    });
  }

  _critical() {
    this._createOsc(440, 'sawtooth', 0.12, 0.2);
    setTimeout(() => this._createOsc(330, 'sawtooth', 0.18, 0.2), 100);
  }

  _shutdown() {
    [400, 320, 240, 160, 90, 50].forEach((freq, idx) => {
      setTimeout(() => this._createOsc(freq, 'sawtooth', 0.35, 0.25), idx * 110);
    });
  }

  _revive() {
    [100, 180, 300, 480, 720, 1050].forEach((freq, idx) => {
      setTimeout(() => this._createOsc(freq, 'sine', 0.2, 0.2), idx * 80);
    });
  }

  speak(text, options = {}) {
    if (!text || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      console.warn('[AudioEngine] Web Speech API not supported in this browser');
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.rate = Number(options.rate) || 1.0;
      utterance.pitch = Number(options.pitch) || 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('David') ||
            v.name.includes('Daniel')),
      );
      if (preferred) utterance.voice = preferred;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sis-audio-pulse', { detail: { type: 'speak', level: 0.95 } }),
        );
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[AudioEngine] Speech synthesis error:', e.message);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export default AudioEngine;
