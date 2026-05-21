/**
 * UIManager.js — All UI overlays for game screens.
 *
 * Manages HTML overlays for:
 * - Loading screen
 * - Main menu
 * - HUD (lives, timer, level name)
 * - Pause overlay
 * - Win screen with star rating
 * - Fail screen with retry
 * - Rotate device (landscape) warning
 * - Interstitial ad placeholder
 */

export class UIManager {
  constructor() {
    /** @type {Object<string, HTMLElement>} */
    this.screens = {};

    /** @type {string} Current visible screen */
    this.currentScreen = null;

    this._createElements();
  }

  /** Create all overlay DOM elements. */
  _createElements() {
    // ── Loading screen ──
    const loading = document.createElement('div');
    loading.id = 'screen-loading';
    loading.className = 'game-screen';
    loading.innerHTML = `
      <div class="loading-content">
        <h1>Pixel Popper</h1>
        <div class="loading-bar">
          <div class="loading-progress"></div>
        </div>
        <p>Loading...</p>
      </div>
    `;
    document.body.appendChild(loading);
    this.screens.loading = loading;

    // ── Main menu ──
    const menu = document.createElement('div');
    menu.id = 'screen-menu';
    menu.className = 'game-screen';
    menu.innerHTML = `
      <div class="menu-content">
        <h1>Pixel Popper</h1>
        <p class="menu-subtitle">Guide the pixels to their matching targets!</p>
        <div class="menu-buttons">
          <button class="btn btn-play" data-btn="play">▶ Play</button>
          <button class="btn btn-settings" data-btn="settings">⚙ Settings</button>
        </div>
        <div class="menu-stats">
          <div class="stat">
            <span class="stat-label">Best Stars</span>
            <span class="stat-value" id="menu-best-stars">0</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(menu);
    this.screens.menu = menu;

    // ── HUD (heads-up display) ──
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.className = 'hud-overlay';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-level" id="hud-level">Level 1: First Drop</div>
        <div class="hud-timer" id="hud-timer">60s</div>
      </div>
      <div class="hud-bottom">
        <div class="hud-lives" id="hud-lives">❤️❤️❤️</div>
        <button class="btn btn-pause" id="btn-pause" data-btn="pause">⏸</button>
      </div>
    `;
    document.body.appendChild(hud);
    this.screens.hud = hud;

    // ── Pause overlay ──
    const pause = document.createElement('div');
    pause.id = 'screen-pause';
    pause.className = 'game-screen';
    pause.style.display = 'none';
    pause.innerHTML = `
      <div class="pause-overlay">
        <div class="pause-content">
          <h2>Paused</h2>
          <div class="menu-buttons">
            <button class="btn btn-play" data-btn="resume">▶ Resume</button>
            <button class="btn btn-play" data-btn="retry">↺ Retry</button>
            <button class="btn btn-play" data-btn="menu">☰ Menu</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(pause);
    this.screens.pause = pause;

    // ── Win screen ──
    const win = document.createElement('div');
    win.id = 'screen-win';
    win.className = 'game-screen';
    win.style.display = 'none';
    win.innerHTML = `
      <div class="win-content">
        <h2>Level Complete!</h2>
        <div class="stars" id="win-stars">
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
        </div>
        <div class="win-stats">
          <div class="win-stat">Time Left: <span id="win-time">0s</span></div>
          <div class="win-stat">Lives Left: <span id="win-lives">0</span></div>
        </div>
        <div class="menu-buttons">
          <button class="btn btn-play" data-btn="next">▶ Next Level</button>
          <button class="btn btn-play" data-btn="retry">↺ Replay</button>
          <button class="btn btn-play" data-btn="menu">☰ Menu</button>
        </div>
      </div>
    `;
    document.body.appendChild(win);
    this.screens.win = win;

    // ── Fail screen ──
    const fail = document.createElement('div');
    fail.id = 'screen-fail';
    fail.className = 'game-screen';
    fail.style.display = 'none';
    fail.innerHTML = `
      <div class="fail-content">
        <h2>Level Failed</h2>
        <p class="fail-reason" id="fail-reason">Time's up!</p>
        <div class="menu-buttons">
          <button class="btn btn-play" data-btn="retry">↺ Retry</button>
          <button class="btn btn-play" data-btn="menu">☰ Menu</button>
        </div>
      </div>
    `;
    document.body.appendChild(fail);
    this.screens.fail = fail;

    // ── Rotate device overlay ──
    const rotate = document.createElement('div');
    rotate.id = 'rotate-overlay';
    rotate.style.display = 'none';
    rotate.innerHTML = `
      <div class="rotate-content">
        <div class="rotate-icon">📱</div>
        <p>Please rotate your device to portrait</p>
      </div>
    `;
    document.body.appendChild(rotate);
    this.screens.rotate = rotate;

    // Apply shared styles
    this._applyStyles();
  }

  /** Apply CSS styles for all UI elements. */
  _applyStyles() {
    if (document.getElementById('pixel-popper-styles')) return;

    const style = document.createElement('style');
    style.id = 'pixel-popper-styles';
    style.textContent = `
      .game-screen {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(10, 10, 30, 0.92);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #fff;
      }

      .game-screen.active {
        display: flex;
      }

      /* Loading */
      .loading-content {
        text-align: center;
      }
      .loading-content h1 {
        font-size: 28px;
        margin-bottom: 30px;
        background: linear-gradient(90deg, #ff4400, #ffaa00, #00ff88, #0088ff, #ff0088);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .loading-bar {
        width: 200px;
        height: 4px;
        background: #333;
        border-radius: 2px;
        margin: 0 auto 10px;
        overflow: hidden;
      }
      .loading-progress {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00ff88, #0088ff);
        border-radius: 2px;
        animation: loading 1.5s ease-in-out infinite;
      }
      @keyframes loading {
        0% { width: 0%; margin-left: 0; }
        50% { width: 60%; margin-left: 20%; }
        100% { width: 0%; margin-left: 100%; }
      }

      /* Menu */
      .menu-content {
        text-align: center;
      }
      .menu-content h1 {
        font-size: 32px;
        margin-bottom: 8px;
        background: linear-gradient(90deg, #ff4400, #ffaa00, #00ff88, #0088ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .menu-subtitle {
        font-size: 14px;
        opacity: 0.7;
        margin-bottom: 30px;
      }
      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        margin-bottom: 20px;
      }
      .menu-stats {
        display: flex;
        gap: 30px;
        justify-content: center;
      }
      .stat {
        text-align: center;
      }
      .stat-label {
        display: block;
        font-size: 11px;
        opacity: 0.6;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 24px;
        font-weight: bold;
      }

      /* Buttons */
      .btn {
        padding: 12px 32px;
        font-size: 16px;
        font-weight: 600;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        min-width: 180px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.15s ease;
      }
      .btn:hover, .btn:active {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.05);
      }
      .btn-play {
        background: linear-gradient(135deg, #00aa55, #0088ff);
        border: none;
      }

      /* HUD */
      .hud-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 50;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: white;
      }
      .hud-top {
        display: flex;
        justify-content: space-between;
        padding: 10px 16px;
        background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
      }
      .hud-level {
        font-size: 14px;
        font-weight: 600;
      }
      .hud-timer {
        font-size: 18px;
        font-weight: bold;
      }
      .hud-timer.warning {
        color: #ff4444;
        animation: timer-pulse 0.5s ease-in-out infinite;
      }
      @keyframes timer-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .hud-bottom {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 10px 16px;
        background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%);
      }
      .hud-lives {
        font-size: 20px;
      }
      .btn-pause {
        pointer-events: all;
        width: 44px;
        height: 44px;
        min-width: 44px;
        padding: 8px;
        font-size: 18px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      /* Pause */
      .pause-overlay {
        background: rgba(0, 0, 0, 0.8);
      }
      .pause-content {
        text-align: center;
      }
      .pause-content h2 {
        font-size: 28px;
        margin-bottom: 20px;
      }

      /* Win */
      .win-content {
        text-align: center;
      }
      .win-content h2 {
        font-size: 28px;
        margin-bottom: 10px;
        color: #00ff88;
      }
      .stars {
        font-size: 40px;
        margin-bottom: 15px;
      }
      .star {
        color: #444;
        transition: color 0.3s ease;
      }
      .star.earned {
        color: #ffcc00;
        text-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
      }
      .win-stats {
        margin-bottom: 20px;
        font-size: 14px;
        opacity: 0.8;
      }
      .win-stat {
        margin: 4px 0;
      }

      /* Fail */
      .fail-content {
        text-align: center;
      }
      .fail-content h2 {
        font-size: 28px;
        margin-bottom: 10px;
        color: #ff4444;
      }
      .fail-reason {
        font-size: 16px;
        opacity: 0.7;
        margin-bottom: 20px;
      }

      /* Rotate device */
      .rotate-content {
        text-align: center;
        padding: 40px;
      }
      .rotate-icon {
        font-size: 60px;
        margin-bottom: 20px;
      }
      .rotate-content p {
        font-size: 16px;
        opacity: 0.8;
      }

      /* Ad overlay */
      #ad-overlay {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show a specific screen and hide others.
   * @param {string} screenName - Screen key (loading, menu, win, fail, pause)
   */
  showScreen(screenName) {
    // Hide all screens
    for (const [key, el] of Object.entries(this.screens)) {
      if (key !== 'hud' && key !== 'rotate') {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    }

    // Show the requested screen
    if (screenName === 'hud') {
      this.screens.hud.style.display = 'block';
    } else if (screenName === 'rotate') {
      this.screens.rotate.style.display = 'flex';
    } else {
      const el = this.screens[screenName];
      if (el) {
        el.classList.add('active');
        el.style.display = 'flex';
      }
    }

    this.currentScreen = screenName;
  }

  /**
   * Show/hide the HUD.
   * @param {boolean} show
   */
  setHudVisible(show) {
    this.screens.hud.style.display = show ? 'block' : 'none';
    if (show) this.showScreen(null);
  }

  /**
   * Update HUD elements.
   * @param {Object} data
   * @param {string} data.levelName
   * @param {number} data.timeRemaining
   * @param {number} data.lives
   * @param {number} data.maxLives
   */
  updateHUD({ levelName, timeRemaining, lives, maxLives }) {
    const levelEl = document.getElementById('hud-level');
    const timerEl = document.getElementById('hud-timer');
    const livesEl = document.getElementById('hud-lives');

    if (levelEl) levelEl.textContent = `Level ${this._levelIdForName(levelName)}`;
    if (timerEl) {
      timerEl.textContent = `${Math.ceil(timeRemaining)}s`;
      if (timeRemaining <= 10) {
        timerEl.classList.add('warning');
      } else {
        timerEl.classList.remove('warning');
      }
    }
    if (livesEl) {
      livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, maxLives - lives));
    }
  }

