/**
 * AdManager — singleton placeholder for in-app advertisement management.
 *
 * Provides stub methods for showing interstitial and rewarded ads.
 * Ads are simulated with setTimeout and return Promises that resolve
 * when the "ad" completes.
 *
 * Interstitial ads respect a cooldown: no more than one ad per
 * 3 level completions.
 *
 * Placement names:
 *   - 'level-complete'
 *   - 'continue-after-fail'
 *   - 'double-coins'
 */

const INTERSTITIAL_COOLDOWN_LEVELS = 3;

// ── State (module-private) ────────────────────────────────────────
let _instance = null;
let _isAdPlaying = false;
let _levelCompletionsSinceLastAd = 0;

/**
 * Increment the level-completion counter and return whether an
 * interstitial ad should be shown (every 3 levels).
 * @private
 * @returns {boolean}
 */
function _shouldShowInterstitial() {
  _levelCompletionsSinceLastAd += 1;
  if (_levelCompletionsSinceLastAd >= INTERSTITIAL_COOLDOWN_LEVELS) {
    _levelCompletionsSinceLastAd = 0;
    return true;
  }
  return false;
}

class AdManager {
  constructor() {
    if (_instance) {
      return _instance;
    }
    _instance = this;
  }

  /**
   * Whether an ad is currently playing.
   */
  get isAdPlaying() {
    return _isAdPlaying;
  }

  /**
   * Show an interstitial ad for the given placement.
   *
   * @param {string} placementName - One of: 'level-complete',
   *   'continue-after-fail', 'double-coins'.
   * @returns {Promise<void>} Resolves when the simulated ad completes (1.5s).
   *   If the ad cooldown prevents showing (less than 3 level completions
   *   since last ad), resolves immediately with no log.
   */
  showInterstitialAd(placementName) {
    if (_isAdPlaying) {
      return Promise.resolve();
    }

    if (!_shouldShowInterstitial()) {
      return Promise.resolve();
    }

    _isAdPlaying = true;
    console.log(`[Ad] interstitial shown: ${placementName}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        _isAdPlaying = false;
        resolve();
      }, 1500);
    });
  }

  /**
   * Show a rewarded ad for the given placement.
   *
   * @param {string} placementName - One of: 'level-complete',
   *   'continue-after-fail', 'double-coins'.
   * @param {Function} onReward - Callback invoked when the ad completes.
   * @returns {Promise<void>} Resolves when the simulated ad completes (2s).
   */
  showRewardedAd(placementName, onReward) {
    if (_isAdPlaying) {
      return Promise.resolve();
    }

    _isAdPlaying = true;
    console.log(`[Ad] rewarded ad shown: ${placementName}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        _isAdPlaying = false;
        if (typeof onReward === 'function') {
          onReward();
        }
        resolve();
      }, 2000);
    });
  }

  /**
   * Increment the level-completion counter manually.
   * Useful for testing or for scenarios not driven by the manager itself.
   * @param {number} count - Number of levels to count.
   */
  incrementLevelCompletions(count = 1) {
    _levelCompletionsSinceLastAd += count;
    if (_levelCompletionsSinceLastAd >= INTERSTITIAL_COOLDOWN_LEVELS) {
      _levelCompletionsSinceLastAd = 0;
    }
  }
}

const AdManager$1 = new AdManager();

export { AdManager };
export default AdManager$1;
