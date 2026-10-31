export const MAX_ROM_BYTES = 4 * 1024 * 1024;

/** Read a user-selected file and reject anything that is clearly not an iNES image. */
export async function readRomFile(file) {
  if (file.size > MAX_ROM_BYTES) {
    throw new Error(`file is larger than ${MAX_ROM_BYTES / 1024 / 1024} MiB`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isINes = bytes.length >= 16
    && bytes[0] === 0x4e && bytes[1] === 0x45 && bytes[2] === 0x53 && bytes[3] === 0x1a;
  if (!isINes) throw new Error("not an iNES (.nes) image");
  return bytes;
}
