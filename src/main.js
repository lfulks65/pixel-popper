/**
 * main.js — Entry point. Wires together renderer, scene, engine, and orientation.
 */

import * as THREE from 'three';
import { createRenderer, getRenderer, handleResize } from './renderer.js';
import { createScene, getScene, getCamera, updateCameraAspect } from './scene.js';
import { createEngine, GameState } from './engine.js';
import { initOrientation, isPortraitOrientation } from './orientation.js';

// ── 1. Orientation ──
initOrientation();

// ── 2. Renderer ──
const renderer = createRenderer('game-container');

// ── 3. Scene ──
const { scene, camera } = createScene(renderer);

// ── 4. Game object for demo ──
const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff88,
  emissive: 0x004422,
  roughness: 0.3,
  metalness: 0.6,
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// ── 5. Engine ──
const engine = createEngine({
  renderer,
  scene,
  camera,
  update(deltaTime) {
    // Rotate the sample cube during gameplay
    if (engine.getState() === GameState.PLAYING) {
      cube.rotation.x += deltaTime * 0.8;
      cube.rotation.y += deltaTime * 1.2;
    }
  },
});

// ── 6. Wire resize to both renderer and camera ──
window.addEventListener('renderer:resize', () => {
  updateCameraAspect(window.innerWidth, window.innerHeight);
});

// ── 7. Start game ──
engine.start();
engine.startGame(); // loading → menu → playing

console.log('Pixel Popper engine initialized — renderer + scene + engine ready.');
