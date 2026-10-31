import assert from "node:assert/strict";
import { test } from "node:test";
import { dpadDirections } from "../src/touch.js";

test("D-pad ignores the centre dead zone", () => {
  assert.deepEqual(dpadDirections(5, 5, 80), []);
});

test("D-pad maps cardinals with a forgiving angle and narrow diagonals", () => {
  assert.deepEqual(dpadDirections(0, -60, 80), ["Up"]);
  assert.deepEqual(dpadDirections(60, 20, 80), ["Right"], "18° off axis stays cardinal");
  assert.deepEqual(dpadDirections(-50, 50, 80), ["Down", "Left"]);
  assert.deepEqual(dpadDirections(200, -190, 80), ["Up", "Right"], "outside the pad still steers");
});
