/**
 * InputController.js — Touch input controller with raycasting and multi-touch.
 *
 * Maps touch events on the game canvas to 3D interactions with level elements:
 *   - Paddle: drag to rotate around its pivot (clamped to limits)
 *   - Gate: drag Y to slide open/closed; tap to toggle
 *   - Tap zones on toggle-able elements for tap detection
 *
 * Features:
 *   - Multi-touch: each active touch tracked independently
 *   - Visual feedback: scale pulse on grab, ripple on tap
 *   - Browser gesture prevention on the game canvas
 *   - Readable state: { activeElement, touchPosition, isInteracting }
 */

import * as THREE from 'three';

// ─── Visual helpers ────────────────────────────────────────────────────────

/**
 * Create a brief scale pulse on a mesh group for touch feedback.
 * @param {THREE.Group} group
 */
function _pulseScale(group) {
  if (!group) return;
  const origScale = group.scale.clone();
  const startTime = performance.now();
  const duration = 150;

  function animatePulse() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / duration);
    const factor = 1 + 0.05 * Math.sin(t * Math.PI);
    group.scale.copy(origScale).multiplyScalar(factor);
    if (t < 1) {
      requestAnimationFrame(animatePulse);
    } else {
      group.scale.copy(origScale);
    }
  }
  requestAnimationFrame(animatePulse);
}

/**
 * Create a brief emissive glow on a mesh group for touch feedback.
 * @param {THREE.Group} group
 */
function _glowOnTouch(group) {
  if (!group) return;
  const originalMaterials = new Map();
  group.traverse((child) => {
    if (child.isMesh && child.material) {
      originalMaterials.set(child.uuid, {
        originalEmissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0),
        originalIntensity: child.material.emissiveIntensity || 0,
      });
    }
  });

  const startTime = performance.now();
  const duration = 250;

  function animateGlow() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / duration);
    const intensity = 0.5 * (1 - t);

    group.traverse((child) => {
      if (child.isMesh && child.material) {
        const info = originalMaterials.get(child.uuid);
        if (info) {
          if (!child.material.emissive) {
            child.material.emissive = new THREE.Color(0);
          }
          child.material.emissive.set(0xffaa44);
          child.material.emissiveIntensity = intensity;
        }
      }
    });

    if (t < 1) {
      requestAnimationFrame(animateGlow);
    } else {
      group.traverse((child) => {
        if (child.isMesh) {
          const info = originalMaterials.get(child.uuid);
          if (info) {
            child.material.emissive.copy(info.originalEmissive);
            child.material.emissiveIntensity = info.originalIntensity;
          }
        }
      });
    }
  }
  requestAnimationFrame(animateGlow);
}

/**
 * Create a ripple ring effect at a 3D position for tap feedback.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 */
function _createRipple(scene, position) {
  if (!scene || !position) return;

  const geo = new THREE.RingGeometry(0.02, 0.05, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(position);
  ring.position.y += 0.05;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const startTime = performance.now();
  const duration = 400;

  function animateRipple() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / duration);
    const scale = 1 + 4 * t;
    ring.scale.set(scale, scale, 1);
    ring.material.opacity = 0.8 * (1 - t);

    if (t < 1) {
      requestAnimationFrame(animateRipple);
    } else {
      scene.remove(ring);
      geo.dispose();
      mat.dispose();
    }
  }
  requestAnimationFrame(animateRipple);
}

// ─── Touch tracker ─────────────────────────────────────────────────────────

/**
 * Track state for a single active touch.
 *
 * Stores cumulative delta (from start) and incremental delta (since last
 * frame), plus total travel distance for tap detection.
 *
 * IMPORTANT: update() must compute deltas from `currentPosition` *before*
 * overwriting it with `position`, otherwise all distances become zero.
 */
class TouchTracker {
  /**
   * @param {number} identifier  Touch identifier
   * @param {THREE.Vector3} position  World-space start position
   * @param {BaseLevelElement} element  Element being interacted with
   */
  constructor(identifier, position, element) {
    this.identifier = identifier;
    this.startPosition = position.clone();
    this.currentPosition = position.clone();
    this.previousPosition = position.clone();
    this.element = element;
    this.lastMoveTime = performance.now();
    this.totalDistance = 0;

    // Last frame's cumulative deltas (for incremental calculation)
    this._lastCumulativeX = 0;
    this._lastCumulativeY = 0;
  }

