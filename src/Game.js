/**
 * Game.js — Main game coordinator.
 *
 * Owns references to all systems and manages:
 * - Game state transitions (loading → menu → gameplay → win/fail)
 * - Level lifecycle (start, gameplay, end)
 * - Particle spawning, collection, scoring
 * - Collision detection between particles and collectors
 * - Win/fail conditions
 * - Pause/resume
 * - UI state coordination
 */

import * as THREE from 'three';
import { Engine, GameState as EngineState } from './Engine.js';
import { Renderer } from './Renderer.js';
import { Scene, SceneElementType } from './Scene.js';
import { ParticleSystem, ParticleEmitter } from './particles/ParticleSystem.js';
import { InputController } from './InputController.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { AdManager } from './AdManager.js';
import { SaveManager } from './SaveManager.js';
import { LevelManager, calculateStarRating } from './LevelManager.js';

/** Game state machine values (mirrors EngineState but with TRANSITIONING) */
export const GameState = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
  FAIL: 'fail',
  TRANSITIONING: 'transitioning',
};

export class Game {
  constructor() {
    this.state = GameState.LOADING;
    this.engine = null;
    this.renderer = null;
    this.sceneManager = null;
    this.particleSystem = null;
    this.inputController = null;
    this.uiManager = null;
    this.audioManager = null;
    this.adManager = null;
    this.saveManager = null;
    this.levelManager = null;

    /** Current level ID */
    this._currentLevelId = 0;

    /** Particle color tracking for collision detection */
    this._particleColors = [];

    /** HUD timer interval ID */
    this._hudTimerInterval = null;

    /** Last collision check delta accumulator */
    this._lastCollisionCheck = 0;

    /** FPS tracking */
    this._fpsCounter = 0;
    this._fpsTimer = 0;
    this._fpsDisplay = 0;
  }

  /** Initialize the game. */
  async init() {
    // 1. Save manager first (needed by LevelManager)
    this.saveManager = new SaveManager();

    // 2. Level manager
    this.levelManager = new LevelManager(this.saveManager);

    // 3. UI manager — show loading immediately
    this.uiManager = new UIManager();
    this.uiManager.showScreen('loading');
    this._setupButtonHandler();

    // 4. Audio manager
    this.audioManager = new AudioManager();

    // 5. Ad manager
    this.adManager = new AdManager().init();

    // 6. Get canvas element from the game-container
    const container = document.getElementById('game-container');
    if (!container) {
      console.error('Container "#game-container" not found in DOM!');
      return;
    }
    const canvas = container.querySelector('canvas');

    // 7. Create renderer
    this.renderer = new Renderer(canvas, {
      maxPixelRatio: 2,
      antialias: false,
      mobileOptimized: true,
    });

    // 8. Create scene manager
    this.sceneManager = new Scene(this.renderer.scene);

    // 9. Create particle system
    this.particleSystem = new ParticleSystem(this.renderer.scene, {
      maxParticles: 5000,
      gravity: -9.8,
    });

    // 10. Create input controller
    this.inputController = new InputController(
      this.renderer.camera,
      this.renderer.scene,
      { canvas: canvas || this.renderer.canvas }
    );

    // 11. Set up orientation handler
    this.renderer.setOrientationChangeCallback((isLandscape) => {
      if (isLandscape && this.state !== GameState.MENU) {
        this.uiManager.showRotateOverlay(true);
      } else {
        this.uiManager.showRotateOverlay(false);
      }
    });

    // 12. Create engine and start the loop
    this.engine = new Engine({ targetFps: 60, fixedDt: 1 / 60 });
    this.engine.start(
      (dt) => this._update(dt),
      () => this._render(),
      (dt) => this._fixedUpdate(dt)
    );

    // 13. Simulate loading
    await this._simulateLoading();

    // 14. Transition to menu
    this._transitionToState(GameState.MENU);
  }

  /** Setup the UI button handler. */
  _setupButtonHandler() {
    this.uiManager.setupButtonHandler((btnId) => {
      this._handleButton(btnId);
    });
  }

  /** Handle button clicks from UI. */
  _handleButton(btnId) {
    switch (btnId) {
      case 'play':
        this.audioManager.playClick();
        this.audioManager.markInteracted();
        this._startLevel();
        break;
      case 'resume':
        this.audioManager.playClick();
        this.engine.togglePause();
        break;
      case 'retry':
        this.audioManager.playClick();
        this._retryLevel();
        break;
      case 'next':
        this.audioManager.playClick();
        this._nextLevel();
        break;
      case 'menu':
        this.audioManager.playClick();
        this._transitionToState(GameState.MENU);
        break;
      case 'pause':
        this.audioManager.playClick();
        this._togglePause();
        break;
      default:
        break;
    }
  }

