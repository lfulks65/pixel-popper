/**
 * LevelManager.js — Manages loading, switching, and resetting levels.
 *
 * Responsibilities:
 *   - Load a level's data from LevelData
 *   - Create LevelElement instances for each element in the level
 *   - Manage the active level state (current, previous, next)
 *   - Provide lifecycle hooks (onLevelLoad, onLevelComplete, onLevelReset)
 *   - Track progress (particles collected, time remaining, stars earned)
 */

import * as THREE from 'three';
import { createElement, BaseLevelElement } from './LevelElements.js';

/**
 * @typedef {Object} LevelDefinition
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {Array<{position: number[], color: string, rate: number, spread: number}>} emitters
 * @property {Array<{position: number[], color: string, targetCount: number}>} collectors
 * @property {Object[]} elements
 * @property {number[]} starThresholds  [1-star, 2-star, 3-star percentages]
 * @property {number} [timeLimit]  seconds, optional
 */

/**
 * Manages level state and transitions.
 */
export class LevelManager {
  /**
   * @param {Object} options
   * @param {Object} [options.scene]  THREE.Scene to attach element meshes to
   * @param {Function} [options.onLevelLoaded]  Callback(levelData)
   * @param {Function} [options.onLevelComplete]  Callback(levelData, stars)
   * @param {Function} [options.onLevelReset]  Callback()
   */
  constructor(options = {}) {
    this.scene = options.scene || null;

    // Callbacks
    this._onLevelLoaded = options.onLevelLoaded || null;
    this._onLevelComplete = options.onLevelComplete || null;
    this._onLevelReset = options.onLevelReset || null;

    // State
    this._currentLevelIndex = -1;
    this._levels = [];
    this._levelData = null;
    this._elements = [];        // All LevelElement instances
    this._elementMap = new Map(); // type → [LevelElement]
    this._emitters = [];         // Emitter configs from level data
    this._collectors = [];       // Collector configs from level data

    // Progress tracking
    this._collectedPerColor = {};  // color → count
    this._totalParticles = 0;
    this._timeRemaining = 0;
    this._running = false;

    // Timer
    this._timerInterval = null;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Set the list of levels (call once after importing).
   * @param {LevelDefinition[]} levels
   */
  setLevels(levels) {
    this._levels = levels.map((l, i) => ({ ...l, _index: i }));
  }

  /**
   * Load a specific level by id (1-based).
   * @param {number} levelId
   * @returns {boolean}  true if the level was found and loaded
   */
  loadLevel(levelId) {
    const idx = this._levels.findIndex((l) => l.id === levelId);
    if (idx === -1) {
      console.warn(`Level ${levelId} not found.`);
      return false;
    }

    return this._loadLevelAt(idx);
  }

  /**
   * Load the next level (sequential).
   * @returns {boolean}
   */
  loadNextLevel() {
    const next = this._currentLevelIndex + 1;
    if (next >= this._levels.length) return false;
    return this._loadLevelAt(next);
  }

  /**
   * Load a specific level by index.
   * @private
   */
  _loadLevelAt(index) {
    // Save current level data before switching
    if (this._currentLevelIndex >= 0 && this._levelData) {
      this._saveState();
    }

    this._currentLevelIndex = index;
    this._levelData = this._levels[index];

    // Build elements
    this._elements = [];
    this._elementMap = new Map();

    if (this._levelData.elements && this._levelData.elements.length > 0) {
      for (const elemData of this._levelData.elements) {
        const element = createElement(elemData);
        this._elements.push(element);

        const type = element.type;
        if (!this._elementMap.has(type)) {
          this._elementMap.set(type, []);
        }
        this._elementMap.get(type).push(element);
      }
    }

    // Build emitter / collector configs
    this._emitters = this._levelData.emitters || [];
    this._collectors = this._levelData.collectors || [];

    // Reset progress
    this._resetProgress();

    // Attach meshes to scene
    this._attachMeshes();

    // Notify
    if (this._onLevelLoaded) {
      this._onLevelLoaded(this._levelData);
    }

    return true;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Scene management
  // ───────────────────────────────────────────────────────────────────────

  _attachMeshes() {
    if (!this.scene) return;

    // Remove existing level meshes
    const existing = [];
    this.scene.traverse((child) => {
      if (child.userData && child.userData.levelElement !== undefined) {
        existing.push(child);
      }
    });
    for (const obj of existing) {
      this.scene.remove(obj);
      obj.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) {
            c.material.forEach((m) => m.dispose());
          } else {
            c.material.dispose();
          }
        }
      });
    }

    // Add new meshes
    for (const element of this._elements) {
      const mesh = element.createMesh();
      if (mesh) {
        mesh.userData.levelElement = element;
        mesh.userData.levelId = this._levelData.id;
        this.scene.add(mesh);
      }
    }
  }

  /**
   * Remove all level meshes from the scene.
   */
  clearScene() {
    if (!this.scene) return;

    this._elements.forEach((element) => {
      if (element.mesh) {
        this.scene.remove(element.mesh);
        element.mesh.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    });
    this._elements = [];
    this._elementMap = new Map();
  }

  // ───────────────────────────────────────────────────────────────────────
  // Updates
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Call each frame with delta time (seconds).
   * @param {number} dt
   */
  update(dt) {
    if (!this._levelData) return;

    // Update all animated elements
    for (const element of this._elements) {
      element.update(dt);
    }

    // Update timer
    if (this._running && this._timeRemaining > 0) {
      this._timeRemaining -= dt;
      if (this._timeRemaining <= 0) {
        this._timeRemaining = 0;
        this._stopTimer();
        this._handleTimeUp();
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Progress tracking
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Record that a particle of the given color has been collected.
   * @param {string} color
   */
  recordCollected(color) {
    if (!this._collectedPerColor[color]) {
      this._collectedPerColor[color] = 0;
    }
    this._collectedPerColor[color]++;
    this._totalParticles++;

    // Check if any collector has met its target
    this._checkCollectionComplete();
  }

  /**
   * @returns {number}  Current time remaining (0 if not running)
   */
  getTimeRemaining() {
    return this._timeRemaining;
  }

  /**
   * @returns {boolean}  true if the current level has a time limit
   */
  hasTimeLimit() {
    return !!this._levelData?.timeLimit;
  }

  /**
   * Start the level timer.
   */
  startTimer() {
    if (this._timerInterval) return;
    this._running = true;
    this._timeRemaining = this._levelData.timeLimit || 0;
  }

  /**
   * Stop the level timer.
   */
  stopTimer() {
    this._running = false;
    this._stopTimer();
  }

  _stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Completion checking
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Check if all collectors have met their targets.
   * @returns {{ complete: boolean, stars: number, percentages: number[] }}
   */
  checkComplete() {
    if (!this._levelData || !this._collectors) {
      return { complete: false, stars: 0, percentages: [] };
    }

    const percentages = this._collectors.map((c) => {
      const collected = this._collectedPerColor[c.color] || 0;
      return Math.min(100, Math.round((collected / c.targetCount) * 100));
    });

    const allComplete = percentages.every((p) => p >= 100);
    if (!allComplete) {
      return { complete: false, stars: 0, percentages };
    }

    // Calculate stars based on the minimum percentage across collectors
    // (player must fully collect ALL colors)
    const minPercent = Math.min(...percentages);
    const thresholds = this._levelData.starThresholds || [60, 80, 95];

    let stars = 1;
    if (minPercent >= thresholds[1]) stars = 2;
    if (minPercent >= thresholds[2]) stars = 3;

    // Cap by total particles collected vs. threshold
    const totalTarget = this._collectors.reduce((sum, c) => sum + c.targetCount, 0);
    const totalCollected = Object.values(this._collectedPerColor).reduce((sum, v) => sum + v, 0);

    return { complete: true, stars, percentages };
  }

  /**
   * @returns {number[]}  Star thresholds from current level
   */
  getStarThresholds() {
    return this._levelData?.starThresholds || [60, 80, 95];
  }

  // ───────────────────────────────────────────────────────────────────────
  // Getters
  // ───────────────────────────────────────────────────────────────────────

  /**
   * @returns {LevelDefinition|null}  Current level data
   */
  getCurrentLevel() {
    return this._levelData;
  }

  /**
   * @returns {number}  Current level index (0-based)
   */
  getCurrentLevelIndex() {
    return this._currentLevelIndex;
  }

  /**
   * @returns {boolean}  true if there are more levels after the current one
   */
  hasMoreLevels() {
    return this._currentLevelIndex < this._levels.length - 1;
  }

  /**
   * @returns {boolean}  true if this is the first level
   */
  isFirstLevel() {
    return this._currentLevelIndex <= 0;
  }

  /**
   * @returns {BaseLevelElement[]}  All elements of the given type
   */
  getElementsByType(type) {
    return this._elementMap.get(type) || [];
  }

  /**
   * @returns {BaseLevelElement[]}  All elements
   */
  getAllElements() {
    return this._elements;
  }

  /**
   * @returns {Object[]}  Emitter configurations
   */
  getEmitters() {
    return this._emitters;
  }

  /**
   * @returns {Object[]}  Collector configurations
   */
  getCollectors() {
    return this._collectors;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Reset the current level (keep same level data, reset progress).
   */
  resetLevel() {
    this._resetProgress();

    // Reset collector meshes
    this._elements.forEach((element) => {
      if (element.reset) {
        element.reset();
      }
    });

    if (this._onLevelReset) {
      this._onLevelReset();
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ───────────────────────────────────────────────────────────────────────

  _resetProgress() {
    this._collectedPerColor = {};
    this._totalParticles = 0;
    this._timeRemaining = 0;
    this._running = false;
    this._stopTimer();

    // Reset collector element meshes
    this._elements.forEach((element) => {
      if (element.reset) {
        element.reset();
      }
    });
  }

  _saveState() {
    // Could save state for undo/continue functionality
    // For now, just reset progress
  }

  _handleTimeUp() {
    // Time's up — notify game state
    // Could trigger a "level failed" screen
    console.warn(`Level ${this._levelData?.id} time's up!`);
  }

  _checkCollectionComplete() {
    // Check completion after each collection event
    const result = this.checkComplete();
    if (result.complete) {
      this.stopTimer();
      if (this._onLevelComplete) {
        this._onLevelComplete(this._levelData, result.stars);
      }
    }
  }
}

// ── Named export for convenience ────────────────────────────────────────────
export default LevelManager;