  /**
   * Update the win screen with results.
   * @param {number} stars
   * @param {number} timeRemaining
   * @param {number} livesRemaining
   */
  updateWinScreen(stars, timeRemaining, livesRemaining) {
    // Update stars
    const starEls = document.querySelectorAll('#win-stars .star');
    starEls.forEach((el, i) => {
      el.classList.toggle('earned', i < stars);
    });

    const timeEl = document.getElementById('win-time');
    const livesEl = document.getElementById('win-lives');
    if (timeEl) timeEl.textContent = `${Math.ceil(timeRemaining)}s`;
    if (livesEl) livesEl.textContent = livesRemaining;
  }

  /**
   * Update the fail screen with reason.
   * @param {string} reason
   */
  updateFailScreen(reason) {
    const reasonEl = document.getElementById('fail-reason');
    if (reasonEl) reasonEl.textContent = reason;
  }

  /**
   * Update menu stats.
   * @param {number} bestStars
   */
  updateMenuStats(bestStars) {
    const bestEl = document.getElementById('menu-best-stars');
    if (bestEl) bestEl.textContent = `${bestStars} ⭐`;
  }

  /**
   * Simulate loading progress.
   * @param {number} progress - 0 to 100
   */
  setLoadingProgress(progress) {
    const bar = document.querySelector('.loading-progress');
    if (bar) {
      bar.style.animation = 'none';
      bar.style.width = `${progress}%`;
      bar.style.marginLeft = '0';
    }
  }

