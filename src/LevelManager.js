/**
 * LevelManager.js — Level data, loading, progression, and persistence.
 *
 * Manages level definitions, loading levels, tracking progress,
 * and persisting unlocked levels across browser sessions.
 */

import { Scene, SceneElementType } from './Scene.js';
import * as THREE from 'three';

/**
 * Level data for all 10 levels.
 * Each level defines:
 * - id: Level number (1-based)
 * - name: Display name
 * - timeLimit: Seconds to complete
 * - lives: Starting lives
 * - emitters: Particle emitter configs
 * - paddles: Player-controlled paddle configs
 * - collectors: Collector/target zone configs
 * - walls: Obstacle configurations
 * - gates: Slideable gate configs
 */
export const LEVEL_DATA = [
  {
    id: 1,
    name: 'First Drop',
    timeLimit: 60,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: 0,
        y: 5.5,
        rate: 40,
        velocity: new THREE.Vector3(0, -8, 0),
        spread: new THREE.Vector3(0.5, 0.3, 0),
        color: new THREE.Color(0xff4400), // Orange
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: -1.5, y: 2, width: 1.2, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: 0, y: -4.5, radius: 0.6, requiredColor: 0xff4400, targetCount: 15 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-3.5, -4, -0.2), new THREE.Vector3(3.5, -3.5, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 2,
    name: 'Dual Stream',
    timeLimit: 60,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: -1.5,
        y: 5.5,
        rate: 30,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.4, 0.3, 0),
        color: new THREE.Color(0xff4400), // Orange
        lifetime: 4.0,
      },
      {
        id: 'e2',
        x: 1.5,
        y: 5.5,
        rate: 30,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.4, 0.3, 0),
        color: new THREE.Color(0x0088ff), // Blue
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: -1.5, y: 2, width: 1.0, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -0.8, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 10 },
      { id: 'c2', x: 0.8, y: -4.5, radius: 0.5, requiredColor: 0x0088ff, targetCount: 10 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-0.15, -3.5, -0.2), new THREE.Vector3(0.15, -1, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 3,
    name: 'Three Colors',
    timeLimit: 75,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: -2,
        y: 5.5,
        rate: 25,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.3, 0),
        color: new THREE.Color(0xff4400), // Orange
        lifetime: 4.0,
      },
      {
        id: 'e2',
        x: 0,
        y: 5.5,
        rate: 25,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.3, 0),
        color: new THREE.Color(0x0088ff), // Blue
        lifetime: 4.0,
      },
      {
        id: 'e3',
        x: 2,
        y: 5.5,
        rate: 25,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.3, 0),
        color: new THREE.Color(0xff0088), // Pink
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: 0, y: 1.5, width: 1.5, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -1.5, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 8 },
      { id: 'c2', x: 0, y: -4.5, radius: 0.5, requiredColor: 0x0088ff, targetCount: 8 },
      { id: 'c3', x: 1.5, y: -4.5, radius: 0.5, requiredColor: 0xff0088, targetCount: 8 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-1.2, -3, -0.2), new THREE.Vector3(-0.8, -1, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(0.8, -3, -0.2), new THREE.Vector3(1.2, -1, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 4,
    name: 'Gate Keeper',
    timeLimit: 75,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: 0,
        y: 5.5,
        rate: 35,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.6, 0.3, 0),
        color: new THREE.Color(0xffaa00), // Yellow
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: 0, y: 2, width: 1.2, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: 0, y: -4.5, radius: 0.6, requiredColor: 0xffaa00, targetCount: 12 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-2, -3.5, -0.2), new THREE.Vector3(2, -3, 0.2)) },
    ],
    gates: [
      { id: 'g1', x: 0, y: 0, width: 2, height: 0.15, slideRange: 1.5, color: 0x886644 },
    ],
  },
  {
    id: 5,
    name: 'Maze Runner',
    timeLimit: 90,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: -2.5,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(1, -7, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0xff4400), // Orange
        lifetime: 4.5,
      },
      {
        id: 'e2',
        x: 2.5,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(-1, -7, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0x00ff00), // Green
        lifetime: 4.5,
      },
    ],
    paddles: [
      { id: 'p1', x: -1.5, y: 2.5, width: 1.0, height: 0.15, color: 0x00aaff, rotation: 0 },
      { id: 'p2', x: 1.5, y: 2.5, width: 1.0, height: 0.15, color: 0x00aaff, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -1.5, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 10 },
      { id: 'c2', x: 1.5, y: -4.5, radius: 0.5, requiredColor: 0x00ff00, targetCount: 10 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-0.5, -4, -0.2), new THREE.Vector3(-0.5, 1, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(0.5, -4, -0.2), new THREE.Vector3(0.5, 1, 0.2)) },
      { id: 'w3', aabb: new THREE.Box3(new THREE.Vector3(-2, -0.5, -0.2), new THREE.Vector3(2, -0.5, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 6,
    name: 'Color Chaos',
    timeLimit: 90,
    lives: 2,
    emitters: [
      {
        id: 'e1',
        x: -3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(1, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xff4400),
        lifetime: 3.5,
      },
      {
        id: 'e2',
        x: 0,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(0, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0x0088ff),
        lifetime: 3.5,
      },
      {
        id: 'e3',
        x: 3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(-1, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xff0088),
        lifetime: 3.5,
      },
    ],
    paddles: [
      { id: 'p1', x: 0, y: 2, width: 1.4, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -1.5, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 8 },
      { id: 'c2', x: 0, y: -4.5, radius: 0.5, requiredColor: 0x0088ff, targetCount: 8 },
      { id: 'c3', x: 1.5, y: -4.5, radius: 0.5, requiredColor: 0xff0088, targetCount: 8 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-1.8, -3.5, -0.2), new THREE.Vector3(-1.0, -2, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(1.0, -3.5, -0.2), new THREE.Vector3(1.8, -2, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 7,
    name: 'Funnel Vision',
    timeLimit: 90,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: 0,
        y: 5.5,
        rate: 40,
        velocity: new THREE.Vector3(0, -6, 0),
        spread: new THREE.Vector3(2, 0.2, 0),
        color: new THREE.Color(0xffaa00),
        lifetime: 5.0,
      },
    ],
    paddles: [
      { id: 'p1', x: 0, y: 3, width: 0.8, height: 0.15, color: 0x00ff88, rotation: 0 },
      { id: 'p2', x: 0, y: 0, width: 0.8, height: 0.15, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: 0, y: -4.5, radius: 0.7, requiredColor: 0xffaa00, targetCount: 15 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-2, 1, -0.2), new THREE.Vector3(-0.5, 1.5, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(0.5, 1, -0.2), new THREE.Vector3(2, 1.5, 0.2)) },
      { id: 'w3', aabb: new THREE.Box3(new THREE.Vector3(-1.5, -1, -0.2), new THREE.Vector3(-0.3, -0.5, 0.2)) },
      { id: 'w4', aabb: new THREE.Box3(new THREE.Vector3(0.3, -1, -0.2), new THREE.Vector3(1.5, -0.5, 0.2)) },
    ],
    gates: [
      { id: 'g1', x: 0, y: -2.5, width: 3, height: 0.15, slideRange: 1, color: 0x886644 },
    ],
  },
  {
    id: 8,
    name: 'Twin Gates',
    timeLimit: 100,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: -2,
        y: 5.5,
        rate: 25,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xff4400),
        lifetime: 4.0,
      },
      {
        id: 'e2',
        x: 2,
        y: 5.5,
        rate: 25,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0x0088ff),
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: -1.5, y: 3, width: 1.0, height: 0.15, color: 0x00aaff, rotation: 0 },
      { id: 'p2', x: 1.5, y: 3, width: 1.0, height: 0.15, color: 0x00aaff, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -1, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 10 },
      { id: 'c2', x: 1, y: -4.5, radius: 0.5, requiredColor: 0x0088ff, targetCount: 10 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-3.5, -4, -0.2), new THREE.Vector3(-2.5, -3.5, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(2.5, -4, -0.2), new THREE.Vector3(3.5, -3.5, 0.2)) },
    ],
    gates: [
      { id: 'g1', x: 0, y: 1, width: 0.3, height: 2, slideRange: 2, color: 0x886644 },
    ],
  },
  {
    id: 9,
    name: 'The Gauntlet',
    timeLimit: 100,
    lives: 2,
    emitters: [
      {
        id: 'e1',
        x: -3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(1, -8, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0xff4400),
        lifetime: 3.5,
      },
      {
        id: 'e2',
        x: -1.5,
        y: 5.5,
        rate: 15,
        velocity: new THREE.Vector3(0.5, -8, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0x00ff00),
        lifetime: 3.5,
      },
      {
        id: 'e3',
        x: 1.5,
        y: 5.5,
        rate: 15,
        velocity: new THREE.Vector3(-0.5, -8, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0x0088ff),
        lifetime: 3.5,
      },
      {
        id: 'e4',
        x: 3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(-1, -8, 0),
        spread: new THREE.Vector3(0.2, 0.2, 0),
        color: new THREE.Color(0xff0088),
        lifetime: 3.5,
      },
    ],
    paddles: [
      { id: 'p1', x: -2, y: 2.5, width: 0.8, height: 0.12, color: 0x00aaff, rotation: 0 },
      { id: 'p2', x: 2, y: 2.5, width: 0.8, height: 0.12, color: 0x00aaff, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -2, y: -4.5, radius: 0.45, requiredColor: 0xff4400, targetCount: 6 },
      { id: 'c2', x: -0.7, y: -4.5, radius: 0.45, requiredColor: 0x00ff00, targetCount: 6 },
      { id: 'c3', x: 0.7, y: -4.5, radius: 0.45, requiredColor: 0x0088ff, targetCount: 6 },
      { id: 'c4', x: 2, y: -4.5, radius: 0.45, requiredColor: 0xff0088, targetCount: 6 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-0.3, -3.5, -0.2), new THREE.Vector3(0.3, 1, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(-2, -1.5, -0.2), new THREE.Vector3(2, -1.2, 0.2)) },
    ],
    gates: [],
  },
  {
    id: 10,
    name: 'Final Pop',
    timeLimit: 120,
    lives: 3,
    emitters: [
      {
        id: 'e1',
        x: -3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(0.5, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xff4400),
        lifetime: 4.0,
      },
      {
        id: 'e2',
        x: -1.5,
        y: 5.5,
        rate: 18,
        velocity: new THREE.Vector3(0.2, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0x0088ff),
        lifetime: 4.0,
      },
      {
        id: 'e3',
        x: 0,
        y: 5.5,
        rate: 15,
        velocity: new THREE.Vector3(0, -7, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xffaa00),
        lifetime: 4.0,
      },
      {
        id: 'e4',
        x: 1.5,
        y: 5.5,
        rate: 18,
        velocity: new THREE.Vector3(-0.2, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0x00ff00),
        lifetime: 4.0,
      },
      {
        id: 'e5',
        x: 3,
        y: 5.5,
        rate: 20,
        velocity: new THREE.Vector3(-0.5, -8, 0),
        spread: new THREE.Vector3(0.3, 0.2, 0),
        color: new THREE.Color(0xff0088),
        lifetime: 4.0,
      },
    ],
    paddles: [
      { id: 'p1', x: -2.5, y: 3.5, width: 0.8, height: 0.12, color: 0x00aaff, rotation: 0 },
      { id: 'p2', x: 2.5, y: 3.5, width: 0.8, height: 0.12, color: 0x00aaff, rotation: 0 },
      { id: 'p3', x: 0, y: 0, width: 1.2, height: 0.12, color: 0x00ff88, rotation: 0 },
    ],
    collectors: [
      { id: 'c1', x: -2, y: -4.5, radius: 0.5, requiredColor: 0xff4400, targetCount: 6 },
      { id: 'c2', x: -1, y: -4.5, radius: 0.5, requiredColor: 0x0088ff, targetCount: 6 },
      { id: 'c3', x: 0, y: -4.5, radius: 0.5, requiredColor: 0xffaa00, targetCount: 6 },
      { id: 'c4', x: 1, y: -4.5, radius: 0.5, requiredColor: 0x00ff00, targetCount: 6 },
      { id: 'c5', x: 2, y: -4.5, radius: 0.5, requiredColor: 0xff0088, targetCount: 6 },
    ],
    walls: [
      { id: 'w1', aabb: new THREE.Box3(new THREE.Vector3(-1, -3, -0.2), new THREE.Vector3(-0.5, 2, 0.2)) },
      { id: 'w2', aabb: new THREE.Box3(new THREE.Vector3(0.5, -3, -0.2), new THREE.Vector3(1, 2, 0.2)) },
      { id: 'w3', aabb: new THREE.Box3(new THREE.Vector3(-2, -1.5, -0.2), new THREE.Vector3(-1, -1, 0.2)) },
      { id: 'w4', aabb: new THREE.Box3(new THREE.Vector3(1, -1.5, -0.2), new THREE.Vector3(2, -1, 0.2)) },
    ],
    gates: [
      { id: 'g1', x: 0, y: 4, width: 2.5, height: 0.15, slideRange: 1, color: 0x886644 },
    ],
  },
];

