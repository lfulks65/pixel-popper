import * as THREE from 'three';
import { ParticleSystem, ParticleEmitter } from './ParticleSystem.js';

/**
 * ParticleEffects – visual convenience layer around ParticleSystem.
 *
 * Provides high-level methods for:
 * - Collection bursts (ring of short-lived particles when a particle enters a collector)
 * - Particle trails (reuse pool particles with short lifetime for trailing effects)
 * - Emitter streams (continuous emission from defined emitter points)
 * - Color-matched glow (emissive + additive blending)
 *
 * @example
 *   const scene = new THREE.Scene();
 *   const effects = new ParticleEffects(scene);
 *   // Add an emitter stream at the top of the screen
 *   effects.addEmitterStream({
 *     position: new THREE.Vector3(0, 5, 0),
 *     color: new THREE.Color(0xff4400),
 *     rate: 50,
 *   });
 *   // Trigger a collection burst
 *   effects.spawnCollectionBurst(new THREE.Vector3(0, -2, 0));
 */
export class ParticleEffects {
  /**
   * @param {THREE.Scene} scene  Three.js scene to add the InstancedMesh to.
   * @param {Object} [options]
   * @param {number} [options.maxParticles]  Pool size (default 5000).
   * @param {number} [options.gravity]  Gravity for all particles (default -9.8).
   * @param {boolean} [options.enableTrails]  Whether to enable trail particles (default true).
   * @param {number} [options.trailLifetime]  Trail particle lifetime in seconds (default 0.3).
   * @param {number} [options.burstCount]  Default burst particle count (default 30).
   * @param {THREE.Color} [options.burstColor]  Default burst color (default gold).
   */
  constructor(scene, {
    maxParticles = 5000,
    gravity = -9.8,
    enableTrails = true,
    trailLifetime = 0.3,
    burstCount = 30,
    burstColor = new THREE.Color(0xffcc00),
  } = {}) {
    /** @type {ParticleSystem} Core particle system */
    this.system = new ParticleSystem(scene, {
      maxParticles,
      gravity,
    });

    /** @type {boolean} Whether trailing is enabled */
    this.enableTrails = enableTrails;

    /** @type {number} Trail particle lifetime */
    this.trailLifetime = trailLifetime;

    /** @type {number} Default burst particle count */
    this.burstCount = burstCount;

    /** @type {THREE.Color} Default burst color */
    this.burstColor = burstColor;

    /** @type {Set<THREE.Vector3>} Tracker for emission positions (dedup) */
    this._emitterPositions = new Set();
  }

  // ─── Emitter Streams ───────────────────────────────────────────────

  /**
   * Add a continuous emitter stream that spawns particles at a fixed rate.
   *
   * @param {Object} config
   * @param {THREE.Vector3} config.position  World spawn position.
   * @param {number} [config.rate]  Particles per second (default 50).
   * @param {THREE.Vector3} [config.velocity]  Base velocity (default: downward).
   * @param {THREE.Vector3} [config.spread]  Random spread (default 0.5 each axis).
   * @param {THREE.Color} [config.color]  Particle color (default gold).
   * @param {number} [config.lifetime]  Particle lifetime in seconds (default 2.0).
   * @returns {ParticleEmitter} The created emitter.
   */
  addEmitterStream({
    position = new THREE.Vector3(0, 5, 0),
    rate = 50,
    velocity = new THREE.Vector3(0, -8, 0),
    spread = new THREE.Vector3(0.5, 0.5, 0.5),
    color = new THREE.Color(0xffcc00),
    lifetime = 2.0,
  }) {
    const emitter = this.system.addEmitter({
      position: position.clone(),
      rate,
      velocity: velocity.clone(),
      spread: spread.clone(),
      color: color.clone(),
      lifetime,
    });
    this._trackPosition(position);
    return emitter;
  }

  /**
   * Remove all emitter streams.
   */
  clearEmitters() {
    this.system.clearEmitters();
    this._emitterPositions.clear();
  }

  // ─── Collection Burst ──────────────────────────────────────────────

