/**
 * renderer.js — Three.js WebGL renderer setup
 *
 * Creates a WebGLRenderer with antialiasing, caps pixelRatio at 2 for
 * mobile performance, fills the window, and handles resize events.
 */

import * as THREE from 'three';

let renderer = null;
let container = null;

/**
 * Create and configure the renderer.
 * @param {string} containerId - DOM id of the container element (default: game-container)
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(containerId = 'game-container') {
  container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container "#${containerId}" not found in DOM`);
  }

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true, // transparent background so scene bg/fog can show
  });

  // Cap pixel ratio for mobile performance (max 2×)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Fill the container / window
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Clear to fully transparent — scene.background handles the colour
  renderer.setClearColor(0x000000, 0);

  // Append canvas to container
  container.appendChild(renderer.domElement);

  // Listen for resize so we can update size + camera
  window.addEventListener('resize', handleResize);

  return renderer;
}

/**
 * Handle window/container resize.
 */
export function handleResize() {
  if (!renderer) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);

  // Notify any registered listeners
  window.dispatchEvent(new CustomEvent('renderer:resize', { detail: { width, height } }));
}

/**
 * Get the current renderer instance.
 * @returns {THREE.WebGLRenderer | null}
 */
export function getRenderer() {
  return renderer;
}

/**
 * Dispose of the renderer and clean up event listeners.
 */
export function dispose() {
  window.removeEventListener('resize', handleResize);
  if (container && renderer && renderer.domElement.parentNode === container) {
    container.removeChild(renderer.domElement);
  }
  renderer?.dispose();
  renderer = null;
}
