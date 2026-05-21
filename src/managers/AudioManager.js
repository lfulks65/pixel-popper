/**
 * AudioManager — singleton placeholder for audio management.
 *
 * Pure stubs ready for real audio integration.  Each playback method
 * logs `[Audio] play: <soundName>` to the console.  When muted (or
 * when the mute preference has been explicitly set to true via
 * toggle()), every method is a no-op.
 *
 * The mute preference is persisted in localStorage under the key
 * `pixel-popper-audio-muted`.
 */

const MUTE_STORAGE_KEY = 'pixel-popper-audio-muted';

let _instance = null;
let _isMuted = false;

function _loadMutePreference() {
  const stored = localStorage.getItem(MUTE_STORAGE_KEY);
  if (stored !== null) {
    _isMuted = stored === 'true';
  }
}

function _saveMutePreference() {
  localStorage.setItem(MUTE_STORAGE_KEY, String(_isMuted));
}

class AudioManager {
  constructor() {
    if (_instance) {
      return _instance;
    }
    _instance = this;
    _loadMutePreference();
  }

  /**
   * Toggle mute state and persist the preference.
   */
  toggle() {
    _isMuted = !_isMuted;
    _saveMutePreference();
    return _isMuted;
  }

  /**
   * Whether audio is currently muted.
   */
  get isMuted() {
    return _isMuted;
  }

  /**
   * Get the current mute state without toggling.
   */
  getMuted() {
    return _isMuted;
  }

  /**
   * Force-set the mute state (useful for loading a saved preference).
   */
  setMuted(muted) {
    _isMuted = Boolean(muted);
    _saveMutePreference();
  }

  // ── Playback stubs ──────────────────────────────────────────────

  /**
   * Play the "collect" sound (e.g. when the player picks up an item).
   */
  playCollect() {
    if (_isMuted) return;
    console.log('[Audio] play: collect');
  }

  /**
   * Play the "wrong color" sound (e.g. when the player makes a mistake).
   */
  playWrongColor() {
    if (_isMuted) return;
    console.log('[Audio] play: wrongColor');
  }

  /**
   * Play the "gate toggle" sound (e.g. when a gate opens/closes).
   */
  playGateToggle() {
    if (_isMuted) return;
    console.log('[Audio] play: gateToggle');
  }

  /**
   * Play the "paddle rotate" sound (e.g. when the paddle rotates).
   */
  playPaddleRotate() {
    if (_isMuted) return;
    console.log('[Audio] play: paddleRotate');
  }

  /**
   * Play the "win" sound (e.g. when the player completes a level).
   */
  playWin() {
    if (_isMuted) return;
    console.log('[Audio] play: win');
  }

  /**
   * Play the "fail" sound (e.g. when the player loses a life).
   */
  playFail() {
    if (_isMuted) return;
    console.log('[Audio] play: fail');
  }

  /**
   * Play a generic UI click sound.
   */
  playUIClick() {
    if (_isMuted) return;
    console.log('[Audio] play: uiClick');
  }
}

// Ensure the singleton is available immediately when the module loads.
const AudioManager$1 = new AudioManager();

export { AudioManager };
export default AudioManager$1;
