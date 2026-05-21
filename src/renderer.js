/**
 * Renderer.js — Three.js WebGL renderer wrapper.
 *
 * Manages the renderer, camera, scene, and window resize handling.
 * Provides camera manipulation for play area control and orientation detection.
 * Optimized for mobile with capped pixel ratio and optional antialiasing.
 */

import * as THREE from 'three';

/**
 * Renderer class — encapsulates the WebGL renderer, camera, and scene.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas element to render into.
   * @param {Object} options
   * @param {number} [options.maxPixelRatio=2] — Max pixel ratio for mobile.
   * @param {boolean} [options.antialias=false] — Whether to enable antialiasing.
   * @param {boolean} [options.mobileOptimized=true] — Mobile perf optimizations.
   * @param {number} [options.frustumSize=16] — Orthographic frustum height.
   */
  constructor(canvas, {
    maxPixelRatio = 2,
    antialias = false,
    mobileOptimized = true,
    frustumSize = 16,
  } = {}) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {THREE.WebGLRenderer} */
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: antialias,
      alpha: true,
      powerPreference: 'low-power', // prefer battery life
    });

    /** @type {number} Max pixel ratio cap */
    this.maxPixelRatio = maxPixelRatio;

    /** @type {boolean} Mobile optimization flag */
    this.mobileOptimized = mobileOptimized;

    /** @type {THREE.Scene} */
    this.scene = new THREE.Scene();

    /** @type {THREE.OrthographicCamera} */
    this.camera = null;

    /** @type {number} Portait aspect ratio 9:16 */
    this.PORTRAIT_ASPECT = 9 / 16;

    /** @type {boolean} Whether currently in landscape */
    this.isLandscape = false;

    /** @type {Function|null} Orientation change callback */
    this._orientationCallback = null;

    // Cap pixel ratio for mobile performance
    const pixelRatio = Math.min(window.devicePixelRatio, maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Create the camera
    this._createCamera(frustumSize);

    // Add ambient + directional lighting
    this._setupLighting();

    // Background gradient
    this._setupBackground();

    // Listen for resize
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._checkOrientation);

    // Listen for device orientation as fallback
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', this._checkOrientation);
    }
  }

  /** Create the orthographic camera. */
  _createCamera(frustumSize) {
    const aspect = this.PORTRAIT_ASPECT;
    const frustumHeight = frustumSize;
    const frustumWidth = frustumHeight * aspect;

    const right = frustumWidth / 2;
    const left = -right;
    const top = frustumHeight / 2;
    const bottom = -top;

    this.camera = new THREE.OrthographicCamera(
      left, right, top, bottom, 0.1, 200
    );
    this.camera.position.z = 20;
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  /** Setup basic lighting. */
  _setupLighting() {
    // Soft ambient
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    // Main directional fill — cyan
    const dirLight = new THREE.DirectionalLight(0x00d4ff, 1.2);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // Warm accent point light — magenta
    const pointLight = new THREE.PointLight(0xff00aa, 0.8, 40);
    pointLight.position.set(-3, -5, 5);
    this.scene.add(pointLight);
  }

  /** Setup dark gradient background. */
  _setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#0d0d2b');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  /**
   * Set the camera frustum to the given bounds.
   * @param {number} left
   * @param {number} right
   * @param {number} top
   * @param {number} bottom
   * @param {THREE.Vector3} [lookAt] Where to look.
   */
  setCamera(left, right, top, bottom, lookAt = new THREE.Vector3(0, 0, 0)) {
    if (!this.camera) return;
    this.camera.left = left;
    this.camera.right = right;
    this.camera.top = top;
    this.camera.bottom = bottom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(lookAt);
  }

  /**
   * Handle window resize — update renderer and camera.
   */
  _onResize = () => {
    if (!this.renderer || !this.camera) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);

    // Maintain portrait aspect ratio
    const windowAspect = width / height;

    if (windowAspect > this.PORTRAIT_ASPECT) {
      // Letterbox on sides
      const frustumHeight = 16;
      const frustumWidth = frustumHeight * windowAspect;
      this.camera.left = -frustumWidth / 2;
      this.camera.right = frustumWidth / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = -frustumHeight / 2;
    } else {
      const frustumHeight = 16;
      const frustumWidth = frustumHeight * windowAspect;
      this.camera.left = -frustumWidth / 2;
      this.camera.right = frustumWidth / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = -frustumHeight / 2;
    }
    this.camera.updateProjectionMatrix();

    // Dispatch custom event for other systems
    window.dispatchEvent(new CustomEvent('renderer:resize', { detail: { width, height } }));

    // Check landscape
    this._checkOrientation();
  };

  /**
   * Check if orientation is landscape.
   */
  _checkOrientation = () => {
    const wasLandscape = this.isLandscape;

    if (screen.orientation) {
      const type = screen.orientation.type || '';
      const angle = screen.orientation.angle || 0;
      this.isLandscape = !type.includes('portrait') && angle !== 0 && angle !== 180;
    } else {
      this.isLandscape = window.innerWidth > window.innerHeight;
    }

    if (this.isLandscape !== wasLandscape && this._orientationCallback) {
      this._orientationCallback(this.isLandscape);
    }
  };

  /**
   * Set a callback for orientation changes.
   * @param {Function} callback - (isLandscape: boolean) => void
   */
  setOrientationChangeCallback(callback) {
    this._orientationCallback = callback;
  }

  /**
   * Set the pixel ratio for rendering.
   * @param {number} ratio
   */
  setPixelRatio(ratio) {
    this.renderer.setPixelRatio(Math.min(ratio, this.maxPixelRatio));
  }

  /** Render the scene. */
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Dispose of all resources. */
  dispose() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._checkOrientation);
    window.removeEventListener('deviceorientation', this._checkOrientation);
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
