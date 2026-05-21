/**
 * main.js — Entry point. Wires together renderer, scene, engine, and orientation.
 */

import * as THREE from 'three';
import { createRenderer, getRenderer, handleResize } from './renderer.js';
import { createScene, getScene, getCamera, updateCameraAspect } from './scene.js';
import { createEngine, GameState } from './engine.js';
import { initOrientation, isPortraitOrientation } from './orientation.js';
import { ParticleEffects } from './particles/ParticleEffects.js';

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

// ── 5. Particle System ──
const effects = new ParticleEffects(scene, {
  maxParticles: 5000,
  enableTrails: true,
});

// Add emitter streams
effects.addEmitterStream({
  position: new THREE.Vector3(-1.5, 4, 0),
  rate: 60,
  velocity: new THREE.Vector3(0, -8, 0),
  spread: new THREE.Vector3(0.3, 0.5, 0.2),
  color: new THREE.Color(0xff4400),
  lifetime: 3.0,
});

effects.addEmitterStream({
  position: new THREE.Vector3(1.5, 4, 0),
  rate: 40,
  velocity: new THREE.Vector3(0, -6, 0),
  spread: new THREE.Vector3(0.4, 0.6, 0.3),
  color: new THREE.Color(0x00aaff),
  lifetime: 2.5,
});

// Add a collector (sphere collision) for burst effects
effects.addCollector(new THREE.Vector3(0, -3, 0), 1.0);

// Set glow properties
effects.setGlow(0.6);
effects.setGlowColor(new THREE.Color(0xffaa00));
effects.setAdditiveBlending(true);

// Trigger an initial collection burst for visual demo
effects.spawnCollectionBurst(new THREE.Vector3(0, -3, 0), {
  count: 40,
  speed: 5,
  color: new THREE.Color(0x00ff88),
});

// ── 6. Engine ──
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

    // Update particle system
    effects.update(deltaTime);
  },
});

// ── 7. Wire resize to both renderer and camera ──
window.addEventListener('renderer:resize', () => {
  updateCameraAspect(window.innerWidth, window.innerHeight);
});

// ── 8. Start game ──
engine.start();
engine.startGame(); // loading → menu → playing

console.log('Pixel Popper engine initialized — renderer + scene + engine ready.');
console.log(`Particles: ${effects.aliveCount} alive, ${effects.freeCount} free`);
