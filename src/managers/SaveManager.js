/**
 * SaveManager — singleton for local-progression save using localStorage.
 *
 * Persistence key: `pixel-popper-save`
 *
 * Data structure:
 * {
 *   levels: { [levelId: string]: { unlocked: boolean, stars: number, bestScore: number, completed: boolean } },
 *   totalCoins: number,
 *   settings: { soundMuted: boolean }
 * }
 *
 * Handles corrupted or missing data gracefully by falling back to defaults.
 * Auto-saves on level completion.
 */

const SAVE_KEY = 'pixel-popper-save';

// ── Default data ──────────────────────────────────────────────────

function _defaultData() {
  return {
    levels: {},
    totalCoins: 0,
    settings: {
      soundMuted: false,
    },
  };
}

// ── Internal state ────────────────────────────────────────────────

let _instance = null;
let _data = _defaultData();

/**
 * Attempt to load saved data from localStorage.
 * Returns the default data structure if nothing is stored or data is corrupted.
 * @returns {object}
 * @private
 */
function _loadData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return _defaultData();

    const parsed = JSON.parse(raw);

    // Validate structure loosely — we need levels (object), totalCoins (number), settings (object)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.levels === 'object' &&
      typeof parsed.totalCoins === 'number' &&
      typeof parsed.settings === 'object'
    ) {
      return parsed;
    }

    // Corrupted data — fall back to defaults
    return _defaultData();
  } catch {
    // JSON parse error, quota error, etc. — fall back to defaults
    return _defaultData();
  }
}

/**
 * Persist current state to localStorage.
 * @private
 */
function _save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(_data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Create or get a level state entry, initialising defaults if missing.
 * @param {string} levelId
 * @returns {{ unlocked: boolean, stars: number, bestScore: number, completed: boolean }}
 * @private
 */
function _ensureLevelEntry(levelId) {
  if (!_data.levels[levelId]) {
    _data.levels[levelId] = {
      unlocked: false,
      stars: 0,
      bestScore: 0,
      completed: false,
    };
  }
  return _data.levels[levelId];
}

// ── Class definition ──────────────────────────────────────────────

class SaveManager {
  constructor() {
    if (_instance) {
      return _instance;
    }
    _instance = this;
    _data = _loadData();
  }

  // ── Level state queries ────────────────────────────────────────

  /**
   * Get the current state for a given level.
   * @param {string} levelId
   * @returns {{ unlocked: boolean, stars: number, bestScore: number, completed: boolean }}
   */
  getLevelState(levelId) {
    _ensureLevelEntry(levelId);
    return { ..._data.levels[levelId] };
  }

  /**
   * Mark a level as completed with the given star count and coin reward.
   * Auto-saves. Unlocks the next level (levelId + 1) if it isn't already unlocked.
   * @param {string} levelId
   * @param {number} stars - Star rating for this level (0–3).
   * @param {number} coins - Coins earned from this level.
   */
  completeLevel(levelId, stars, coins) {
    const level = _ensureLevelEntry(levelId);
    level.completed = true;
    level.stars = Math.max(level.stars, stars);
    level.bestScore = Math.max(level.bestScore, 0); // could be updated from game score
    _data.totalCoins += coins || 0;

    // Unlock the next sequential level
    const nextId = String(Number(levelId) + 1);
    _ensureLevelEntry(nextId);
    _data.levels[nextId].unlocked = true;

    _save();
  }

  /**
   * Find the next level that is unlocked but not yet completed.
   * Returns `null` if all levels are completed.
   * @returns {string|null}
   */
  getNextUnlockedLevel() {
    // Try sequential levels starting from 1
    for (let i = 1; i <= 1000; i++) {
      const id = String(i);
      const level = _ensureLevelEntry(id);
      if (level.unlocked && !level.completed) {
        return id;
      }
    }
    return null;
  }

  // ── Coins ──────────────────────────────────────────────────────

  /**
   * Get the total number of coins earned across all levels.
   * @returns {number}
   */
  getTotalCoins() {
    return _data.totalCoins;
  }

  /**
   * Add coins to the total.
   * @param {number} amount
   */
  addCoins(amount) {
    _data.totalCoins += amount || 0;
    _save();
  }

  // ── Settings ───────────────────────────────────────────────────

  /**
   * Get the full settings object.
   * @returns {{ soundMuted: boolean }}
   */
  getSettings() {
    return { ..._data.settings };
  }

  /**
   * Set a setting value.
   * @param {string} key - Setting key (e.g. 'soundMuted').
   * @param {*} value
   */
  setSetting(key, value) {
    _data.settings[key] = value;
    _save();
  }

  // ── Reset ──────────────────────────────────────────────────────

  /**
   * Reset all saved progression to defaults.
   * Clears localStorage and reinitialises in-memory state.
   */
  resetAll() {
    _data = _defaultData();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }
}

const SaveManager$1 = new SaveManager();

export { SaveManager };
export default SaveManager$1;
