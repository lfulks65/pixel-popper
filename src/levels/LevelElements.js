/**
 * LevelElements.js — 3D meshes for each interactive element type.
 *
 * Each element extends BaseLevelElement which defines the common interface:
 *   - createMesh()  → returns THREE.Group or Mesh
 *   - getCollisionBounds() → returns an AABB {min, max} in world space
 *   - update(dt)    → for animated elements (movers, portals, etc.)
 *   - onHover(state) → visual feedback (highlight / de-highlight)
 */

import * as THREE from 'three';

// ─── Rounded-rectangle geometry builder ───────────────────────────────────
function createRoundedRectGeometry(width, height, depth, radius, segments = 4) {
  const shape = new THREE.Shape();
  const w = width / 2 - radius;
  const h = height / 2 - radius;
  shape.moveTo(-w - radius, -h);
  shape.lineTo(w, -h);
  shape.quadraticCurveTo(w + radius, -h, w + radius, -h + radius);
  shape.lineTo(w + radius, h);
  shape.quadraticCurveTo(w + radius, h + radius, w, h + radius);
  shape.lineTo(-w, h + radius);
  shape.quadraticCurveTo(-w - radius, h + radius, -w - radius, h);
  shape.lineTo(-w - radius, -h + radius);
  shape.quadraticCurveTo(-w - radius, -h, -w, -h);

  const extrudeSettings = { depth, bevelEnabled: false };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2); // lie flat
  geo.translate(0, depth / 2, 0);
  return geo;
}

/**
 * Simple rounded-rectangle paddle geometry (flat, thin box).
 */
function createPaddleGeometry(width, height, depth, cornerRadius = 0.05) {
  const shape = new THREE.Shape();
  const hw = width / 2 - cornerRadius;
  const hh = height / 2 - cornerRadius;

  shape.moveTo(-hw, -hh - cornerRadius);
  shape.lineTo(-hw, hh);
  shape.quadraticCurveTo(-hw, hh + cornerRadius, -hw + cornerRadius, hh + cornerRadius);
  shape.lineTo(hw - cornerRadius, hh + cornerRadius);
  shape.quadraticCurveTo(hw, hh + cornerRadius, hw, hh);
  shape.lineTo(hw, hh - cornerRadius);
  shape.quadraticCurveTo(hw, hh - cornerRadius - (hh + cornerRadius - (hh)), hh - cornerRadius - (hh - hh));
  // Simpler approach: use arc-style
  shape.lineTo(hw, hh - cornerRadius);
  shape.quadraticCurveTo(hw, hh, hw - cornerRadius, hh);
  shape.lineTo(-hw + cornerRadius, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cornerRadius);
  shape.lineTo(-hw, -hh + cornerRadius);
  shape.quadraticCurveTo(-hw, -hh, -hw + cornerRadius, -hh);
  shape.lineTo(hw - cornerRadius, -hh);

  const extrudeSettings = { depth, bevelEnabled: false };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  return geo;
}

/**
 * Diamond shape geometry (top-down view, tapered vertically for a plate).
 */
function createDiamondGeometry(topWidth, topDepth, height, bevel = 0.05) {
  const shape = new THREE.Shape();
  const hw = topWidth / 2;
  const hd = topDepth / 2;

  shape.moveTo(0, -hd);
  shape.lineTo(hw, 0);
  shape.lineTo(0, hd);
  shape.lineTo(-hw, 0);
  shape.closePath();

  const extrudeSettings = { depth: height, bevelEnabled: false };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, height / 2, 0);
  return geo;
}


// ─── Base class ───────────────────────────────────────────────────────────
export class BaseLevelElement {
  /**
   * @param {Object} data  Element data from the level definition.
   */
  constructor(data = {}) {
    this.type = data.type || 'wall';
    this.position = data.position ? new THREE.Vector3(...data.position) : new THREE.Vector3();
    this.mesh = null;
    this.highlightMesh = null;
    this.originalMaterials = new Map();
    this.hovered = false;
  }

  /**
   * Create and return the THREE.Group / Mesh for this element.
   * Subclasses must override.
   * @returns {THREE.Group}
   */
  createMesh() {
    throw new Error('createMesh() must be implemented by subclass');
  }

  /**
   * Return an axis-aligned bounding box for particle collision.
   * @returns {{ min: THREE.Vector3, max: THREE.Vector3 }}
   */
  getCollisionBounds() {
    throw new Error('getCollisionBounds() must be implemented by subclass');
  }

