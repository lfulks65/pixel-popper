import * as THREE from 'three';
import { ParticleEffects } from './particles/ParticleEffects.js';

// --- Scene setup ---
const canvas = document.getElementById('canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a2e, 1);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// --- Resize handling ---
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// --- Simple geometry for verification (a colored cube) ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- Particle System ---
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

// --- Render loop ---
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // Update particle system
  effects.update(dt);

  renderer.render(scene, camera);
}
animate();

console.log('Pixel Popper initialized — Three.js renderer ready.');
console.log(`Particles: ${effects.aliveCount} alive, ${effects.freeCount} free`);
