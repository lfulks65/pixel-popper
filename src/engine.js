/**
 * Engine.js — Game engine loop with state machine, delta timing, pause/resume.
 *
 * State machine: loading → menu → playing → paused → win → fail
 * Supports pause/resume, fixed timestep, FPS tracking.
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
  [GameState.LOADING]:  [GameState.MENU],
  [GameState.MENU]:     [GameState.PLAYING],
  [GameState.PLAYING]:  [GameState.PAUSED, GameState.WIN, GameState.FAIL],
  [GameState.PAUSED]:   [GameState.PLAYING, GameState.MENU],
  [GameState.WIN]:      [GameState.MENU],
  [GameState.FAIL]:     [GameState.MENU],
};

/**
 * Engine class — manages the game loop, state transitions, and FPS.
 */
export class Engine {
  /**
   * @param {Object} options
   * @param {number} [options.targetFps=60] Target frames per second.
   * @param {number} [options.fixedDt=1/60] Fixed timestep in seconds.
   */
  constructor({ targetFps = 60, fixedDt = 1 / 60 } = {}) {
    /** @type {string} Current game state */
    this.state = GameState.LOADING;

    /** @type {number} Fixed timestep in seconds */
    this.fixedDelta = fixedDt;
    this.fixedMs = (1000 / targetFps);

    // Timing
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;

    // Callbacks
    /** @type {Function|null} Called every frame with dt in seconds */
    this.updateFn = null;
    /** @type {Function|null} Called every frame for custom render */
    this.renderFn = null;
    /** @type {Function|null} Fixed timestep callback */
    this.fixedUpdateFn = null;

    // FPS tracking
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 0;

    // State change callback
    this.onStateChange = null;

    // Bind loop
    this.loop = this.loop.bind(this);
  }

  // ── State Machine ──

  /**
   * Transition to a new game state.
   * @param {string} nextState
   */
  setState(nextState) {
    if (!TRANSITIONS[this.state]) {
      throw new Error(`No transitions defined from state "${this.state}"`);
    }
    if (!TRANSITIONS[this.state].includes(nextState)) {
      throw new Error(`Invalid transition: ${this.state} → ${nextState}`);
    }

    const prev = this.state;
    this.state = nextState;

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

  /** Get current game state. */
  getState() {
    return this.state;
  }

  /** Get current FPS. */
  getFPS() {
    return this.fps;
  }

  /** Pause the game. */
  pause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  /** Resume the game from paused. */
  resume() {
    if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
  }

  /**
   * Toggle pause state.
   * @returns {boolean} True if now paused.
   */
  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
      return true;
    } else if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
      return false;
    }
    return false;
  }

  /** Restart the game — goes to menu then playing. */
  restart() {
    if (this.state === GameState.PLAYING ||
        this.state === GameState.PAUSED ||
        this.state === GameState.WIN ||
        this.state === GameState.FAIL) {
      this.setState(GameState.MENU);
      this.setState(GameState.PLAYING);
    }
  }

  // ── Loop ──

  /**
   * Set the per-frame update callback.
   * @param {Function} updateFn - (dt: number) => void
   */
  setUpdateFn(updateFn) {
    this.updateFn = updateFn;
  }

  /**
   * Set the per-frame render callback.
   * @param {Function} renderFn - () => void
   */
  setRenderFn(renderFn) {
    this.renderFn = renderFn;
  }

  /**
   * Set the fixed timestep update callback.
   * @param {Function} fixedUpdateFn - (dt: number) => void
   */
  setFixedUpdateFn(fixedUpdateFn) {
    this.fixedUpdateFn = fixedUpdateFn;
  }

  /**
   * Start the game loop.
   */
  start(updateFn, renderFn, fixedUpdateFn) {
    if (this.running) return;

    if (updateFn) this.updateFn = updateFn;
    if (renderFn) this.renderFn = renderFn;
    if (fixedUpdateFn) this.fixedUpdateFn = fixedUpdateFn;

    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop();
  }

  /** Stop the game loop. */
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
    while (this.accumulator >= this.fixedMs) {
      const dt = this.fixedDelta; // in seconds

      if (this.state === GameState.PLAYING) {
        if (this.updateFn) this.updateFn(dt);
        if (this.fixedUpdateFn) this.fixedUpdateFn(dt);
      }

      this.accumulator -= this.fixedMs;
    }

    // FPS counting
    this.frameCount++;
    this.fpsTime += clampedDelta;
    if (this.fpsTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      console.log(`[Engine] FPS: ${this.fps}`);
    }

    // Render (always, even in paused/menu states)
    this._render();

    requestAnimationFrame(this.loop);
  }

  /** Render the scene. */
  _render() {
    if (this.renderFn) {
      this.renderFn();
    }
  }
}