  /**
   * Called each frame with delta time. Subclasses animate as needed.
   * @param {number} dt  Delta time in seconds.
   */
  update(_dt) {
    // No-op in base
  }

  /**
   * Visual feedback when the player hovers over / touches an element.
   * @param {boolean} hovered
   */
  onHover(hovered) {
    this.hovered = hovered;
    if (hovered) {
      this._applyHighlight();
    } else {
      this._removeHighlight();
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────
  _applyHighlight() {
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material);
        }
        const highlight = child.material.clone();
        highlight.emissive = new THREE.Color(0xffff88);
        highlight.emissiveIntensity = 0.4;
        child.material = highlight;
      }
    });
  }

  _removeHighlight() {
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.isMesh && this.originalMaterials.has(child.uuid)) {
        child.material.dispose();
        child.material = this.originalMaterials.get(child.uuid);
      }
    });
    this.originalMaterials.clear();
  }

  _buildAABB(offsetX, offsetY, offsetZ, halfSizeX, halfSizeY, halfSizeZ) {
    const pos = this.position;
    return {
      min: new THREE.Vector3(
        pos.x + offsetX - halfSizeX,
        pos.y + offsetY - halfSizeY,
        pos.z + offsetZ - halfSizeZ
      ),
      max: new THREE.Vector3(
        pos.x + offsetX + halfSizeX,
        pos.y + offsetY + halfSizeY,
        pos.z + offsetZ + halfSizeZ
      ),
    };
  }
}


// ─── Wall ─────────────────────────────────────────────────────────────────
export class WallElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.size = data.size || [1, 1, 0.2];
  }

  createMesh() {
    const [w, h, d] = this.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.3,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    return this.mesh;
  }

  getCollisionBounds() {
    const [w, h, d] = this.size;
    return this._buildAABB(0, 0, 0, w / 2, h / 2, d / 2);
  }
}


// ─── Paddle ───────────────────────────────────────────────────────────────
export class PaddleElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.rotation = data.rotation || 0; // initial angle in radians
    this.limits = data.limits || [-Math.PI / 4, Math.PI / 4]; // [-45°, 45°]
    this.width = data.width || 1.2;
    this.height = data.height || 0.08;
    this.depth = data.depth || 0.08;
  }

  createMesh() {
    const group = new THREE.Group();

    // Paddle body — flat rounded rectangle
    const geo = createRoundedRectGeometry(
      this.width,
      this.height,
      this.depth,
      Math.min(this.width, this.height) * 0.15,
      4
    );

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.4,
      metalness: 0.6,
    });
    const paddle = new THREE.Mesh(geo, mat);
    group.add(paddle);

    // Pivot indicator (small sphere at center)
    const pivotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pivotMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    this.pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
    group.add(this.pivotMesh);

    // Store initial rotation
    this.initialRotation = this.rotation;
    group.rotation.z = this.rotation;
    group.position.copy(this.position);

    this.mesh = group;
    return this.mesh;
  }

  /** Rotate the paddle (clamped to limits). */
  setRotation(angle) {
    this.rotation = Math.max(this.limits[0], Math.min(this.limits[1], angle));
    if (this.mesh) {
      this.mesh.rotation.z = this.rotation;
    }
  }

  update(dt) {
    // Paddles can be updated by input, nothing animated by default
  }

  getCollisionBounds() {
    return this._buildAABB(0, 0, 0, this.width / 2, this.height / 2, this.depth / 2);
  }
}


