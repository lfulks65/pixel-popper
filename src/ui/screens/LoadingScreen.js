/**
 * LoadingScreen — Game title with neon glow + pixel-art spinner.
 *
 * Displays "PIXEL POPPER" with a pulsing neon glow, a spinning
 * loader ring, and a "Loading..." message.
 */

class LoadingScreen {
  /** @type {HTMLElement | null} */
  #el = null;

  constructor() {
    this.#el = null;
  }

  /**
   * Mount the loading screen into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.#el = document.createElement('div');
    this.#el.className = 'screen';
    this.#el.setAttribute('data-screen', 'loading');
    this.#el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="title-glow">PIXEL POPPER</div>
        <div class="spinner"></div>
        <p style="color:rgba(255,255,255,0.5);font-size:16px;margin-top:16px;">Loading…</p>
      </div>
    `;
    container.appendChild(this.#el);
    return this.#el;
  }

  /**
   * Show this screen (add .active class).
   */
  show() {
    if (this.#el) {
      this.#el.classList.add('active');
      this.#el.classList.remove('fade-out');
    }
  }

  /**
   * Hide this screen.
   */
  hide() {
    if (this.#el) {
      this.#el.classList.remove('active');
      this.#el.classList.add('fade-out');
    }
  }
}

export { LoadingScreen };
export default LoadingScreen;
