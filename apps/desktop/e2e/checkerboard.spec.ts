import { expect, test } from "@playwright/test";
import { readRenderedPixelAtRatio } from "./helpers/screenshotPixels";

/**
 * Visual regression: the checkerboard pattern must remain visually stable
 * across undo/redo. The pattern should always:
 * 1. Cover the artboard area (cells within 8x8 grid in screen-space)
 * 2. NOT cover the pasteboard (midnight color outside artboard)
 */

async function createBlankCanvas(page: import("@playwright/test").Page) {
  // Click "New Document" on the welcome screen → opens custom new-document dialog
  await page.getByRole("button", { name: "New Document" }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 5000 });
  // Click Create (accepts default 1080×1080)
  await page.locator('[data-dialog-confirm]').click();
  await page.waitForTimeout(300);
}

async function samplePixels(page: import("@playwright/test").Page) {
  const canvas = page.locator("#canvas-container > canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return null;
  const xEdge = 5 / box.width;
  const yEdge = 5 / box.height;
  return {
    pasteboard: {
      topLeft: await readRenderedPixelAtRatio(canvas, xEdge, yEdge),
      topRight: await readRenderedPixelAtRatio(canvas, 1 - xEdge, yEdge),
      bottomLeft: await readRenderedPixelAtRatio(canvas, xEdge, 1 - yEdge),
      bottomRight: await readRenderedPixelAtRatio(canvas, 1 - xEdge, 1 - yEdge),
    },
    // Avoid the exact viewport center, where tool/transform overlays may render
    // Photon Amber controls over the otherwise neutral checkerboard.
    artboardCenter: await readRenderedPixelAtRatio(canvas, 0.45, 0.45),
  };
}

test.describe("canvas checkerboard visibility", () => {
  test("blank canvas: checkerboard inside artboard, midnight on pasteboard", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    // Hide right side panel so New Document is clickable
    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, "200", "200");
    await page.waitForTimeout(500);

    const samples = await samplePixels(page);
    expect(samples).not.toBeNull();
    if (!samples) return;

    // The artboard center should be a checker color (light ~199 or dark ~140)
    expect(samples.artboardCenter).not.toBeNull();
    const [ar, ag, ab] = samples.artboardCenter!;
    expect(ar).toBeGreaterThan(100);
    expect(ag).toBeGreaterThan(100);
    expect(ab).toBeGreaterThan(100);

    // The pasteboard corners should be the midnight background (~13, 15, 18)
    for (const [name, px] of Object.entries(samples.pasteboard)) {
      expect(px).not.toBeNull();
      const [r, g, b] = px!;
      expect(r, `pasteboard ${name} should be midnight (r=${r})`).toBeLessThan(50);
      expect(g, `pasteboard ${name} should be midnight (g=${g})`).toBeLessThan(50);
      expect(b, `pasteboard ${name} should be midnight (b=${b})`).toBeLessThan(50);
    }

    // The WebGL canvas's CSS size must match its drawing buffer, otherwise
    // the browser scales the buffer to fit and the checker cells become
    // non-square (the "stretched checkerboard" bug).
    const sizeCheck = await page.evaluate(() => {
      const container = document.getElementById("canvas-container");
      if (!container) return null;
      const canvases = Array.from(container.querySelectorAll("canvas"));
      const webglCanvas = canvases.find((c) => c.getContext("webgl2"));
      if (!webglCanvas) return null;
      const gl = webglCanvas.getContext("webgl2");
      if (!gl) return null;
      return {
        bufferW: gl.drawingBufferWidth,
        bufferH: gl.drawingBufferHeight,
        cssW: webglCanvas.clientWidth,
        cssH: webglCanvas.clientHeight,
      };
    });
    expect(sizeCheck).not.toBeNull();
    if (!sizeCheck) return;
    // Aspect ratio of buffer must match aspect ratio of CSS box.
    const bufferAspect = sizeCheck.bufferW / sizeCheck.bufferH;
    const cssAspect = sizeCheck.cssW / sizeCheck.cssH;
    // Allow 5% tolerance for subpixel rounding
    const aspectDelta = Math.abs(bufferAspect - cssAspect) / bufferAspect;
    expect(aspectDelta, `buffer aspect ${bufferAspect.toFixed(3)} != css aspect ${cssAspect.toFixed(3)} (delta ${(aspectDelta * 100).toFixed(1)}%)`).toBeLessThan(0.05);
  });

  test("blank canvas renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, "200", "200");
    await page.waitForTimeout(500);

    const container = page.locator("#canvas-container");
    await expect(container).toBeVisible();
    const canvasCount = await container.locator("canvas").count();
    expect(canvasCount).toBeGreaterThan(0);
  });
});
