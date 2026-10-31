import assert from "node:assert/strict";
import { test } from "node:test";
import { FrameRunner, MAX_CATCH_UP_FRAMES } from "../src/runner.js";

function harness(overrides = {}) {
  const calls = { steps: 0, presents: 0, errors: [] };
  let pending = null;
  const runner = new FrameRunner({
    fps: 60,
    step: () => { calls.steps += 1; },
    present: () => { calls.presents += 1; },
    onError: (error) => calls.errors.push(error),
    requestFrame: (callback) => { pending = callback; return 1; },
    cancelFrame: () => { pending = null; },
    ...overrides,
  });
  return { runner, calls, tick: (now) => pending(now) };
}

test("schedules by elapsed time, not by callback count", () => {
  const { runner, calls, tick } = harness();
  runner.start();
  tick(0);
  assert.equal(calls.steps, 1, "first callback runs a frame immediately");
  tick(8); // 120 Hz display: half a frame elapsed
  assert.equal(calls.steps, 1);
  assert.equal(calls.presents, 1, "nothing is presented without a new frame");
  tick(17);
  assert.equal(calls.steps, 2);
  tick(17 + 1000 / 30); // 30 Hz display: two frames per callback
  assert.equal(calls.steps, 4);
});

test("caps catch-up work and drops the remaining backlog", () => {
  const { runner, calls, tick } = harness();
  runner.start();
  tick(0);
  tick(5000);
  assert.equal(calls.steps, 1 + MAX_CATCH_UP_FRAMES);
  tick(5001);
  assert.equal(calls.steps, 1 + MAX_CATCH_UP_FRAMES, "backlog was not carried forward");
});

test("stops scheduling and reports emulation errors", () => {
  const failure = new Error("CPU halted");
  const { runner, calls, tick } = harness({ step: () => { throw failure; } });
  runner.start();
  tick(0);
  assert.equal(runner.running, false);
  assert.deepEqual(calls.errors, [failure]);
});
