/** Fraction of the D-pad radius around the centre that registers no direction. */
const DEAD_ZONE = 0.2;
/** Cosine threshold per axis: cardinals span ±63°, diagonals the 27° between them. */
const AXIS_THRESHOLD = 0.45;
/** Extra hit area around face buttons (CSS px); overlapping slop between A and B presses both. */
const BUTTON_SLOP = 14;

/** Directions for a touch at (dx, dy) from the D-pad centre, y pointing down. */
export function dpadDirections(dx, dy, radius) {
  const distance = Math.hypot(dx, dy);
  if (distance < radius * DEAD_ZONE) return [];
  const directions = [];
  if (dy <= -distance * AXIS_THRESHOLD) directions.push("Up");
  if (dy >= distance * AXIS_THRESHOLD) directions.push("Down");
  if (dx <= -distance * AXIS_THRESHOLD) directions.push("Left");
  if (dx >= distance * AXIS_THRESHOLD) directions.push("Right");
  return directions;
}

function contains(rect, x, y, slop) {
  return x >= rect.left - slop && x <= rect.right + slop
    && y >= rect.top - slop && y <= rect.bottom + slop;
}

/**
 * Multi-touch on-screen controller. Each pointer is tracked independently and
 * may slide between buttons; a pointer that starts on the D-pad stays bound to
 * it, so a drifting thumb keeps steering instead of dropping the direction.
 */
export class TouchControls {
  #dpad;
  #buttons;
  #onChange;
  #pointers = new Map();
  #held = new Set();

  /**
   * @param {HTMLElement} root container of `.dpad` and `[data-button]` elements
   * @param {(held: Set<string>) => void} onChange
   */
  constructor(root, onChange) {
    this.#dpad = root.querySelector(".dpad");
    this.#buttons = [...root.querySelectorAll("[data-button]")];
    this.#onChange = onChange;

    for (const element of [this.#dpad, ...this.#buttons]) {
      element.addEventListener("pointerdown", this.#down);
      element.addEventListener("pointermove", this.#move);
      element.addEventListener("pointerup", this.#up);
      element.addEventListener("pointercancel", this.#up);
      element.addEventListener("lostpointercapture", this.#up);
      element.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  releaseAll() {
    this.#pointers.clear();
    this.#emit();
  }

  #down = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    // Capture keeps move/up events flowing while the finger slides off the element.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const onDpad = event.currentTarget === this.#dpad;
    this.#pointers.set(event.pointerId, { onDpad, held: [] });
    this.#track(event);
  };

  #move = (event) => {
    if (this.#pointers.has(event.pointerId)) this.#track(event);
  };

  #up = (event) => {
    if (this.#pointers.delete(event.pointerId)) this.#emit();
  };

  #track(event) {
    const pointer = this.#pointers.get(event.pointerId);
    pointer.held = pointer.onDpad
      ? this.#dpadAt(event.clientX, event.clientY)
      : this.#buttonsAt(event.clientX, event.clientY);
    this.#emit();
  }

  #dpadAt(x, y) {
    const rect = this.#dpad.getBoundingClientRect();
    return dpadDirections(
      x - (rect.left + rect.width / 2),
      y - (rect.top + rect.height / 2),
      Math.min(rect.width, rect.height) / 2,
    );
  }

  #buttonsAt(x, y) {
    return this.#buttons
      .filter((element) => contains(element.getBoundingClientRect(), x, y, BUTTON_SLOP))
      .map((element) => element.dataset.button);
  }

  #emit() {
    const held = new Set();
    for (const pointer of this.#pointers.values()) {
      for (const button of pointer.held) held.add(button);
    }
    const pressedNew = [...held].some((button) => !this.#held.has(button));
    for (const element of [this.#dpad, ...this.#buttons]) {
      const active = element === this.#dpad
        ? ["Up", "Down", "Left", "Right"].filter((d) => held.has(d)).join(" ")
        : held.has(element.dataset.button) ? "true" : "";
      if (element.dataset.active !== active) element.dataset.active = active;
    }
    this.#held = held;
    if (pressedNew) navigator.vibrate?.(8);
    this.#onChange(held);
  }
}
