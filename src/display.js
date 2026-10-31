import { Renderer } from "./core/renderer.js";

const WIDTH = 256;
const HEIGHT = 240;

/** Canvas 2D presenter used only when WebGL2 is unavailable; CSS does the scaling. */
class Canvas2DDisplay {
  kind = "canvas2d";
  #context;
  #image;

  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.classList.add("pixelated");
    this.#context = canvas.getContext("2d", { alpha: false });
    if (!this.#context) throw new Error("Neither WebGL2 nor Canvas 2D is available");
    this.#image = this.#context.createImageData(WIDTH, HEIGHT);
  }

  setFilter() {}
  setIntegerScale() {}
  resize() {}

  draw(rgba) {
    this.#image.data.set(rgba);
    this.#context.putImageData(this.#image, 0, 0);
  }
}

/** GPU presenter around VisualFC's WebGL2 renderer, tracking context loss. */
class WebGLDisplay {
  kind = "webgl2";
  #renderer;
  #lost = false;

  constructor(canvas, options) {
    this.canvas = canvas;
    this.#renderer = new Renderer(canvas, { width: WIDTH, height: HEIGHT, ...options });
    canvas.addEventListener("webglcontextlost", () => { this.#lost = true; });
    canvas.addEventListener("webglcontextrestored", () => { this.#lost = false; });
  }

  setFilter(filter) {
    this.#renderer.setFilter(filter);
  }

  setIntegerScale(enabled) {
    this.#renderer.setIntegerScale(enabled);
  }

  resize(width, height) {
    if (!this.#lost) this.#renderer.resize(width, height);
  }

  draw(rgba) {
    if (!this.#lost) this.#renderer.draw(rgba);
  }
}

export function createDisplay(canvas, options) {
  try {
    return new WebGLDisplay(canvas, options);
  } catch (error) {
    console.warn("WebGL2 renderer unavailable, using Canvas 2D:", error);
    // A canvas with a failed WebGL context cannot provide a 2D one; swap it out.
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    return new Canvas2DDisplay(replacement);
  }
}
