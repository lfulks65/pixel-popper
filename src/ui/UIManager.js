/**
 * UIManager — Manages all UI screens with smooth transitions.
 *
 * Singleton pattern, accessible from the game engine.
 * All screens are overlaid on top of the Three.js canvas.
 *
 * Screen stack: push/pop screens with fade transitions (200-300ms CSS transitions)
 *
 * Methods:
 *   - showLoading()
 *   - showMenu()
 *   - showLevelSelect()
 *   - showGameplay()
 *   - showPause()
 *   - showWin(stars, coins)
 *   - showFail(reason)
 *
 * Usage:
 *   const ui = UIManager.getInstance();
 *   ui.init(canvasContainer);
 *   ui.on('play', () => { ... });
 *   ui.showLoading();
 *   // ... later
 *   ui.showMenu();
 */

import './styles.css';

import { LoadingScreen } from './screens/LoadingScreen.js';
import { MainMenu } from './screens/MainMenu.js';
import { LevelSelect } from './screens/LevelSelect.js';
import { GameplayHUD } from './screens/GameplayHUD.js';
import { PauseOverlay } from './screens/PauseOverlay.js';
import { WinScreen } from './screens/WinScreen.js';
import { FailScreen } from './screens/FailScreen.js';

import { SaveManager } from '../managers/SaveManager.js';
import { AudioManager } from '../managers/AudioManager.js';

// ── Screen names (must match data-screen attributes) ──────────────────
const SCREEN_NAMES = [
  'loading',
  'menu',
  'level-select',
  'hud',
  'pause',
  'win',
  'fail',
];

/**
 * UIManager — Singleton.
 */
class UIManager {
  /** @type {UIManager | null} */
  static #instance = null;

  /** @type {HTMLElement | null} */
  #container = null;

  /** @type {HTMLElement | null} */
  #uiRoot = null;

  /** @type {Map<string, object>} Screen instances keyed by name */
  #screens = new Map();

  /** @type {string | null} Currently visible screen name */
  #currentScreen = null;

  /** @type {Array<string>} Screen stack for back-navigation */
  #screenStack = [];

  /** @type {object} Callbacks registered by the game engine */
  #callbacks = {};

  /** @type {number} Transition duration in ms */
  #transitionDuration = 250;

  /**
   * Private constructor — use getInstance() instead.
   */
  constructor() {
    if (UIManager.#instance) {
      return UIManager.#instance;
    }
    UIManager.#instance = this;
  }

  /**
   * Get the singleton instance.
   * @returns {UIManager}
   */
  static getInstance() {
    if (!UIManager.#instance) {
      UIManager.#instance = new UIManager();
    }
    return UIManager.#instance;
  }

