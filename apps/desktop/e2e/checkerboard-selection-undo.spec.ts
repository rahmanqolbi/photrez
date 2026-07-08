import { expect, test } from "@playwright/test";

/**
 * Visual regression: the checkerboard pattern must remain visually stable
 * across undo/redo of SELECTION TOOL operations.
 *
 * The user reported: "saat undo redo menyebabkan checkboardnya jadi melar"
 * (undo/redo of selection tool edits makes the checkerboard appear stretched).
 *
 * This test:
 * 1. Creates a canvas
 * 2. Switches to selection tool
 * 3. Draws a selection
 * 4. Moves the selection
 * 5. Performs undo/redo
 * 6. Verifies canvas size is consistent (no "stretching" effect)
 */

async function createBlankCanvas(page: import("@playwright/test").Page, width = 1080, height = 1080) {
  // Click "New Document" on the welcome screen → opens custom new-document dialog
  await page.getByRole("button", { name: "New Document" }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 5000 });
  // Fill Width and Height (the two number inputs in the right panel)
  const numInputs = page.locator('[role="dialog"] input[type="number"]');
  await numInputs.nth(0).fill(String(width));
  await numInputs.nth(1).fill(String(height));
  // Click Create
  await page.locator('[data-dialog-confirm]').click();
  await page.waitForTimeout(300);
}

function sampleCanvasSize(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const container = document.getElementById("canvas-container");
    if (!container) return null;
    const canvases = Array.from(container.querySelectorAll("canvas"));
    const webglCanvas = canvases.find((c) => c.getContext("webgl2"));
    if (!webglCanvas) return null;
    const gl = webglCanvas.getContext("webgl2");
    if (!gl) return null;
    return { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight };
  });
}

test.describe("canvas checkerboard — selection tool undo/redo", () => {
  test("canvas size remains stable across selection undo and redo", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, 400, 300);
    await page.waitForTimeout(500);

    // === Phase 1: Initial state ===
    const initial = await sampleCanvasSize(page);
    expect(initial).not.toBeNull();
    if (!initial) return;
    console.log("INITIAL: canvas =", initial.w, "x", initial.h);

    // === Phase 2: Switch to selection tool and draw a selection ===
    await page.getByRole("button", { name: "Rectangle Select" }).click();
    await page.waitForTimeout(200);

    const canvasBox = await page.locator("#canvas-container > canvas").first().boundingBox();
    if (!canvasBox) throw new Error("canvas not found");
    const startX = canvasBox.x + canvasBox.width / 2 - 50;
    const startY = canvasBox.y + canvasBox.height / 2 - 30;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 60);
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterDraw = await sampleCanvasSize(page);
    expect(afterDraw).not.toBeNull();
    if (!afterDraw) return;
    console.log("AFTER DRAW SELECTION: canvas =", afterDraw.w, "x", afterDraw.h);

    // === Phase 3: Move the selection ===
    // Click inside the selection and drag
    await page.mouse.move(startX + 30, startY + 20);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 50);
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterMove = await sampleCanvasSize(page);
    expect(afterMove).not.toBeNull();
    if (!afterMove) return;
    console.log("AFTER MOVE: canvas =", afterMove.w, "x", afterMove.h);

    // === Phase 4: Undo ===
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    const afterUndo = await sampleCanvasSize(page);
    expect(afterUndo).not.toBeNull();
    if (!afterUndo) return;
    console.log("AFTER UNDO: canvas =", afterUndo.w, "x", afterUndo.h);

    // === Phase 5: Redo ===
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);

    const afterRedo = await sampleCanvasSize(page);
    expect(afterRedo).not.toBeNull();
    if (!afterRedo) return;
    console.log("AFTER REDO: canvas =", afterRedo.w, "x", afterRedo.h);

    // === Assertions ===
    // Canvas size should be consistent across all phases
    expect(afterDraw.w, "canvas should be stable after selection draw").toBe(initial.w);
    expect(afterDraw.h).toBe(initial.h);
    expect(afterMove.w, "canvas should be stable after selection move").toBe(initial.w);
    expect(afterMove.h).toBe(initial.h);
    expect(afterUndo.w, "canvas should be stable after undo of selection edit").toBe(initial.w);
    expect(afterUndo.h).toBe(initial.h);
    expect(afterRedo.w, "canvas should be stable after redo of selection edit").toBe(initial.w);
    expect(afterRedo.h).toBe(initial.h);
  });

  test("blank canvas renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, 200, 200);
    await page.waitForTimeout(500);

    const container = page.locator("#canvas-container");
    await expect(container).toBeVisible();
    const canvasCount = await container.locator("canvas").count();
    expect(canvasCount).toBeGreaterThan(0);
  });
});
