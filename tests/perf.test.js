import assert from "node:assert/strict";
import { test } from "node:test";
import { PerfMeter, describeHostCpu } from "../src/perf.js";

function clock() {
  let time = 0;
  return { now: () => time, advance: (ms) => { time += ms; } };
}

test("reports FPS, frame cost and load over the rolling window", () => {
  const c = clock();
  const meter = new PerfMeter({ windowMs: 1000, now: c.now });
  for (let i = 0; i < 120; i++) {
    c.advance(1000 / 60);
    meter.frame(2);
    meter.busy(1);
  }
  const { fps, frameMs, load } = meter.sample();
  assert.ok(Math.abs(fps - 60) < 1.5, `fps ${fps}`);
  assert.equal(frameMs, 2);
  assert.ok(Math.abs(load - 0.18) < 0.01, `load ${load}`);
});

test("measures over elapsed time until a full window has passed", () => {
  const c = clock();
  const meter = new PerfMeter({ windowMs: 1000, now: c.now });
  for (let i = 0; i < 15; i++) {
    c.advance(1000 / 60);
    meter.frame(1);
  }
  assert.ok(Math.abs(meter.sample().fps - 60) < 1, "a quarter second in, FPS is not under-reported");
});

test("reset forgets earlier frames, e.g. after a pause", () => {
  const c = clock();
  const meter = new PerfMeter({ now: c.now });
  c.advance(100);
  meter.frame(5);
  meter.reset();
  c.advance(100);
  assert.deepEqual(meter.sample(), { fps: 0, frameMs: 0, load: 0 });
});

test("describes the host CPU from navigator data", async () => {
  const nav = {
    hardwareConcurrency: 10,
    userAgentData: {
      platform: "macOS",
      getHighEntropyValues: async () => ({ architecture: "arm", bitness: "64", platform: "macOS" }),
    },
  };
  assert.equal(await describeHostCpu(nav), "10 logical cores · arm 64-bit · macOS");
  assert.equal(await describeHostCpu({ hardwareConcurrency: 4 }), "4 logical cores");
});
