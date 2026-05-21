/**
 * Scene.js — Three.js scene management and level element creation.
 *
 * Provides methods for creating level elements (paddles, walls, gates,
 * collectors, emitter markers) and managing the scene lifecycle.
 */

import * as THREE from 'three';

/**
 * Element type constants.
 */
export const SceneElementType = Object.freeze({
  PADDLE: 'paddle',
  WALL: 'wall',
  GATE: 'gate',
  COLLECTOR: 'collector',
  EMITTER_MARKER: 'emitter',
});

/**
 * Scene class — manages Three.js scene elements and level geometry.
 */
export class Scene {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to manage elements in.
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {Array<Object>} Paddle objects */
    this.paddles = [];

    /** @type {Array<Object>} Wall objects */
    this.walls = [];

    /** @type {Array<Object>} Gate objects */
    this.gates = [];

    /** @type {Array<Object>} Collector objects */
    this.collectors = [];

    /** @type {Array<Object>} Emitter marker objects */
    this.emitterMarkers = [];

    /** @type {THREE.Color} Default paddle color */
    this._paddleColor = 0x00ff88;

    /** @type {THREE.Color} Default wall color */
    this._wallColor = 0x444466;

    /** @type {THREE.Color} Default gate color */
    this._gateColor = 0x886644;
  }

  /**
   * Create a paddle element.
   * @param {Object} options
   * @param {string} options.id - Element ID
   * @param {number} options.x - X position
   * @param {number} options.y - Y position
   * @param {number} [options.width=1.0] - Paddle width
   * @param {number} [options.height=0.15] - Paddle height
   * @param {number} [options.color=0x00ff88] - Paddle color
   * @param {number} [options.rotation=0] - Initial rotation (radians)
   * @returns {Object} Paddle object with group and properties
   */
  createPaddle({
    id, x, y, width = 1.0, height = 0.15,
    color = 0x00ff88, rotation = 0,
  }) {
    const group = new THREE.Group();
    group.name = id || 'paddle';
    group.userData.elementType = 'paddle';
    group.userData.clickable = true;

    // Paddle geometry
    const geo = new THREE.BoxGeometry(width, height, 0.1);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      metalness: 0.3,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    group.position.set(x, y, 0);
    this.scene.add(group);

    const paddle = {
      id,
      group,
      rotation,
      targetAngle: 0,
      angleSpeed: 0,
      width,
      height,
      color,
    };
    this.paddles.push(paddle);
    return paddle;
  }

  /**
   * Create a wall element.
   * @param {Object} options
   * @param {string} options.id - Element ID
   * @param {THREE.Box3} options.aabb - Axis-aligned bounding box
   * @param {number} [options.color=0x444466] - Wall color
   * @returns {Object} Wall object
   */
  createWall({ id, aabb, color = 0x444466 }) {
    const group = new THREE.Group();
    group.name = id || 'wall';
    group.userData.elementType = 'wall';

    // Calculate dimensions from aabb
    const center = new THREE.Vector3();
    aabb.getCenter(center);
    const size = new THREE.Vector3();
    aabb.getSize(size);

    const geo = new THREE.BoxGeometry(
      Math.abs(size.x), Math.abs(size.y), 0.2
    );
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.5,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    group.add(mesh);

    this.scene.add(group);

    const wall = { id, group, aabb, color };
    this.walls.push(wall);
    return wall;
  }

  /**
   * Create a gate element (slideable barrier).
   * @param {Object} options
   * @param {string} options.id - Element ID
   * @param {number} options.x - Center X
   * @param {number} options.y - Center Y
   * @param {number} options.width - Gate width
   * @param {number} options.height - Gate height
   * @param {number} options.slideRange - How far it can slide horizontally
   * @param {number} [options.color=0x886644] - Gate color
   * @returns {Object} Gate object
   */
  createGate({
    id, x, y, width, height, slideRange, color = 0x886644,
  }) {
    const group = new THREE.Group();
    group.name = id || 'gate';
    group.userData.elementType = 'gate';
    group.userData.clickable = true;

    const geo = new THREE.BoxGeometry(width, height, 0.15);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2,
      metalness: 0.4,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    group.position.set(x, y, 0);
    this.scene.add(group);

    const gate = {
      id, group,
      slideRange,
      offset: 0,
      targetOffset: 0,
      color,
    };
    this.gates.push(gate);
    return gate;
  }

  /**
   * Create a collector element (target zone).
   * @param {Object} options
   * @param {string} options.id - Element ID
   * @param {number} options.x - Center X
   * @param {number} options.y - Center Y
   * @param {number} options.radius - Collector radius
   * @param {number} options.requiredColor - Required particle color (hex)
   * @param {number} options.targetCount - Number of particles needed
   * @returns {Object} Collector object
   */
  createCollector({
    id, x, y, radius, requiredColor, targetCount,
  }) {
    const group = new THREE.Group();
    group.name = id || 'collector';
    group.userData.elementType = 'collector';

    // Outer ring
    const ringGeo = new THREE.RingGeometry(radius * 0.8, radius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: requiredColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = 0.01;
    group.add(ring);

    // Inner glow sphere
    const glowGeo = new THREE.SphereGeometry(radius * 0.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: requiredColor,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // Label ring (visual)
    const labelGeo = new THREE.RingGeometry(radius * 1.1, radius * 1.15, 32);
    const labelMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.z = 0.02;
    group.add(label);

    group.position.set(x, y, 0);
    this.scene.add(group);

    const collector = {
      id,
      group,
      center: new THREE.Vector3(x, y, 0),
      radius,
      requiredColor,
      targetCount,
      collectedCount: 0,
      hit: false,
      hitTimer: 0,
      glow,
      ring,
      label,
    };
    this.collectors.push(collector);
    return collector;
  }

  /**
   * Create an emitter marker (visual indicator at spawn point).
   * @param {Object} options
   * @param {string} options.id - Element ID
   * @param {number} options.x - X position
   * @param {number} options.y - Y position
   * @param {number} options.color - Emitter color (hex)
   * @returns {Object} Emitter marker object
   */
  createEmitterMarker({ id, x, y, color = 0xff4400 }) {
    const group = new THREE.Group();
    group.name = id || 'emitter';
    group.userData.elementType = 'emitter_marker';

    // Pulse ring
    const ringGeo = new THREE.RingGeometry(0.15, 0.25, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // Center dot
    const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: color,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);

    group.position.set(x, y, 0);
    this.scene.add(group);

    const marker = { id, group, ring, dot, color };
    this.emitterMarkers.push(marker);
    return marker;
  }

  /**
   * Update all scene elements each frame.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    // Animate emitter markers
    for (const marker of this.emitterMarkers) {
      const pulse = Math.sin(performance.now() * 0.003) * 0.2 + 0.8;
      marker.group.scale.set(pulse, pulse, 1);
      marker.ring.material.opacity = 0.4 + pulse * 0.3;
    }

    // Animate collectors
    for (const collector of this.collectors) {
      const pulse = Math.sin(performance.now() * 0.002 + collector.center.x) * 0.1 + 0.9;
      collector.ring.material.opacity = 0.4 + pulse * 0.2;
      collector.glow.scale.set(pulse, pulse, 1);

      if (collector.hitTimer > 0) {
        collector.hitTimer -= dt;
        // Flash brighter
        const flash = collector.hitTimer < 0.25 ? 0.8 : 0.3;
        collector.glow.material.opacity = flash;
      }

      // Animate label
      if (collector.label) {
        const labelPulse = Math.sin(performance.now() * 0.001 + collector.center.y) * 0.05 + 1;
        collector.label.scale.set(labelPulse, labelPulse, 1);
      }
    }

    // Animate gates
    for (const gate of this.gates) {
      // Smooth slide
      const diff = gate.targetOffset - gate.offset;
      gate.offset += diff * Math.min(dt * 5, 1);
      gate.group.position.x = gate.group.position.x + gate.offset;
      gate.targetOffset = 0; // Reset after applying
    }
  }

  /**
   * Clear all elements from the scene.
   */
  clear() {
    const disposeObj = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj.children) {
        for (const child of obj.children) {
          disposeObj(child);
        }
      }
      if (obj.parent) {
        obj.parent.remove(obj);
      }
    };

    for (const paddle of this.paddles) {
      disposeObj(paddle.group);
    }
    for (const wall of this.walls) {
      disposeObj(wall.group);
    }
    for (const gate of this.gates) {
      disposeObj(gate.group);
    }
    for (const collector of this.collectors) {
      disposeObj(collector.group);
    }
    for (const marker of this.emitterMarkers) {
      disposeObj(marker.group);
    }

    this.paddles.length = 0;
    this.walls.length = 0;
    this.gates.length = 0;
    this.collectors.length = 0;
    this.emitterMarkers.length = 0;
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this.clear();
  }
}
