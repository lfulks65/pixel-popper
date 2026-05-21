/**
 * AudioManager.js — Procedural audio using Web Audio API.
 *
 * Generates sound effects programmatically (no external assets needed):
 * - Collect sound: satisfying pop/ting
 * - Wrong color: low buzz
 * - Level complete: ascending chime
 * - Level fail: descending tone
 * - Background ambient loop
 */

export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;

    /** @type {boolean} Whether audio is enabled */
    this.enabled = true;

    /** @type {boolean} Whether audio has been initialized */
    this.initialized = false;

    /** @type {Object<string, Function>} Sound effect functions */
    this._sounds = {};

    /** @type {number} Master volume (0-1) */
    this.masterVolume = 0.5;

    /** @type {boolean} Whether UI interaction has occurred */
    this._uiInteracted = false;
  }

  /**
   * Initialize audio context. Must be called from a user gesture.
   * @returns {boolean} True if initialization succeeded
   */
  init() {
    if (this.initialized) return true;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this._setupSoundEffects();
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('Audio not available:', e);
      return false;
    }
  }

  /**
   * Mark UI interaction as occurred (allows audio to start).
   */
  markInteracted() {
    this._uiInteracted = true;
    if (!this.initialized) {
      this.init();
    }
  }

  /** Set up procedural sound effects. */
  _setupSoundEffects() {
    if (!this.ctx) return;

    /** Collect sound — bright pop */
    this._sounds.collect = () => {
      if (!this._isEnabled()) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(this.masterVolume * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.15);
    };

    /** Wrong color — low buzz */
    this._sounds.wrong = () => {
      if (!this._isEnabled()) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.3);
    };

    /** Level complete — ascending chime */
    this._sounds.levelComplete = () => {
      if (!this._isEnabled()) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        const t = this.ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(this.masterVolume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    };

    /** Level fail — descending tone */
    this._sounds.levelFail = () => {
      if (!this._isEnabled()) return;
      const notes = [400, 350, 300, 200];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'triangle';
        const t = this.ctx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(this.masterVolume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    };

    /** Button click — short blip */
    this._sounds.click = () => {
      if (!this._isEnabled()) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.05);
    };

    /** Lose life — sad tone */
    this._sounds.loseLife = () => {
      if (!this._isEnabled()) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(this.masterVolume * 0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.3);
    };
  }

  /** Check if audio is enabled and context is ready. */
  _isEnabled() {
    return this.enabled && this.initialized && this.ctx && this.ctx.state === 'running';
  }

  /**
   * Play a named sound effect.
   * @param {string} name - Sound key (collect, wrong, levelComplete, levelFail, click, loseLife)
   */
  play(name) {
    if (!this._isEnabled()) return;

    const sound = this._sounds[name];
    if (sound) {
      sound();
    } else {
      console.warn(`Audio: unknown sound '${name}'`);
    }
  }

  /**
   * Play the collect sound.
   */
  playCollect() {
    this.play('collect');
  }

  /**
   * Play the wrong color sound.
   */
  playWrong() {
    this.play('wrong');
  }

  /**
   * Play the level complete sound.
   */
  playLevelComplete() {
    this.play('levelComplete');
  }

  /**
   * Play the level fail sound.
   */
  playLevelFail() {
    this.play('levelFail');
  }

  /**
   * Play a button click sound.
   */
  playClick() {
    this.play('click');
  }

  /**
   * Play the lose life sound.
   */
  playLoseLife() {
    this.play('loseLife');
  }

  /**
   * Set master volume.
   * @param {number} volume - 0 to 1
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable all audio.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Cleanup audio resources.
   */
  dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
    this._sounds = {};
  }
}
