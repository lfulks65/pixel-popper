/**
 * scene.js — Three.js scene setup with lighting, fog, and portrait camera.
 *
 * Creates a dark gradient background, an orthographic camera suited for
 * portrait (9:16) view, neon-style lighting, and exponential fog for depth.
 */

import * as THREE from 'three';

let scene = null;
let camera = null;
let ambientLight = null;
let directionalLight = null;

/**
 * Aspect ratio for portrait view (9:16).
 */
const PORTRAIT_ASPECT = 9 / 16;

/**
 * Default dimensions for the portrait-framed camera.
 * Width and height in world units — aspect ratio is 9:16.
 */
const VIEW_WIDTH = 9;
const VIEW_HEIGHT = 16;

/**
 * Create the scene, camera, lights, and fog.
 * @param {THREE.WebGLRenderer} renderer - The WebGLRenderer instance
 * @param {number} [frustumSize=16] - Size of the orthographic frustum (height)
 * @returns {{ scene: THREE.Scene, camera: THREE.OrthographicCamera }}
 */
export function createScene(renderer, frustumSize = 16) {
  // ── Scene with dark gradient background ──
  scene = new THREE.Scene();

  // Create a dark gradient texture for the background
  const gradientTexture = createGradientTexture();
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 512;
  bgCanvas.height = 512;
  const ctx = bgCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#0d0d2b');
  gradient.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  // Exponential fog for depth — dark purple tint matches the theme
  scene.fog = new THREE.Fog(0x0d0d2b, 15, 50);

  // ── Orthographic Camera (portrait 9:16) ──
  // Orthographic camera keeps things crisp and uniform — great for
  // portrait-style arcade games where we want no perspective distortion.
  const aspect = PORTRAIT_ASPECT;
  const frustumHeight = frustumSize;
  const frustumWidth = frustumHeight * aspect;

  const right = frustumWidth / 2;
  const left = -right;
  const top = frustumHeight / 2;
  const bottom = -top;

  camera = new THREE.OrthographicCamera(
    left,
    right,
    top,
    bottom,
    0.1,
    200,
  );

  // Position camera looking at scene origin, slightly elevated
  camera.position.z = 20;
  camera.lookAt(0, 0, 0);

  // ── Lighting (neon-style) ──

  // Ambient light — soft overall illumination
  ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  // Directional light — main fill with cyan/neon blue
  directionalLight = new THREE.DirectionalLight(0x00d4ff, 1.2);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Point light — warm accent (magenta/neon pink) from below
  const pointLight = new THREE.PointLight(0xff00aa, 0.8, 40);
  pointLight.position.set(-3, -5, 5);
  scene.add(pointLight);

  return { scene, camera };
}

/**
 * Create a gradient texture for the background.
 * @returns {THREE.CanvasTexture}
 */
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Get the scene.
 * @returns {THREE.Scene}
 */
export function getScene() {
  return scene;
}

/**
 * Get the camera.
 * @returns {THREE.OrthographicCamera}
 */
export function getCamera() {
  return camera;
}

/**
 * Get the ambient light.
 * @returns {THREE.AmbientLight}
 */
export function getAmbientLight() {
  return ambientLight;
}

/**
 * Get the directional light.
 * @returns {THREE.DirectionalLight}
 */
export function getDirectionalLight() {
  return directionalLight;
}

/**
 * Update camera aspect ratio when the window resizes.
 * Keeps the viewport constrained to portrait framing.
 * @param {number} width - New width in pixels
 * @param {number} height - New height in pixels
 */
export function updateCameraAspect(width, height) {
  if (!camera) return;

  // Maintain portrait aspect ratio: scale the orthographic frustum
  // so the smaller dimension fills the viewport.
  const windowAspect = width / height;

  if (windowAspect > PORTRAIT_ASPECT) {
    // Window is wider than portrait — letterbox on sides
    const newHeight = 16 / PORTRAIT_ASPECT * (9 / (16 / windowAspect));
    const aspect = windowAspect;
    const frustumHeight = 16;
    const frustumWidth = frustumHeight * aspect;

    camera.left = -frustumWidth / 2;
    camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
  } else {
    // Window is taller — full portrait
    const frustumHeight = 16;
    const frustumWidth = frustumHeight * (width / height);

    camera.left = -frustumWidth / 2;
    camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
  }

  camera.updateProjectionMatrix();
}