// ─── Gate ─────────────────────────────────────────────────────────────────
export class GateElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.initialState = data.initialState || 'closed'; // 'closed' | 'open'
    this.width = data.width || 1.0;
    this.height = data.height || 0.8;
    this.depth = data.depth || 0.1;
    this.slideDistance = data.slideDistance || 0.6;
    this.state = this.initialState; // runtime state
  }

  createMesh() {
    const group = new THREE.Group();

    // Frame (static, outlines the opening)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.4,
    });

    // Left pillar
    const pillarGeo = new THREE.BoxGeometry(0.08, this.height + 0.16, this.depth);
    const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
    leftPillar.position.set(-this.width / 2 - 0.04, 0, 0);
    group.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
    rightPillar.position.set(this.width / 2 + 0.04, 0, 0);
    group.add(rightPillar);

    // Top beam
    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + 0.24, 0.08, this.depth),
      frameMat
    );
    topBeam.position.set(0, this.height / 2 + 0.04, 0);
    group.add(topBeam);

    // Sliding panel
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xcc4444,
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.panel = new THREE.Mesh(
      new THREE.BoxGeometry(this.width - 0.16, this.height - 0.16, this.depth),
      panelMat
    );
    this.panel.castShadow = true;
    group.add(this.panel);

    group.position.copy(this.position);
    this.mesh = group;

    // Set initial position based on state
    this._applyGateState();

    return this.mesh;
  }

  _applyGateState() {
    if (!this.panel) return;
    const offset = this.state === 'closed' ? 0 : this.slideDistance;
    this.panel.position.y = offset;
  }

  toggle() {
    this.state = this.state === 'closed' ? 'open' : 'closed';
    this._applyGateState();
  }

  update(dt) {
    // Smooth slide animation could go here
    if (!this.panel) return;
    const targetY = this.state === 'closed' ? 0 : this.slideDistance;
    this.panel.position.y += (targetY - this.panel.position.y) * Math.min(1, dt * 6);
  }

  getCollisionBounds() {
    if (this.state === 'open') {
      // Gate is fully open — return no meaningful bounds (or very thin)
      return {
        min: new THREE.Vector3(0, 0, 0),
        max: new THREE.Vector3(0, 0, 0),
      };
    }
    // Closed gate blocks the opening
    return this._buildAABB(0, 0, 0, this.width / 2, this.height / 2, this.depth / 2);
  }
}


// ─── Splitter ─────────────────────────────────────────────────────────────
export class SplitterElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.outputs = data.outputs || ['#ff3333', '#3333ff']; // colors for output streams
    this.topWidth = data.topWidth || 0.8;
    this.topDepth = data.topDepth || 0.8;
    this.height = data.height || 0.06;
  }

  createMesh() {
    const group = new THREE.Group();

    // Diamond plate (top-down view)
    const geo = createDiamondGeometry(this.topWidth, this.topDepth, this.height);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.5,
      metalness: 0.5,
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.castShadow = true;
    group.add(plate);

    // Output indicators (colored wedges at the edges)
    this.outputs.forEach((color, i) => {
      const indicatorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.3,
        roughness: 0.3,
      });
      const indicatorGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
      const angle = (i / this.outputs.length) * Math.PI * 2 - Math.PI / 2;
      indicator.position.set(
        Math.cos(angle) * this.topWidth * 0.3,
        this.height / 2,
        Math.sin(angle) * this.topDepth * 0.3
      );
      group.add(indicator);
    });

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  getCollisionBounds() {
    return this._buildAABB(0, 0, 0, this.topWidth / 2, this.height / 2, this.topDepth / 2);
  }
}


// ─── Funnel ───────────────────────────────────────────────────────────────
export class FunnelElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.direction = data.direction || 'down'; // 'down' | 'up' | 'left' | 'right'
    this.topWidth = data.topWidth || 1.5;
    this.topDepth = data.topDepth || 1.5;
    this.bottomWidth = data.bottomWidth || 0.4;
    this.bottomDepth = data.bottomDepth || 0.4;
    this.height = data.height || 0.6;
  }

  createMesh() {
    const group = new THREE.Group();

    // Tapered shape using a custom approach: build from 4 trapezoid sides
    const topHalf = this.topWidth / 2;
    const topDHalf = this.topDepth / 2;
    const botHalf = this.bottomWidth / 2;
    const botDHalf = this.bottomDepth / 2;
    const h = this.height;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x55aa55,
      roughness: 0.6,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
    });

    // Front face
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-topHalf, 0);
    frontShape.lineTo(topHalf, 0);
    frontShape.lineTo(botHalf, h);
    frontShape.lineTo(-botHalf, h);
    frontShape.closePath();

    const extrudeSettings = { depth: this.topDepth, bevelEnabled: false };
    const frontGeo = new THREE.ExtrudeGeometry(frontShape, extrudeSettings);
    const frontMesh = new THREE.Mesh(frontGeo, mat);
    frontMesh.position.z = -this.topDepth / 2;
    group.add(frontMesh);

    // Back face
    const backGeo = new THREE.ExtrudeGeometry(frontShape, extrudeSettings);
    const backMesh = new THREE.Mesh(backGeo, mat);
    backMesh.position.z = this.topDepth / 2;
    group.add(backMesh);

    // Top opening ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x338833,
      roughness: 0.5,
      metalness: 0.3,
    });
    const topRing = new THREE.Mesh(
      new THREE.BoxGeometry(this.topWidth, 0.04, this.topDepth),
      ringMat
    );
    topRing.position.y = h;
    group.add(topRing);

    // Bottom opening ring
    const botRing = new THREE.Mesh(
      new THREE.BoxGeometry(this.bottomWidth, 0.04, this.bottomDepth),
      ringMat
    );
    botRing.position.y = h;
    botRing.position.z = 0;
    group.add(botRing);

    group.position.copy(this.position);
    if (this.direction === 'up') {
      group.rotation.x = Math.PI;
    }

    this.mesh = group;
    return this.mesh;
  }

  getCollisionBounds() {
    return this._buildAABB(0, 0, 0, this.topWidth / 2, this.height, this.topDepth / 2);
  }
}


