import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSupportedImageBytes,
  decodeImageBytes,
  ImageTooLargeError,
  UnsupportedImageError,
} from "../imageDecode";
import { setDeviceMaxTextureSize, MAX_CANVAS_DIM } from "../types";

// ─── isSupportedImageBytes (pure, no mocks) ──────────────────────
describe("isSupportedImageBytes", () => {
  it("rejects bytes shorter than 4", () => {
    expect(isSupportedImageBytes(new Uint8Array([0x89, 0x50]))).toBe(false);
    expect(isSupportedImageBytes(new Uint8Array([]))).toBe(false);
  });

  it("accepts PNG magic", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts JPEG magic", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts GIF magic", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts BMP magic", () => {
    const bytes = new Uint8Array([0x42, 0x4d, 0, 0, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts TIFF LE magic", () => {
    const bytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts TIFF BE magic", () => {
    const bytes = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("accepts WebP (RIFF????WEBP)", () => {
    // RIFF + 4 bytes size + WEBP
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(isSupportedImageBytes(bytes)).toBe(true);
  });

  it("rejects WebP when too short (<12 bytes)", () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0]);
    expect(isSupportedImageBytes(bytes)).toBe(false);
  });

  it("rejects random garbage", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(isSupportedImageBytes(bytes)).toBe(false);
  });
});

// ─── decodeImageBytes (needs createImageBitmap mock) ─────────────
describe("decodeImageBytes", () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const PNG_HEADER = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  beforeEach(() => {
    // Default mock: accepts any blob, returns a small bitmap
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap);
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    setDeviceMaxTextureSize(MAX_CANVAS_DIM); // reset
  });

  it("rejects empty bytes", async () => {
    await expect(
      decodeImageBytes(new Uint8Array(0)),
    ).rejects.toThrow(UnsupportedImageError);
  });

  it("rejects non-image bytes", async () => {
    await expect(
      decodeImageBytes(new Uint8Array([0x00, 0x01, 0x02, 0x03])),
    ).rejects.toThrow(UnsupportedImageError);
  });

  it("returns ImageBitmap on success", async () => {
    const bitmap = await decodeImageBytes(PNG_HEADER);
    expect(bitmap).toBeDefined();
    expect(bitmap.width).toBe(100);
  });

  it("closes bitmap and throws ImageTooLargeError when dimensions exceed device limit", async () => {
    const closeFn = vi.fn();
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 20000,
      height: 100,
      close: closeFn,
    } as unknown as ImageBitmap);

    // Device limit is 16384 by default
    await expect(decodeImageBytes(PNG_HEADER)).rejects.toThrow(ImageTooLargeError);
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it("uses device-adaptive limit when setDeviceMaxTextureSize is lower", async () => {
    const closeFn = vi.fn();
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 9000,
      height: 100,
      close: closeFn,
    } as unknown as ImageBitmap);

    setDeviceMaxTextureSize(8192);

    await expect(decodeImageBytes(PNG_HEADER)).rejects.toThrow(ImageTooLargeError);
    expect(closeFn).toHaveBeenCalledTimes(1);
  });
});