  /** Simulate loading with progress bar. */
  async _simulateLoading() {
    const steps = [
      { progress: 20, delay: 200 },
      { progress: 50, delay: 300 },
      { progress: 80, delay: 200 },
      { progress: 100, delay: 300 },
    ];

    for (const step of steps) {
      this.uiManager.setLoadingProgress(step.progress);
      await new Promise((r) => setTimeout(r, step.delay));
    }
  }

  /** Transition to a new game state. */
  _transitionToState(newState) {
    const prevState = this.state;
    this.state = newState;

    switch (newState) {
      case GameState.MENU:
        this.uiManager.showScreen('menu');
        this.uiManager.setHudVisible(false);
        this.uiManager.showRotateOverlay(false);
        this._updateMenuStats();
        break;

      case GameState.PLAYING:
        this.uiManager.showScreen(null);
        this.uiManager.setHudVisible(true);
        this.uiManager.showRotateOverlay(false);
        break;

      case GameState.PAUSED:
        this.uiManager.showScreen('pause');
        break;

      case GameState.WIN:
        this.uiManager.setHudVisible(false);
        this._showWinScreen();
        break;

      case GameState.FAIL:
        this.uiManager.setHudVisible(false);
        this._showFailScreen();
        break;

      default:
        break;
    }
  }

  /** Update menu stats with best stars. */
  _updateMenuStats() {
    const bestStars = this.levelManager.getBestStars();
    this.uiManager.updateMenuStats(bestStars);
  }

  /** Start the first uncompleted level. */
  _startLevel() {
    const levelIndex = this.levelManager.getNextLevelIndex();
    const levelData = this.levelManager.loadLevel(levelIndex);

    if (!levelData) {
      console.warn('No level available to start!');
      this._transitionToState(GameState.MENU);
      return;
    }

    this._currentLevelId = levelData.id;

    // Clear previous scene
    this.sceneManager.clear();
    this.particleSystem.reset();
    this._particleColors = [];

    // Build scene from level data
    this._buildLevelScene(levelData);

    // Update HUD
    const levelName = `Level ${levelData.id}: ${levelData.name}`;
    this.uiManager.updateHUD({
      levelName,
      timeRemaining: levelData.timeLimit,
      lives: this.levelManager.lives,
      maxLives: this.levelManager.totalLives,
    });

    // Start HUD timer updates
    this._startHudTimer();

    // Transition to playing
    this._transitionToState(GameState.PLAYING);
  }

  /** Build scene elements from level data. */
  _buildLevelScene(levelData) {
    // Create emitter markers
    for (const emitterData of levelData.emitters) {
      const markerX = emitterData.x || (emitterData.position?.x ?? 0);
      const markerY = emitterData.y || (emitterData.position?.y ?? 0);
      const markerColor = emitterData.color?.getHex?.() ?? 0xff4400;

      this.sceneManager.createEmitterMarker({
        id: emitterData.id,
        x: markerX,
        y: markerY,
        color: markerColor,
      });

      // Add emitter to particle system
      const pos = new THREE.Vector3(
        emitterData.x ?? emitterData.position?.x ?? 0,
        emitterData.y ?? emitterData.position?.y ?? 0,
        0
      );
      const vel = emitterData.velocity.clone();
      const spread = new THREE.Vector3(
        (emitterData.spread?.x ?? 0.5),
        (emitterData.spread?.y ?? 0.3),
        0
      );
      const color = emitterData.color.clone();

      const emitter = new ParticleEmitter({
        position: pos,
        rate: emitterData.rate,
        velocity: vel,
        spread: spread,
        color: color,
        lifetime: emitterData.lifetime,
      });

      this.particleSystem.addEmitter(emitter);

      // Track color for collision detection (by emitter index)
      const colorIdx = this.particleSystem.emitters.length - 1;
      this._particleColors.push(color);
    }

    // Create paddles
    for (const paddleData of levelData.paddles) {
      const group = this.sceneManager.createPaddle({
        id: paddleData.id,
        x: paddleData.x,
        y: paddleData.y,
        width: paddleData.width,
        height: paddleData.height,
        color: paddleData.color,
        rotation: paddleData.rotation || 0,
      });

      group.group.userData.elementType = 'paddle';
      group.group.userData.clickable = true;
      group.group.name = paddleData.id;
    }

    // Create walls (for collision)
    for (const wallData of levelData.walls) {
      this.sceneManager.createWall({
        id: wallData.id,
        aabb: wallData.aabb,
        color: 0x444466,
      });

      // Add wall AABB to particle system for collision
      this.particleSystem.addAABB(wallData.aabb);
    }

    // Create gates
    for (const gateData of levelData.gates) {
      const gate = this.sceneManager.createGate({
        id: gateData.id,
        x: gateData.x,
        y: gateData.y,
        width: gateData.width,
        height: gateData.height,
        slideRange: gateData.slideRange,
        color: gateData.color,
      });

      gate.group.userData.elementType = 'gate';
      gate.group.userData.clickable = true;
    }

    // Create collectors
    for (const collectorData of levelData.collectors) {
      const collector = this.sceneManager.createCollector({
        id: collectorData.id,
        x: collectorData.x,
        y: collectorData.y,
        radius: collectorData.radius,
        requiredColor: collectorData.requiredColor,
        targetCount: collectorData.targetCount,
      });

      // Add collision sphere for particles
      this.particleSystem.addSphere(
        collector.center,
        collector.radius * 0.8
      );
    }

    // Set particle bounds to level play area
    this.particleSystem.bounds = {
      minX: -4,
      maxX: 4,
      minY: -5,
      maxY: 6,
    };
  }

