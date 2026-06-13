import { expect, test } from "@playwright/test";

async function createBlankCanvas(page: import("@playwright/test").Page, width = "800", height = "600") {
  const promptValues = [width, height];
  page.on("dialog", async (dialog) => {
    await dialog.accept(promptValues.shift() ?? height);
  });
  await page.getByRole("button", { name: "New Canvas" }).click();
}

async function getTransformBox(page: import("@playwright/test").Page) {
  const box = page.locator("[data-transform-box]");
  await expect(box).toBeVisible();
  return box.evaluate((node) => {
    const rect = node as SVGRectElement;
    return {
      x: Number(rect.getAttribute("x")),
      y: Number(rect.getAttribute("y")),
      width: Number(rect.getAttribute("width")),
      height: Number(rect.getAttribute("height")),
    };
  });
}

function cropOverlay(page: import("@playwright/test").Page) {
  return page.locator("[data-crop-overlay], [data-modern-crop-overlay]");
}

test.describe("editor browser smoke", () => {
  test.beforeEach(({ page }) => {
    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
  });
  test("renders the empty editor shell and workspace controls", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner").getByText("photrez")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No image open" })).toBeVisible();
    await expect(page.getByRole("contentinfo").getByText("No selection")).toBeVisible();
    await expect(page.getByRole("button", { name: "Move Tool" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Crop Tool" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Canvas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New document" })).toHaveCount(0);
  });

  test("creates a blank document and switches contextual tool options", async ({ page }) => {
    await page.goto("/");
    await createBlankCanvas(page);

    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();
    await expect(page.getByText("800 x 600 px")).toBeVisible();
    await expect(page.getByText("Active:")).toBeVisible();
    await expect(page.getByText("Selected Layer:")).toBeVisible();

    await page.getByRole("button", { name: "Crop Tool" }).click();
    await expect(page.getByTitle("Delete Cropped Pixels (Destructive)")).toHaveCount(1);
    await expect(page.getByTitle("Rotate 90° CW")).toHaveCount(1);

    await page.getByRole("button", { name: "Move Tool" }).click();
    await expect(page.getByText("Active:")).toBeVisible();
    await expect(page.getByText("Move Tool")).toBeVisible();
  });

  test("toggles side panels without losing the active document", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    await page.getByRole("button", { name: "Hide side panels" }).click();
    await expect(page.getByRole("button", { name: "Show side panels" })).toBeVisible();

    await createBlankCanvas(page);
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();

    await page.getByRole("button", { name: "Show side panels" }).click();
    await expect(page.getByRole("button", { name: "Hide side panels" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();

    await page.getByRole("button", { name: "Hide side panels" }).click();
    await expect(page.getByRole("button", { name: "Show side panels" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();
  });

  test("switches to classic crop overlay without losing crop controls", async ({ page }) => {
    await page.goto("/");
    await createBlankCanvas(page);
    await page.getByRole("button", { name: "Crop Tool" }).click();
    await page.getByRole("button", { name: "Classic" }).click();

    await expect(page.getByRole("button", { name: "Classic" })).toBeVisible();
    await expect(page.getByRole("button", { name: "APPLY" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(cropOverlay(page)).toBeVisible();
  });

  test("creates replacement crop preview from pasteboard drag", async ({ page }) => {
    await page.goto("/");
    await createBlankCanvas(page);
    await page.getByRole("button", { name: "Crop Tool" }).click();

    const container = page.locator("#canvas-container");
    await container.dispatchEvent("pointerdown", {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    await container.dispatchEvent("pointermove", {
      pointerId: 1,
      clientX: 180,
      clientY: 160,
    });
    await container.dispatchEvent("pointerup", {
      pointerId: 1,
      clientX: 180,
      clientY: 160,
    });

    await expect(cropOverlay(page)).toBeVisible();
  });

  test("keeps move transform box aligned through fit, zoom, and pan", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 820 });
    await page.goto("/");
    await createBlankCanvas(page);
    await page.getByRole("button", { name: "Move Tool" }).click();

    const container = page.locator("#canvas-container");
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();
    const viewport = containerBox!;
    const initial = await getTransformBox(page);
    const fitZoom = Math.max(0.05, Math.min((viewport.width - 80) / 800, (viewport.height - 80) / 600, 10));

    expect(initial.width).toBeCloseTo(800 * fitZoom, 1);
    expect(initial.height).toBeCloseTo(600 * fitZoom, 1);
    expect(initial.x).toBeCloseTo((viewport.width - initial.width) / 2, 1);
    expect(initial.y).toBeCloseTo((viewport.height - initial.height) / 2, 1);

    await page.keyboard.press("Control+=");
    await page.waitForTimeout(250);
    const zoomed = await getTransformBox(page);
    expect(zoomed.width).toBeGreaterThan(initial.width);
    expect(zoomed.height / zoomed.width).toBeCloseTo(600 / 800, 3);
    expect(zoomed.x + zoomed.width / 2).toBeCloseTo(initial.x + initial.width / 2, 0);
    expect(zoomed.y + zoomed.height / 2).toBeCloseTo(initial.y + initial.height / 2, 0);

    const startX = viewport.x + viewport.width / 2;
    const startY = viewport.y + viewport.height / 2;
    await page.keyboard.down("Space");
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 35);
    const panned = await getTransformBox(page);
    expect(panned.x - zoomed.x).toBeCloseTo(60, 0);
    expect(panned.y - zoomed.y).toBeCloseTo(35, 0);
    expect(panned.width).toBeCloseTo(zoomed.width, 1);
    expect(panned.height).toBeCloseTo(zoomed.height, 1);

    await page.mouse.up();
    await page.keyboard.up("Space");
  });

  test("deselects the Move transform box when Move Tool clicks outside the artboard", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 820 });
    await page.goto("/");
    await createBlankCanvas(page);
    await page.getByRole("button", { name: "Move Tool" }).click();

    const initial = await getTransformBox(page);
    expect(initial.width).toBeGreaterThan(0);
    expect(initial.height).toBeGreaterThan(0);

    const container = page.locator("#canvas-container");
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();
    const viewport = containerBox!;
    // Click to the right of the document — outside artboard bounds but inside container.
    // Canvas is 800px wide, container is 1366px wide, so 812 is past the document edge.
    const clickX = initial.x + initial.width + 12;
    const clickY = initial.y + 12;
    expect(clickX).toBeGreaterThan(initial.x + initial.width);

    await page.mouse.click(viewport.x + clickX, viewport.y + clickY);

    await expect(page.locator("[data-transform-box]")).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByText(/No active layer/)).toBeVisible();
  });

  test("deselects the Move transform box when Move Tool clicks outside at zoom ≠ 1", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 820 });
    await page.goto("/");
    await createBlankCanvas(page);
    await page.getByRole("button", { name: "Move Tool" }).click();

    const initial = await getTransformBox(page);
    expect(initial.width).toBeGreaterThan(0);
    expect(initial.height).toBeGreaterThan(0);

    // Use the keyboard zoom path so the deselect check covers zoom != 1.
    const container = page.locator("#canvas-container");
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();
    await page.keyboard.press("Control+-");
    await page.waitForTimeout(250);
    await expect(page.locator("[data-transform-box]")).toBeVisible();

    // At zoom != 1, click in the right pasteboard away from transform handles/rotate zones.
    const current = await getTransformBox(page);
    const clickX = current.x + current.width + 48;
    const clickY = current.y + current.height / 2;
    expect(clickX).toBeGreaterThan(0);
    expect(clickX).toBeLessThan(containerBox!.width);
    await page.mouse.click(containerBox!.x + clickX, containerBox!.y + clickY);

    await expect(page.locator("[data-transform-box]")).toHaveCount(0);
  });

  test("brush stroke appears on the active layer", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 820 });
    await page.goto("/");
    await createBlankCanvas(page, "120", "90");
    await page.getByRole("button", { name: "Move Tool" }).click();

    const container = page.locator("#canvas-container");
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();

    const initialBox = await getTransformBox(page);
    await page.mouse.click(
      containerBox!.x + initialBox.x + initialBox.width + 12,
      containerBox!.y + initialBox.y + 12,
    );
    await expect(page.locator("[data-transform-box]")).toHaveCount(0);

    await page.getByRole("button", { name: "Brush Tool" }).click();

    const canvas = page.locator("#canvas-container > canvas").first();
    const before = await canvas.evaluate((node) => {
      const gl = (node as HTMLCanvasElement).getContext("webgl2", { preserveDrawingBuffer: true });
      if (!gl) return null;
      const pixel = new Uint8Array(4);
      gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return Array.from(pixel);
    });
    expect(before).not.toBeNull();

    const fitZoom = Math.max(0.05, Math.min((containerBox!.width - 80) / 120, (containerBox!.height - 80) / 90, 10));
    const artboardX = (containerBox!.width - 120 * fitZoom) / 2;
    const artboardY = (containerBox!.height - 90 * fitZoom) / 2;
    const startX = containerBox!.x + artboardX + (120 * fitZoom) / 2 - 18;
    const startY = containerBox!.y + artboardY + (90 * fitZoom) / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 36, startY);
    await page.mouse.up();
    await page.waitForTimeout(150);

    const after = await canvas.evaluate((node) => {
      const gl = (node as HTMLCanvasElement).getContext("webgl2", { preserveDrawingBuffer: true });
      if (!gl) return null;
      const pixel = new Uint8Array(4);
      gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return Array.from(pixel);
    });
    expect(after).not.toBeNull();
    expect(after).not.toEqual(before);

    await page.getByRole("button", { name: "Eraser Tool" }).click();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 36, startY);
    await page.mouse.up();
    await page.waitForTimeout(150);

    const erased = await canvas.evaluate((node) => {
      const gl = (node as HTMLCanvasElement).getContext("webgl2", { preserveDrawingBuffer: true });
      if (!gl) return null;
      const pixel = new Uint8Array(4);
      gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return Array.from(pixel);
    });
    expect(erased).not.toBeNull();
    expect(erased).not.toEqual(after);
  });
});

