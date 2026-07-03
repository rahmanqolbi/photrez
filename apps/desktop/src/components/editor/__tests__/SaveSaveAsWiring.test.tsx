import { describe, it, expect, vi } from "vitest";
import { showSaveDialogAllFormats } from "@/tauri/native";

// Mock Tauri plugin-dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
  open: vi.fn(),
}));

// Mock Tauri core invoke (needed by native.ts)
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("showSaveDialogAllFormats", () => {
  it("returns all supported format filters", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(save).mockResolvedValue("/path/file.png");
    const result = await showSaveDialogAllFormats("test.ptz");
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: "test.ptz",
        filters: expect.arrayContaining([
          expect.objectContaining({ name: "All Supported Formats" }),
          expect.objectContaining({ name: "Photrez Project (*.ptz)" }),
          expect.objectContaining({ name: "PNG Image (*.png)" }),
          expect.objectContaining({ name: "JPEG Image (*.jpg)" }),
          expect.objectContaining({ name: "WebP Image (*.webp)" }),
        ]),
      })
    );
    expect(result).toBe("/path/file.png");
  });

  it("returns null when dialog is cancelled", async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(save).mockResolvedValue(null);
    const result = await showSaveDialogAllFormats("test.ptz");
    expect(result).toBeNull();
  });
});
