export const BUTTONS = Object.freeze(["A", "B", "Select", "Start", "Up", "Down", "Left", "Right"]);

/** Keyboard layout matching the native VisualFC game window, plus a WASD/JK alternative. */
export const KEY_BINDINGS = Object.freeze({
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  KeyX: "A",
  KeyZ: "B",
  Enter: "Start",
  ShiftLeft: "Select",
  ShiftRight: "Select",
  KeyW: "Up",
  KeyS: "Down",
  KeyA: "Left",
  KeyD: "Right",
  KeyK: "A",
  KeyJ: "B",
});

const STICK_DEAD_ZONE = 0.5;

/** Read a W3C "standard" mapped gamepad: bottom face = A, right face = B. */
export function readGamepad(pad) {
  const held = new Set();
  const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
  if (pressed(0)) held.add("A");
  if (pressed(1)) held.add("B");
  if (pressed(8)) held.add("Select");
  if (pressed(9)) held.add("Start");
  const [x = 0, y = 0] = pad.axes;
  if (pressed(12) || y <= -STICK_DEAD_ZONE) held.add("Up");
  if (pressed(13) || y >= STICK_DEAD_ZONE) held.add("Down");
  if (pressed(14) || x <= -STICK_DEAD_ZONE) held.add("Left");
  if (pressed(15) || x >= STICK_DEAD_ZONE) held.add("Right");
  return held;
}

/**
 * Combines keyboard, gamepad and touch sources and forwards only changes to the
 * emulator. Opposing directions cancel to neutral, as on the native frontend.
 */
export class InputState {
  #apply;
  #keys = new Set();
  #gamepad = new Set();
  #touch = new Set();
  #applied = new Set();

  /** @param {(button: string, pressed: boolean) => void} apply */
  constructor(apply) {
    this.#apply = apply;
  }

  /** Returns true when the key is bound, so the caller can suppress its default action. */
  keyDown(code) {
    if (!Object.hasOwn(KEY_BINDINGS, code)) return false;
    this.#keys.add(code);
    this.sync();
    return true;
  }

  keyUp(code) {
    if (!Object.hasOwn(KEY_BINDINGS, code)) return false;
    this.#keys.delete(code);
    this.sync();
    return true;
  }

  setGamepad(buttons) {
    this.#gamepad = new Set(buttons);
    this.sync();
  }

  setTouch(buttons) {
    this.#touch = new Set(buttons);
    this.sync();
  }

  releaseAll() {
    this.#keys.clear();
    this.#gamepad.clear();
    this.#touch.clear();
    this.sync();
  }

  /** Resend held buttons after the emulator cleared its input (ROM load or reset). */
  reapply() {
    this.#applied.clear();
    this.sync();
  }

  get held() {
    const held = new Set([...this.#gamepad, ...this.#touch]);
    for (const code of this.#keys) held.add(KEY_BINDINGS[code]);
    for (const [a, b] of [["Up", "Down"], ["Left", "Right"]]) {
      if (held.has(a) && held.has(b)) {
        held.delete(a);
        held.delete(b);
      }
    }
    return held;
  }

  sync() {
    const held = this.held;
    for (const button of BUTTONS) {
      const pressed = held.has(button);
      if (pressed !== this.#applied.has(button)) {
        this.#apply(button, pressed);
        if (pressed) this.#applied.add(button);
        else this.#applied.delete(button);
      }
    }
  }
}