  /**
   * Spawn a ring burst of particles at a world position.
   * Used when a particle enters a collector — creates a satisfying visual
   * feedback with particles flying outward in all directions.
   *
   * @param {THREE.Vector3} position  World position to burst from.
   * @param {Object} [options]
   * @param {number} [options.count]  Number of particles (default from config).
   * @param {number} [options.speed]  Max burst speed (default 4).
   * @param {THREE.Color} [options.color]  Burst color (default from config).
   * @param {number} [options.lifetime]  Lifetime in seconds (default 0.8).
   * @returns {number} Number of particles spawned.
   */
  spawnCollectionBurst(
    position,
    { count, speed, color, lifetime } = {}
  ) {
    return this.system.burst(position, {
      count: count ?? this.burstCount,
      speed: speed ?? 4,
      color: color ?? this.burstColor,
      lifetime: lifetime ?? 0.8,
    });
  }

  // ─── Particle Trails ───────────────────────────────────────────────

  /**
   * Spawn a trail particle at a position for a visual trailing effect.
   * Trails are short-lived particles with reduced size and brightness.
   *
   * @param {THREE.Vector3} position  World position for the trail.
   * @param {THREE.Color} [color]  Trail color (default to system default).
   */
  spawnTrail(position, color) {
    if (!this.enableTrails) return;

    const c = color ?? this.burstColor;

    const emitter = new ParticleEmitter({
      position: position.clone(),
      rate: 1000, // burst instantly
      velocity: new THREE.Vector3(0, 0, 0),
      spread: new THREE.Vector3(0.01, 0.01, 0.01),
      color: c.clone(),
      lifetime: this.trailLifetime,
    });

    this.system.spawn(emitter);
  }

  // ─── Glow Configuration ────────────────────────────────────────────

  /**
   * Set the glow intensity for all particles.
   * Particles use emissive materials + additive blending for glow.
   *
   * @param {number} intensity  Emissive intensity (0 = no glow, 1+ = bright glow).
   */
  setGlow(intensity) {
    if (this.system.mesh.material.emissiveIntensity !== undefined) {
      this.system.mesh.material.emissiveIntensity = intensity;
    }
  }

  /**
   * Set the emissive color for all particles.
   *
   * @param {THREE.Color} color  Emissive color.
   */
  setGlowColor(color) {
    if (this.system.mesh.material.emissive) {
      this.system.mesh.material.emissive.copy(color);
    }
  }

  /**
   * Enable or disable additive blending for the glow effect.
   * Additive blending creates a bright, glowing appearance when particles overlap.
   *
   * @param {boolean} enabled
   */
  setAdditiveBlending(enabled) {
    this.system.mesh.material.blending = enabled
      ? THREE.AdditiveBlending
      : THREE.NormalBlending;
  }

  // ─── Update ────────────────────────────────────────────────────────

  /**
   * Update the particle system and optionally spawn trails from active emitters.
   *
   * @param {number} dt  Time delta in seconds.
   */
  update(dt) {
    // Spawn from emitters
    for (const emitter of this.system.emitters) {
      emitter.spawn(this.system, dt);
    }

    // Update physics
    this.system.update(dt);
  }

  // ─── Collision Objects ─────────────────────────────────────────────

  /**
   * Add a sphere collision object (e.g., a collector or funnel).
   *
   * @param {THREE.Vector3} center  Center of the sphere.
   * @param {number} [radius]  Radius (default 0.5).
   */
  addCollector(center, radius = 0.5) {
    this.system.addSphere(center, radius);
  }

  /**
   * Add an AABB collision object (e.g., a wall, paddle, or funnel).
   *
   * @param {import('./ParticleSystem.js').AABB} aabb  Axis-aligned bounding box.
   */
  addWall(aabb) {
    this.system.addAABB(aabb);
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  /**
   * Clear all particles and reset the system.
   */
  clear() {
    this.system.reset();
    this.clearEmitters();
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this.system.dispose();
    this.clear();
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  /** Track a position for deduplication. */
  _trackPosition(position) {
    const key = `${position.x.toFixed(3)},${position.y.toFixed(3)},${position.z.toFixed(3)}`;
    this._emitterPositions.add(key);
  }

  // ─── Read-only properties ──────────────────────────────────────────

  /** Number of currently alive particles. */
  get aliveCount() {
    return this.system.aliveCount;
  }

  /** Number of free slots in the pool. */
  get freeCount() {
    return this.system.freeCount;
  }
}