/**
 * Star rating based on remaining time and lives.
 * @param {number} timeRemaining Seconds left
 * @param {number} timeLimit Total time limit
 * @param {number} livesRemaining Lives left
 * @param {number} totalLives Starting lives
 * @returns {number} Star count (1-3)
 */
export function calculateStarRating(timeRemaining, timeLimit, livesRemaining, totalLives) {
  let score = 0;
  const timeRatio = timeRemaining / timeLimit;

  if (timeRatio >= 0.5) score += 1;
  if (livesRemaining >= totalLives) score += 1;
  if (timeRatio >= 0.3 && livesRemaining >= 1) score += 1;

  return Math.max(1, Math.min(3, score));
}

/**
 * LevelManager — Manages level data, progression, and persistence.
 */
export class LevelManager {
  constructor(saveManager) {
    /** @type {SaveManager} */
    this.saveManager = saveManager;

    /** @type {number} Currently active level index (0-based) */
    this.currentLevelIndex = 0;

    /** @type {Object|null} Current level data */
    this.currentLevel = null;

    /** @type {number} Level start time (timestamp) */
    this.levelStartTime = 0;

    /** @type {number} Current lives */
    this.lives = 3;

    /** @type {number} Total lives for this level */
    this.totalLives = 3;

    /** @type {boolean} Whether the level is complete */
    this.levelComplete = false;

    /** @type {number} Star rating for current level (if completed) */
    this.starRating = 0;

    /** @type {number} Incorrect particles collected */
    this.wrongCollisions = 0;
  }

