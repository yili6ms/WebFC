# WebFC

A browser Famicom / NES player deployable to [Vercel](https://vercel.com). Emulation is done by the
[VisualFC](https://github.com/yili6ms/VisualFC) core compiled to WebAssembly; frames are scaled on the
GPU by VisualFC's WebGL2 renderer (pixel, xBR-style smoothing or CRT), with a Canvas 2D fallback.

- Load `.nes` files from your computer or phone with **Open ROM…**, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>O</kbd>, or drag and drop. ROMs are read in the browser and never uploaded.
- Includes free homebrew games under **Games**, so you can play right away (see below).
- Keyboard and USB/Bluetooth gamepad input (W3C standard mapping), pause/resume, reset, fullscreen.
- Supported cartridges are those of the core: NTSC iNES mapper 0 (NROM), 2 (UxROM) and 3 (CNROM). Audio, save states and SRAM persistence are not implemented by the core.

### Performance stats

A corner overlay on the game screen (toggle with **Stats**) and the side panel show live figures, measured over a
rolling one-second window and refreshed four times a second:

- **FPS:** emulated frames per second, with the average core time per frame.
- **Emulator CPU:** main-thread time spent emulating and drawing, as a share of one core.
- **Host CPU:** logical core count, plus architecture and OS where the browser exposes them (Chromium browsers
  do). Web pages cannot read the CPU model or system-wide usage.
- **CPU pressure:** system-wide `nominal` / `fair` / `serious` / `critical` state, from the
  [Compute Pressure API](https://developer.mozilla.org/docs/Web/API/Compute_Pressure_API) in browsers that support it
  (Chromium-based); hidden elsewhere.

| Action | Keys |
| --- | --- |
| D-pad | Arrow keys or W A S D |
| A / B | X / Z or K / J |
| Start / Select | Enter / Shift |
| Pause / resume | Space |
| Open ROM | Ctrl/⌘+O |

### Mobile

On touch devices an on-screen controller appears: the screen sits above the controller in portrait,
and between the D-pad and A/B buttons in landscape. It supports multi-touch; fingers can slide between
buttons, the D-pad keeps steering if your thumb drifts off it, and pressing between A and B holds both
(Android also gives a short vibration). **Fullscreen** includes the controller and locks landscape where
supported. iPhone Safari has no element fullscreen, so use **Share → Add to Home Screen**: the web app
manifest opens WebFC full screen. Integer scaling defaults to off on touch screens to use more of the display.

## Included games

The **Games** dialog opens on your first visit. It lists VisualFC's built-in demo and these
redistributable homebrew ROMs, which are stored unmodified in `public/roms/`:

| Game | Author | License |
| --- | --- | --- |
| [Falling](https://github.com/tragicmuffin/falling-nes) | tragicmuffin | MIT |
| [Lunar Limit](https://github.com/pubby/lunarlimit) | Pubby | MIT |
| [RALPH 4](https://github.com/pubby/Ralph-4) | Pubby | MIT |
| [Star Evil](https://forums.nesdev.org/viewtopic.php?t=16993) | Pubby | MIT |
| [Concentration Room](https://github.com/pinobatch/croom-nes) | Damian Yerrick | GPL-3.0+ with an exception for unmodified ROMs |
| [robotfindskitten](https://github.com/pinobatch/rfk-nes) | Damian Yerrick | zlib |

The full license notices are in [`public/roms/LICENSES.txt`](public/roms/LICENSES.txt), which the app links to.
Bundled games can be linked directly, e.g. `/?game=falling`. To add a game, confirm that its license allows
redistribution and that it runs on the core (mapper 0/2/3, NTSC, iNES 1.0 header). Then put `<id>.nes` and a
256×240 `<id>.png` title screenshot in `public/roms/`, add the notice to `LICENSES.txt`, and add an entry to
`src/library.js`. `npm test` boots every listed ROM on the bundled core.

## Development

Requires Node.js 20.19+.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (scheduler, input)
npm run build    # production build in dist/
```

## Deploying to Vercel

The project is a static Vite site; `vercel.json` sets the build command and output directory.
Import the repository in Vercel (framework preset **Vite**) or run `npx vercel --prod`.
[Vercel Speed Insights](https://vercel.com/docs/speed-insights) (`@vercel/speed-insights`) reports Core Web Vitals
from production builds; enable it under the project's **Speed Insights** tab. In `npm run dev` it loads a debug script that
only logs to the console and sends nothing. Outside Vercel (e.g. `npm run preview`) its script request returns 404, which is harmless.
No Rust toolchain is needed at deploy time, because the compiled core is committed in `src/core/`.

## Updating the VisualFC core

`src/core/` is generated: `visual_fc.js`, `visual_fc_bg.wasm`, type declarations, and VisualFC's
`renderer.js`/`shaders.js`, plus `VERSION` (the source commit) and VisualFC's `LICENSE`.
The pinned commit lives in `visualfc.ref`. To rebuild:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129 --locked   # must match VisualFC's pin
npm run build:core
```

Override with `VISUALFC_REF=<commit-or-branch>` or point `VISUALFC_DIR` at a local checkout.
The script prefers the rustup toolchain's `cargo`, since other installs (e.g. Homebrew) lack the WASM target.

## Layout

| File | Role |
| --- | --- |
| `src/main.js` | UI wiring: ROM loading, drag and drop, shortcuts, status, settings |
| `src/runner.js` | Fixed-rate frame scheduler (NTSC 60.0988 Hz from elapsed time, capped catch-up) |
| `src/input.js` | Keyboard/gamepad/touch merging; opposing directions cancel; only changes reach the core |
| `src/touch.js` | Multi-touch on-screen controller and D-pad direction mapping |
| `src/display.js` | WebGL2 renderer with Canvas 2D fallback and context-loss handling |
| `src/rom.js` | Local file reading and iNES header check |
| `src/library.js` | Bundled game list (metadata, ROM and thumbnail paths) |
| `src/perf.js` | Rolling FPS/CPU-load meter, host CPU description and CPU pressure observer |
