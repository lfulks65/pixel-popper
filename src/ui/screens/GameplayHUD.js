/**
 * GameplayHUD — In-game overlay.
 *
 * Features:
 *  - Top bar: level number (left), progress bar (center), pause button (right)
 *  - Bottom bar: collector progress indicators (colored circles/gauges)
 *  - Safe-area-inset padding for notches/home indicators
 *  - Semi-transparent backgrounds for readability
 */

class GameplayHUD {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {object} Callbacks */
  #callbacks = {};

  /** @type {number} Current progress (0-100) */
  #progress = 0;

  /** @type {number} Level number */
  #levelNumber = 1;

  /** @type {Array<{target: number, collected: number, color: string}>} Collector gauges */
  #collectors = [];

  constructor() {
    this.#callbacks = {};
    this.#progress = 0;
    this.#levelNumber = 1;
    this.#collectors = [];
  }

  /**
   * Register a callback for an action.
   * @param {'pause'|string} event - Event name
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Set the collectors to display in the bottom bar.
   * @param {Array<{target: number, collected: number, color: string}>} collectors
   */
  setCollectors(collectors) {
    this.#collectors = collectors;
    this.#renderCollectors();
  }

  /**
   * Mount the HUD into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'hud');

    this.#el.innerHTML = `
      <!-- Top Bar -->
      <div class="hud-top safe-top">
        <div class="hud-level" id="pp-hud-level">Level 1</div>
        <div class="progress-bar" id="pp-hud-progress">
          <div class="progress-bar__fill" id="pp-hud-progress-fill" style="width:0%"></div>
        </div>
        <button class="pp-btn pp-btn--icon pp-btn--sm" id="pp-hud-pause-btn" aria-label="Pause">
          ⏸
        </button>
      </div>

      <!-- Bottom Bar -->
      <div class="hud-bottom safe-bottom" id="pp-hud-collectors">
        <!-- Collector gauges rendered dynamically -->
      </div>
    `;

    container.appendChild(this.#el);
    this.#bindEvents();
    this.#renderCollectors();
  }

  /**
   * Bind event listeners.
   * @private
   */
  #bindEvents() {
    const pauseBtn = this.#el?.querySelector('#pp-hud-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (this.#callbacks.pause) this.#callbacks.pause();
      });
    }
  }

  /**
   * Render the collector gauges in the bottom bar.
   * @private
   */
  #renderCollectors() {
    const container = this.#el?.querySelector('#pp-hud-collectors');
    if (!container) return;

    if (this.#collectors.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.#collectors
      .map((c) => {
        const pct = Math.min(100, Math.round((c.collected / Math.max(1, c.target)) * 100));
        const filled = c.collected >= c.target;
        return `
          <div class="collector-gauge">
            <div class="collector-gauge__circle ${filled ? 'collector-gauge__circle--filled' : ''}"
                 style="--gauge-color: ${c.color};">
              <div class="collector-gauge__fill"
                   style="height:${pct}%;background:${c.color}"></div>
            </div>
            <span>${c.collected}/${c.target}</span>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Update the progress bar fill.
   * @param {number} progress - 0-100
   */
  setProgress(progress) {
    this.#progress = progress;
    const fill = this.#el?.querySelector('#pp-hud-progress-fill');
    if (fill) {
      fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }

  /**
   * Update the level number display.
   * @param {number} level
   */
  setLevel(level) {
    this.#levelNumber = level;
    const el = this.#el?.querySelector('#pp-hud-level');
    if (el) {
      el.textContent = `Level ${level}`;
    }
  }

  /**
   * Update a specific collector's progress and re-render.
   * @param {number} index - Index in the collectors array
   * @param {number} collected - Number collected
   */
  updateCollector(index, collected) {
    if (this.#collectors[index]) {
      this.#collectors[index].collected = collected;
      this.#renderCollectors();
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

  /**
   * Destroy the DOM element and clean up.
   */
  destroy() {
    if (this.#el?.parentNode) {
      this.#el.parentNode.removeChild(this.#el);
    }
    this.#el = null;
  }
}

export { GameplayHUD };
export default GameplayHUD;
