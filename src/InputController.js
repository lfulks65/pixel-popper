/**
 * InputController.js — Touch input handling with raycasting.
 *
 * Manages touch events, raycasting against scene elements,
 * and translating touch positions to game actions (rotate paddles,
 * slide gates, tap buttons).
 */

import * as THREE from 'three';

export class InputController {
  /**
   * @param {THREE.Camera} camera
   * @param {THREE.Scene} scene
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas
   */
  constructor(camera, scene, { canvas } = {}) {
    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {HTMLCanvasElement|null} */
    this.canvas = canvas || (document.getElementById('canvas') || document.querySelector('canvas'));

    /** @type {THREE.Raycaster} */
    this.raycaster = new THREE.Raycaster();

    /** @type {THREE.Vector2} Normalized touch/mouse position (-1 to 1) */
    this.normalizedPos = new THREE.Vector2(0, 0);

    /** @type {THREE.Vector3} World-space touch position */
    this.worldPos = new THREE.Vector3();

    /** @type {THREE.Vector3} Plane to raycast against (for consistent z-depth) */
    this.raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    /** @type {Object<string, Object>} Touch state by ID */
    this.touches = new Map();

    /** @type {Object|null} Currently active paddle touch */
    this.activePaddleTouch = null;

    /** @type {Object|null} Currently active gate touch */
    this.activeGateTouch = null;

    /** @type {Array<string>} IDs of buttons recently tapped */
    this.tappedButtons = [];

    /** @type {boolean} Whether touch input is enabled */
    this.enabled = true;

    /** @type {Function|null} Button tap callback */
    this._buttonTapFn = null;

    this._setupEvents();
  }

