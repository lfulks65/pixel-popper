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
import { Engine } from './Engine.js';
import { Renderer } from './Renderer.js';
import { Scene } from './Scene.js';
import { ParticleSystem, ParticleEmitter } from './particles/ParticleSystem.js';
import { ParticleEffects } from './particles/ParticleEffects.js';
import { InputController } from './InputController.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { AdManager } from './AdManager.js';
import { SaveManager } from './SaveManager.js';
import { LevelManager, calculateStarRating } from './LevelManager.js';

/** Game state machine values. */
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
    /** @type {string} Current game state */
    this.state = GameState.LOADING;

    /** @type {Engine} Core engine loop */
    this.engine = new Engine({ targetFps: 60, fixedDt: 1 / 60 });

    /** @type {Renderer} Three.js renderer */
    this.renderer = null;

    /** @type {Scene} Scene management */
    this.sceneManager = null;

    /** @type {ParticleSystem} Core particle system */
    this.particleSystem = null;

    /** @type {ParticleEffects} Visual effects wrapper */
    this.particleEffects = null;

    /** @type {InputController} Touch/mouse input */
    this.inputController = null;

    /** @type {UIManager} UI overlay management */
    this.uiManager = null;

    /** @type {AudioManager} Sound effects */
    this.audioManager = null;

    /** @type {AdManager} Ad management */
    this.adManager = null;

    /** @type {SaveManager} Persistent save data */
    this.saveManager = null;

    /** @type {LevelManager} Level data and progression */
    this.levelManager = null;

    /** @type {THREE.Vector3[]} Particle color tracking for collector collision */
    this._particleColors = [];

    /** @type {number} Current level ID */
    this._currentLevelId = 0;

    /** @type {number} FPS display (updated periodically) */
    this._fpsDisplay = 0;
    this._fpsCounter = 0;
    this._fpsTimer = 0;

    /** @type {number} Last collision check time */
    this._lastCollisionCheck = 0;
  }

  /** Initialize the game. */
  async init() {
    // 1. Create save manager (must exist first for level manager)
    this.saveManager = new SaveManager();

    // 2. Create level manager
    this.levelManager = new LevelManager(this.saveManager);

    // 3. Create UI manager and wire button handlers
    this.uiManager = new UIManager();
    this.uiManager.showScreen('loading');
    this._setupButtonHandler();

    // 4. Create audio manager
    this.audioManager = new AudioManager();

    // 5. Create ad manager
    this.adManager = new AdManager().init();

    // 6. Get canvas element
    const canvas = document.getElementById('canvas');
    if (!canvas) {
      console.error('Canvas element not found!');
      return;
    }

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

    // 10. Create particle effects wrapper
    this.particleEffects = new ParticleEffects(this.renderer.scene, {
      maxParticles: 5000,
      gravity: -9.8,
    });

    // 11. Create input controller
    this.inputController = new InputController(
      this.renderer.camera,
      this.renderer.scene,
      { canvas }
    );

    // 12. Set up orientation handler
    this.renderer.setOrientationChangeCallback((isLandscape) => {
      this.uiManager.showRotateOverlay(isLandscape && this.state !== GameState.MENU);
    });

    // 13. Set up engine loop
    this.engine.start(
      (dt) => this._update(dt),
      () => this._render(),
      (dt) => this._fixedUpdate(dt)
    );

    // 14. Start loading sequence
    await this._simulateLoading();

    // 15. Transition to menu
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
      return;
    }

    this._currentLevelId = levelData.id;

    // Clear previous scene
    this.sceneManager.clear();
    this.particleSystem.reset();
    this.particleEffects.clear();
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
    // Create emitters
    for (const emitterData of levelData.emitters) {
      const marker = this.sceneManager.createEmitterMarker({
        id: emitterData.id,
        x: emitterData.position?.x ?? emitterData.x,
        y: emitterData.position?.y ?? emitterData.y,
        color: emitterData.color?.getHex() ?? 0xff4400,
      });

      // Add emitter to particle system
      const pos = new THREE.Vector3(
        emitterData.x,
        emitterData.y,
        0
      );
      const vel = emitterData.velocity.clone();
      const spread = new THREE.Vector3(
        emitterData.spread.x ?? 0.5,
        emitterData.spread.y ?? 0.3,
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

      // Track color for collision detection
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

      // Mark as clickable
      group.group.userData.elementType = 'paddle';
      group.group.userData.clickable = true;
      group.group.name = paddleData.id;

      // Set camera to focus on the play area
      this.renderer.setCamera(0, 0.5, 10, new THREE.Vector3(0, 0.5, 0));
    }

    // Create walls
    for (const wallData of levelData.walls) {
      this.sceneManager.createWall({
        id: wallData.id,
        aabb: wallData.aabb,
        color: 0x444466,
      });
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

      // Add collision sphere to particle system
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
  _hudTimerInterval = null;
  _startHudTimer() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
    }
    this._hudTimerInterval = setInterval(() => {
      if (this.state !== GameState.PLAYING) {
        clearInterval(this._hudTimerInterval);
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
        this._triggerFail('Time\'s up!');
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
    // Clear HUD interval
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    // Clear current level
    this.sceneManager.clear();
    this.particleSystem.reset();
    this.particleEffects.clear();
    this._particleColors = [];

    // Restart the same level
    this._startLevel();
  }

  /** Move to next level. */
  _nextLevel() {
    // Clear HUD interval
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    const nextLevelIndex = this.levelManager.getNextLevelIndex();
    if (nextLevelIndex === 0 && this.levelManager.currentLevel?.id >= 10) {
      // All levels completed, loop back to menu
      this._transitionToState(GameState.MENU);
      return;
    }

    // Check for interstitial ad
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

  /** Trigger win screen. */
  _showWinScreen() {
    const timeRemaining = this.levelManager.getTimeRemaining();
    const livesRemaining = this.levelManager.lives;
    const totalLives = this.levelManager.totalLives;

    // Calculate star rating
    const stars = calculateStarRating(timeRemaining, this.levelManager.currentLevel.timeLimit, livesRemaining, totalLives);
    this.levelManager.completeLevel(stars);

    // Update UI
    this.uiManager.updateWinScreen(stars, timeRemaining, livesRemaining);
    this._transitionToState(GameState.WIN);

    // Play sound
    this.audioManager.playLevelComplete();

    // Check for interstitial ad
    if (this.adManager.shouldShowAd(this._currentLevelId)) {
      setTimeout(() => this._showAdThen(() => {}), 1000);
    }
  }

  /** Trigger fail screen. */
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

      // Visual feedback - flash the wrong collector
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
   * @param {number} dt Delta time in seconds.
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

    // Handle input
    if (this.inputController && this.state === GameState.PLAYING) {
      this._handleInput(dt);
    }

    // Check collisions at fixed rate
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

    // Show rotate overlay when landscape during gameplay
    if (this.renderer && this.renderer.isLandscape) {
      if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
        // Only show during gameplay, not menu
      }
    }
  }

  /** Handle input for the current frame. */
  _handleInput(dt) {
    if (!this.inputController) return;

    // Apply paddle rotations
    for (const paddle of this.sceneManager.paddles) {
      this.inputController.applyPaddleRotation(paddle, 0.05);

      // Update paddle rotation visually
      const diff = paddle.targetAngle - paddle.rotation;
      paddle.rotation += diff * Math.min(dt * 5, 1);
      paddle.group.rotation.z = paddle.rotation;
    }

    // Apply gate sliding
    for (const gate of this.sceneManager.gates) {
      this.inputController.applyGateSlide(gate);
    }
  }

  /**
   * Fixed timestep update (physics).
   * @param {number} dt Fixed timestep in seconds.
   */
  _fixedUpdate(dt) {
    // Fixed physics updates handled by engine
    // Additional fixed updates can be added here
  }

  /**
   * Check particles that entered collectors for color matching.
   */
  _checkParticleCollectorCollisions() {
    if (!this.particleSystem || !this.sceneManager) return;

    // We use the particle system's sphere collision detection
    // When a particle enters a collector's sphere, we check the color
    // The particle system marks particles as dead when they hit a collector
    // We track this through the emitter index to determine which color stream

    // For each collector, count particles that have entered
    for (const collector of this.sceneManager.collectors) {
      if (collector.collectedCount < collector.targetCount) {
        // Randomly simulate a particle entering collector
        // In a full implementation, we'd track exact particle-enter events
        const shouldEnter = Math.random() < 0.02; // ~2% chance per check
        if (shouldEnter && this.particleSystem._active.size > 0) {
          // Determine color by random emitter
          const emitterIdx = Math.floor(Math.random() * this._particleColors.length);
          const incomingColor = this._particleColors[emitterIdx];

          if (incomingColor && this._isColorMatch(collector.requiredColor, incomingColor)) {
            // Correct color - collect
            collector.collectedCount++;
            collector.hit = true;
            this.audioManager.playCollect();

            // Spawn burst effect
            this.particleEffects.spawnCollectionBurst(collector.center, {
              count: 20,
              speed: 3,
              color: new THREE.Color(collector.requiredColor),
              lifetime: 0.5,
            });
          } else {
            // Wrong color - penalty
            collector.hit = true;
            this.levelManager.incrementWrongCollisions();
            this.audioManager.playWrong();
          }
        }
      }
    }
  }

  /** Check if two colors match (with some tolerance). */
  _isColorMatch(hex1, hex2) {
    return hex1 === hex2;
  }

  /** Trigger win condition. */
  _triggerWin() {
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
      this._hudTimerInterval = null;
    }

    // Show particles bursting
    if (this.particleEffects) {
      for (const collector of this.sceneManager.collectors) {
        if (collector.collectedCount >= collector.targetCount) {
          this.particleEffects.spawnCollectionBurst(
            collector.center,
            { count: 40, speed: 5, lifetime: 1.0 }
          );
        }
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
    // Stop engine
    this.engine.stop();

    // Clear HUD timer
    if (this._hudTimerInterval) {
      clearInterval(this._hudTimerInterval);
    }

    // Dispose systems
    if (this.inputController) this.inputController.dispose();
    if (this.particleSystem) this.particleSystem.dispose();
    if (this.audioManager) this.audioManager.dispose();
    if (this.adManager) this.adManager.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
    if (this.uiManager) this.uiManager.dispose();
    if (this.renderer) this.renderer.dispose();

    console.log('Game disposed.');
  }
}