  /**
   * Load a specific level by index.
   * @param {number} index - Level index (0-based)
   * @returns {Object|null} Level data or null if locked
   */
  loadLevel(index) {
    if (index < 0 || index >= LEVEL_DATA.length) return null;

    // Check if level is unlocked
    const unlocked = this.saveManager.isLevelUnlocked(index + 1);
    if (!unlocked && index > 0) return null;

    this.currentLevelIndex = index;
    this.currentLevel = LEVEL_DATA[index];
    this.lives = this.currentLevel.lives;
    this.totalLives = this.currentLevel.lives;
    this.levelComplete = false;
    this.starRating = 0;
    this.levelStartTime = Date.now();
    this.wrongCollisions = 0;

    return this.currentLevel;
  }

  /**
   * Get the next level to play (first uncompleted).
   * @returns {number} Level index (0-based)
   */
  getNextLevelIndex() {
    const saved = this.saveManager.getSavedData();

    // Find first level that isn't completed
    for (let i = 0; i < LEVEL_DATA.length; i++) {
      const levelData = saved.levels[i + 1];
      if (!levelData || !levelData.completed) {
        return i;
      }
    }

    // All levels completed, return first level (for replay)
    return 0;
  }

  /**
   * Mark the current level as complete.
   * @param {number} stars - Star rating (1-3)
   * @returns {boolean} Whether a new level was unlocked
   */
  completeLevel(stars) {
    if (!this.currentLevel) return false;

    this.levelComplete = true;
    this.starRating = stars;

    const levelId = this.currentLevel.id;
    this.saveManager.completeLevel(levelId, stars);

    // Unlock next level if not the last one
    const nextLevelId = levelId + 1;
    if (nextLevelId <= LEVEL_DATA.length) {
      return this.saveManager.unlockLevel(nextLevelId);
    }

    return false;
  }

