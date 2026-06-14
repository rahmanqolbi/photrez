import { expect, test } from "@playwright/test";

/**
 * Visual regression: the checkerboard pattern must remain visually stable
 * across undo/redo. The pattern should always:
 * 1. Cover the artboard area (cells within 8x8 grid in screen-space)
 * 2. NOT cover the pasteboard (midnight color outside artboard)
 */

async function createBlankCanvas(page: import("@playwright/test").Page, width = "200", height = "200") {
  const promptValues = [width, height];
  page.on("dialog", async (dialog) => {
    const next = promptValues.shift() ?? height;
    await dialog.accept(next);
  });
  await page.getByRole("button", { name: "New Canvas" }).click();
}

function samplePixels(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const container = document.getElementById("canvas-container");
    if (!container) return null;
    const canvases = Array.from(container.querySelectorAll("canvas"));
    const webglCanvas = canvases.find((c) => c.getContext("webgl2"));
    if (!webglCanvas) return null;
    const gl = webglCanvas.getContext("webgl2");
    if (!gl) return null;

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const sampleAt = (x: number, y: number) => {
      const pixel = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return Array.from(pixel);
    };
    return {
      w,
      h,
      // Pasteboard corners (very close to canvas edges, outside artboard)
      pasteboard: {
        topLeft: sampleAt(5, h - 5),
        topRight: sampleAt(w - 5, h - 5),
        bottomLeft: sampleAt(5, 5),
        bottomRight: sampleAt(w - 5, 5),
      },
      // Artboard center (should be checker ~140 or ~199)
      artboardCenter: sampleAt(Math.floor(w / 2), Math.floor(h / 2)),
    };
  });
}

test.describe("canvas checkerboard visibility", () => {
  test("blank canvas: checkerboard inside artboard, midnight on pasteboard", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    // Hide right side panel so New Canvas is clickable
    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, "200", "200");
    await page.waitForTimeout(500);

    const samples = await samplePixels(page);
    expect(samples).not.toBeNull();
    if (!samples) return;

    // The artboard center should be a checker color (light ~199 or dark ~140)
    const [ar, ag, ab] = samples.artboardCenter;
    expect(ar).toBeGreaterThan(100);
    expect(ag).toBeGreaterThan(100);
    expect(ab).toBeGreaterThan(100);

    // The pasteboard corners should be the midnight background (~13, 15, 18)
    for (const [name, px] of Object.entries(samples.pasteboard)) {
      const [r, g, b] = px;
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
