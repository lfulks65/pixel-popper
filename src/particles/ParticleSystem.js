import * as THREE from 'three';

/**
 * Particle – lightweight data bag describing one particle's state.
 * Uses typed arrays internally for GPU instancing performance.
 */
export class Particle {
  static SIZE = 10; // vec3 pos + vec3 vel + vec3 rgb + float lifetime + bool active = 10 floats

  /** @type {Float32Array}  Shared backing store – offset × SIZE entries */
  static pool = null;
  /** @type {Float32Array}  Typed array view into backing store */
  static view = null;

  static init(maxParticles) {
    this.pool = new Float32Array(maxParticles * this.SIZE);
    this.view = this.pool;
  }

  constructor(publicIdx) {
    this._offset = publicIdx * this.SIZE;
  }

  get x() { return this._offset + 0; }
  get y() { return this._offset + 1; }
  get z() { return this._offset + 2; }
  get vx() { return this._offset + 3; }
  get vy() { return this._offset + 4; }
  get vz() { return this._offset + 5; }
  get r() { return this._offset + 6; }
  get g() { return this._offset + 7; }
  get b() { return this._offset + 8; }
  get lifetime() { return this._offset + 9; }

  set pos(v) { this.x = v.x; this.y = v.y; this.z = v.z; }
  get pos() {
    return new THREE.Vector3(this.pool[this.x], this.pool[this.y], this.pool[this.z]);
  }

  set vel(v) { this.vx = v.x; this.vy = v.y; this.vz = v.z; }
  get vel() {
    return new THREE.Vector3(this.pool[this.vx], this.pool[this.vy], this.pool[this.vz]);
  }

  set color(v) { this.r = v.x; this.g = v.y; this.b = v.z; }
  get color() {
    return new THREE.Color(this.pool[this.r], this.pool[this.g], this.pool[this.b]);
  }

  get active() { return this.pool[this.lifetime + 1] > 0; }
  set active(v) { this.pool[this.lifetime + 1] = v ? 1 : 0; }

  reset() {
    this.pool[this.x] = 0;
    this.pool[this.y] = 0;
    this.pool[this.z] = 0;
    this.pool[this.vx] = 0;
    this.pool[this.vy] = 0;
    this.pool[this.vz] = 0;
    this.pool[this.r] = 1;
    this.pool[this.g] = 1;
    this.pool[this.b] = 1;
    this.pool[this.lifetime] = 0;
    this.pool[this.lifetime + 1] = 0;
  }
}

/**
 * ParticleEmitter – a single spawn point with configurable parameters.
 */
export class ParticleEmitter {
  /**
   * @param {THREE.Vector3} position  World-space spawn origin.
   * @param {number} rate  Particles spawned per second.
   * @param {THREE.Vector3} velocity  Base velocity vector.
   * @param {THREE.Vector3} spread  Random spread per axis per spawn.
   * @param {THREE.Color} color  Spawn color.
   * @param {number} lifetime  Particle lifetime in seconds.
   */
  constructor({
    position = new THREE.Vector3(0, 0, 0),
    rate = 100,
    velocity = new THREE.Vector3(0, -5, 0),
    spread = new THREE.Vector3(0.5, 0.5, 0.5),
    color = new THREE.Color(0xffaa00),
    lifetime = 2.0,
  } = {}) {
    this.position = position;
    this.rate = rate;
    this.velocity = velocity;
    this.spread = spread;
    this.color = color;
    this.lifetime = lifetime;
    this._elapsed = 0;
  }

  /**
   * Spawn particles up to the current time.  Returns the count spawned.
   */
  spawn(system, dt) {
    this._elapsed += dt;
    const interval = 1 / this.rate;
    let count = 0;

    while (this._elapsed >= interval) {
      this._elapsed -= interval;
      system.spawn(this);
      count++;
    }
    return count;
  }
}

/**
 * AABB collision helper.
 */
export class AABB {
  constructor(min = new THREE.Vector3(), max = new THREE.Vector3()) {
    this.min = min;
    this.max = max;
  }
}