  /**
   * Reset the current level state for retry.
   */
  resetForRetry() {
    if (!this.currentLevel) return;

    this.lives = this.totalLives;
    this.levelComplete = false;
    this.starRating = 0;
    this.levelStartTime = Date.now();
    this.wrongCollisions = 0;
  }

  /**
   * Lose a life. Returns true if still alive.
   * @returns {boolean} True if player is still alive
   */
  loseLife() {
    this.lives--;
    return this.lives > 0;
  }

  /**
   * Increment wrong collision count.
   */
  incrementWrongCollisions() {
    this.wrongCollisions++;
  }

  /**
   * Check if the level should fail based on wrong collisions.
   * @returns {boolean} True if level should fail
   */
  shouldFailFromCollisions() {
    // Fail if wrong collisions exceed lives
    return this.wrongCollisions >= this.totalLives;
  }

  /**
   * Get time remaining for the current level.
   * @returns {number} Seconds remaining
   */
  getTimeRemaining() {
    if (!this.currentLevel) return 0;
    const elapsed = (Date.now() - this.levelStartTime) / 1000;
    return Math.max(0, this.currentLevel.timeLimit - elapsed);
  }

  /**
   * Check if time is up.
   * @returns {boolean} True if time ran out
   */
  isTimeUp() {
    return this.getTimeRemaining() <= 0;
  }

  /**
   * Get all collectors' progress for the current level.
   * @param {Array<Object>} collectors - Array of collector objects from Scene
   * @returns {boolean} True if all collectors are complete
   */
  areAllCollectorsComplete(collectors) {
    if (!collectors || collectors.length === 0) return false;

    return collectors.every((c) => c.collectedCount >= c.targetCount);
  }

  /**
   * Get the star rating for a given level (from saved data).
   * @param {number} levelId - Level ID (1-based)
   * @returns {number} Star rating (0 if not completed)
   */
  getStarRatingForLevel(levelId) {
    return this.saveManager.getLevelStarRating(levelId) || 0;
  }

  /**
   * Get the best star rating across all levels.
   * @returns {number} Max stars achieved
   */
  getBestStars() {
    return this.saveManager.getBestStars();
  }

  /**
   * Check if the current level is the final level.
   * @returns {boolean}
   */
  isFinalLevel() {
    return !this.currentLevel || this.currentLevel.id >= LEVEL_DATA.length;
  }

  /**
   * Reset all progress (for development/testing).
   */
  resetProgress() {
    this.saveManager.resetProgress();
    this.currentLevel = null;
    this.currentLevelIndex = 0;
    this.lives = 3;
    this.levelComplete = false;
  }
}
