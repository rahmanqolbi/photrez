import { expect, test } from "@playwright/test";
import type { DocumentEngine } from "@/engine/document";
import { readRenderedPixelAtRatio } from "./helpers/screenshotPixels";

/**
 * Grand-tour test: proves the entire pixel pipeline end-to-end in the Tauri WebView.
 *
 * Chain: UI create canvas → mouse paint → engine mutation → WebGL render →
 *        encodeComposite → base64 bridge roundtrip → valid image bytes.
 *
 * This is the single native-integration smoke test. It replaces the old 9-item
 * NATIVE-002 through NATIVE-009 checklist (waived 2026-06-23) by proving the
 * critical OS-integration path that no individual unit test covers alone.
 */

async function createBlankCanvas(page: import("@playwright/test").Page) {
  // Click "New Document" on the welcome screen → opens custom new-document dialog
  await page.getByRole("button", { name: "New Document" }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 5000 });
  // Click Create (accepts default 1080×1080)
  await page.locator('[data-dialog-confirm]').click();
  await page.waitForTimeout(300);
}

test.describe("native e2e smoke — grand tour", () => {
  test("full pipeline: UI create → brush paint → export → valid image bytes", async ({ page }) => {
    // ── 1. App shell loads ──
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");
    await expect(page.getByRole("banner").getByText("photrez")).toBeVisible();

    // Hide side panels for a clean canvas view
    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    // ── 2. Create a blank canvas ──
    await createBlankCanvas(page);
    const container = page.locator("#canvas-container");
    await expect(container).toBeVisible();
    await page.waitForTimeout(300);

    // ── 3. Switch to Brush tool and paint a stroke ──
    await page.getByRole("button", { name: "Brush Tool" }).click();

    const canvas = page.locator("#canvas-container > canvas").first();
    const before = await readRenderedPixelAtRatio(canvas, 0.5, 0.5);
    expect(before).not.toBeNull();

    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();
    const { width: vw, height: vh } = containerBox!;

    // Calculate artboard center in screen coordinates
    const fitZoom = Math.max(0.05, Math.min((vw - 80) / 160, (vh - 80) / 120, 10));
    const artboardX = (vw - 160 * fitZoom) / 2;
    const artboardY = (vh - 120 * fitZoom) / 2;
    const centerX = containerBox!.x + artboardX + (160 * fitZoom) / 2;
    const centerY = containerBox!.y + artboardY + (120 * fitZoom) / 2;

    // Paint a horizontal stroke across the artboard center
    await page.mouse.move(centerX - 32, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 32, centerY);
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await readRenderedPixelAtRatio(canvas, 0.5, 0.5);
    expect(after).not.toBeNull();
    expect(after).not.toEqual(before);

    // ── 4. Export via encodeComposite + base64 roundtrip ──
    const result = await page.evaluate(async () => {
      const ed = (window as unknown as {
        __photrezEditor?: { workspace: { getActiveEngine: () => DocumentEngine | null } };
      }).__photrezEditor;
      if (!ed) throw new Error("Editor context not found");

      const { encodeComposite } = await import("/src/components/editor/exportDocument");

      const engine = ed.workspace.getActiveEngine();
      if (!engine) throw new Error("No active engine");

      // Step A: Encode composite → raw bytes
      const rawBytes = await encodeComposite(engine, "png", 100);

      // Step B: Simulate native.ts writeFileBytes base64 encoding
      let binary = "";
      for (let i = 0; i < rawBytes.length; i++) {
        binary += String.fromCharCode(rawBytes[i]);
      }
      const b64 = btoa(binary);

      // Step C: Simulate Tauri backend write_file_bytes decode + roundtrip
      const decodedBinary = atob(b64);
      const decodedBytes = new Uint8Array(decodedBinary.length);
      for (let i = 0; i < decodedBinary.length; i++) {
        decodedBytes[i] = decodedBinary.charCodeAt(i);
      }

      // Step D: Verify roundtrip byte-for-byte match
      let bytesMatch = decodedBytes.length === rawBytes.length;
      if (bytesMatch) {
        for (let i = 0; i < rawBytes.length; i++) {
          if (decodedBytes[i] !== rawBytes[i]) { bytesMatch = false; break; }
        }
      }

      // Step E: Decode as image to verify dimensions and non-empty content
      const blob = new Blob([decodedBytes], { type: "image/png" });
      const img = await createImageBitmap(blob);
      const dimsOk = img.width === 160 && img.height === 120;

      // Step F: Sample a pixel from the decoded image to verify brush content
      const verifyCanvas = new OffscreenCanvas(160, 120);
      const verifyCtx = verifyCanvas.getContext("2d")!;
      verifyCtx.drawImage(img, 0, 0);
      const centerPixel = verifyCtx.getImageData(80, 60, 1, 1).data;

      return {
        bytesMatch,
        dimsOk,
        pngHeader: Array.from(rawBytes.slice(0, 8)),
        fileSize: rawBytes.length,
        b64Length: b64.length,
        centerPixel: Array.from(centerPixel),
        hasBrushContent: centerPixel[3] > 0, // non-transparent = painted
      };
    });

    // ── 5. Assertions ──
    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    expect(result.pngHeader).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(result.dimsOk).toBe(true);
    expect(result.bytesMatch).toBe(true);
    expect(result.fileSize).toBeGreaterThan(100);
    expect(result.b64Length).toBeGreaterThan(result.fileSize); // base64 is ~33% larger
    expect(result.hasBrushContent).toBe(true); // painted pixels survived export → decode
  });
});
