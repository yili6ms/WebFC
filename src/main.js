import "./style.css";
import { injectSpeedInsights } from "@vercel/speed-insights";
import init, { Button, Emulator } from "./core/visual_fc.js";
import coreVersion from "./core/VERSION?raw";
import { createDisplay } from "./display.js";
import { InputState, readGamepad } from "./input.js";
import { DEMO_ID, GAMES, findGame, romUrl, thumbnailUrl } from "./library.js";
import { readRomFile } from "./rom.js";
import { FrameRunner } from "./runner.js";
import { TouchControls } from "./touch.js";

// Web-vitals reporting for Vercel deployments; dev builds only log locally.
injectSpeedInsights();

const $ = (selector) => document.querySelector(selector);
const ui = {
  games: $("#games"),
  open: $("#open"),
  library: $("#library"),
  libraryList: $("#library-list"),
  libraryOpen: $("#library-open"),
  file: $("#file"),
  pause: $("#pause"),
  reset: $("#reset"),
  filter: $("#filter"),
  integer: $("#integer"),
  fullscreen: $("#fullscreen"),
  stage: $("#stage"),
  romName: $("#rom-name"),
  state: $("#state"),
  fps: $("#fps"),
  message: $("#message"),
};
$("#core-version").textContent = coreVersion.trim().slice(0, 7);

const settings = {
  filter: localStorage.getItem("webfc.filter") ?? "nearest",
  // Small touch screens lose too much area to whole-number scaling, so default it off there.
  integerScale: (localStorage.getItem("webfc.integerScale")
    ?? String(!matchMedia("(pointer: coarse)").matches)) === "true",
};
if (![...ui.filter.options].some((option) => option.value === settings.filter)) {
  settings.filter = "nearest";
}
ui.filter.value = settings.filter;
ui.integer.checked = settings.integerScale;

function showMessage(text, isError = false) {
  ui.message.textContent = text;
  ui.message.classList.toggle("error", isError);
}

let emulator;
let faulted = false;

try {
  await init();
  emulator = Emulator.demo();
} catch (error) {
  ui.romName.textContent = "Unavailable";
  showMessage(`Could not start the emulator core: ${error.message}`, true);
  throw error;
}

const display = createDisplay($("#game"), {
  filter: settings.filter,
  integerScale: settings.integerScale,
});
const canvas = display.canvas;
if (display.kind !== "webgl2") {
  ui.filter.disabled = ui.integer.disabled = true;
  ui.filter.title = "Filters require WebGL2";
}

function present() {
  display.draw(emulator.frameBuffer());
}

const runner = new FrameRunner({
  fps: emulator.fps,
  step: () => emulator.runFrame(),
  present,
  onError(error) {
    faulted = true;
    showMessage(`Emulation stopped: ${error.message}. Reset or load another ROM.`, true);
    updateState();
  },
});

const input = new InputState((button, pressed) => emulator.setButton(Button[button], pressed));
const touch = new TouchControls($("#touch"), (held) => input.setTouch(held));

// Show the on-screen controller on touch-first devices, or once any touch is seen.
const coarsePointer = matchMedia("(pointer: coarse)");
function enableTouchUi(enabled) {
  document.body.classList.toggle("touch", enabled);
  // Mobile pickers often grey out files whose extension has no registered type.
  if (enabled) ui.file.removeAttribute("accept");
}
enableTouchUi(coarsePointer.matches);
coarsePointer.addEventListener("change", (event) => event.matches && enableTouchUi(true));
window.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") enableTouchUi(true);
}, { capture: true, passive: true });

function updateState() {
  ui.pause.disabled = faulted;
  ui.reset.disabled = false;
  ui.pause.textContent = runner.running ? "Pause" : "Resume";
  ui.state.textContent = faulted ? "Faulted" : runner.running ? "Running" : "Paused";
  ui.state.dataset.state = ui.state.textContent.toLowerCase();
}

function setRunning(running) {
  if (faulted) return;
  if (running) runner.start();
  else runner.stop();
  updateState();
}

function setCartridge(name) {
  ui.romName.textContent = name;
  document.title = `${name} — WebFC`;
}

let currentGameId = DEMO_ID;

function startCartridge(name, message, gameId = null) {
  faulted = false;
  input.reapply();
  setCartridge(name);
  showMessage(message);
  present();
  runner.stop();
  setRunning(true);
  currentGameId = gameId;
  // Bundled games get a shareable ?game= link; local files cannot be linked.
  const url = new URL(location.href);
  if (gameId && gameId !== DEMO_ID) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");
  history.replaceState(null, "", url);
}

async function loadFile(file) {
  if (!file) return;
  try {
    const bytes = await readRomFile(file);
    // On failure the core keeps the current cartridge running untouched.
    emulator.loadRom(bytes);
  } catch (error) {
    showMessage(`Could not load ${file.name}: ${error.message}`, true);
    return;
  }
  startCartridge(file.name, `Loaded ${file.name}.`);
}

async function loadGame(game) {
  try {
    if (game.builtIn) {
      const demo = Emulator.demo();
      emulator.free();
      emulator = demo;
    } else {
      const response = await fetch(romUrl(game));
      if (!response.ok) throw new Error(`download failed (HTTP ${response.status})`);
      emulator.loadRom(new Uint8Array(await response.arrayBuffer()));
    }
  } catch (error) {
    showMessage(`Could not load ${game.title}: ${error.message}`, true);
    return;
  }
  startCartridge(game.title, `${game.title} by ${game.author} · ${game.license}`, game.id);
}

