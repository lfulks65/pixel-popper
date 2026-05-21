/**
 * main.js — Entry point for Pixel Popper.
 *
 * Wires together all game systems:
 * - Renderer (Three.js WebGL)
 * - Scene (level elements, camera)
 * - Engine (game loop, state machine)
 * - ParticleSystem (particle physics)
 * - LevelManager (level data, progression)
 * - InputController (touch/mouse input)
 * - UIManager (all UI overlays)
 * - AudioManager (procedural sound effects)
 * - AdManager (interstitial ads)
 * - SaveManager (persistent level unlocks)
 * - Game (main coordinator class)
 * - Orientation handler (rotate device overlay)
 *
 * Flow: loading → menu → level → gameplay → win/fail → progression
 */

import { Game } from './Game.js';
import { initOrientation, dispose as disposeOrientation } from './orientation.js';

/** Initialize and start the game. */
async function initGame() {
  // 1. Initialize orientation handler first
  initOrientation();

  // 2. Create and initialize the game
  const game = new Game();
  await game.init();

  // 3. Handle window resize → update renderer and camera
  window.addEventListener('resize', () => {
    if (game.renderer) {
      // Renderer handles resize internally
    }
  });

  // 4. Orientation change callback
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (game.renderer) {
        game.renderer._checkOrientation();
      }
    }, 300);
  });

  // 5. Keyboard shortcuts for testing
  document.addEventListener('keydown', (e) => {
    if (game.state === 'playing') {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        game._togglePause();
      }
    }
    if (e.key === 'r' || e.key === 'R') {
      // Quick restart (dev convenience)
      game._transitionToState('menu');
    }
  });

  console.log('Pixel Popper initialized. Press P to pause, R to restart.');
  console.log(`Engine FPS: ${game.engine?.getFPS?.() ?? 'N/A'}`);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