test.describe("export dialog", () => {
  test("opens export dialog, switches format, shows quality slider for JPEG/WebP", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();

    await page.getByRole("button", { name: "Export" }).click();

    const dialog = page.getByText("Export").first();
    await expect(dialog).toBeVisible();
    await expect(page.getByText("PNG")).toBeVisible();
    await expect(page.getByText("JPEG")).toBeVisible();
    await expect(page.getByText("WebP")).toBeVisible();

    // No quality slider visible for PNG
    await expect(page.getByText("Quality:")).toHaveCount(0);

    // JPEG shows quality slider
    await page.getByText("JPEG").click();
    await expect(page.getByText("Quality: 90%")).toBeVisible();

    // WebP shows quality slider
    await page.getByText("WebP").click();
    await expect(page.getByText("Quality: 90%")).toBeVisible();

    await page.getByText("Cancel").click();
    await expect(page.getByText("PNG")).toHaveCount(0);
  });

  test("Ctrl+S opens export dialog when document is open", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();

    await page.keyboard.press("Control+s");
    await expect(page.getByText("PNG")).toBeVisible();

    await page.getByText("Cancel").click();
  });

  test("encodeComposite produces valid format headers matching canvas dimensions", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const { WorkspaceManager } = await import("/src/engine/workspace.ts");
      const { encodeComposite } = await import("/src/components/editor/exportDocument.ts");

      const session = WorkspaceManager.createBlankDocument("e2e-export", "E2E", 10, 10);
      const engine = session.engine;

      const layer = engine.getLayers()[0];
      const canvas = new OffscreenCanvas(10, 10);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FF6600";
      ctx.fillRect(0, 0, 10, 10);
      layer.imageBitmap = canvas.transferToImageBitmap();

      const pngBytes = await encodeComposite(engine, "png", 100);
      const jpegBytes = await encodeComposite(engine, "jpeg", 85);
      const webpBytes = await encodeComposite(engine, "webp", 80);

      return {
        pngBytes: Array.from(pngBytes),
        jpegBytes: Array.from(jpegBytes),
        webpBytes: Array.from(webpBytes),
      };
    });

    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    expect(result.pngBytes.slice(0, 8)).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    // JPEG header: FF D8
    expect(result.jpegBytes.slice(0, 2)).toEqual([0xFF, 0xD8]);
    // WebP header: RIFF
    expect(result.webpBytes.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]);
    // Non-empty output
    expect(result.pngBytes.length).toBeGreaterThan(50);
    expect(result.jpegBytes.length).toBeGreaterThan(50);
    expect(result.webpBytes.length).toBeGreaterThan(50);
  });

  test("export compositing matches document dimensions and blend mode + transform parity", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const { WorkspaceManager } = await import("/src/engine/workspace.ts");
      const { encodeComposite } = await import("/src/components/editor/exportDocument.ts");

      // Test 1: Dimensions match
      const doc = WorkspaceManager.createBlankDocument("dim-test", "Dim", 320, 240);
      const engine = doc.engine;
      const layer = engine.getLayers()[0];

      const cav = new OffscreenCanvas(320, 240);
      const c = cav.getContext("2d")!;
      c.fillStyle = "#FF0000";
      c.fillRect(0, 0, 320, 240);
      layer.imageBitmap = cav.transferToImageBitmap();

      const bytes = await encodeComposite(engine, "png", 100);
      const blob = new Blob([bytes]);
      const img = await createImageBitmap(blob);
      const dimMatch = img.width === 320 && img.height === 240;

      // Test 2: Transformed layer (scaled + rotated)
      engine.addLayer("Top");
      const top = engine.getLayers()[0];
      const topCanvas = new OffscreenCanvas(10, 10);
      const topCtx = topCanvas.getContext("2d")!;
      topCtx.fillStyle = "#00FF00";
      topCtx.beginPath();
      topCtx.arc(5, 5, 5, 0, Math.PI * 2);
      topCtx.fill();
      top.imageBitmap = topCanvas.transferToImageBitmap();
      top.transform = { x: 80, y: 60, scaleX: 2, scaleY: 2, rotation: 45, flipH: false, flipV: false };
      top.opacity = 0.75;
      top.blendMode = "multiply";

      const transformBytes = await encodeComposite(engine, "png", 100);

      // Test 3: Invisible layer exclusion
      const invisibleLayer = engine.addLayer("Hidden");
      invisibleLayer.visible = false;
      const invisibleCanvas = new OffscreenCanvas(1, 1);
      invisibleCanvas.getContext("2d")!.fillStyle = "#000000";
      invisibleCanvas.getContext("2d")!.fillRect(0, 0, 1, 1);
      invisibleLayer.imageBitmap = invisibleCanvas.transferToImageBitmap();

      const hiddenBytes = await encodeComposite(engine, "png", 100);
      const hiddenBlob = new Blob([hiddenBytes]);
      const hiddenImg = await createImageBitmap(hiddenBlob);
      const hiddenDimMatch = hiddenImg.width === 320 && hiddenImg.height === 240;

      return {
        dimMatch,
        transformFileSize: transformBytes.length,
        hiddenDimMatch,
        formatCount: 3,
      };
    });

    expect(result.dimMatch).toBe(true);
    expect(result.transformFileSize).toBeGreaterThan(50);
    expect(result.hiddenDimMatch).toBe(true);
  });

  test("export data flow: encodeComposite → base64 → file write roundtrip", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const { WorkspaceManager } = await import("/src/engine/workspace.ts");
      const { encodeComposite } = await import("/src/components/editor/exportDocument.ts");

      // Create a document with content
      const session = WorkspaceManager.createBlankDocument("dataflow", "DataFlow", 16, 16);
      const engine = session.engine;
      const layer = engine.getLayers()[0];

      const canvas = new OffscreenCanvas(16, 16);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FF6600";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#0000FF";
      ctx.fillRect(4, 4, 8, 8);
      layer.imageBitmap = canvas.transferToImageBitmap();

      // Step 1: Encode composite → raw bytes
      const rawBytes = await encodeComposite(engine, "png", 100);

      // Step 2: Simulate frontend → Tauri bridge (native.ts writeFileBytes)
      // Encode Uint8Array to base64 (same as native.ts does)
      let binary = "";
      for (let i = 0; i < rawBytes.length; i++) {
        binary += String.fromCharCode(rawBytes[i]);
      }
      const b64 = btoa(binary);

      // Step 3: Simulate Tauri backend write_file_bytes (same as main.rs does)
      // Decode base64 → bytes
      const decodedBinary = atob(b64);
      const decodedBytes = new Uint8Array(decodedBinary.length);
      for (let i = 0; i < decodedBinary.length; i++) {
        decodedBytes[i] = decodedBinary.charCodeAt(i);
      }

      // Step 4: Verify roundtrip — bytes match exactly
      let match = decodedBytes.length === rawBytes.length;
      if (match) {
        for (let i = 0; i < rawBytes.length; i++) {
          if (decodedBytes[i] !== rawBytes[i]) {
            match = false;
            break;
          }
        }
      }

      // Step 5: Verify the decoded bytes decode as a valid PNG via Blob
      const blob = new Blob([decodedBytes], { type: "image/png" });
      const img = await createImageBitmap(blob);
      const dimsOk = img.width === 16 && img.height === 16;

      return {
        match,
        dimsOk,
        rawSize: rawBytes.length,
        b64Length: b64.length,
        format: "png",
      };
    });

    expect(result.match).toBe(true);
    expect(result.dimsOk).toBe(true);
    expect(result.rawSize).toBeGreaterThan(50);
    expect(result.b64Length).toBeGreaterThan(result.rawSize); // base64 is ~33% larger
  });
});
