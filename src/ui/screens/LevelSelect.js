/**
 * LevelSelect — Level progression grid.
 *
 * Features:
 *  - 2-column grid for portrait layout
 *  - Locked/unlocked state based on SaveManager progress
 *  - Star display per level
 *  - Scrollable if more levels than fit on screen
 */

import { SaveManager } from '../managers/SaveManager.js';

// Total number of levels
const TOTAL_LEVELS = 10;

class LevelSelect {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks */
  #callbacks = {};

  /** @type {number} Current level range start (for pagination if needed) */
  #startLevel = 0;

  constructor() {
    this.#callbacks = {};
    this.#startLevel = 0;
  }

  /**
   * Register a callback for a level selection.
   * @param {'selectLevel'|'back'|'toggleSound'|'reset'} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Mount the level select into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'level-select');

    this.#el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Header -->
        <div style="display:flex;align-items:center;padding:12px 16px;gap:12px;background:rgba(0,0,0,0.4);">
          <button class="pp-btn pp-btn--icon pp-btn--sm" id="pp-back-btn" aria-label="Back">←</button>
          <div>
            <div style="font-size:18px;font-weight:700;">SELECT LEVEL</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.5);" id="pp-level-progress">Loading...</div>
          </div>
          <div style="flex:1;"></div>
          <div class="coin-display">
            <span class="coin-icon">🪙</span>
            <span id="pp-total-coins">0</span>
          </div>
        </div>
        <!-- Level Grid -->
        <div class="level-grid" id="pp-level-grid">
          <!-- Levels rendered by renderLevels() -->
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
    const backBtn = this.#el?.querySelector('#pp-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        SaveManager.addCoins(0); // save if needed
        if (this.#callbacks.back) this.#callbacks.back();
      });
    }
  }

  /**
   * Render all levels in the grid.
   */
  renderLevels() {
    const grid = this.#el?.querySelector('#pp-level-grid');
    const progressEl = this.#el?.querySelector('#pp-level-progress');
    if (!grid) return;

    grid.innerHTML = '';

    let unlockedCount = 0;
    let completedCount = 0;

    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const state = SaveManager.getLevelState(String(i));
      if (state.unlocked) unlockedCount++;
      if (state.completed) completedCount++;

      const btn = document.createElement('button');
      btn.className = 'level-btn' + (!state.unlocked ? ' locked' : '');
      btn.setAttribute('aria-label', `Level ${i}`);
      btn.dataset.levelId = String(i);

      if (state.unlocked) {
        btn.innerHTML = `
          <div class="level-number">${i}</div>
          <div class="level-stars" data-level-stars="${i}">
            ${this.#renderStars(state.stars)}
          </div>
        `;
        btn.addEventListener('click', () => {
          if (this.#callbacks.selectLevel) {
            this.#callbacks.selectLevel(String(i));
          }
        });
      } else {
        btn.innerHTML = `
          <div class="lock-icon">🔒</div>
          <div class="level-number" style="font-size:16px;color:rgba(255,255,255,0.5);">${i}</div>
        `;
      }

      grid.appendChild(btn);
    }

    // Update progress text
    if (progressEl) {
      progressEl.textContent = `${completedCount} / ${TOTAL_LEVELS} completed`;
    }

    // Update coin display
    const coinsEl = this.#el?.querySelector('#pp-total-coins');
    if (coinsEl) {
      coinsEl.textContent = String(SaveManager.getTotalCoins());
    }
  }

  /**
   * Render star indicators for a given count.
   * @param {number} count - 0-3
   * @returns {string}
   * @private
   */
  #renderStars(count) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
      if (i <= count) {
        html += `<span class="star earned" style="animation-delay:${i * 80}ms;">★</span>`;
      } else {
        html += `<span class="star empty">★</span>`;
      }
    }
    return html;
  }

  /**
   * Show this screen.
   */
  show() {
    if (this.#el) {
      this.#el.classList.add('active');
      this.#el.classList.remove('fade-out');
      this.renderLevels();
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
   * Refresh level states from SaveManager (e.g. after completion).
   */
  refresh() {
    this.renderLevels();
  }
}

export { LevelSelect, TOTAL_LEVELS };
export default LevelSelect;
