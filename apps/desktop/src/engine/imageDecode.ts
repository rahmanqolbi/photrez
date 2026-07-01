import { MAX_CANVAS_DIM, getEffectiveMaxDim } from "./types";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38]; // "GIF8"
const BMP_MAGIC = [0x42, 0x4d]; // "BM"
const TIFF_MAGIC_LE = [0x49, 0x49, 0x2a, 0x00];
const TIFF_MAGIC_BE = [0x4d, 0x4d, 0x00, 0x2a];

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Magic-byte sniffer. The Rust side already enforces an
 * extension allowlist on `read_file_bytes`, but the bytes on disk could
 * still be anything (renamed .png, truncated download, network attack
 * via a malicious file picker result). Verifying the first 4-12 bytes
 * catches a renamed junk file before we hand it to createImageBitmap,
 * which gives a much less actionable error message.
 */
export function isSupportedImageBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (startsWith(bytes, PNG_MAGIC)) return true;
  if (startsWith(bytes, JPEG_MAGIC)) return true;
  if (startsWith(bytes, GIF_MAGIC)) return true;
  if (startsWith(bytes, BMP_MAGIC)) return true;
  if (startsWith(bytes, TIFF_MAGIC_LE)) return true;
  if (startsWith(bytes, TIFF_MAGIC_BE)) return true;
  // WebP: RIFF????WEBP — needs 12 bytes
  if (
    bytes.length >= 12 &&
    startsWith(bytes, WEBP_RIFF) &&
    startsWith(bytes.slice(8, 12), WEBP_MARK)
  ) {
    return true;
  }
  return false;
}

export class ImageTooLargeError extends Error {
  constructor(public readonly width: number, public readonly height: number) {
    const limit = getEffectiveMaxDim();
    super(
      `Image dimensions ${width}x${height} exceed device limit ${limit}px per side`,
    );
    this.name = "ImageTooLargeError";
  }
}

export class UnsupportedImageError extends Error {
  constructor(message = "File is not a recognised image format") {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

/**
 * Decode file bytes to an ImageBitmap with defense-in-depth:
 * - reject empty bytes (createImageBitmap hangs / throws obscurely)
 * - reject non-image bytes via magic-byte sniff
 * - reject bitmaps whose decoded dimensions exceed MAX_CANVAS_DIM
 *   before they get handed to the engine (otherwise the engine's
 *   memory budget explodes and the WebView2 process dies)
 * - on the rejection path the bitmap is never allocated, so no
 *   `close()` is required.
 */
export async function decodeImageBytes(bytes: Uint8Array): Promise<ImageBitmap> {
  if (bytes.length === 0) {
    throw new UnsupportedImageError("File is empty (0 bytes)");
  }
  if (!isSupportedImageBytes(bytes)) {
    throw new UnsupportedImageError();
  }

  const blobBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBytes).set(bytes);
  const bitmap = await createImageBitmap(new Blob([blobBytes]));

  if (bitmap.width > getEffectiveMaxDim() || bitmap.height > getEffectiveMaxDim()) {
    bitmap.close();
    throw new ImageTooLargeError(bitmap.width, bitmap.height);
  }
  return bitmap;
}