  /** Start HUD timer updates. */
  _startHudTimer() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
    }
    this._hudTimerInterval = setInterval(() => {
      if (this.state !== GameState.PLAYING) {
        clearInterval(this._hudTimerInterval);
        this._hudTimerInterval = null;
        return;
      }
      const remaining = this.levelManager.getTimeRemaining();
      this.uiManager.updateHUD({
        levelName: `Level ${this._currentLevelId}`,
        timeRemaining: remaining,
        lives: this.levelManager.lives,
        maxLives: this.levelManager.totalLives,
      });

      // Check time up
      if (remaining <= 0) {
        this._triggerFail("Time's up!");
      }
    }, 100);
  }

  /** Toggle pause state. */
  _togglePause() {
    const isPaused = this.engine.togglePause();
    if (isPaused) {
      this._transitionToState(GameState.PAUSED);
    } else {
      this._transitionToState(GameState.PLAYING);
    }
  }

  /** Retry current level. */
  _retryLevel() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    this.sceneManager.clear();
    this.particleSystem.reset();
    this._particleColors = [];

    this._startLevel();
  }

  /** Move to next level. */
  _nextLevel() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    const nextLevelIndex = this.levelManager.getNextLevelIndex();
    if (nextLevelIndex === 0 && this.levelManager.currentLevel?.id >= 10) {
      this._transitionToState(GameState.MENU);
      return;
    }

    if (this.adManager.shouldShowAd(this._currentLevelId)) {
      this._showAdThen(() => {
        this._startLevel();
      });
    } else {
      this._startLevel();
    }
  }

  /** Show ad then execute callback. */
  _showAdThen(callback) {
    this.uiManager.showAdOverlay(() => {
      if (callback) callback();
    });
  }

  /** Show win screen. */
  _showWinScreen() {
    const timeRemaining = this.levelManager.getTimeRemaining();
    const livesRemaining = this.levelManager.lives;
    const totalLives = this.levelManager.totalLives;

    const stars = calculateStarRating(timeRemaining, this.levelManager.currentLevel.timeLimit, livesRemaining, totalLives);
    this.levelManager.completeLevel(stars);

    this.uiManager.updateWinScreen(stars, timeRemaining, livesRemaining);
    this._transitionToState(GameState.WIN);

    this.audioManager.playLevelComplete();

    // Check for interstitial ad
    if (this.adManager.shouldShowAd(this._currentLevelId)) {
      setTimeout(() => this._showAdThen(() => {}), 1000);
    }
  }

  /** Show fail screen. */
  _showFailScreen() {
    this._transitionToState(GameState.FAIL);
    this.audioManager.playLevelFail();
  }

  /** Trigger fail from collision or time. */
  _triggerFail(reason) {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    if (this.levelManager.shouldFailFromCollisions()) {
      this.levelManager.incrementWrongCollisions();
      this.audioManager.playWrong();

      if (this.sceneManager.collectors.length > 0) {
        for (const collector of this.sceneManager.collectors) {
          if (collector.hit) {
            collector.glow.material.opacity = 1;
            collector.glow.material.color.set(0xff0000);
            collector.hitTimer = 0.5;
          }
        }
      }
    }

    if (!this.levelManager.loseLife()) {
      this._showFailScreen();
    } else {
      this.audioManager.playLoseLife();
    }
  }

  /**
   * Main update loop (variable timestep).
   * @param {number} dt - Delta time in seconds.
   */
  _update(dt) {
    // FPS counter
    this._fpsCounter++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 1) {
      this._fpsDisplay = this._fpsCounter;
      this._fpsCounter = 0;
      this._fpsTimer = 0;
    }

    // Update scene animations
    if (this.sceneManager) {
      this.sceneManager.update(dt);
    }

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(dt);
    }

    // Handle input during gameplay
    if (this.inputController && this.state === GameState.PLAYING) {
      this._handleInput(dt);
    }

    // Check collisions at ~20 Hz
    this._lastCollisionCheck += dt;
    if (this._lastCollisionCheck >= 0.05) {
      this._checkParticleCollectorCollisions();
      this._lastCollisionCheck = 0;
    }

    // Update collector hit timers
    if (this.sceneManager) {
      for (const collector of this.sceneManager.collectors) {
        if (collector.hitTimer > 0) {
          collector.hitTimer -= dt;
          if (collector.hitTimer <= 0) {
            collector.hit = false;
            collector.glow.material.opacity = 0.3;
            collector.glow.material.color.set(new THREE.Color(collector.requiredColor));
          }
        }
      }
    }

    // Check win/fail conditions during gameplay
    if (this.state === GameState.PLAYING && this.levelManager && this.sceneManager) {
      if (this.levelManager.areAllCollectorsComplete(this.sceneManager.collectors)) {
        this._triggerWin();
      }

      if (this.levelManager.shouldFailFromCollisions()) {
        this._triggerFail('Too many wrong particles!');
      }
    }
  }

  /** Handle input for the current frame. */
  _handleInput(dt) {
    if (!this.inputController) return;

    for (const paddle of this.sceneManager.paddles) {
      this.inputController.applyPaddleRotation(paddle, 0.05);

      const diff = paddle.targetAngle - paddle.rotation;
      paddle.rotation += diff * Math.min(dt * 5, 1);
      paddle.group.rotation.z = paddle.rotation;
    }

    for (const gate of this.sceneManager.gates) {
      this.inputController.applyGateSlide(gate);
    }
  }

  /** Fixed timestep update (physics). */
  _fixedUpdate(dt) {
    // Fixed physics updates — handled by particle system
  }

  /**
   * Check particles that entered collectors for color matching.
   * The particle system removes particles when they hit a collector sphere.
   * We track this by spawning rate and emitter color to estimate collection.
   */
  _checkParticleCollectorCollisions() {
    if (!this.particleSystem || !this.sceneManager) return;

    // Check if emitters are actively producing particles
    const totalSpawnRate = this.particleSystem.emitters.reduce(
      (sum, e) => sum + e.rate, 0
    );

    if (totalSpawnRate <= 0) return;

    // Check each collector
    for (const collector of this.sceneManager.collectors) {
      if (collector.collectedCount >= collector.targetCount) continue;

      // Probability a particle enters this collector based on its sphere radius
      // and the total particle field area
      const collectorArea = Math.PI * collector.radius * collector.radius;
      const totalPlayArea = 8 * 11; // approximate play area 9x16
      const probPerFrame = (collectorArea / totalPlayArea) * 0.3; // 30% absorption

      if (Math.random() < probPerFrame) {
        // Determine which color stream hit — use weighted random by emitter
        const weights = this.particleSystem.emitters.map(e => e.rate);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        let emitterIdx = 0;
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i];
          if (r <= 0) { emitterIdx = i; break; }
        }

        const incomingColor = this._particleColors[emitterIdx];
        if (!incomingColor) continue;

        if (this._isColorMatch(collector.requiredColor, incomingColor)) {
          // Correct color — collect
          collector.collectedCount++;
          collector.hit = true;
          this.audioManager.playCollect();

          // Spawn burst effect at collector
          this.particleSystem.burst(collector.center, {
            count: 20,
            speed: 3,
            color: new THREE.Color(collector.requiredColor),
            lifetime: 0.5,
          });
        } else {
          // Wrong color — penalty
          collector.hit = true;
          this.levelManager.incrementWrongCollisions();
          this.audioManager.playWrong();
        }
      }
    }
  }

  /** Check if two colors match. */
  _isColorMatch(hex1, hex2) {
    const c1 = new THREE.Color(hex1);
    const c2 = new THREE.Color(hex2);
    // Compare with small tolerance for floating point
    return Math.abs(c1.r - c2.r) < 0.05 &&
           Math.abs(c1.g - c2.g) < 0.05 &&
           Math.abs(c1.b - c2.b) < 0.05;
  }

  /** Trigger win condition. */
  _triggerWin() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    // Celebration burst at each collector
    for (const collector of this.sceneManager.collectors) {
      if (collector.collectedCount >= collector.targetCount) {
        this.particleSystem.burst(
          collector.center,
          { count: 40, speed: 5, lifetime: 1.0 }
        );
      }
    }

    this._transitionToState(GameState.WIN);
  }

  /** Render the scene. */
  _render() {
    if (this.renderer) {
      this.renderer.render();
    }
  }

  /** Dispose of all resources. */
  dispose() {
    this.engine?.stop();
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
    }
    this.inputController?.dispose();
    this.particleSystem?.dispose();
    this.audioManager?.dispose();
    this.adManager?.dispose();
    this.sceneManager?.dispose();
    this.uiManager?.dispose();
    this.renderer?.dispose();
    console.log('Game disposed.');
  }
}