/**
 * ParticleSystem – manages a pool of instanced particles using a single
 * THREE.InstancedMesh with a small BoxGeometry.
 *
 * - Up to MAX_PARTICLES (default 5000) particles in the pool.
 * - Each particle holds position, velocity, color, lifetime, active flag.
 * - Gravity pulls particles downward at ~9.8 units/s².
 * - Dead particles are recycled (reset + reused instance slot).
 * - Accepts level geometry for simple sphere-based collision detection.
 */
export class ParticleSystem {
  /** @type {number} */
  static MAX_PARTICLES = 5000;

  /** @type {number} Default gravity (units / s² downward). */
  static DEFAULT_GRAVITY = 9.8;

  /**
   * @param {THREE.Scene} scene  Three.js scene to add the InstancedMesh to.
   * @param {Object} options
   * @param {number} [options.maxParticles]  Pool capacity (default 5000).
   * @param {number} [options.gravity]  Gravity strength, negative = down (default -9.8).
   * @param {THREE.BoxGeometry} [options.geometry]  Geometry for each particle (default small box).
   * @param {THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial} [options.material]  Particle material.
   * @param {number} [options.screenMinX]  World X lower bound for off-screen culling.
   * @param {number} [options.screenMaxX]  World X upper bound.
   * @param {number} [options.screenMinY]  World Y lower bound.
   * @param {number} [options.screenMaxY]  World Y upper bound.
   */
  constructor(scene, {
    maxParticles = ParticleSystem.MAX_PARTICLES,
    gravity = -ParticleSystem.DEFAULT_GRAVITY,
    geometry = null,
    material = null,
    screenMinX = -10,
    screenMaxX = 10,
    screenMinY = -10,
    screenMaxY = 10,
  } = {}) {
    /** @type {number} Maximum pool size */
    this.maxParticles = maxParticles;

    /** @type {number} Gravity applied to y-velocity each second */
    this.gravity = gravity;

    /** @type {number[]} Free indices in the pool (stack). */
    this._free = [];
    for (let i = maxParticles - 1; i >= 0; i--) this._free.push(i);

    /** @type {Set<number>} Currently active particle indices. */
    this._active = new Set();

    /** @type {ParticleEmitter[]} */
    this.emitters = [];

    /** @type {Array<{type:'aabb'|'sphere', data:AABB|THREE.Vector3, radius?:number}>} */
    this.collisionObjects = [];

    /** @type {number} World bounds for off-screen culling */
    this.bounds = { minX: screenMinX, maxX: screenMaxX, minY: screenMinY, maxY: screenMaxY };

    // --- InstancedMesh ---
    const boxGeo = geometry || new THREE.BoxGeometry(0.06, 0.06, 0.06);

    const mat = material || new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.92,
      metalness: 0.1,
      roughness: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(boxGeo, mat, maxParticles);
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    // --- Color buffer (r152+ supports instanceColor) ---
    // Three.js InstancedMesh accepts instanceColor as a BufferAttribute
    // on the mesh. We manage it manually via setInstanceColorAt().
    this._colorBuffer = new Float32Array(maxParticles * 3);
    this._colorAttr = new THREE.InstancedBufferAttribute(this._colorBuffer, 3);
    this._colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = this._colorAttr;

    // --- Transient objects ---
    this._matrix = new THREE.Matrix4();
    this._position = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._scale = new THREE.Vector3(1, 1, 1);

    // --- Initialize shared particle pool ---
    Particle.init(maxParticles);

    // Pre-warm: reset all particles to inactive
    for (let i = 0; i < maxParticles; i++) {
      const p = new Particle(i);
      p.reset();
    }

    // Set all matrices to identity (hidden)
    this._matrix.identity();
    for (let i = 0; i < maxParticles; i++) {
      this.mesh.setMatrixAt(i, this._matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.count = 0;
  }

  // ─── Emitter management ────────────────────────────────────────────

  /** Add an emitter to the system. */
  addEmitter(emitter) {
    if (!(emitter instanceof ParticleEmitter)) {
      emitter = new ParticleEmitter(emitter);
    }
    this.emitters.push(emitter);
    return emitter;
  }

  /** Remove all emitters. */
  clearEmitters() {
    this.emitters.length = 0;
  }

  // ─── Collision geometry ────────────────────────────────────────────

  /** Add an AABB collision object. */
  addAABB(aabb) {
    this.collisionObjects.push({ type: 'aabb', data: aabb });
  }

  /** Add a sphere collision object. */
  addSphere(center, radius = 0.5) {
    this.collisionObjects.push({ type: 'sphere', data: center, radius });
  }

  /** Remove all collision objects. */
  clearCollisionObjects() {
    this.collisionObjects.length = 0;
  }

  // ─── Spawning ──────────────────────────────────────────────────────

  /**
   * Spawn one particle from the free pool using an emitter's config.
   * @param {ParticleEmitter} emitter
   * @returns {Particle|null} The particle if spawned, or null if pool is full.
   */
  spawn(emitter) {
    if (this._free.length === 0) return null;

    const idx = this._free.pop();
    const p = new Particle(idx);
    p.reset();

    // Position with random spread
    p.pool[p.x] = emitter.position.x + (Math.random() - 0.5) * emitter.spread.x;
    p.pool[p.y] = emitter.position.y + (Math.random() - 0.5) * emitter.spread.y;
    p.pool[p.z] = emitter.position.z + (Math.random() - 0.5) * emitter.spread.z;

    // Velocity with spread
    p.pool[p.vx] = emitter.velocity.x + (Math.random() - 0.5) * emitter.spread.x;
    p.pool[p.vy] = emitter.velocity.y + (Math.random() - 0.5) * emitter.spread.y;
    p.pool[p.vz] = emitter.velocity.z + (Math.random() - 0.5) * emitter.spread.z;

    // Color
    const c = emitter.color;
    // Slight color variation per particle
    const variation = 0.1;
    p.pool[p.r] = Math.min(1, Math.max(0, c.r + (Math.random() - 0.5) * variation));
    p.pool[p.g] = Math.min(1, Math.max(0, c.g + (Math.random() - 0.5) * variation));
    p.pool[p.b] = Math.min(1, Math.max(0, c.b + (Math.random() - 0.5) * variation));

    // Lifetime
    p.pool[p.lifetime] = emitter.lifetime;
    p.pool[p.lifetime + 1] = 1; // active = true

    this._active.add(idx);
    this.mesh.count++;
    return p;
  }

  // ─── Update loop ───────────────────────────────────────────────────

  /**
   * Advance the simulation by dt seconds.  Called each frame.
   * @param {number} dt  Time delta in seconds.
   */
  update(dt) {
    // Clamp dt to avoid explosions on tab-switch
    dt = Math.min(dt, 0.05);

    const b = this.bounds;

    for (const idx of this._active) {
      const p = new Particle(idx);

      // Apply gravity
      p.pool[p.vy] += this.gravity * dt;

      // Move by velocity * dt
      p.pool[p.x] += p.pool[p.vx] * dt;
      p.pool[p.y] += p.pool[p.vy] * dt;
      p.pool[p.z] += p.pool[p.vz] * dt;

      // Decay lifetime
      p.pool[p.lifetime] -= dt;

      // Update instance matrix
      this._position.set(p.pool[p.x], p.pool[p.y], p.pool[p.z]);

      // Scale based on remaining lifetime (shrink as particle ages)
      const lifeRatio = Math.max(0, p.pool[p.lifetime]);
      const s = 0.3 + 0.7 * lifeRatio;
      this._scale.set(s, s, s);

      this._matrix.compose(
        this._position,
        this._quaternion,
        this._scale
      );
      this.mesh.setMatrixAt(idx, this._matrix);

      // Update instance color
      this._colorBuffer[idx * 3] = p.pool[p.r];
      this._colorBuffer[idx * 3 + 1] = p.pool[p.g];
      this._colorBuffer[idx * 3 + 2] = p.pool[p.b];

      // Check collision with level geometry
      this._resolveCollision(p);

      // Recycle dead particles
      if (p.pool[p.lifetime] <= 0 ||
          p.pool[p.x] < b.minX || p.pool[p.x] > b.maxX ||
          p.pool[p.y] < b.minY || p.pool[p.y] > b.maxY) {
        p.reset();
        this._active.delete(idx);
        this._free.push(idx);
        this.mesh.count--;
      }
    }

    // Mark buffers as needing GPU upload
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Simple sphere-vs-object collision.
   * For AABBs: reflect and kill. For spheres: check distance.
   */
  _resolveCollision(p) {
    const px = p.pool[p.x];
    const py = p.pool[p.y];
    const pz = p.pool[p.z];
    const pr = 0.06; // particle radius (half of box size)

    for (const obj of this.collisionObjects) {
      if (obj.type === 'aabb') {
        const a = obj.data;
        // Check if particle sphere intersects AABB
        const closestX = Math.max(a.min.x, Math.min(px, a.max.x));
        const closestY = Math.max(a.min.y, Math.min(py, a.max.y));
        const closestZ = Math.max(a.min.z, Math.min(pz, a.max.z));
        const dx = px - closestX;
        const dy = py - closestY;
        const dz = pz - closestZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < pr * pr) {
          // Kill particle on collision with walls/paddles/funnels/collectors
          p.pool[p.lifetime] = -0.01; // force dead
          return;
        }
      } else if (obj.type === 'sphere') {
        const s = obj.data;
        const r = obj.radius || 0.5;
        const dx = px - s.x;
        const dy = py - s.y;
        const dz = pz - s.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < (r + pr) * (r + pr)) {
          // Kill particle when it enters a collector sphere
          p.pool[p.lifetime] = -0.01;
          return;
        }
      }
    }
  }

  // ─── Burst effect ──────────────────────────────────────────────────

  /**
   * Spawn a burst of particles at a world position – used for
   * collection effects, explosions, etc.
   *
   * @param {THREE.Vector3} position  World position to burst from.
   * @param {Object} [options]
   * @param {number} [options.count]  Number of particles (default 30).
   * @param {number} [options.speed]  Max burst speed (default 4).
   * @param {THREE.Color} [options.color]  Burst color (default gold).
   * @param {number} [options.lifetime]  Lifetime in seconds (default 0.8).
   * @returns {number}  Number of particles actually spawned.
   */
  burst(position, {
    count = 30,
    speed = 4,
    color = new THREE.Color(0xffcc00),
    lifetime = 0.8,
  } = {}) {
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      // Ring / sphere burst: random direction on unit sphere, scaled by speed
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.sin(phi) * Math.sin(theta);
      const dz = Math.cos(phi);

      const emitter = new ParticleEmitter({
        position: position.clone(),
        rate: 1000, // burst instantly
        velocity: new THREE.Vector3(dx * speed, dy * speed, dz * speed),
        spread: new THREE.Vector3(0.01, 0.01, 0.01),
        color: color.clone(),
        lifetime,
      });

      if (this.spawn(emitter)) spawned++;
    }
    return spawned;
  }

  // ─── Particle count ────────────────────────────────────────────────

  /** Number of currently alive particles. */
  get aliveCount() {
    return this._active.size;
  }

  /** Number of free slots in the pool. */
  get freeCount() {
    return this._free.length;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  /** Reset the system to empty state but keep InstancedMesh. */
  reset() {
    for (const idx of this._active) {
      const p = new Particle(idx);
      p.reset();
    }
    this._free.length = this.maxParticles;
    for (let i = 0; i < this.maxParticles; i++) {
      this._free[i] = i;
    }
    this._active.clear();
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Remove the InstancedMesh from the scene and dispose resources. */
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