  /**
   * Initialize the UI manager and create the overlay root.
   * Call this once, before any show* methods.
   * @param {HTMLElement} container - Parent element (usually the game canvas container)
   */
  init(container) {
    this.#container = container;
    this.#uiRoot = document.createElement('div');
    this.#uiRoot.className = 'pixel-popper-ui';
    this.#uiRoot.setAttribute('role', 'dialog');
    this.#uiRoot.setAttribute('aria-label', 'Game UI');

    // Create all screen instances
    const loadingScreen = new LoadingScreen();
    loadingScreen.mount(this.#uiRoot);
    this.#screens.set('loading', loadingScreen);

    const mainMenu = new MainMenu();
    mainMenu.mount(this.#uiRoot);
    this.#screens.set('menu', mainMenu);

    const levelSelect = new LevelSelect();
    levelSelect.mount(this.#uiRoot);
    this.#screens.set('level-select', levelSelect);

    const hud = new GameplayHUD();
    hud.mount(this.#uiRoot);
    this.#screens.set('hud', hud);

    const pauseOverlay = new PauseOverlay();
    pauseOverlay.mount(this.#uiRoot);
    this.#screens.set('pause', pauseOverlay);

    const winScreen = new WinScreen();
    winScreen.mount(this.#uiRoot);
    this.#screens.set('win', winScreen);

    const failScreen = new FailScreen();
    failScreen.mount(this.#uiRoot);
    this.#screens.set('fail', failScreen);

    container.appendChild(this.#uiRoot);
  }

  /**
   * Register a callback for a UI event.
   * @param {string} event - Event name (e.g. 'play', 'resume', 'nextLevel')
   * @param {Function} fn - Callback function
   */
  on(event, fn) {
    this.#callbacks[event] = fn;
  }

  /**
   * Remove a callback for a UI event.
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    if (this.#callbacks[event]) {
      this.#callbacks[event] = fn;
    }
  }

  // ── Screen transitions ──────────────────────────────────────────────

  /**
   * Transition from the current screen to a new screen.
   * @param {string} from - Screen name to hide
   * @param {string} to - Screen name to show
   */
  #transition(from, to) {
    const fromScreen = this.#screens.get(from);
    const toScreen = this.#screens.get(to);

    if (!fromScreen && !toScreen) return;

    // Hide the old screen
    if (fromScreen && from !== to) {
      fromScreen.hide();
    }

    // Show the new screen after a brief delay for transition
    if (toScreen) {
      setTimeout(() => {
        toScreen.show();
      }, from === to ? 0 : 50);
      this.#currentScreen = to;
    }
  }

  /**
   * Push a screen onto the stack (for back-navigation).
   * @param {string} screenName
   */
  pushScreen(screenName) {
    if (this.#currentScreen && this.#currentScreen !== screenName) {
      this.#screenStack.push(this.#currentScreen);
    }
  }

  /**
   * Pop the top screen and return to the previous one.
   * @returns {string | null} Previous screen name, or null if stack is empty
   */
  popScreen() {
    const previous = this.#screenStack.pop();
    if (previous) {
      this.showScreen(previous);
      return previous;
    }
    return null;
  }

  /**
   * Get the current screen name.
   * @returns {string | null}
   */
  getCurrentScreen() {
    return this.#currentScreen;
  }

  /**
   * Get the screen stack.
   * @returns {string[]}
   */
  getScreenStack() {
    return [...this.#screenStack];
  }

  /**
   * Show a specific screen by name.
   * @param {string} screenName
   */
  showScreen(screenName) {
    if (this.#currentScreen && this.#currentScreen !== screenName) {
      this.#transition(this.#currentScreen, screenName);
    } else if (!this.#currentScreen) {
      this.#transition(null, screenName);
      this.#currentScreen = screenName;
    }
  }

  // ── Public show methods ────────────────────────────────────────────

  /**
   * Show the loading screen.
   */
  showLoading() {
    this.pushScreen('loading');
    this.showScreen('loading');
  }

  /**
   * Show the main menu screen.
   */
  showMenu() {
    this.pushScreen('menu');
    const menu = this.#screens.get('menu');
    if (menu) {
      menu.updateTotalCoins(SaveManager.getTotalCoins());
      menu.updateSoundToggle(AudioManager.isMuted);
    }
    this.showScreen('menu');
  }

  /**
   * Show the level select screen.
   */
  showLevelSelect() {
    this.pushScreen('level-select');
    const levelSelect = this.#screens.get('level-select');
    if (levelSelect) {
      levelSelect.renderLevels();
    }
    this.showScreen('level-select');
  }

  /**
   * Show the gameplay HUD (in-game overlay).
   * @param {object} [options]
   * @param {number} [options.level=1] - Current level number
   * @param {Array<{target: number, collected: number, color: string}>} [options.collectors] - Collector gauges
   * @param {number} [options.progress=0] - Progress bar percentage (0-100)
   */
  showGameplay(options = {}) {
    this.pushScreen('hud');
    const hud = this.#screens.get('hud');
    if (hud) {
      if (options.level !== undefined) {
        hud.setLevel(options.level);
      }
      if (options.collectors) {
        hud.setCollectors(options.collectors);
      }
      if (options.progress !== undefined) {
        hud.setProgress(options.progress);
      }
    }
    this.showScreen('hud');
  }

  /**
   * Show the pause overlay.
   */
  showPause() {
    this.pushScreen('pause');
    const pause = this.#screens.get('pause');
    if (pause) {
      pause.updateSoundToggle(AudioManager.isMuted);
    }
    this.showScreen('pause');
  }

  /**
   * Show the win screen with results.
   * @param {number} stars - Stars earned (0-3)
   * @param {number} coins - Coins collected
   * @param {string} [levelId] - Level ID for display
   */
  showWin(stars, coins, levelId = '1') {
    this.pushScreen('win');
    const win = this.#screens.get('win');
    if (win) {
      win.setResults(stars, coins);
      win.setLevelId(levelId);
    }
    this.showScreen('win');
  }

  /**
   * Show the fail screen with a reason.
   * @param {string} reason - Reason for failure
   * @param {string} [levelId] - Level ID for display
   */
  showFail(reason = 'Time ran out!', levelId = '1') {
    this.pushScreen('fail');
    const fail = this.#screens.get('fail');
    if (fail) {
      fail.setReason(reason);
    }
    this.showScreen('fail');
  }

  /**
   * Hide all screens (transition to black/canvas only).
   */
  hideAll() {
    this.#screens.forEach((screen) => {
      screen.hide();
    });
    this.#currentScreen = null;
  }

  /**
   * Update the HUD progress during gameplay.
   * @param {number} progress - 0-100
   */
  updateHUDProgress(progress) {
    const hud = this.#screens.get('hud');
    if (hud) {
      hud.setProgress(progress);
    }
  }

  /**
   * Update a collector gauge during gameplay.
   * @param {number} index - Collector index
   * @param {number} collected - Number collected
   */
  updateHUDCollector(index, collected) {
    const hud = this.#screens.get('hud');
    if (hud) {
      hud.updateCollector(index, collected);
    }
  }

  /**
   * Refresh the level select screen (e.g. after returning from gameplay).
   */
  refreshLevelSelect() {
    const levelSelect = this.#screens.get('level-select');
    if (levelSelect) {
      levelSelect.refresh();
    }
  }

  /**
   * Update the sound toggle across all screens that have one.
   * @param {boolean} isMuted
   */
  updateSoundToggle(isMuted) {
    const menu = this.#screens.get('menu');
    const pause = this.#screens.get('pause');
    if (menu) menu.updateSoundToggle(isMuted);
    if (pause) pause.updateSoundToggle(isMuted);
  }

  /**
   * Update total coins display across all screens that show it.
   * @param {number} totalCoins
   */
  updateTotalCoins(totalCoins) {
    const menu = this.#screens.get('menu');
    const levelSelect = this.#screens.get('level-select');
    if (menu) menu.updateTotalCoins(totalCoins);
    if (levelSelect) levelSelect.renderLevels();
  }

  /**
   * Dispose of the UI manager and remove the overlay.
   */
  dispose() {
    if (this.#uiRoot && this.#uiRoot.parentNode) {
      this.#uiRoot.parentNode.removeChild(this.#uiRoot);
    }
    this.#uiRoot = null;
    this.#container = null;
    this.#screens.clear();
    this.#currentScreen = null;
    this.#screenStack = [];
    UIManager.#instance = null;
  }
}

const UIManager$1 = UIManager.getInstance();

export { UIManager };
export default UIManager$1;
