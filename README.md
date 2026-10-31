# WebFC

A browser Famicom / NES player deployable to [Vercel](https://vercel.com). Emulation is done by the
[VisualFC](https://github.com/yili6ms/VisualFC) core compiled to WebAssembly; frames are scaled on the
GPU by VisualFC's WebGL2 renderer (pixel, xBR-style smoothing or CRT), with a Canvas 2D fallback.

- Load `.nes` files from your computer or phone with **Open ROM…**, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>O</kbd>, or drag and drop. ROMs are read in the browser and never uploaded.
- Starts with VisualFC's built-in homebrew demo, so no ROM is required.
- Keyboard and USB/Bluetooth gamepad input (W3C standard mapping), pause/resume, reset, fullscreen.
- Supported cartridges are those of the core: NTSC iNES mapper 0 (NROM), 2 (UxROM) and 3 (CNROM). Audio, save states and SRAM persistence are not implemented by the core.

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