  /** Set up touch and mouse event listeners. */
  _setupEvents() {
    if (!this.canvas) return;

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });

    // Mouse events (for desktop testing)
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
  }

  /**
   * Convert screen coordinates to normalized device coordinates.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {THREE.Vector2}
   */
  _toNormalized(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  /**
   * Convert normalized coordinates to world position at a given Z depth.
   * @param {THREE.Vector2} normalized
   * @param {number} [z=0] Z depth in world space
   * @returns {THREE.Vector3}
   */
  _normalizedToWorld(normalized, z = 0) {
    this.raycaster.setFromCamera(normalized, this.camera);

    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.raycastPlane, target);
    return target || new THREE.Vector3(z, z, z);
  }

  /** Handle touch start event. */
  _onTouchStart(e) {
    if (!this.enabled) return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const normalized = this._toNormalized(touch.clientX, touch.clientY);
      const worldPos = this._normalizedToWorld(normalized);

      this.touches.set(touch.identifier, {
        normalized: normalized.clone(),
        worldPos: worldPos.clone(),
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        element: null,
      });

      // Raycast to find what was touched
      this._raycastElement(normalized);
    }
  }

  /** Handle touch move event. */
  _onTouchMove(e) {
    if (!this.enabled) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const normalized = this._toNormalized(touch.clientX, touch.clientY);
      const worldPos = this._normalizedToWorld(normalized);
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        touchData.normalized = normalized.clone();
        touchData.worldPos = worldPos.clone();
      }

      this.normalizedPos = normalized.clone();
    }
  }

  /** Handle touch end event. */
  _onTouchEnd(e) {
    if (!this.enabled) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        const isTap = (Date.now() - touchData.startTime) < 300;
        const dx = touch.clientX - touchData.startX;
        const dy = touch.clientY - touchData.startY;
        const dragDist = Math.sqrt(dx * dx + dy * dy);

        if (isTap && dragDist < 15 && touchData.element) {
          // It's a tap — check if it's a button
          if (touchData.element.type === 'button' && this._buttonTapFn) {
            this._buttonTapFn(touchData.element.id);
          }
          // Toggle paddle if tapped near one
          if (touchData.element.type === 'paddle') {
            // Paddle rotation handled by active touch
          }
        }

        // If touching a gate, release it
        if (touchData.element && touchData.element.type === 'gate') {
          this.activeGateTouch = null;
        }
      }

      this.touches.delete(touch.identifier);

      // If this was the last touch, clear active paddle touch
      if (this.touches.size === 0) {
        this.activePaddleTouch = null;
      }
    }
  }

  /** Handle mouse down (desktop). */
  _onMouseDown(e) {
    if (!this.enabled) return;
    const normalized = this._toNormalized(e.clientX, e.clientY);
    const worldPos = this._normalizedToWorld(normalized);

    this._raycastElement(normalized);

    // Simulate a tap
    setTimeout(() => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const norm = new THREE.Vector2(x, y);

      // Check buttons
      if (this.tappedButtons.length > 0) {
        for (const btnId of this.tappedButtons) {
          if (this._buttonTapFn) {
            this._buttonTapFn(btnId);
          }
        }
        this.tappedButtons = [];
      }
    }, 50);
  }

  /** Handle mouse move (desktop). */
  _onMouseMove(e) {
    if (!this.enabled) return;
    const normalized = this._toNormalized(e.clientX, e.clientY);
    this.normalizedPos = normalized;
  }

  /** Handle mouse up (desktop). */
  _onMouseUp(e) {}

  /**
   * Raycast against scene elements to find what was touched.
   * @param {THREE.Vector2} normalized
   */
  _raycastElement(normalized) {
    this.raycaster.setFromCamera(normalized, this.camera);

    // Collect all clickable objects
    const clickableObjects = [];

    this.scene.traverse((object) => {
      if (object.userData && object.userData.clickable) {
        clickableObjects.push(object);
      }
      if (object.userData && object.userData.elementType) {
        clickableObjects.push(object);
      }
    });

    if (clickableObjects.length === 0) return;

    const intersects = this.raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const obj = hit.object;

      // Find the parent group with element metadata
      let element = null;
      let current = obj;
      while (current) {
        if (current.userData && current.userData.elementType) {
          element = current;
          break;
        }
        current = current.parent;
      }

      if (element) {
        // Store on the last touch point
        if (this.touches.size > 0) {
          const lastTouch = Array.from(this.touches.values()).pop();
          if (lastTouch) {
            lastTouch.element = {
              id: element.name || element.uuid,
              type: element.userData.elementType,
              position: hit.point.clone(),
            };
          }
        }

        // If it's a paddle, track for rotation
        if (element.userData.elementType === 'paddle') {
          this.activePaddleTouch = element;
        }

        // If it's a button, mark as tapped
        if (element.userData.elementType === 'button') {
          this.tappedButtons.push(element.name);
        }

        // If it's a gate, mark as active
        if (element.userData.elementType === 'gate') {
          this.activeGateTouch = element;
        }
      }
    }
  }

  /**
   * Get the world position of a touch.
   * @param {number} [touchId=null] Touch identifier, or null for most recent
   * @returns {THREE.Vector3|null}
   */
  getWorldPosition(touchId = null) {
    if (touchId !== null) {
      const touch = this.touches.get(touchId);
      return touch ? touch.worldPos.clone() : null;
    }

    if (this.touches.size === 0) return null;
    const lastTouch = Array.from(this.touches.values()).pop();
    return lastTouch ? lastTouch.worldPos.clone() : null;
  }

  /**
   * Set the button tap callback.
   * @param {Function} fn
   */
  setButtonTapCallback(fn) {
    this._buttonTapFn = fn;
  }

  /**
   * Apply paddle rotation based on touch position.
   * @param {Object} paddle Paddle object
   * @param {number} sensitivity Rotation sensitivity
   */
  applyPaddleRotation(paddle, sensitivity = 0.05) {
    if (!paddle || !this.enabled) return;

    const touch = Array.from(this.touches.values())
      .find((t) => t.element && t.element.id === paddle.id);

    if (!touch) {
      // Smooth return to center when not touching
      const centerAngle = 0;
      const diff = centerAngle - paddle.rotation;
      paddle.rotation += diff * Math.min(0.1, 1);
      return;
    }

    // Rotate based on touch X position relative to paddle center
    const dx = touch.worldPos.x - paddle.group.position.x;
    const targetAngle = Math.max(-0.7, Math.min(0.7, dx * 0.3));

    if (Math.abs(targetAngle - paddle.targetAngle) > 0.01) {
      paddle.angleSpeed += (targetAngle - paddle.targetAngle) * sensitivity;
    }

    paddle.targetAngle = targetAngle;
  }

  /**
   * Slide a gate based on touch position.
   * @param {Object} gate Gate object
   */
  applyGateSlide(gate) {
    if (!gate || !this.enabled) return;

    const touch = this.activeGateTouch;
    if (!touch) return;

    const gateIndex = gate.id.replace('g', '');
    const gateTouches = Array.from(this.touches.values()).filter(
      (t) => t.element && t.element.type === 'gate' && t.element.id === gate.id
    );

    if (gateTouches.length > 0) {
      const touchData = gateTouches[0];
      gate.targetOffset = touchData.worldPos.x - gate.group.position.x;
      gate.targetOffset = Math.max(-gate.slideRange, Math.min(gate.slideRange, gate.targetOffset));
    }
  }

  /** Enable/disable input. */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /** Cleanup event listeners. */
  dispose() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
  }
}