  /**
   * Get the screen name for a level number.
   * @param {string} levelName
   * @returns {string}
   */
  _levelIdForName(levelName) {
    const match = levelName.match(/^Level (\d+)/);
    return match ? match[1] : '?';
  }

  /**
   * Set up button tap handlers.
   * @param {Function} handler - Function called with button ID
   */
  setupButtonHandler(handler) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-btn]');
      if (btn) {
        const btnId = btn.getAttribute('data-btn');
        handler(btnId);
      }
    });

    document.addEventListener('touchend', (e) => {
      const btn = e.target.closest('[data-btn]');
      if (btn) {
        e.preventDefault();
        const btnId = btn.getAttribute('data-btn');
        handler(btnId);
      }
    }, { passive: false });
  }

  /**
   * Show rotate device overlay for landscape.
   * @param {boolean} show
   */
  showRotateOverlay(show) {
    this.screens.rotate.style.display = show ? 'flex' : 'none';
  }

  /**
   * Show interstitial ad overlay.
   * @param {Function} callback - Called when dismissed
   */
  showAdOverlay(callback) {
    const ad = document.getElementById('ad-overlay');
    if (ad) {
      ad.style.display = 'flex';
      let countdown = 3;
      const timerEl = ad.querySelector('#ad-timer') || document.createElement('div');
      timerEl.id = 'ad-timer';
      timerEl.style.cssText = 'font-size: 14px; opacity: 0.5; margin-top: 20px;';
      if (!ad.querySelector('#ad-timer')) ad.appendChild(timerEl);
      timerEl.textContent = `Closing in ${countdown}...`;

      const interval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(interval);
          ad.style.display = 'none';
          callback && callback();
        } else {
          timerEl.textContent = `Closing in ${countdown}...`;
        }
      }, 1000);
    } else {
      callback && callback();
    }
  }

  /**
   * Dispose of all UI elements.
   */
  dispose() {
    for (const el of Object.values(this.screens)) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    this.screens = {};
    this.currentScreen = null;

    const style = document.getElementById('pixel-popper-styles');
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }
}
