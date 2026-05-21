/**
 * PauseOverlay — Pause screen overlay.
 *
 * Features:
 *  - Semi-transparent dark overlay
 *  - Resume, Restart, Quit to Menu buttons
 *  - Sound toggle
 */

import { AudioManager } from '../managers/AudioManager.js';

class PauseOverlay {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks */
  #callbacks = {};

  constructor() {
    this.#callbacks = {};
  }

  /**
   * Register a callback for an action.
   * @param {'resume'|'restart'|'quit'|'toggleSound'|string} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Mount the pause overlay into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'pause');

    this.#el.innerHTML = `
      <div class="overlay-bg">
        <div class="overlay-content">
          <div style="font-size:clamp(24px,6vw,36px);font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">
            PAUSED
          </div>
          <div class="subtitle">Take a breather</div>
          <div class="overlay-buttons">
            <button class="pp-btn pp-btn--primary" id="pp-pause-resume" style="min-height:52px;">
              ▶ RESUME
            </button>
            <button class="pp-btn" id="pp-pause-restart">
              ↻ RESTART
            </button>
            <button class="pp-btn" id="pp-pause-quit">
              ✕ QUIT TO MENU
            </button>
          </div>
          <div style="margin-top:20px;">
            <div class="toggle" id="pp-pause-sound-toggle" role="button" tabindex="0" aria-label="Toggle sound">
              <span id="pp-pause-sound-icon">🔊</span>
              <span id="pp-pause-sound-label">Sound On</span>
              <div class="toggle__track" id="pp-pause-sound-track">
                <div class="toggle__thumb"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(this.#el);
    this.#bindEvents();
    this.#updateSoundState();
  }

  /**
   * Bind event listeners.
   * @private
   */
  #bindEvents() {
    const resumeBtn = this.#el?.querySelector('#pp-pause-resume');
    const restartBtn = this.#el?.querySelector('#pp-pause-restart');
    const quitBtn = this.#el?.querySelector('#pp-pause-quit');
    const soundToggle = this.#el?.querySelector('#pp-pause-sound-toggle');

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.resume) this.#callbacks.resume();
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.restart) this.#callbacks.restart();
      });
    }

    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.quit) this.#callbacks.quit();
      });
    }

    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.toggleSound) this.#callbacks.toggleSound();
      });
      soundToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          AudioManager.playUIClick();
          if (this.#callbacks.toggleSound) this.#callbacks.toggleSound();
        }
      });
    }
  }

  /**
   * Update the sound toggle UI state.
   * @param {boolean} isMuted
   */
  updateSoundToggle(isMuted) {
    const track = this.#el?.querySelector('#pp-pause-sound-track');
    const icon = this.#el?.querySelector('#pp-pause-sound-icon');
    const label = this.#el?.querySelector('#pp-pause-sound-label');

    if (track) {
      track.classList.toggle('on', !isMuted);
    }
    if (icon) {
      icon.textContent = isMuted ? '🔇' : '🔊';
    }
    if (label) {
      label.textContent = isMuted ? 'Sound Off' : 'Sound On';
    }
  }

  /**
   * Update internal mute state from AudioManager.
   * @private
   */
  #updateSoundState() {
    this.updateSoundToggle(AudioManager.isMuted);
  }

  /**
   * Show this screen.
   */
  show() {
    if (this.#el) {
      this.#el.classList.add('active');
      this.#el.classList.remove('fade-out');
    }
  }

  /**
   * Hide this screen.
   */
  hide() {
    if (this.#el) {
      this.#el.classList.remove('active');
      this.#el.classList.add('fade-out');
    }
  }
}

export { PauseOverlay };
export default PauseOverlay;