  /**
   * Update with a new position.
   *
   * Must compute all deltas from `currentPosition` BEFORE copying `position`
   * into it. Otherwise delta = position - position = 0.
   * @param {THREE.Vector3} position
   */
  update(position) {
    // 1) Compute distance delta BEFORE overwriting currentPosition
    const moveDist = new THREE.Vector3().subVectors(position, this.currentPosition).length();
    this.totalDistance += moveDist;

    // 2) Update cumulative delta from start
    const cX = position.x - this.startPosition.x;
    const cY = position.y - this.startPosition.y;

    // 3) Compute incremental delta since last frame
    this._deltaX = cX - this._lastCumulativeX;
    this._deltaY = cY - this._lastCumulativeY;
    this._lastCumulativeX = cX;
    this._lastCumulativeY = cY;

    // 4) Now update positions
    this.previousPosition.copy(this.currentPosition);
    this.currentPosition.copy(position);
    this.lastMoveTime = performance.now();
  }

  /** @returns {number} Incremental horizontal delta since last update */
  getDeltaX() {
    return this._deltaX;
  }

  /** @returns {number} Incremental vertical delta since last update */
  getDeltaY() {
    return this._deltaY;
  }

  /** @returns {number} Cumulative horizontal delta from start */
  getCumulativeX() {
    return this.currentPosition.x - this.startPosition.x;
  }

  /** @returns {number} Cumulative vertical delta from start */
  getCumulativeY() {
    return this.currentPosition.y - this.startPosition.y;
  }

  /**
   * @returns {boolean} true if this is considered a tap (short duration,
   *          minimal movement)
   */
  isTap() {
    const elapsed = performance.now() - this.lastMoveTime;
    return this.totalDistance < 0.05 && elapsed < 300;
  }
}

// ─── InputController ───────────────────────────────────────────────────────

/**
 * Touch input controller for 3D game interaction.
 *
 * @param {Object} options
 * @param {THREE.Scene} options.scene
 * @param {THREE.Camera} options.camera
 * @param {HTMLCanvasElement} options.canvas
 * @param {THREE.Raycaster} [options.raycaster]
 * @param {THREE.Plane} [options.rayTargetPlane]
 * @param {Function} [options.onTap]
 * @param {Function} [options.onPaddleRotate]
 * @param {Function} [options.onGateSlide]
 * @param {Function} [options.onGateToggle]
 */
export class InputController {
  constructor(options = {}) {
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.canvas = options.canvas || null;

    this.raycaster = options.raycaster || new THREE.Raycaster();
    this._targetPlane =
      options.rayTargetPlane ||
      new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this._onTap = options.onTap || null;
    this._onPaddleRotate = options.onPaddleRotate || null;
    this._onGateSlide = options.onGateSlide || null;
    this._onGateToggle = options.onGateToggle || null;

    this._touchMap = new Map();

    this.state = {
      activeElement: null,
      touchPosition: new THREE.Vector3(),
      isInteracting: false,
    };

    // Binding cache for install/uninstall
    this._handlers = null;
  }

  // ── Init / Destroy ────────────────────────────────────────────────────

