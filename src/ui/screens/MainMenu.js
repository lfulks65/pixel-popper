/**
 * MainMenu — Main menu screen.
 *
 * Features:
 *  - Big "PLAY" button (touch-friendly, min 48px)
 *  - Level select button
 *  - Sound toggle (uses AudioManager)
 *  - High score / total coins display
 *  - Portrait-safe layout: title at top 20%, buttons centered
 */

import { AudioManager } from '../managers/AudioManager.js';

class MainMenu {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks registered by the game engine */
  #callbacks = {};

  constructor() {
    this.#callbacks = {};
  }

  /**
   * Register a callback for a menu action.
   * @param {'play'|'levelSelect'|'toggleSound'|'reset'} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Mount the main menu into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'menu');

    const totalCoins = 0; // Will be set via updateTotalCoins()

    this.#el.innerHTML = `
      <div class="menu-layout">
        <div class="title-glow">PIXEL POPPER</div>
        <div class="subtitle">Pop bubbles. Collect coins. Beat levels.</div>
        <div class="menu-buttons">
          <button class="pp-btn pp-btn--primary" id="pp-play-btn" style="min-height:56px;font-size:24px;">
            ▶ PLAY
          </button>
          <button class="pp-btn" id="pp-levels-btn">
            📋 LEVEL SELECT
          </button>
          <div class="coin-display" id="pp-coins-display">
            <span class="coin-icon">🪙</span>
            <span id="pp-total-coins">0</span>
          </div>
          <div class="toggle" id="pp-sound-toggle" role="button" tabindex="0" aria-label="Toggle sound">
            <span id="pp-sound-icon">🔊</span>
            <span id="pp-sound-label">Sound On</span>
            <div class="toggle__track" id="pp-sound-track">
              <div class="toggle__thumb"></div>
            </div>
          </div>
          <button class="pp-btn pp-btn--sm" id="pp-reset-btn" style="opacity:0.4;font-size:13px;">
            RESET PROGRESS
          </button>
        </div>
      </div>
    `;

    container.appendChild(this.#el);
    this.#bindEvents();
    this.#updateSoundState();
  }

  /**
   * Bind event listeners to DOM elements.
   * @private
   */
  #bindEvents() {
    const playBtn = this.#el?.querySelector('#pp-play-btn');
    const levelsBtn = this.#el?.querySelector('#pp-levels-btn');
    const soundToggle = this.#el?.querySelector('#pp-sound-toggle');
    const resetBtn = this.#el?.querySelector('#pp-reset-btn');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.play) this.#callbacks.play();
      });
    }

    if (levelsBtn) {
      levelsBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.levelSelect) this.#callbacks.levelSelect();
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

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
          if (this.#callbacks.reset) this.#callbacks.reset();
        }
      });
    }
  }

  /**
   * Show this screen (add .active class).
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

  /**
   * Update the total coins display.
   * @param {number} totalCoins
   */
  updateTotalCoins(totalCoins) {
    const el = this.#el?.querySelector('#pp-total-coins');
    if (el) el.textContent = String(totalCoins);
  }

  /**
   * Update the sound toggle UI state.
   * @param {boolean} isMuted
   */
  updateSoundToggle(isMuted) {
    const track = this.#el?.querySelector('#pp-sound-track');
    const icon = this.#el?.querySelector('#pp-sound-icon');
    const label = this.#el?.querySelector('#pp-sound-label');

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
   * Update internal mute state from AudioManager (called on mount).
   * @private
   */
  #updateSoundState() {
    this.updateSoundToggle(AudioManager.isMuted);
  }
}

export { MainMenu };
export default MainMenu;
