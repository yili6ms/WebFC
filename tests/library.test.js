import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { Emulator, initSync } from "../src/core/visual_fc.js";
import { GAMES, romUrl, thumbnailUrl } from "../src/library.js";

const publicFile = (url) => new URL(`../public${url}`, import.meta.url);
initSync({ module: fs.readFileSync(new URL("../src/core/visual_fc_bg.wasm", import.meta.url)) });

test("library ids are unique and every game has a thumbnail and license entry", () => {
  assert.equal(new Set(GAMES.map((game) => game.id)).size, GAMES.length);
  const licenses = fs.readFileSync(publicFile("/roms/LICENSES.txt"), "utf8");
  for (const game of GAMES) {
    assert.ok(fs.existsSync(publicFile(thumbnailUrl(game))), `${game.id} thumbnail`);
    if (!game.builtIn) assert.ok(licenses.includes(`File: ${game.id}.nes`), `${game.id} license`);
  }
});

for (const game of GAMES.filter((entry) => !entry.builtIn)) {
  test(`${game.title} loads and runs on the bundled core`, () => {
    const emulator = new Emulator(new Uint8Array(fs.readFileSync(publicFile(romUrl(game)))));
    for (let frame = 0; frame < 180; frame++) emulator.runFrame();
    const pixels = emulator.frameBuffer();
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
    assert.ok(colors.size > 1, "title screen should not be blank");
    emulator.free();
  });
}
