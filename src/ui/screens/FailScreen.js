/**
 * FailScreen — Level failed screen.
 *
 * Features:
 *  - "LEVEL FAILED" title
 *  - Reason (wrong color, time up, etc.)
 *  - Retry button
 *  - "Continue with Ad" button (calls AdManager.showRewardedAd)
 *  - Menu button
 */

import { AdManager } from '../managers/AdManager.js';

class FailScreen {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks */
  #callbacks = {};

  /** @type {string} Reason for failure */
  #reason = 'Time ran out!';

  constructor() {
    this.#callbacks = {};
    this.#reason = 'Time ran out!';
  }

  /**
   * Register a callback for an action.
   * @param {'retry'|'watchAd'|'menu'|'toggleSound'|string} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Mount the fail screen into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'fail');

    this.#el.innerHTML = `
      <div class="overlay-bg">
        <div class="overlay-content">
          <div class="fail-title">LEVEL FAILED</div>
          <div class="fail-reason" id="pp-fail-reason">${this.#reason}</div>

          <div class="overlay-buttons">
            <button class="pp-btn pp-btn--primary" id="pp-fail-retry" style="min-height:52px;">
              ↻ RETRY
            </button>
            <button class="pp-btn" id="pp-fail-ad">
              📺 CONTINUE WITH AD
            </button>
            <button class="pp-btn" id="pp-fail-menu">
              ☰ MAIN MENU
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(this.#el);
    this.#bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  #bindEvents() {
    const retryBtn = this.#el?.querySelector('#pp-fail-retry');
    const adBtn = this.#el?.querySelector('#pp-fail-ad');
    const menuBtn = this.#el?.querySelector('#pp-fail-menu');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (this.#callbacks.retry) this.#callbacks.retry();
      });
    }

    if (adBtn) {
      adBtn.addEventListener('click', () => {
        AdManager.showRewardedAd('continue-after-fail', () => {
          // Ad completed — notify game engine to retry
          if (this.#callbacks.watchAd) this.#callbacks.watchAd();
        });
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        if (this.#callbacks.menu) this.#callbacks.menu();
      });
    }
  }

  /**
   * Set the reason for failure and update the display.
   * @param {string} reason
   */
  setReason(reason) {
    this.#reason = reason;
    const reasonEl = this.#el?.querySelector('#pp-fail-reason');
    if (reasonEl) {
      reasonEl.textContent = reason;
    }
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

export { FailScreen };
export default FailScreen;
