/**
 * AdManager.js — Interstitial ad management.
 *
 * Shows an interstitial ad every 3 levels. Since this is a standalone
 * demo without a real ad network, it simulates ads with a full-screen
 * overlay that auto-closes after 3 seconds.
 *
 * In production, replace `_showInterstitial()` with actual ad network calls
 * (AdMob, Unity Ads, AppLovin, etc.).
 */

export class AdManager {
  constructor() {
    /** @type {number} Levels played since last ad */
    this.levelsSinceLastAd = 0;

    /** @type {number} Show ad every N levels */
    this.adInterval = 3;

    /** @type {boolean} Whether ads are enabled */
    this.enabled = true;

    /** @type {boolean} Whether an ad is currently showing */
    this.showing = false;

    /** @type {number} Ad duration in seconds */
    this.adDuration = 3;

    /** @type {Function|null} Callback when ad is dismissed */
    this._dismissCallback = null;

    /** @type {HTMLElement|null} Ad overlay element */
    this._overlay = null;
  }

  /**
   * Initialize the ad manager. Creates the overlay element.
   */
  init() {
    this._createOverlay();
    return this;
  }

  /**
   * Create the ad overlay DOM element.
   */
  _createOverlay() {
    if (this._overlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'ad-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      z-index: 10000;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
    `;
    overlay.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 20px;">Advertisement</div>
      <div style="font-size: 14px; opacity: 0.7; margin-bottom: 10px;">Thank you for playing Pixel Popper!</div>
      <div style="font-size: 14px; opacity: 0.5;" id="ad-timer">Closing in 3...</div>
    `;

    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  /**
   * Check if an ad should be shown after completing a level.
   * @param {number} levelCompleted - The level that was just completed
   * @returns {boolean} True if an ad should be shown
   */
  shouldShowAd(levelCompleted) {
    if (!this.enabled) return false;

    this.levelsSinceLastAd++;

    if (this.levelsSinceLastAd >= this.adInterval) {
      this.levelsSinceLastAd = 0;
      return true;
    }

    return false;
  }

  /**
   * Show an interstitial ad.
   * @param {Function} [dismissCallback] - Called when ad is dismissed
   * @returns {Promise<void>} Resolves when ad is dismissed
   */
  showInterstitial(dismissCallback = null) {
    if (!this.enabled || !this._overlay) {
      if (dismissCallback) dismissCallback();
      return Promise.resolve();
    }

    this.showing = true;
    this._dismissCallback = dismissCallback;

    this._overlay.style.display = 'flex';

    // Update timer
    let countdown = this.adDuration;
    const timerEl = this._overlay.querySelector('#ad-timer');
    const interval = setInterval(() => {
      countdown--;
      if (timerEl) {
        timerEl.textContent = `Closing in ${Math.max(0, countdown)}...`;
      }
      if (countdown <= 0) {
        clearInterval(interval);
        this._dismiss();
      }
    }, 1000);

    return new Promise((resolve) => {
      // Override dismiss to resolve the promise
      const origDismiss = this._dismiss.bind(this);
      this._dismiss = () => {
        clearInterval(interval);
        origDismiss();
        if (dismissCallback) dismissCallback();
        resolve();
      };
    });
  }

  /**
   * Dismiss the current ad overlay.
   */
  _dismiss() {
    if (this._overlay) {
      this._overlay.style.display = 'none';
    }
    this.showing = false;
    this._dismissCallback = null;
  }

  /**
   * Reset the ad counter (useful when skipping levels).
   */
  resetCounter() {
    this.levelsSinceLastAd = 0;
  }

  /**
   * Enable or disable ads.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set the ad interval (how often to show ads).
   * @param {number} interval
   */
  setInterval(interval) {
    this.adInterval = interval;
  }

  /**
   * Cleanup.
   */
  dispose() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
  }
}
