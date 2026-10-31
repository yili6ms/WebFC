/* tslint:disable */
/* eslint-disable */

export enum Button {
    A = 0,
    B = 1,
    Select = 2,
    Start = 3,
    Up = 4,
    Down = 5,
    Left = 6,
    Right = 7,
}

export class Emulator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Start the built-in homebrew after its six initialization frames.
     */
    static demo(): Emulator;
    /**
     * Return an owned RGBA snapshot, not a view into growable WASM memory.
     */
    frameBuffer(): Uint8Array;
    /**
     * Replace the cartridge only after the new image has loaded successfully.
     */
    loadRom(rom: Uint8Array): void;
    /**
     * Load an iNES image from bytes. Invalid or unsupported ROMs throw an Error.
     */
    constructor(rom: Uint8Array);
    /**
     * Power-cycle the current cartridge, clearing RAM and controller input.
     */
    reset(): void;
    /**
     * Run synchronously to the next frame's first CPU instruction boundary.
     */
    runFrame(): void;
    /**
     * Update player one's live input; the game still latches and reads the pad.
     */
    setButton(button: Button, pressed: boolean): void;
    readonly fps: number;
    /**
     * JavaScript receives a bigint, preserving the core's 64-bit frame count.
     */
    readonly frameNumber: bigint;
    readonly height: number;
    readonly width: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_emulator_free: (a: number, b: number) => void;
    readonly emulator_demo: () => [number, number, number];
    readonly emulator_fps: (a: number) => number;
    readonly emulator_frameBuffer: (a: number) => [number, number];
    readonly emulator_frameNumber: (a: number) => bigint;
    readonly emulator_height: (a: number) => number;
    readonly emulator_loadRom: (a: number, b: number, c: number) => [number, number];
    readonly emulator_new: (a: number, b: number) => [number, number, number];
    readonly emulator_reset: (a: number) => void;
    readonly emulator_runFrame: (a: number) => [number, number];
    readonly emulator_setButton: (a: number, b: number, c: number) => [number, number];
    readonly emulator_width: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