function renderLibrary() {
  ui.libraryList.replaceChildren(...GAMES.map((game) => {
    const item = document.createElement("li");
    item.className = "game-card";
    if (game.id === currentGameId) item.setAttribute("aria-current", "true");

    const play = document.createElement("button");
    play.type = "button";
    play.className = "game-play";
    const image = Object.assign(document.createElement("img"), {
      src: thumbnailUrl(game), alt: "", width: 256, height: 240, loading: "lazy",
    });
    const title = Object.assign(document.createElement("strong"), { textContent: game.title });
    const description = Object.assign(document.createElement("span"), { textContent: game.description });
    play.append(image, title, description);
    play.addEventListener("click", () => {
      ui.library.close();
      loadGame(game);
    });

    const meta = document.createElement("p");
    meta.className = "game-meta";
    const source = Object.assign(document.createElement("a"), {
      href: game.source, target: "_blank", rel: "noopener", textContent: `${game.author}, ${game.year}`,
    });
    meta.append(source, ` · ${game.license}`);
    item.append(play, meta);
    return item;
  }));
}

function openLibrary() {
  releaseInputs();
  renderLibrary();
  ui.library.showModal();
}

function reset() {
  emulator.reset();
  faulted = false;
  input.reapply();
  showMessage("Cartridge reset.");
  present();
  runner.stop();
  setRunning(true);
}

// Toolbar buttons give focus back to the page so game keys keep working.
function onClick(button, action) {
  button.addEventListener("click", () => {
    action();
    button.blur();
  });
}

onClick(ui.games, openLibrary);
onClick(ui.open, () => ui.file.click());
ui.libraryOpen.addEventListener("click", () => {
  ui.library.close();
  ui.file.click();
});
// A click on the backdrop (the dialog element itself) dismisses it.
ui.library.addEventListener("click", (event) => {
  if (event.target === ui.library) ui.library.close();
});
onClick(ui.pause, () => setRunning(!runner.running));
onClick(ui.reset, reset);
// iPhone Safari has no element fullscreen; installing to the home screen covers it.
if (!document.fullscreenEnabled) ui.fullscreen.hidden = true;
onClick(ui.fullscreen, async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
    return;
  }
  try {
    // The stage holds the screen and the touch controller, so both stay visible.
    await ui.stage.requestFullscreen({ navigationUI: "hide" });
    if (document.body.classList.contains("touch")) await screen.orientation?.lock?.("landscape");
  } catch {
    // Orientation lock is unsupported on many devices; fullscreen still applies.
  }
});

ui.file.addEventListener("change", () => {
  loadFile(ui.file.files[0]);
  ui.file.value = "";
});

ui.filter.addEventListener("change", () => {
  display.setFilter(ui.filter.value);
  localStorage.setItem("webfc.filter", ui.filter.value);
  present();
  ui.filter.blur();
});

ui.integer.addEventListener("change", () => {
  display.setIntegerScale(ui.integer.checked);
  localStorage.setItem("webfc.integerScale", String(ui.integer.checked));
  present();
  ui.integer.blur();
});

// Drag and drop anywhere on the page.
let dragDepth = 0;
window.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragDepth += 1;
  document.body.classList.add("dragging");
});
window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) document.body.classList.remove("dragging");
});
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging");
  loadFile(event.dataTransfer?.files[0]);
});

// Keyboard input and shortcuts.
const isFormField = (target) => target instanceof HTMLElement && target.matches("input, select, textarea");

window.addEventListener("keydown", (event) => {
  if (ui.library.open) return;
  if ((event.ctrlKey || event.metaKey) && event.code === "KeyO") {
    event.preventDefault();
    ui.file.click();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) setRunning(!runner.running);
    return;
  }
  if (input.keyDown(event.code)) event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  if (input.keyUp(event.code)) event.preventDefault();
});

function releaseInputs() {
  touch.releaseAll();
  input.releaseAll();
}
window.addEventListener("blur", releaseInputs);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseInputs();
  else runner.resync();
});

// Gamepads are polled only while one is connected.
let gamepadPolling = false;
function pollGamepads() {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((candidate) => candidate?.connected);
  input.setGamepad(pad ? readGamepad(pad) : []);
  gamepadPolling = Boolean(pad);
  if (gamepadPolling) requestAnimationFrame(pollGamepads);
}
window.addEventListener("gamepadconnected", (event) => {
  showMessage(`Gamepad connected: ${event.gamepad.id}`);
  if (!gamepadPolling) pollGamepads();
});

// Keep the drawing buffer at physical-pixel resolution for crisp scaling.
new ResizeObserver(() => {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  try {
    display.resize(width, height);
    present();
  } catch (error) {
    console.warn("Resize failed:", error);
  }
}).observe(canvas);

// Report the emulated frame rate once per second.
let lastFrame = emulator.frameNumber;
setInterval(() => {
  const frame = emulator.frameNumber;
  const frames = frame >= lastFrame ? Number(frame - lastFrame) : 0;
  lastFrame = frame;
  ui.fps.textContent = runner.running ? `${frames} fps` : "—";
}, 1000);

setCartridge(findGame(DEMO_ID).title);
showMessage("Pick a free game under Games, or open your own .nes file.");
present();
setRunning(true);

const linkedGame = findGame(new URLSearchParams(location.search).get("game") ?? "");
if (linkedGame) {
  loadGame(linkedGame);
} else if (!localStorage.getItem("webfc.libraryShown")) {
  // Introduce the bundled games once; afterwards the Games button opens them.
  localStorage.setItem("webfc.libraryShown", "1");
  openLibrary();
}