// ─── Bumper ───────────────────────────────────────────────────────────────
export class BumperElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.bounceForce = data.bounceForce || 5;
    this.radius = data.radius || 0.25;
    this.height = data.height || 0.2;
    this.pulsePhase = Math.random() * Math.PI * 2; // random start phase
  }

  createMesh() {
    const group = new THREE.Group();

    // Main body — cylinder
    const geo = new THREE.CylinderGeometry(
      this.radius,
      this.radius,
      this.height,
      24
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.body = new THREE.Mesh(geo, mat);
    this.body.castShadow = true;
    group.add(this.body);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(this.radius + 0.03, 0.02, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff4400,
      emissiveIntensity: 0.3,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = this.height / 2;
    group.add(this.ring);

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  update(dt) {
    // Pulsing glow effect
    if (!this.ring) return;
    this.pulsePhase += dt * 3;
    const pulse = 0.2 + 0.2 * Math.sin(this.pulsePhase);
    this.ring.material.emissiveIntensity = pulse;
  }

  getCollisionBounds() {
    return {
      min: new THREE.Vector3(
        this.position.x - this.radius,
        this.position.y - this.height / 2,
        this.position.z - this.radius
      ),
      max: new THREE.Vector3(
        this.position.x + this.radius,
        this.position.y + this.height / 2,
        this.position.z + this.radius
      ),
    };
  }
}


// ─── Mover ────────────────────────────────────────────────────────────────
export class MoverElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.path = (data.path || []).map((p) => new THREE.Vector3(...p));
    this.speed = data.speed || 2;
    this.width = data.width || 1.0;
    this.height = data.height || 0.06;
    this.depth = data.depth || 0.6;
    this._pathLength = this._calculatePathLength();
    this._progress = 0; // 0..1 along path
  }

  _calculatePathLength() {
    let len = 0;
    for (let i = 1; i < this.path.length; i++) {
      len += this.path[i - 1].distanceTo(this.path[i]);
    }
    return len || 1;
  }

  createMesh() {
    const group = new THREE.Group();

    // Platform
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8855cc,
      roughness: 0.4,
      metalness: 0.5,
    });
    this.platform = new THREE.Mesh(geo, mat);
    this.platform.castShadow = true;
    this.platform.receiveShadow = true;
    group.add(this.platform);

    // Arrow indicators showing direction
    if (this.path.length >= 2) {
      const dir = this.path[1].clone().sub(this.path[0]).normalize();
      const arrowGeo = new THREE.ConeGeometry(0.06, 0.15, 6);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, this.height / 2 + 0.08, 0);
      arrow.rotation.z = -Math.atan2(dir.y, dir.x) + Math.PI / 2;
      group.add(arrow);
    }

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  update(dt) {
    if (!this.platform || this.path.length < 2) return;

    this._progress += (this.speed * dt) / this._pathLength;
    if (this._progress >= 1) {
      this._progress = 0; // loop
    }

    // Interpolate along path
    let traveled = this._progress * this._pathLength;
    let pos = new THREE.Vector3();

    for (let i = 0; i < this.path.length - 1; i++) {
      const seg = this.path[i].distanceTo(this.path[i + 1]);
      if (traveled <= seg) {
        const t = traveled / seg;
        pos.lerpVectors(this.path[i], this.path[i + 1], t);
        break;
      }
      traveled -= seg;
      if (i === this.path.length - 2) {
        pos.copy(this.path[i + 1]);
      }
    }

    this.platform.position.copy(pos);
  }

  getCollisionBounds() {
    if (!this.platform) {
      return this._buildAABB(0, 0, 0, this.width / 2, this.height / 2, this.depth / 2);
    }
    const p = this.platform.position;
    return {
      min: new THREE.Vector3(
        p.x - this.width / 2,
        p.y - this.height / 2,
        p.z - this.depth / 2
      ),
      max: new THREE.Vector3(
        p.x + this.width / 2,
        p.y + this.height / 2,
        p.z + this.depth / 2
      ),
    };
  }
}


