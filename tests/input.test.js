import assert from "node:assert/strict";
import { test } from "node:test";
import { InputState, readGamepad } from "../src/input.js";

function recorder() {
  const events = [];
  return { events, input: new InputState((button, pressed) => events.push(`${button}:${pressed}`)) };
}

test("combines keyboard and gamepad, forwarding only changes", () => {
  const { events, input } = recorder();
  assert.equal(input.keyDown("KeyX"), true);
  input.setGamepad(["A"]);
  input.keyUp("KeyX");
  assert.deepEqual(events, ["A:true"], "A stays held while the gamepad presses it");
  input.setGamepad([]);
  assert.deepEqual(events, ["A:true", "A:false"]);
  assert.equal(input.keyDown("KeyQ"), false, "unbound keys are ignored");
});

test("opposing directions cancel to neutral", () => {
  const { events, input } = recorder();
  input.keyDown("ArrowLeft");
  input.keyDown("ArrowRight");
  assert.deepEqual(events, ["Left:true", "Left:false"]);
});

test("reapply resends held buttons after the emulator cleared input", () => {
  const { events, input } = recorder();
  input.keyDown("Enter");
  input.reapply();
  input.releaseAll();
  assert.deepEqual(events, ["Start:true", "Start:true", "Start:false"]);
});

test("reads standard-mapped gamepads with a stick dead zone", () => {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  buttons[1].pressed = true;
  buttons[9].pressed = true;
  const held = readGamepad({ buttons, axes: [0.9, -0.2] });
  assert.deepEqual([...held].sort(), ["B", "Right", "Start"]);
});

test("touch combines with keyboard and is cleared by releaseAll", () => {
  const { events, input } = recorder();
  input.setTouch(["B", "Up"]);
  input.keyDown("KeyZ");
  input.setTouch(["Up"]);
  input.releaseAll();
  assert.deepEqual(events, ["B:true", "Up:true", "B:false", "Up:false"]);
});
