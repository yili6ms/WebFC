import { fragmentShader, vertexShader } from "./shaders.js";

const modes = Object.freeze({ nearest: 0, xbr: 1, crt: 2 });

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function createProgram(gl) {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate a WebGL program");
  const shaders = [];
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragmentShader],
    ]) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Could not allocate a WebGL shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`WebGL shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program linking failed: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
}

/** Owns a canvas's WebGL2 context; accepts the WASM API's copied RGBA frames. */
export class Renderer {
  #canvas;
  #gl;
  #width;
  #height;
  #filter;
  #integerScale;
  #program = null;
  #texture = null;
  #vao = null;
  #modeLocation;
  #disposed = false;
  #needsRebuild = false;
  #onContextLost = (event) => {
    event.preventDefault();
    // The old context's handles cannot be used or deleted after restoration.
    this.#texture = this.#vao = this.#program = null;
    this.#needsRebuild = true;
  };

  constructor(canvas, {
    width = 256,
    height = 240,
    filter = "nearest",
    integerScale = true,
  } = {}) {
    positiveInteger(width, "Source width");
    positiveInteger(height, "Source height");
    this.setFilter(filter);
    this.setIntegerScale(integerScale);
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable; a GPU renderer could not be created");
    if (gl.isContextLost()) throw new Error("WebGL context is lost");
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (width > maxSize || height > maxSize) {
      throw new RangeError(`Source dimensions exceed the GPU texture limit (${maxSize})`);
    }
    this.#canvas = canvas;
    this.#gl = gl;
    this.#width = width;
    this.#height = height;
    this.#createResources();
    canvas.addEventListener("webglcontextlost", this.#onContextLost);
  }

  setFilter(filter) {
    if (this.#disposed) throw new Error("Renderer has been disposed");
    if (typeof filter !== "string" || !Object.hasOwn(modes, filter)) {
      throw new RangeError(`Unknown filter "${filter}"; expected nearest, xbr or crt`);
    }
    this.#filter = filter;
  }

  setIntegerScale(enabled) {
    if (this.#disposed) throw new Error("Renderer has been disposed");
    if (typeof enabled !== "boolean") throw new TypeError("Integer scaling must be a boolean");
    this.#integerScale = enabled;
  }

  /** Set drawing-buffer dimensions in physical pixels, not CSS pixels. */
  resize(width, height) {
    this.#requireActive();
    positiveInteger(width, "Canvas width");
    positiveInteger(height, "Canvas height");
    const maximum = this.#gl.getParameter(this.#gl.MAX_VIEWPORT_DIMS);
    if (width > maximum[0] || height > maximum[1]) {
      throw new RangeError("Canvas dimensions exceed the GPU viewport limit");
    }
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;
    if (this.#gl.drawingBufferWidth !== width || this.#gl.drawingBufferHeight !== height) {
      throw new Error("The GPU could not allocate the requested canvas size");
    }
  }

  draw(rgba) {
    this.#requireActive();
    if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray)
        || rgba.length !== this.#width * this.#height * 4) {
      throw new TypeError(`Frame must contain ${this.#width * this.#height * 4} RGBA bytes`);
    }
    if (this.#needsRebuild) {
      this.#createResources();
      this.#needsRebuild = false;
    }
    const gl = this.#gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width < 1 || height < 1) throw new Error("Canvas drawing buffer is empty");
    let scale = Math.min(width / this.#width, height / this.#height);
    if (this.#integerScale && scale >= 1) scale = Math.floor(scale);
    const viewportWidth = Math.max(1, Math.floor(this.#width * scale));
    const viewportHeight = Math.max(1, Math.floor(this.#height * scale));

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DITHER);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(
      Math.floor((width - viewportWidth) / 2),
      Math.floor((height - viewportHeight) / 2),
      viewportWidth,
      viewportHeight,
    );
    gl.useProgram(this.#program);
    gl.bindVertexArray(this.#vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    const sampling = this.#filter === "crt" ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampling);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampling);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, this.#width, this.#height,
      gl.RGBA, gl.UNSIGNED_BYTE, rgba,
    );
    gl.uniform1i(this.#modeLocation, modes[this.#filter]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    if (this.#disposed) return;
    this.#canvas.removeEventListener("webglcontextlost", this.#onContextLost);
    this.#deleteResources();
    this.#disposed = true;
  }

  #requireActive() {
    if (this.#disposed) throw new Error("Renderer has been disposed");
    if (this.#gl.isContextLost()) {
      throw new Error("WebGL context is lost; wait for webglcontextrestored before drawing");
    }
  }

  #createResources() {
    const gl = this.#gl;
    try {
      this.#program = createProgram(gl);
      this.#texture = gl.createTexture();
      this.#vao = gl.createVertexArray();
      if (!this.#texture || !this.#vao) throw new Error("Could not allocate WebGL frame resources");
      gl.useProgram(this.#program);
      gl.uniform1i(gl.getUniformLocation(this.#program, "frame"), 0);
      this.#modeLocation = gl.getUniformLocation(this.#program, "mode");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA8, this.#width, this.#height,
        0, gl.RGBA, gl.UNSIGNED_BYTE, null,
      );
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`WebGL frame allocation failed (${error})`);
    } catch (error) {
      this.#deleteResources();
      throw error;
    }
  }

  #deleteResources() {
    this.#gl.deleteTexture(this.#texture);
    this.#gl.deleteVertexArray(this.#vao);
    this.#gl.deleteProgram(this.#program);
    this.#texture = this.#vao = this.#program = null;
  }
}