// ─── Portal ───────────────────────────────────────────────────────────────
export class PortalElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.exitPosition = data.exitPosition ? new THREE.Vector3(...data.exitPosition) : new THREE.Vector3();
    this.radius = data.radius || 0.4;
    this.tubeRadius = data.tubeRadius || 0.06;
    this.color = data.color || 0x00ccff;
    this._rotationAngle = 0;
  }

  createMesh() {
    const group = new THREE.Group();

    // Torus ring
    const ringGeo = new THREE.TorusGeometry(this.radius, this.tubeRadius, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(this.ring);

    // Inner glow disc
    const discGeo = new THREE.CircleGeometry(this.radius - this.tubeRadius, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this.disc = new THREE.Mesh(discGeo, discMat);
    group.add(this.disc);

    // Particle effect particles (small spheres orbiting)
    this.particleGroup = new THREE.Group();
    const pGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: this.color });
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(pGeo, pMat.clone());
      p.userData.index = i;
      this.particleGroup.add(p);
    }
    group.add(this.particleGroup);

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  update(dt) {
    // Slow rotation
    if (this.ring) {
      this._rotationAngle += dt * 0.5;
      this.ring.rotation.x = this._rotationAngle;
      this.ring.rotation.y = this._rotationAngle * 0.7;
      this.disc.rotation.copy(this.ring.rotation);
    }

    // Orbiting particles
    const count = this.particleGroup.children.length;
    for (let i = 0; i < count; i++) {
      const p = this.particleGroup.children[i];
      const angle = (i / count) * Math.PI * 2 + this._rotationAngle * 2;
      const r = this.radius * 0.6;
      p.position.x = Math.cos(angle) * r;
      p.position.y = Math.sin(angle) * r;
      p.position.z = Math.sin(angle * 2 + i) * 0.05;
    }
  }

  getCollisionBounds() {
    return {
      min: new THREE.Vector3(
        this.position.x - this.radius,
        this.position.y - this.radius,
        this.position.z - this.tubeRadius
      ),
      max: new THREE.Vector3(
        this.position.x + this.radius,
        this.position.y + this.radius,
        this.position.z + this.tubeRadius
      ),
    };
  }
}


// ─── Converter ────────────────────────────────────────────────────────────
export class ConverterElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.fromColor = data.fromColor || '#ff3333';
    this.toColor = data.toColor || '#3333ff';
    this.width = data.width || 0.8;
    this.height = data.height || 0.6;
    this.depth = data.depth || 0.3;
    this._glowPhase = Math.random() * Math.PI * 2;
  }

  createMesh() {
    const group = new THREE.Group();

    // Main box
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.fromColor),
      roughness: 0.4,
      metalness: 0.5,
    });
    this.box = new THREE.Mesh(geo, mat);
    this.box.castShadow = true;
    group.add(this.box);

    // Glow border
    const borderGeo = new THREE.EdgesGeometry(geo);
    const borderMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.toColor),
      transparent: true,
      opacity: 0.8,
    });
    this.border = new THREE.LineSegments(borderGeo, borderMat);
    group.add(this.border);

    // Arrow indicators (input → output)
    const arrowGeo = new THREE.ConeGeometry(0.05, 0.12, 6);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffdd44 });
    this.inputArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.inputArrow.rotation.z = -Math.PI / 2;
    this.inputArrow.position.set(-this.width / 2 - 0.1, 0, 0);
    group.add(this.inputArrow);

    this.outputArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.outputArrow.rotation.z = Math.PI / 2;
    this.outputArrow.position.set(this.width / 2 + 0.1, 0, 0);
    group.add(this.outputArrow);

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  update(dt) {
    // Pulsing glow
    this._glowPhase += dt * 2;
    if (this.border) {
      this.border.material.opacity = 0.5 + 0.3 * Math.sin(this._glowPhase);
    }
    if (this.box) {
      // Shift color between fromColor and toColor
      const t = 0.5 + 0.5 * Math.sin(this._glowPhase);
      const col = new THREE.Color(this.fromColor).lerp(new THREE.Color(this.toColor), t);
      this.box.material.emissive = col;
      this.box.material.emissiveIntensity = 0.1 + 0.1 * Math.sin(this._glowPhase * 1.5);
    }
  }

  getCollisionBounds() {
    return this._buildAABB(0, 0, 0, this.width / 2, this.height / 2, this.depth / 2);
  }
}


