/**
 * WinScreen — Level complete screen.
 *
 * Features:
 *  - "LEVEL COMPLETE!" title with celebration animation
 *  - Stars earned (1-3) with scale-in animation
 *  - Coins collected display
 *  - Next Level button
 *  - Menu button
 */

import { AudioManager } from '../managers/AudioManager.js';

class WinScreen {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks */
  #callbacks = {};

  /** @type {number} Stars earned */
  #stars = 1;

  /** @type {number} Coins collected */
  #coins = 0;

  /** @type {string} Level ID */
  #levelId = '1';

  constructor() {
    this.#callbacks = {};
    this.#stars = 1;
    this.#coins = 0;
    this.#levelId = '1';
  }

  /**
   * Register a callback for an action.
   * @param {'nextLevel'|'menu'|'toggleSound'|string} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Mount the win screen into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'win');

    this.#el.innerHTML = `
      <div class="overlay-bg">
        <div class="overlay-content">
          <div class="celebration-title">LEVEL COMPLETE!</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:-4px;">Level ${this.#levelId}</div>
          
          <div class="stars" id="pp-win-stars">
            ${this.#renderStars(0)}
          </div>

          <div class="coin-display" style="font-size:20px;margin-top:12px;">
            <span class="coin-icon">🪙</span>
            <span id="pp-win-coins">0</span> coins collected
          </div>

          <div class="overlay-buttons">
            <button class="pp-btn pp-btn--primary" id="pp-win-next" style="min-height:52px;">
              NEXT LEVEL →
            </button>
            <button class="pp-btn" id="pp-win-menu">
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
    const nextBtn = this.#el?.querySelector('#pp-win-next');
    const menuBtn = this.#el?.querySelector('#pp-win-menu');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.nextLevel) this.#callbacks.nextLevel();
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        AudioManager.playUIClick();
        if (this.#callbacks.menu) this.#callbacks.menu();
      });
    }
  }

  /**
   * Render star indicators with staggered animation.
   * @param {number} count - Stars earned (0-3)
   * @returns {string}
   * @private
   */
  #renderStars(count) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
      if (i <= count) {
        html += `<span class="star earned" style="animation-delay:${i * 150}ms;">★</span>`;
      } else {
        html += `<span class="star empty">★</span>`;
      }
    }
    return html;
  }

  /**
   * Set the stars earned and update the display with animation.
   * @param {number} stars - 0-3
   * @param {number} coins - Coins collected
   */
  setResults(stars, coins) {
    this.#stars = stars;
    this.#coins = coins;

    const starsContainer = this.#el?.querySelector('#pp-win-stars');
    const coinsEl = this.#el?.querySelector('#pp-win-coins');

    if (starsContainer) {
      starsContainer.innerHTML = this.#renderStars(stars);
    }
    if (coinsEl) {
      coinsEl.textContent = String(coins);
    }
  }

  /**
   * Set the level ID for display.
   * @param {string} levelId
   */
  setLevelId(levelId) {
    this.#levelId = levelId;
    const el = this.#el?.querySelector('[style*="Level"]');
    if (el) {
      el.textContent = `Level ${levelId}`;
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

export { WinScreen };
export default WinScreen;