  /**
   * Install touch event listeners on the canvas.
   */
  install() {
    if (!this.canvas) {
      console.warn('InputController: no canvas to install on');
      return;
    }

    this._bindHandlers();

    this.canvas.addEventListener('touchstart', this._handlers.start, {
      passive: false,
    });
    this.canvas.addEventListener('touchmove', this._handlers.move, {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this._handlers.end, {
      passive: false,
    });
    this.canvas.addEventListener('touchcancel', this._handlers.cancel, {
      passive: false,
    });

    // Prevent browser gestures on the game canvas
    const preventGesture = (e) => e.preventDefault();
    this.canvas.addEventListener('gesturestart', preventGesture, {
      passive: false,
    });
    this.canvas.addEventListener('gesturechange', preventGesture, {
      passive: false,
    });
    this.canvas.addEventListener('gestureend', preventGesture, {
      passive: false,
    });

    // Prevent pull-to-refresh on the canvas
    const preventPullRefresh = (e) => {
      if (e.target === this.canvas) {
        e.preventDefault();
      }
    };
    document.body.addEventListener('touchmove', preventPullRefresh, {
      passive: false,
    });

    // Cache the body listener for uninstall
    this._preventPullRefresh = preventPullRefresh;
    this._preventGesture = preventGesture;

    // Double-tap prevention
    this._lastTouchEnd = 0;
    this.canvas.addEventListener(
      'touchend',
      this._preventDoubleTap.bind(this),
      { passive: true },
    );
  }

  _preventDoubleTap() {
    const now = performance.now();
    if (now - this._lastTouchEnd < 300) {
      // Quick successive tap detected — prevent zoom
    }
    this._lastTouchEnd = now;
  }

  /**
   * Remove all event listeners.
   */
  uninstall() {
    if (!this.canvas) return;
    if (this._handlers) {
      this.canvas.removeEventListener('touchstart', this._handlers.start);
      this.canvas.removeEventListener('touchmove', this._handlers.move);
      this.canvas.removeEventListener('touchend', this._handlers.end);
      this.canvas.removeEventListener('touchcancel', this._handlers.cancel);
      this.canvas.removeEventListener('touchend', this._preventDoubleTap);
    }
    this.canvas.removeEventListener('gesturestart', this._preventGesture);
    this.canvas.removeEventListener('gesturechange', this._preventGesture);
    this.canvas.removeEventListener('gestureend', this._preventGesture);
    if (this._preventPullRefresh) {
      document.body.removeEventListener('touchmove', this._preventPullRefresh);
    }
    this._handlers = null;
    this._clearAllTouches();
  }

  _bindHandlers() {
    this._handlers = {
      start: (e) => this._handleTouchStart(e),
      move: (e) => this._handleTouchMove(e),
      end: (e) => this._handleTouchEnd(e),
      cancel: (e) => this._handleTouchCancel(e),
    };
  }

  // ── Touch handlers ────────────────────────────────────────────────────

  /**
   * Raycast against level elements to find what the touch is over.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ element: BaseLevelElement|null, point: THREE.Vector3|null }}
   */
  _raycast(clientX, clientY) {
    if (!this.canvas || !this.camera) {
      return { element: null, point: null };
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera({ x, y }, this.camera);

    // Collect meshes belonging to level elements
    const interactiveMeshes = [];
    if (this.scene) {
      this.scene.traverse((child) => {
        if (child.isMesh && child.userData.levelElement) {
          interactiveMeshes.push(child);
        }
      });
    }

    if (interactiveMeshes.length === 0) {
      return { element: null, point: null };
    }

    const intersects = this.raycaster.intersectObjects(interactiveMeshes, false);

    if (intersects.length === 0) {
      return { element: null, point: null };
    }

    const hit = intersects[0];
    const element = hit.object.userData.levelElement;
    let point = hit.point.clone();

    // Fallback: project ray onto target plane if point is unusable
    if (
      !point ||
      (point.x === 0 && point.y === 0 && point.z === 0)
    ) {
      const planePoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this._targetPlane, planePoint);
      if (planePoint) point = planePoint;
    }

    return { element, point };
  }

  /**
   * Handle paddle drag: map incremental horizontal touch delta to rotation
   * angle change, clamped to the paddle's limits.
   *
   * Uses *incremental* delta (from last frame) so the paddle rotates smoothly
   * by the amount the finger moved, not by the total distance since start.
   * @param {TouchTracker} tracker
   * @param {PaddleElement} element
   */
  _handlePaddleDrag(tracker, element) {
    // Incremental delta since last frame — this is the rotation change
    const deltaX = tracker.getDeltaX();
    const sensitivity = 1.2;
    const deltaAngle = deltaX * sensitivity;

    const newAngle = element.rotation + deltaAngle;
    const clampedAngle = Math.max(
      element.limits[0],
      Math.min(element.limits[1], newAngle),
    );

    if (this._onPaddleRotate) {
      this._onPaddleRotate(element, clampedAngle, deltaAngle);
    }
    if (element.setRotation) {
      element.setRotation(clampedAngle);
    }
  }

  /**
   * Handle gate drag: map cumulative vertical touch delta to panel
   * slide position.
   *
   * Uses cumulative delta from start so the panel follows the finger
   * directly (position = finger Y), clamped to [0, slideDistance].
   * @param {TouchTracker} tracker
   * @param {GateElement} element
   */
  _handleGateSlide(tracker, element) {
    // Cumulative vertical delta from start → direct position mapping
    const cumulativeY = tracker.getCumulativeY();
    const sensitivity = 1.0;
    const slideAmount = Math.max(
      0,
      Math.min(element.slideDistance, cumulativeY * sensitivity),
    );

    if (this._onGateSlide) {
      this._onGateSlide(element, slideAmount, tracker.getDeltaY());
    }

    // Directly set panel position — this overrides the update() lerp
    // because we set it every frame during drag.
    if (element.panel) {
      element.panel.position.y = slideAmount;
    }
  }

  /**
   * Handle a tap on an element.
   * @param {BaseLevelElement} element
   * @param {THREE.Vector3} position
   */
  _handleTap(element, position) {
    const type = element.type;

    // Visual ripple feedback
    if (this.scene) {
      _createRipple(this.scene, position);
    }

    if (this._onTap) {
      this._onTap(element, position);
    }

    // Gate tap: toggle open/closed
    if (type === 'gate' && element.toggle) {
      if (this._onGateToggle) {
        this._onGateToggle(element);
      }
      element.toggle();
    }
  }

  /**
   * Process a single touch point: find element or track existing tracker.
   * @param {number} identifier
   * @param {number} clientX
   * @param {number} clientY
   */
  _processTouch(identifier, clientX, clientY) {
    const { element, point } = this._raycast(clientX, clientY);
    const tracker = this._touchMap.get(identifier);

    if (tracker) {
      // Already tracking — if element changed, release old and grab new
      if (element && element !== tracker.element) {
        this._releaseElement(tracker);
        this._grabElement(identifier, element, point);
      }
      if (element && point) {
        tracker.update(point);
      }
      return;
    }

    // New touch — try to grab an element
    if (element) {
      this._grabElement(identifier, element, point);
    }
  }

  /**
   * Start tracking a touch on an element.
   * @param {number} identifier
   * @param {BaseLevelElement|null} element
   * @param {THREE.Vector3|null} point
   */
  _grabElement(identifier, element, point) {
    // Ensure no other touch is tracking the same element
    for (const [id, t] of this._touchMap) {
      if (t.element === element) {
        this._touchMap.delete(id);
      }
    }

    if (!element || !point) return;

    const tracker = new TouchTracker(identifier, point, element);
    this._touchMap.set(identifier, tracker);

    this.state.activeElement = element;
    this.state.touchPosition.copy(point);
    this.state.isInteracting = true;

    // Visual feedback
    if (element.mesh) {
      _glowOnTouch(element.mesh);
    }
  }

  /**
   * Release an element from a touch.
   * If it was a tap, handle tap logic (toggle gates).
   * If it was a drag on a gate, finalize the panel position.
   * @param {TouchTracker} tracker
   */
  _releaseElement(tracker) {
    const element = tracker.element;
    const point = tracker.currentPosition;
    const wasTap = tracker.isTap();

    if (wasTap && element) {
      this._handleTap(element, point);
    } else if (element && element.type === 'gate') {
      // Finalize gate position based on cumulative drag amount
      const cumulativeY = tracker.getCumulativeY();
      const threshold = element.slideDistance * 0.5;
      if (element.panel) {
        element.panel.position.y =
          cumulativeY > threshold ? element.slideDistance : 0;
      }
      // Set gate state to match final panel position
      element.state =
        cumulativeY > threshold ? 'open' : 'closed';
    }

    // Snap paddle back to limits after release
    if (
      element &&
      element.type === 'paddle' &&
      element.setRotation
    ) {
      element.setRotation(element.rotation);
    }

    // Visual feedback on release
    if (element && element.mesh) {
      _pulseScale(element.mesh);
    }

    this._touchMap.delete(tracker.identifier);

    if (this._touchMap.size === 0) {
      this.state.activeElement = null;
      this.state.isInteracting = false;
    }
  }

  /**
   * Clear all active touches.
   */
  _clearAllTouches() {
    for (const tracker of this._touchMap.values()) {
      this._touchMap.delete(tracker.identifier);
    }
    this._touchMap.clear();
    this.state.activeElement = null;
    this.state.isInteracting = false;
  }

  // ── Event handlers ────────────────────────────────────────────────────

  _handleTouchStart(e) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      this._processTouch(
        touch.identifier,
        touch.clientX,
        touch.clientY,
      );
    }
  }

  _handleTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const tracker = this._touchMap.get(touch.identifier);
      if (!tracker) continue;

      const { element, point } = this._raycast(
        touch.clientX,
        touch.clientY,
      );
      if (point) {
        tracker.update(point);

        if (element === tracker.element) {
          const type = element.type;
          if (type === 'paddle' && element.setRotation) {
            this._handlePaddleDrag(tracker, element);
          } else if (type === 'gate' && element.panel) {
            this._handleGateSlide(tracker, element);
          }
        }
      }
    }
  }

  _handleTouchEnd(e) {
    e.stopPropagation();

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const tracker = this._touchMap.get(touch.identifier);
      if (tracker) {
        this._releaseElement(tracker);
      }
    }

    if (this._touchMap.size === 0) {
      this.state.activeElement = null;
      this.state.isInteracting = false;
    }
  }

  _handleTouchCancel(e) {
    e.stopPropagation();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const tracker = this._touchMap.get(touch.identifier);
      if (tracker) {
        this._touchMap.delete(touch.identifier);
      }
    }
    if (this._touchMap.size === 0) {
      this.state.activeElement = null;
      this.state.isInteracting = false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * @returns {Object}  Readable state: { activeElement, touchPosition, isInteracting }
   */
  getState() {
    return {
      activeElement: this.state.activeElement,
      touchPosition: this.state.touchPosition.clone(),
      isInteracting: this.state.isInteracting,
    };
  }

  /**
   * @returns {Map<number, TouchTracker>}  Copy of active touch map
   */
  getTouchMap() {
    return new Map(this._touchMap);
  }

  /**
   * @returns {number}  Number of active touches
   */
  getTouchCount() {
    return this._touchMap.size;
  }

  /**
   * Reset the controller (clear all tracking).
   */
  reset() {
    this._clearAllTouches();
  }
}

export default InputController;
