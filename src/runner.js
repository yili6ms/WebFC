/** Most emulated frames run for one host callback, so a stalled tab cannot spiral. */
export const MAX_CATCH_UP_FRAMES = 4;

/**
 * Schedules emulated frames at a fixed rate from elapsed host time rather than
 * assuming one emulated frame per animation callback.
 */
export class FrameRunner {
  #fps;
  #step;
  #present;
  #onError;
  #requestFrame;
  #cancelFrame;
  #handle = null;
  #last = null;
  #accumulated = 0;

  constructor({
    fps,
    step,
    present,
    onError,
    requestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame = (handle) => cancelAnimationFrame(handle),
  }) {
    this.#fps = fps;
    this.#step = step;
    this.#present = present;
    this.#onError = onError;
    this.#requestFrame = requestFrame;
    this.#cancelFrame = cancelFrame;
  }

  get running() {
    return this.#handle !== null;
  }

  start() {
    if (this.running) return;
    this.#last = null;
    this.#accumulated = 0;
    this.#handle = this.#requestFrame(this.#tick);
  }

  stop() {
    if (!this.running) return;
    this.#cancelFrame(this.#handle);
    this.#handle = null;
  }

  /** Forget elapsed time, e.g. after the page was hidden. */
  resync() {
    this.#last = null;
    this.#accumulated = 0;
  }

  #tick = (now) => {
    this.#handle = this.#requestFrame(this.#tick);
    const frameMs = 1000 / this.#fps;
    // The first callback after starting runs one frame immediately.
    this.#accumulated += this.#last === null ? frameMs : now - this.#last;
    this.#last = now;

    let frames = 0;
    try {
      while (this.#accumulated >= frameMs && frames < MAX_CATCH_UP_FRAMES) {
        this.#step();
        this.#accumulated -= frameMs;
        frames += 1;
      }
      // Drop backlog the cap could not absorb instead of fast-forwarding later.
      if (this.#accumulated >= frameMs) this.#accumulated = 0;
      if (frames > 0) this.#present();
    } catch (error) {
      this.stop();
      this.#onError(error);
    }
  };
}
