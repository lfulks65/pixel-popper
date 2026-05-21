/**
 * orientation.js — Orientation handler for portrait/landscape detection.
 *
 * Detects portrait vs landscape orientation, shows/hides a
 * "Rotate your device" overlay when in landscape, and dims the game
 * canvas while in the wrong orientation.
 */

const OVERLAY_HTML = `
  <div id="orientation-overlay" style="
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    color: #00d4ff;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    text-align: center;
    padding: 20px;
  ">
    <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
    <h2 style="font-size: 24px; margin-bottom: 10px; font-weight: 600;">
      Rotate your device
    </h2>
    <p style="font-size: 14px; color: #8888aa; max-width: 280px;">
      Pixel Popper is designed for portrait mode.
      <br>
      Please rotate your device to continue.
    </p>
  </div>
`;

let overlayEl = null;
let gameContainer = null;
let isPortrait = true;
let overlayVisible = false;

/**
 * Initialize the orientation handler.
 * Creates the overlay element (hidden by default) and listens for orientation
 * / resize changes.
 */
export function initOrientation() {
  // Create overlay element but keep it hidden
  overlayEl = document.createElement('div');
  overlayEl.id = 'orientation-overlay';
  overlayEl.innerHTML = OVERLAY_HTML;
  overlayEl.style.display = 'none';
  document.body.appendChild(overlayEl);

  // Get game container reference
  gameContainer = document.getElementById('game-container');

  // Check initial orientation
  checkOrientation();

  // Listen for orientation changes
  window.addEventListener('orientationchange', () => {
    // Small delay to let the browser settle
    setTimeout(checkOrientation, 300);
  });

  // Also listen to resize — useful for tablets / split-screen
  window.addEventListener('resize', () => {
    checkOrientation();
  });

  // Listen for deviceorientation as fallback (some browsers block orientation events)
  window.addEventListener('deviceorientation', () => {
    checkOrientation();
  });
}

/**
 * Check whether device is in portrait orientation.
 * Uses the orientation API first, falls back to aspect ratio check.
 * @returns {boolean}
 */
function checkOrientation() {
  // Try the Orientation API (available on iOS / some Android)
  if (screen.orientation) {
    const type = screen.orientation.type || '';
    const angle = screen.orientation.angle || 0;
    // Portrait: type contains 'portrait' or angle is 0/180
    isPortrait = type.includes('portrait') || angle === 0 || angle === 180;
  } else {
    // Fallback: check window aspect ratio
    // Portrait means height > width
    isPortrait = window.innerHeight >= window.innerWidth;
  }

  if (isPortrait) {
    showPortrait();
  } else {
    showLandscape();
  }

  // Notify listeners
  window.dispatchEvent(new CustomEvent('orientation:change', {
    detail: { portrait: isPortrait },
  }));
}

/**
 * Show the game in portrait — hide overlay, dim removed.
 */
function showPortrait() {
  if (overlayVisible) {
    overlayEl.style.display = 'none';
    overlayVisible = false;
  }
  if (gameContainer) {
    gameContainer.style.filter = '';
    gameContainer.style.pointerEvents = '';
  }
}

/**
 * Show landscape warning — dim game, show overlay.
 */
function showLandscape() {
  if (!overlayVisible) {
    overlayEl.style.display = 'flex';
    overlayVisible = true;
  }
  if (gameContainer) {
    gameContainer.style.filter = 'brightness(0.3) blur(2px)';
    gameContainer.style.pointerEvents = 'none';
  }
}

/**
 * Check if currently in portrait orientation.
 * @returns {boolean}
 */
export function isPortraitOrientation() {
  return isPortrait;
}

/**
 * Force set portrait mode (called by orientation overlay button or
 * when the game detects it should lock).
 */
export function setPortraitMode() {
  showPortrait();
}

/**
 * Show the orientation overlay manually (e.g. from UI).
 */
export function showRotateOverlay() {
  overlayEl.style.display = 'flex';
  overlayVisible = true;
}

/**
 * Hide the orientation overlay.
 */
export function hideRotateOverlay() {
  overlayEl.style.display = 'none';
  overlayVisible = false;
}

/**
 * Clean up event listeners and overlay element.
 */
export function dispose() {
  window.removeEventListener('orientationchange', checkOrientation);
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('deviceorientation', checkOrientation);

  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;
  gameContainer = null;
}