// ─── Collector (bucket) ───────────────────────────────────────────────────
export class CollectorElement extends BaseLevelElement {
  constructor(data) {
    super(data);
    this.color = data.color || '#ff3333';
    this.targetCount = data.targetCount || 50;
    this.width = data.width || 1.0;
    this.height = data.height || 0.6;
    this.depth = data.depth || 0.8;
    this.collectedCount = 0;
    this._shakePhase = 0;
  }

  createMesh() {
    const group = new THREE.Group();

    const col = new THREE.Color(this.color);

    // Open-top box: build from 4 walls + bottom
    const wallThickness = 0.06;
    const wallHeight = this.height;

    const wallMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.5,
      metalness: 0.4,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: col.clone().multiplyScalar(0.7),
      roughness: 0.6,
      metalness: 0.3,
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.width, wallHeight, wallThickness),
      wallMat
    );
    backWall.position.set(0, wallHeight / 2, this.depth / 2);
    backWall.castShadow = true;
    group.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.width, wallHeight, wallThickness),
      wallMat
    );
    frontWall.position.set(0, wallHeight / 2, -this.depth / 2);
    frontWall.castShadow = true;
    group.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, this.depth),
      wallMat
    );
    leftWall.position.set(-this.width / 2 + wallThickness / 2, wallHeight / 2, 0);
    leftWall.castShadow = true;
    group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, this.depth),
      wallMat
    );
    rightWall.position.set(this.width / 2 - wallThickness / 2, wallHeight / 2, 0);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Bottom
    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(this.width - wallThickness, wallThickness, this.depth - wallThickness),
      bottomMat
    );
    bottom.position.set(0, wallThickness / 2, 0);
    bottom.receiveShadow = true;
    group.add(bottom);

    // Indicator light on top
    const indicatorGeo = new THREE.SphereGeometry(0.06, 8, 8);
    this.indicatorMat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.5,
    });
    this.indicator = new THREE.Mesh(indicatorGeo, this.indicatorMat);
    this.indicator.position.set(0, wallHeight + 0.1, 0);
    group.add(this.indicator);

    // Fill progress indicator (floating bar)
    const barGeo = new THREE.BoxGeometry(this.width - 0.1, 0.04, this.depth - 0.1);
    this.progressBar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      emissive: 0x22aa22,
      emissiveIntensity: 0.3,
    }));
    this.progressBar.position.set(0, wallHeight + 0.2, 0);
    group.add(this.progressBar);

    group.position.copy(this.position);
    this.mesh = group;
    return this.mesh;
  }

  /** Called when particles are collected. */
  addCollected(count) {
    this.collectedCount += count;
    this._updateProgressBar();
  }

  _updateProgressBar() {
    if (!this.progressBar) return;
    const ratio = Math.min(1, this.collectedCount / this.targetCount);
    this.progressBar.scale.x = ratio;
    this.progressBar.position.x = (-this.width / 2 + 0.05) + (this.width - 0.1) * ratio / 2;
  }

  update(dt) {
    // Shake indicator when full
    if (this.collectedCount >= this.targetCount) {
      this._shakePhase += dt * 8;
      if (this.indicator) {
        this.indicator.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(this._shakePhase);
      }
    }
  }

  getCollisionBounds() {
    return this._buildAABB(0, 0, 0, this.width / 2, this.height, this.depth / 2);
  }

  reset() {
    this.collectedCount = 0;
    this._updateProgressBar();
  }
}


// ─── Element factory ──────────────────────────────────────────────────────
/**
 * Create a LevelElement instance from data.
 * @param {Object} data  Element data from the level definition.
 * @returns {BaseLevelElement}
 */
export function createElement(data) {
  switch (data.type) {
    case 'wall':
      return new WallElement(data);
    case 'paddle':
      return new PaddleElement(data);
    case 'gate':
      return new GateElement(data);
    case 'splitter':
      return new SplitterElement(data);
    case 'funnel':
      return new FunnelElement(data);
    case 'bumper':
      return new BumperElement(data);
    case 'mover':
      return new MoverElement(data);
    case 'portal':
      return new PortalElement(data);
    case 'converter':
      return new ConverterElement(data);
    case 'collector':
      return new CollectorElement(data);
    default:
      console.warn(`Unknown element type: ${data.type}`);
      return new BaseLevelElement(data);
  }
}
