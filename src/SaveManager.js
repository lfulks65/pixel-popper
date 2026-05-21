/**
 * SaveManager.js — Persistent save data using localStorage.
 *
 * Manages:
 * - Level unlock states
 * - Star ratings per level
 * - Best scores
 * - Game settings preferences
 */

const SAVE_KEY = 'pixel_popper_save';

/**
 * Default save data structure.
 */
function getDefaultSaveData() {
  const levels = {};
  for (let i = 1; i <= 10; i++) {
    levels[i] = {
      unlocked: i === 1, // First level unlocked
      completed: false,
      stars: 0,
      bestScore: 0,
    };
  }
  return {
    version: 1,
    levels,
    settings: {
      audioEnabled: true,
      adsEnabled: true,
    },
    totalGamesPlayed: 0,
  };
}

export class SaveManager {
  constructor() {
    /** @type {Object} Current save data */
    this.data = this._load();
  }

  /**
   * Load save data from localStorage.
   * @returns {Object}
   */
  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate structure
        if (parsed && parsed.version && parsed.levels) {
          // Merge with defaults in case of schema changes
          return {
            ...getDefaultSaveData(),
            ...parsed,
            levels: {
              ...getDefaultSaveData().levels,
              ...parsed.levels,
            },
            settings: {
              ...getDefaultSaveData().settings,
              ...parsed.settings,
            },
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return getDefaultSaveData();
  }

  /**
   * Save data to localStorage.
   */
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  }

  /**
   * Get the current save data.
   * @returns {Object}
   */
  getSavedData() {
    return this.data;
  }

  /**
   * Check if a level is unlocked.
   * @param {number} levelId - Level ID (1-based)
   * @returns {boolean}
   */
  isLevelUnlocked(levelId) {
    const level = this.data.levels[levelId];
    return level ? level.unlocked : false;
  }

  /**
   * Unlock a level.
   * @param {number} levelId - Level ID (1-based)
   * @returns {boolean} True if the level was newly unlocked
   */
  unlockLevel(levelId) {
    const level = this.data.levels[levelId];
    if (!level) return false;

    const wasUnlocked = level.unlocked;
    level.unlocked = true;
    if (!wasUnlocked) {
      this.save();
      return true; // Newly unlocked
    }
    return false;
  }

  /**
   * Complete a level with a star rating.
   * @param {number} levelId - Level ID (1-based)
   * @param {number} stars - Star rating (1-3)
   * @returns {Object} The completed level data
   */
  completeLevel(levelId, stars) {
    const level = this.data.levels[levelId];
    if (!level) return null;

    level.completed = true;
    level.unlocked = true;
    // Keep the best star rating
    level.stars = Math.max(level.stars, stars);
    this.data.totalGamesPlayed++;

    this.save();
    return level;
  }

  /**
   * Get the star rating for a completed level.
   * @param {number} levelId - Level ID (1-based)
   * @returns {number} Star rating (0 if not completed)
   */
  getLevelStarRating(levelId) {
    const level = this.data.levels[levelId];
    return level ? level.stars : 0;
  }

  /**
   * Get the best star rating across all levels.
   * @returns {number} Max stars achieved
   */
  getBestStars() {
    let best = 0;
    for (const level of Object.values(this.data.levels)) {
      best = Math.max(best, level.stars);
    }
    return best;
  }

  /**
   * Get total games played.
   * @returns {number}
   */
  getTotalGamesPlayed() {
    return this.data.totalGamesPlayed;
  }

  /**
   * Get settings.
   * @returns {Object}
   */
  getSettings() {
    return { ...this.data.settings };
  }

  /**
   * Update a setting.
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  /**
   * Reset all progress (for development/testing).
   */
  resetProgress() {
    this.data = getDefaultSaveData();
    this.save();
  }

  /**
   * Clear save data entirely.
   */
  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('Failed to clear save data:', e);
    }
    this.data = getDefaultSaveData();
  }
}
