/**
 * LevelData.js — 10 handcrafted levels for Pixel Popper.
 *
 * Each level defines emitters, collectors, walls, and interactive elements
 * that guide colored particles from source to target.
 *
 * Coordinates are in world space. Common conventions:
 *   - Y axis: vertical (up). Ground plane is roughly y = -2.
 *   - X axis: horizontal left/right.
 *   - Z axis: forward/backward (toward the player).
 */

/**
 * @typedef {Object} LevelDefinition
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {Array<{position: number[], color: string, rate: number, spread: number}>} emitters
 * @property {Array<{position: number[], color: string, targetCount: number}>} collectors
 * @property {Object[]} elements
 * @property {number[]} starThresholds  [1-star, 2-star, 3-star percentages]
 * @property {number} [timeLimit]  seconds, optional
 */

/** @type {LevelDefinition[]} */
const levels = [
  // ────────────────────────────────────────────────────────────────────────
  // Level 1 — First Flow
  // "Guide the red particles into the red collector"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'First Flow',
    description: 'Guide the red particles into the red collector',
    emitters: [
      { position: [0, 1.0, -4], color: '#ff3333', rate: 20, spread: 0.2 },
    ],
    collectors: [
      { position: [0, -2.2, 3], color: '#ff3333', targetCount: 50 },
    ],
    elements: [
      // A narrow channel to guide particles
      { type: 'wall', position: [-0.8, -0.5, -0.5], size: [0.2, 3.0, 0.2] },
      { type: 'wall', position: [0.8, -0.5, -0.5], size: [0.2, 3.0, 0.2] },
      // A single paddle to redirect at the bottom
      { type: 'paddle', position: [0, -0.5, 0.5], rotation: 0, limits: [-45, 45] },
    ],
    starThresholds: [60, 80, 95],
    timeLimit: 60,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 2 — Bounce House
  // "Use bumpers to direct particles into the collector"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 2,
    name: 'Bounce House',
    description: 'Use bumpers to direct particles into the collector',
    emitters: [
      { position: [0, 1.5, -4], color: '#ff3333', rate: 20, spread: 0.15 },
    ],
    collectors: [
      { position: [-2, -2.2, 3], color: '#ff3333', targetCount: 60 },
      { position: [2, -2.2, 3], color: '#3333ff', targetCount: 60 },
    ],
    elements: [
      // Walls to create a bouncing arena
      { type: 'wall', position: [-2.5, -0.5, -1], size: [0.2, 3.0, 2.0] },
      { type: 'wall', position: [2.5, -0.5, -1], size: [0.2, 3.0, 2.0] },
      // Bumpers in the middle to scatter particles left and right
      { type: 'bumper', position: [-1, 0.0, -1], bounceForce: 6 },
      { type: 'bumper', position: [1, 0.0, -1], bounceForce: 6 },
      { type: 'bumper', position: [0, -0.5, 0.5], bounceForce: 8 },
      // A paddle to fine-tune the bounce
      { type: 'paddle', position: [0, 0.3, 1.5], rotation: 0.3, limits: [-30, 30] },
    ],
    starThresholds: [70, 85, 95],
    timeLimit: 90,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 3 — Gate Keeper
  // "Open and close the gate at the right time"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    name: 'Gate Keeper',
    description: 'Open and close the gate at the right time',
    emitters: [
      { position: [0, 1.0, -5], color: '#ff3333', rate: 25, spread: 0.2 },
    ],
    collectors: [
      { position: [0, -2.2, 4], color: '#ff3333', targetCount: 70 },
    ],
    elements: [
      // Walls creating a corridor
      { type: 'wall', position: [-1.0, -0.5, -1.5], size: [0.2, 3.0, 3.0] },
      { type: 'wall', position: [1.0, -0.5, -1.5], size: [0.2, 3.0, 3.0] },
      // A gate blocking the path
      { type: 'gate', position: [0, -0.5, 1.0], initialState: 'closed' },
      // A paddle to redirect particles through the gate opening
      { type: 'paddle', position: [0, 0.2, -3], rotation: 0, limits: [-60, 60] },
      // A bumper to add variety
      { type: 'bumper', position: [0, -1.0, 0.0], bounceForce: 4 },
    ],
    starThresholds: [65, 82, 95],
    timeLimit: 75,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 4 — Split Decision
  // "Split particles into two colors"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Split Decision',
    description: 'Split particles into two colors',
    emitters: [
      { position: [0, 1.0, -4], color: '#ff3333', rate: 20, spread: 0.15 },
    ],
    collectors: [
      { position: [-2.5, -2.2, 2], color: '#ff3333', targetCount: 40 },
      { position: [2.5, -2.2, 2], color: '#3333ff', targetCount: 40 },
    ],
    elements: [
      // Walls to funnel into the splitter
      { type: 'wall', position: [-1.5, -0.5, -2], size: [0.2, 2.0, 2.0] },
      { type: 'wall', position: [1.5, -0.5, -2], size: [0.2, 2.0, 2.0] },
      // The splitter diamond
      { type: 'splitter', position: [0, -0.5, -0.5], outputs: ['#ff3333', '#3333ff'] },
      // Funnel on the left path
      { type: 'funnel', position: [-1.5, -0.3, 0.5], direction: 'down' },
      // Funnel on the right path
      { type: 'funnel', position: [1.5, -0.3, 0.5], direction: 'down' },
      // Walls to guide to collectors
      { type: 'wall', position: [-1.0, -0.5, 1.0], size: [0.2, 2.0, 1.5] },
      { type: 'wall', position: [1.0, -0.5, 1.0], size: [0.2, 2.0, 1.5] },
    ],
    starThresholds: [70, 85, 95],
    timeLimit: 90,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 5 — Funnel Vision
  // "Use funnels to channel particles precisely"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Funnel Vision',
    description: 'Use funnels to channel particles precisely',
    emitters: [
      { position: [-2, 1.5, -4], color: '#ff3333', rate: 18, spread: 0.25 },
      { position: [2, 1.5, -4], color: '#3333ff', rate: 18, spread: 0.25 },
    ],
    collectors: [
      { position: [-1, -2.2, 3], color: '#ff3333', targetCount: 50 },
      { position: [1, -2.2, 3], color: '#3333ff', targetCount: 50 },
    ],
    elements: [
      // Walls separating the two streams
      { type: 'wall', position: [0, -0.5, -2], size: [0.2, 3.0, 4.0] },
      // Left funnel
      { type: 'funnel', position: [-1.5, -0.3, -1], direction: 'down' },
      // Right funnel
      { type: 'funnel', position: [1.5, -0.3, -1], direction: 'down' },
      // Paddles to fine-tune
      { type: 'paddle', position: [-1, -0.5, 0.5], rotation: -0.2, limits: [-45, 45] },
      { type: 'paddle', position: [1, -0.5, 0.5], rotation: 0.2, limits: [-45, 45] },
      // Bumpers to create unpredictable paths
      { type: 'bumper', position: [-0.5, 0.0, -3], bounceForce: 3 },
      { type: 'bumper', position: [0.5, 0.0, -3], bounceForce: 3 },
    ],
    starThresholds: [75, 88, 95],
    timeLimit: 100,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 6 — Moving Target
  // "Collect particles while moving platforms shift the playfield"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 6,
    name: 'Moving Target',
    description: 'Collect particles while moving platforms shift the playfield',
    emitters: [
      { position: [0, 1.0, -5], color: '#ff3333', rate: 22, spread: 0.2 },
    ],
    collectors: [
      { position: [0, -2.2, 4], color: '#ff3333', targetCount: 80 },
    ],
    elements: [
      // Outer walls
      { type: 'wall', position: [-3, -0.5, -1.5], size: [0.2, 3.0, 3.0] },
      { type: 'wall', position: [3, -0.5, -1.5], size: [0.2, 3.0, 3.0] },
      // A mover that sweeps left-right
      {
        type: 'mover',
        position: [0, -0.5, 0],
        path: [
          [-2, -0.5, 0],
          [2, -0.5, 0],
        ],
        speed: 2,
      },
      // A second mover going up-down in Z
      {
        type: 'mover',
        position: [0, 0.5, -3],
        path: [
          [0, 0.5, -4],
          [0, 0.5, -2],
        ],
        speed: 1.5,
      },
      // Paddle at the top for initial redirection
      { type: 'paddle', position: [0, 0.5, -3.5], rotation: 0, limits: [-60, 60] },
      // Bumpers for chaos
      { type: 'bumper', position: [-1.5, 0.0, 1.5], bounceForce: 5 },
      { type: 'bumper', position: [1.5, 0.0, 1.5], bounceForce: 5 },
    ],
    starThresholds: [70, 85, 95],
    timeLimit: 120,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 7 — Portal Jump
  // "Use portals to transport particles across the board"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 7,
    name: 'Portal Jump',
    description: 'Use portals to transport particles across the board',
    emitters: [
      { position: [0, 1.0, -4], color: '#ff3333', rate: 20, spread: 0.15 },
    ],
    collectors: [
      { position: [0, -2.2, 4], color: '#ff3333', targetCount: 75 },
    ],
    elements: [
      // Wall blocking the direct path
      { type: 'wall', position: [0, -0.5, 0.5], size: [2.0, 2.5, 0.2] },
      // Portal that teleports past the wall
      {
        type: 'portal',
        position: [0, 0.0, -1.5],
        exitPosition: [0, 0.0, 2.5],
      },
      // Side walls to create the portal corridor
      { type: 'wall', position: [-1.2, -0.5, -2.0], size: [0.2, 3.0, 2.5] },
      { type: 'wall', position: [1.2, -0.5, -2.0], size: [0.2, 3.0, 2.5] },
      // Paddle to aim into the portal
      { type: 'paddle', position: [0, 0.3, -3.0], rotation: 0, limits: [-45, 45] },
      // Bumpers near the exit to scatter
      { type: 'bumper', position: [-0.8, -0.5, 3.0], bounceForce: 4 },
      { type: 'bumper', position: [0.8, -0.5, 3.0], bounceForce: 4 },
    ],
    starThresholds: [70, 85, 95],
    timeLimit: 90,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 8 — Color Exchange
  // "Convert red particles to blue and collect both"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 8,
    name: 'Color Exchange',
    description: 'Convert red particles to blue and collect both',
    emitters: [
      { position: [0, 1.0, -4], color: '#ff3333', rate: 25, spread: 0.2 },
    ],
    collectors: [
      { position: [-2, -2.2, 2], color: '#ff3333', targetCount: 30 },
      { position: [2, -2.2, 2], color: '#3333ff', targetCount: 50 },
    ],
    elements: [
      // Walls funneling to the converter
      { type: 'wall', position: [-1.5, -0.5, -1.5], size: [0.2, 2.5, 2.5] },
      { type: 'wall', position: [1.5, -0.5, -1.5], size: [0.2, 2.5, 2.5] },
      // The converter — turns red to blue
      {
        type: 'converter',
        position: [0, -0.5, 0],
        fromColor: '#ff3333',
        toColor: '#3333ff',
      },
      // Funnel to split after conversion
      { type: 'funnel', position: [-1.0, -0.3, 1.0], direction: 'down' },
      { type: 'funnel', position: [1.0, -0.3, 1.0], direction: 'down' },
      // Walls guiding to each collector
      { type: 'wall', position: [-0.5, -0.5, 1.5], size: [0.2, 2.5, 1.5] },
      { type: 'wall', position: [0.5, -0.5, 1.5], size: [0.2, 2.5, 1.5] },
      // A bumper to help redirect unconverted particles
      { type: 'bumper', position: [0, 0.5, -2.5], bounceForce: 5 },
    ],
    starThresholds: [75, 88, 95],
    timeLimit: 100,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 9 — The Gauntlet
  // "Navigate a gauntlet of every element type"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 9,
    name: 'The Gauntlet',
    description: 'Navigate a gauntlet of every element type',
    emitters: [
      { position: [0, 1.0, -6], color: '#ff3333', rate: 22, spread: 0.18 },
    ],
    collectors: [
      { position: [0, -2.2, 5], color: '#ff3333', targetCount: 90 },
    ],
    elements: [
      // ── Section 1: Walls and paddle ──
      { type: 'wall', position: [-2, -0.5, -4], size: [0.2, 3.0, 2.0] },
      { type: 'wall', position: [2, -0.5, -4], size: [0.2, 3.0, 2.0] },
      { type: 'paddle', position: [0, 0.3, -4], rotation: 0, limits: [-45, 45] },

      // ── Section 2: Bumper maze ──
      { type: 'bumper', position: [-1.5, 0.0, -2], bounceForce: 5 },
      { type: 'bumper', position: [1.5, 0.0, -2], bounceForce: 5 },
      { type: 'bumper', position: [0, 0.5, -2], bounceForce: 4 },
      { type: 'bumper', position: [-1.5, 0.0, 0], bounceForce: 5 },
      { type: 'bumper', position: [1.5, 0.0, 0], bounceForce: 5 },

      // ── Section 3: Gate ──
      { type: 'gate', position: [0, -0.5, 1.5], initialState: 'closed' },
      { type: 'paddle', position: [0, 0.3, -0.5], rotation: 0, limits: [-30, 30] },

      // ── Section 4: Splitter and funnel ──
      { type: 'splitter', position: [0, -0.5, 3], outputs: ['#ff3333', '#3333ff'] },
      { type: 'funnel', position: [-1.5, -0.3, 4], direction: 'down' },
      { type: 'funnel', position: [1.5, -0.3, 4], direction: 'down' },

      // ── Section 5: Converter ──
      {
        type: 'converter',
        position: [0, -0.5, 4.5],
        fromColor: '#ff3333',
        toColor: '#3333ff',
      },

      // ── Section 6: Mover ──
      {
        type: 'mover',
        position: [0, -0.3, 5],
        path: [[-2, -0.3, 5], [2, -0.3, 5]],
        speed: 2,
      },
    ],
    starThresholds: [70, 85, 95],
    timeLimit: 150,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Level 10 — The Final Test
  // "Everything you've learned: all elements, multiple colors, precision"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 10,
    name: 'The Final Test',
    description: 'Everything you have learned: all elements, multiple colors, precision',
    emitters: [
      { position: [-2, 1.5, -5], color: '#ff3333', rate: 20, spread: 0.15 },
      { position: [2, 1.5, -5], color: '#3333ff', rate: 20, spread: 0.15 },
    ],
    collectors: [
      { position: [-3, -2.2, 3], color: '#ff3333', targetCount: 50 },
      { position: [3, -2.2, 3], color: '#3333ff', targetCount: 50 },
    ],
    elements: [
      // ── Start: walls and paddle for left stream ──
      { type: 'wall', position: [0, -0.5, -3.5], size: [0.2, 3.0, 3.0] },
      { type: 'wall', position: [-3.5, -0.5, -3.5], size: [0.2, 3.0, 3.0] },
      { type: 'wall', position: [3.5, -0.5, -3.5], size: [0.2, 3.0, 3.0] },
      { type: 'paddle', position: [-1, 0.5, -3.5], rotation: 0, limits: [-45, 45] },
      { type: 'paddle', position: [1, 0.5, -3.5], rotation: 0, limits: [-45, 45] },

      // ── Bumper zone ──
      { type: 'bumper', position: [-2, 0.0, -1], bounceForce: 5 },
      { type: 'bumper', position: [0, 0.5, -1], bounceForce: 4 },
      { type: 'bumper', position: [2, 0.0, -1], bounceForce: 5 },

      // ── Gate in the center ──
      { type: 'gate', position: [0, -0.5, 1], initialState: 'closed' },

      // ── Converter in the middle ──
      {
        type: 'converter',
        position: [0, -0.5, 2],
        fromColor: '#ff3333',
        toColor: '#3333ff',
      },

      // ── Splitter to distribute ──
      { type: 'splitter', position: [0, -0.5, 2.5], outputs: ['#ff3333', '#3333ff'] },

      // ── Funnels to guide to collectors ──
      { type: 'funnel', position: [-2, -0.3, 3], direction: 'down' },
      { type: 'funnel', position: [2, -0.3, 3], direction: 'down' },

      // ── Mover to create moving target ──
      {
        type: 'mover',
        position: [0, -0.5, 3.5],
        path: [[-2.5, -0.5, 3.5], [2.5, -0.5, 3.5]],
        speed: 1.5,
      },

      // ── Portal for a shortcut ──
      {
        type: 'portal',
        position: [-1.5, 0.0, -2],
        exitPosition: [1.5, 0.0, 2.5],
      },
    ],
    starThresholds: [75, 90, 97],
    timeLimit: 180,
  },
];

// ── Export ──────────────────────────────────────────────────────────────────
export { levels };
export default levels;
