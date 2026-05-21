/**
 * Pixel Popper — Level System
 *
 * Re-exports all level-related modules for convenient imports:
 *   import { LevelManager } from '@/levels'
 *   import { levels } from '@/levels'
 *   import { createElement, WallElement, ... } from '@/levels'
 */

export { LevelManager } from './LevelManager.js';
export { levels } from './LevelData.js';
export default levels;

// Element classes and factory
export {
  BaseLevelElement,
  WallElement,
  PaddleElement,
  GateElement,
  SplitterElement,
  FunnelElement,
  BumperElement,
  MoverElement,
  PortalElement,
  ConverterElement,
  CollectorElement,
  createElement,
} from './LevelElements.js';
