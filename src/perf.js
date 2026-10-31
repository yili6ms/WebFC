/**
 * Rolling-window frame statistics. Busy time is main-thread work spent on
 * emulation and presentation, reported as a share of one CPU core.
 */
export class PerfMeter {
  #windowMs;
  #now;
  #frames = [];
  #busy = [];
  #startedAt;

  constructor({ windowMs = 1000, now = () => performance.now() } = {}) {
    this.#windowMs = windowMs;
    this.#now = now;
    this.#startedAt = now();
  }

  /** Start a fresh measurement, e.g. after resuming or loading a cartridge. */
  reset() {
    this.#frames = [];
    this.#busy = [];
    this.#startedAt = this.#now();
  }

  /** Record one emulated frame and the time spent computing it. */
  frame(costMs) {
    const time = this.#now();
    this.#frames.push({ time, cost: costMs });
    this.#busy.push({ time, cost: costMs });
  }

  /** Record other emulator work (frame copy, GPU upload) that is not a frame. */
  busy(costMs) {
    this.#busy.push({ time: this.#now(), cost: costMs });
  }

  sample() {
    const now = this.#now();
    const cutoff = now - this.#windowMs;
    this.#frames = this.#frames.filter((entry) => entry.time > cutoff);
    this.#busy = this.#busy.filter((entry) => entry.time > cutoff);
    // Until a full window has passed, measure over the time actually elapsed.
    const span = Math.min(this.#windowMs, now - this.#startedAt);
    if (span <= 0) return { fps: 0, frameMs: 0, load: 0 };
    const sum = (entries) => entries.reduce((total, entry) => total + entry.cost, 0);
    return {
      fps: (this.#frames.length * 1000) / span,
      frameMs: this.#frames.length ? sum(this.#frames) / this.#frames.length : 0,
      load: Math.min(1, sum(this.#busy) / span),
    };
  }
}

const PLATFORM_NAMES = { macOS: "macOS", Windows: "Windows", Linux: "Linux", Android: "Android", "Chrome OS": "ChromeOS" };

/** What the browser exposes about the host CPU; the model name is never available to web pages. */
export async function describeHostCpu(nav = navigator) {
  const parts = [];
  if (nav.hardwareConcurrency) parts.push(`${nav.hardwareConcurrency} logical cores`);
  try {
    const data = await nav.userAgentData?.getHighEntropyValues?.(["architecture", "bitness", "platformVersion"]);
    if (data?.architecture) parts.push(`${data.architecture}${data.bitness ? ` ${data.bitness}-bit` : ""}`);
    const platform = PLATFORM_NAMES[data?.platform ?? nav.userAgentData?.platform];
    if (platform) parts.push(platform);
  } catch {
    // User-Agent Client Hints are optional; core count alone is still useful.
  }
  return parts.join(" · ") || "Unavailable";
}

/**
 * Report system-wide CPU pressure (nominal, fair, serious, critical) through the
 * Compute Pressure API. Returns false where the API is unavailable or denied.
 */
export async function watchCpuPressure(onState) {
  if (!("PressureObserver" in globalThis)) return false;
  try {
    const observer = new PressureObserver((records) => onState(records.at(-1).state));
    await observer.observe("cpu", { sampleInterval: 1000 });
    return true;
  } catch {
    return false;
  }
}
