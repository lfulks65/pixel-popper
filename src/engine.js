/**
 * engine.js — Game engine with animation loop, state machine, and FPS counter.
 *
 * State machine: loading → menu → playing → paused → win → fail
 * Supports pause/resume/restart. Logs FPS to console.
 */

// ── State constants ──
export const GameState = Object.freeze({
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
  FAIL: 'fail',
});

/**
 * Transition graph — which states you can move to from each state.
 */
const TRANSITIONS = {
  [GameState.LOADING]:   [GameState.MENU],
  [GameState.MENU]:      [GameState.PLAYING],
  [GameState.PLAYING]:   [GameState.PAUSED, GameState.WIN, GameState.FAIL],
  [GameState.PAUSED]:    [GameState.PLAYING, GameState.MENU],
  [GameState.WIN]:       [GameState.MENU],
  [GameState.FAIL]:      [GameState.MENU],
};

/**
 * Engine class — manages the game loop, state transitions, and FPS.
 */
export class Engine {
  /**
   * @param {Object} options
   * @param {THREE.WebGLRenderer} options.renderer - The WebGLRenderer
   * @param {THREE.Scene} options.scene - The Three.js Scene
   * @param {THREE.Camera} options.camera - The Three.js Camera
   * @param {Function} [options.update] - Called every frame before render
   * @param {Function} [options.render] - Custom render override (optional)
   */
  constructor({ renderer, scene, camera, update = null, render = null } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.updateFn = update;
    this.renderFn = render;

    // Game state
    this.state = GameState.LOADING;
    this.targetState = null;

    // Timing
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDelta = 1000 / 60; // 60 fps fixed step (seconds * 1000)

    // FPS tracking
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 0;
    this.showFps = true; // console log FPS periodically

    // Callbacks for state changes
    this.onStateChange = null;

    // Bind loop
    this.loop = this.loop.bind(this);
  }

  // ── State Machine ──

  /**
   * Transition to a new game state.
   * @param {string} nextState - Target state from GameState enum
   * @throws {Error} If transition is not allowed
   */
  setState(nextState) {
    if (!TRANSITIONS[this.state]) {
      throw new Error(`No transitions defined from state "${this.state}"`);
    }
    if (!TRANSITIONS[this.state].includes(nextState)) {
      throw new Error(
        `Invalid transition: ${this.state} → ${nextState}`
      );
    }

    const prev = this.state;
    this.state = nextState;

    // Fire callback if registered
    if (this.onStateChange) {
      this.onStateChange(prev, nextState);
    }

    console.log(`[Engine] State: ${prev} → ${nextState}`);
  }

  /**
   * Set a callback for state transitions.
   * @param {Function} fn - (prev, next) => void
   */
  onStateChanged(fn) {
    this.onStateChange = fn;
  }

  // ── Game Control ──

  /**
   * Pause the game.
   */
  pause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  /**
   * Resume the game from paused.
   */
  resume() {
    if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
  }

  /**
   * Restart the game — goes to menu then playing.
   */
  restart() {
    if (this.state === GameState.PLAYING ||
        this.state === GameState.PAUSED ||
        this.state === GameState.WIN ||
        this.state === GameState.FAIL) {
      this.setState(GameState.MENU);
      this.setState(GameState.PLAYING);
    }
  }

  /**
   * Transition from loading to menu (call when assets are ready).
   */
  startGame() {
    this.setState(GameState.MENU);
    this.setState(GameState.PLAYING);
  }

  // ── Loop ──

  /**
   * Start the game loop.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop();
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this.running = false;
  }

  /**
   * Main game loop — delta-time based with fixed timestep.
   */
  loop() {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    // Clamp delta to prevent spiral of death on tab-switch
    const clampedDelta = Math.min(delta, 100); // cap at 100ms

    this.accumulator += clampedDelta;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedDelta) {
      if (this.state === GameState.PLAYING && this.updateFn) {
        this.updateFn(this.fixedDelta / 1000); // in seconds
      }
      this.accumulator -= this.fixedDelta;
    }

    // FPS counting
    this.frameCount++;
    this.fpsTime += clampedDelta;
    if (this.fpsTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      if (this.showFps) {
        console.log(`[Engine] FPS: ${this.fps}`);
      }
    }

    // Render (always, even in paused/menu states for static draw)
    this._render();

    requestAnimationFrame(this.loop);
  }

  /**
   * Render the scene.
   */
  _render() {
    if (this.renderFn) {
      this.renderFn();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Get current game state.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Get current FPS.
   * @returns {number}
   */
  getFPS() {
    return this.fps;
  }
}

/**
 * Create a minimal engine instance with the provided renderer, scene, and camera.
 * @param {Object} params
 * @param {THREE.WebGLRenderer} params.renderer
 * @param {THREE.Scene} params.scene
 * @param {THREE.Camera} params.camera
 * @param {Function} [params.update] - Per-frame update callback
 * @returns {Engine}
 */
export function createEngine({ renderer, scene, camera, update } = {}) {
  return new Engine({ renderer, scene, camera, update });
}
