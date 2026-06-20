import { expect, test } from "@playwright/test";
import { readRenderedPixel } from "./helpers/screenshotPixels";

/**
 * Visual regression for the two bugs the user reported on 2026-06-14:
 *
 * 1. "kalau hapus sebagian layer dengan selection tool maka bisa di redo, nah ini
 *    nggak bisa" — selection-tool edits (cut/paste/delete) could not be redone
 *    because the keyboard handler and toolbar mutated engine state WITHOUT first
 *    committing a snapshot to history. Without a pre-action commit, undo would
 *    rewind to whatever the prior commit was, and redo had nothing to replay.
 *
 * 2. "di canvas secara tampilan belum diupdate ketika layer telah diedit, user
 *    harus ganti tool dulu baru keupdate" — the canvas displayed the pre-edit
 *    pixels after a selection-tool delete. Root cause: the call sites updated
 *    engine.layer.imageBitmap but never called renderer.uploadImage(), so the
 *    GPU texture still held the pre-edit bitmap until something else triggered
 *    a re-upload (e.g. switching tools).
 *
 * This test exercises the full delete → undo → redo cycle visually:
 *  - paints a stroke with the brush tool
 *  - selects a region over the stroke with the selection tool
 *  - samples pixel color BEFORE delete
 *  - deletes the selection
 *  - samples pixel color AFTER delete (must differ from before)
 *  - undo → pixel color MUST match the pre-delete color
 *  - redo → pixel color MUST match the post-delete color
 */

async function createBlankCanvas(page: import("@playwright/test").Page, width = "400", height = "300") {
  const promptValues = [width, height];
  page.on("dialog", async (dialog) => {
    const next = promptValues.shift() ?? height;
    await dialog.accept(next);
  });
  await page.getByRole("button", { name: "New Canvas" }).click();
  await page.waitForTimeout(300);
}

function readPixelAt(page: import("@playwright/test").Page, screenX: number, screenY: number) {
  return readRenderedPixel(page.locator("#canvas-container > canvas").first(), screenX, screenY);
}

test.describe("selection tool — delete + undo + redo (regression: 2026-06-14)", () => {
  test("selection delete is undoable AND redoable, canvas updates each step", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    const hideBtn = page.getByRole("button", { name: "Hide side panels" });
    if (await hideBtn.isVisible()) await hideBtn.click();

    await createBlankCanvas(page, "400", "300");

    const container = page.locator("#canvas-container");
    const containerBox = await container.boundingBox();
    if (!containerBox) throw new Error("canvas container not found");

    // === Step 1: Paint a horizontal stroke with the brush tool ===
    await page.getByRole("button", { name: "Brush Tool" }).click();
    await page.waitForTimeout(150);

    // Compute stroke coords (artboard is fit to container)
    const fitZoom = Math.max(
      0.05,
      Math.min(
        (containerBox.width - 80) / 400,
        (containerBox.height - 80) / 300,
        10,
      ),
    );
    const artboardX = (containerBox.width - 400 * fitZoom) / 2;
    const artboardY = (containerBox.height - 300 * fitZoom) / 2;
    const strokeStartX = containerBox.x + artboardX + (400 * fitZoom) / 2 - 40;
    const strokeY = containerBox.y + artboardY + (300 * fitZoom) / 2;

    await page.mouse.move(strokeStartX, strokeY);
    await page.mouse.down();
    await page.mouse.move(strokeStartX + 80, strokeY);
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Sample pixel along the stroke (colored) and just outside (different)
    const strokePixel = await readPixelAt(page, strokeStartX + 40, strokeY);
    expect(strokePixel).not.toBeNull();
    // The stroke should have a non-transparent, non-checker pixel
    const strokeAlpha = strokePixel![3];
    expect(strokeAlpha, "brush stroke should produce visible pixels").toBeGreaterThan(100);

    // === Step 2: Switch to selection tool and draw a selection over the stroke ===
    await page.getByRole("button", { name: "Rectangle Select" }).click();
    await page.waitForTimeout(150);

    const selStartX = strokeStartX - 10;
    const selStartY = strokeY - 20;
    const selEndX = strokeStartX + 90;
    const selEndY = strokeY + 20;
    await page.mouse.move(selStartX, selStartY);
    await page.mouse.down();
    await page.mouse.move(selEndX, selEndY);
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Sample pixel inside the selection (should still be the stroke color)
    const insideSampleX = strokeStartX + 40;
    const insideSampleY = strokeY;
    const beforeDelete = await readPixelAt(page, insideSampleX, insideSampleY);
    expect(beforeDelete).not.toBeNull();

    // === Step 3: Press Delete — pixel inside selection should change ===
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    const afterDelete = await readPixelAt(page, insideSampleX, insideSampleY);
    expect(afterDelete).not.toBeNull();
    // Pixel MUST differ from before delete — the user reported the canvas was
    // "stale" (still showed pre-delete pixels) until they switched tools.
    // This is the bug-2 assertion: canvas MUST reflect the deletion.
    expect(afterDelete, "canvas must reflect the deletion (regression: stale canvas)").not.toEqual(
      beforeDelete,
    );

    // === Step 4: Undo — pixel inside selection should match pre-delete color ===
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    const afterUndo = await readPixelAt(page, insideSampleX, insideSampleY);
    expect(afterUndo).not.toBeNull();
    // The pixel must match the pre-delete color (undo restored the original).
    // This is the bug-1 assertion: undo MUST restore the deleted pixels.
    expect(afterUndo, "undo must restore the deleted pixels (regression: undo broken)").toEqual(
      beforeDelete,
    );

    // === Step 5: Redo — pixel inside selection should match post-delete color ===
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(200);

    const afterRedo = await readPixelAt(page, insideSampleX, insideSampleY);
    expect(afterRedo).not.toBeNull();
    // The pixel must match the post-delete color (redo re-applied the deletion).
    // This is the bug-1 assertion: redo MUST re-delete the pixels.
    expect(afterRedo, "redo must re-apply the deletion (regression: redo broken)").toEqual(
      afterDelete,
    );
  });
});
