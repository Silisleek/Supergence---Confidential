// SIS 1.0 — Voice Input (Dictation Button)
// The DICTATE button is the listening counterpart to the VOICE button: it captures
// speech via the Web Speech API and streams interim words into the chat composer.
// The level meter is driven by a real getUserMedia AnalyserNode, not a canned
// animation, so it only moves when the microphone is actually hearing something.
//
// Distinct from VoiceOutput (which speaks replies aloud) — one listens, one speaks.

const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export class VoiceInput {
  constructor(audio, options = {}) {
    this.audio = audio || null;
    this.onSubmit = options.onSubmit || null;
    this.onStateChange = options.onStateChange || null;
    this.autoSubmit = options.autoSubmit !== false;
    this.inputId = options.inputId || 'chat-input';

    this.supported = !!SpeechRecognitionCtor;
    this.listening = false;

    this.recognition = null;
    this._bound = false;
    this._committedText = '';

    // Real microphone analysis
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.levelData = null;
    this.levelRaf = 0;

    // Elements
    this.btn = null;
    this.labelEl = null;
    this.meterEl = null;
    this.meterFill = null;
  }

  init() {
    if (this._bound) return true;
    this.btn = document.getElementById('sbt-btn-dictate');
    if (!this.btn) {
      console.warn('[VoiceInput] Dictate button not found');
      return false;
    }
    this.labelEl = document.getElementById('sbt-dictate-label');
    this.meterEl = this.btn.querySelector('.sbt-mic-meter');
    this.meterFill = this.btn.querySelector('.sbt-mic-meter-fill');

    this.btn.addEventListener('click', () => this.toggle());
    this._bound = true;

    if (!this.supported) {
      this.btn.classList.add('is-unsupported');
      this.btn.disabled = true;
      if (this.labelEl) this.labelEl.textContent = 'NO STT';
      this.btn.title = 'Speech recognition is not available in this browser';
      this._render();
      return false;
    }

    window.addEventListener('beforeunload', () => this.stop());

    this._render();
    return true;
  }

  toggle() {
    if (!this.supported) return;
    try {
      this.audio?.play('tab');
    } catch {
      /* audio is optional */
    }
    if (this.listening) this.stop();
    else this.start();
  }

  async start() {
    if (!this.supported || this.listening) return;

    // Secure the microphone first so a denied permission never leaves the
    // button stuck in a listening state with nothing behind it.
    const ok = await this._startMeter();
    if (!ok) {
      this._render();
      return;
    }

    const input = document.getElementById(this.inputId);
    this._committedText = input?.value?.trim() || '';

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.addEventListener('result', (e) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }

      const target = document.getElementById(this.inputId);
      if (!target) return;

      if (finalText) {
        const base = this._committedText ? `${this._committedText} ` : '';
        target.value = `${base}${finalText.trim()}`.trim();
        this._committedText = target.value;
        target.dispatchEvent(new Event('input'));
        if (this.autoSubmit) {
          const text = target.value.trim();
          this._committedText = '';
          if (text && this.onSubmit) this.onSubmit(text);
        }
      } else {
        const base = this._committedText ? `${this._committedText} ` : '';
        target.value = `${base}${interim}`;
        target.dispatchEvent(new Event('input'));
      }
    });

    recognition.addEventListener('error', (ev) => {
      const reason = ev.error;
      // 'no-speech' is routine while listening; anything else is fatal.
      if (reason !== 'no-speech' && reason !== 'aborted') {
        console.warn('[VoiceInput] recognition error:', reason);
        this._notifyState(reason);
        this.stop();
      }
    });

    recognition.addEventListener('end', () => {
      // Chrome ends the session periodically — keep it alive while armed.
      if (this.listening) {
        try {
          recognition.start();
        } catch {
          this.stop();
        }
      }
    });

    this.recognition = recognition;
    this.listening = true;
    try {
      recognition.start();
    } catch (err) {
      this.listening = false;
      this._stopMeter();
      this._render();
      console.warn('[VoiceInput] start failed:', err.message);
      return;
    }
    this._render();
    this._notifyState('listening');
  }

  stop() {
    this.listening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }
    this._stopMeter();
    this._render();
    this._notifyState('idle');
  }

  /** Opens a real microphone stream and drives the meter from its amplitude. */
  async _startMeter() {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[VoiceInput] getUserMedia unavailable');
      return false;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('[VoiceInput] microphone permission denied:', err.message);
      this._permissionError = err.name || err.message;
      return false;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume().catch(() => {});
    }
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.levelData = new Uint8Array(this.analyser.frequencyBinCount);
    this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser);

    const tick = () => {
      if (!this.analyser || !this.meterFill) return;
      this.analyser.getByteFrequencyData(this.levelData);
      let sum = 0;
      for (const v of this.levelData) sum += v;
      const level = Math.min(100, sum / this.levelData.length / 2.55);
      this.meterFill.style.width = `${level}%`;
      this.meterEl?.classList.toggle('is-live', level > 2);
      this.levelRaf = requestAnimationFrame(tick);
    };
    tick();
    return true;
  }

  _stopMeter() {
    cancelAnimationFrame(this.levelRaf);
    this.levelRaf = 0;
    if (this.meterFill) this.meterFill.style.width = '0%';
    this.meterEl?.classList.remove('is-live');
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.levelData = null;
  }

  _notifyState(state) {
    try {
      this.onStateChange?.(state);
    } catch {
      /* observer is optional */
    }
  }

  _render() {
    if (!this.btn) return;
    this.btn.classList.toggle('is-active', this.listening);
    this.btn.classList.toggle('is-listening', this.listening);
    this.btn.setAttribute('aria-pressed', String(this.listening));
    if (this.labelEl) {
      if (!this.supported) this.labelEl.textContent = 'NO STT';
      else if (this._permissionError) this.labelEl.textContent = 'DENIED';
      else this.labelEl.textContent = this.listening ? 'LISTENING' : 'DICTATE';
    }
  }
}

export default VoiceInput;
