// apps/desktop/e2e/cross-doc-drag-drop.spec.ts
//
// E2E tests for cross-document drag and drop.
//
// Note: Full OS-level file drop requires Tauri runtime (`bun run tauri dev`).
// Pure browser tests use simulated HTML5 drag events for layer drags
// (which work in the webview).
//
// Tests:
//  1. Layer drag from one doc to another (HTML5 drag in webview)
//  2. Hover tab 500ms → auto-switch
//  3. Drop on invalid zone (tool rail) → no-op

import { expect, test, Page } from "@playwright/test";

async function createBlankCanvas(page: Page) {
  // Check if the welcome screen's "New Document" button is visible
  const welcomeBtn = page.getByRole("button", { name: "New Document" });
  if (await welcomeBtn.isVisible().catch(() => false)) {
    // First document: click welcome screen button → opens dialog → click Create
    await welcomeBtn.click();
  } else {
    // Subsequent document: click tabs bar "New document" button → opens dialog
    await page.getByRole("button", { name: "New document" }).click();
  }
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('[data-dialog-confirm]').click();
  await page.waitForTimeout(300);
}

async function getLayerCount(page: Page): Promise<number> {
  return page.locator("[data-layer-idx]").count();
}

async function simulateLayerDrag(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
  options: { altKey?: boolean } = {}
) {
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();
  await source.hover();
  await page.mouse.down();
  await target.hover();
  // Dispatch HTML5 dragstart and drop events
  await page.evaluate(
    ({ sourceSel, targetSel, altKey }) => {
      const sourceEl = document.querySelector(sourceSel) as HTMLElement;
      const targetEl = document.querySelector(targetSel) as HTMLElement;
      if (!sourceEl || !targetEl) {
        throw new Error(`Source or target not found: ${sourceSel} / ${targetSel}`);
      }
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const dataTransfer = new DataTransfer();

      const dragStart = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        clientX: sourceRect.left + sourceRect.width / 2,
        clientY: sourceRect.top + sourceRect.height / 2,
        altKey,
        dataTransfer,
      });
      sourceEl.dispatchEvent(dragStart);

      const dragOver = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        clientX: targetRect.left + targetRect.width / 2,
        clientY: targetRect.top + targetRect.height / 2,
        altKey,
        dataTransfer,
      });
      targetEl.dispatchEvent(dragOver);

      const drop = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: targetRect.left + targetRect.width / 2,
        clientY: targetRect.top + targetRect.height / 2,
        altKey,
        dataTransfer,
      });
      targetEl.dispatchEvent(drop);

      const dragEnd = new DragEvent("dragend", { bubbles: true, dataTransfer });
      sourceEl.dispatchEvent(dragEnd);
    },
    {
      sourceSel: sourceSelector,
      targetSel: targetSelector,
      altKey: options.altKey ?? false,
    }
  );
  await page.mouse.up();
}

test.describe("Cross-doc drag and drop (browser)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("BROWSER ERROR:", msg.text());
    });
    await page.goto("/");
  });

  test("hover tab 500ms during layer drag switches to that doc", async ({ page }) => {
    await createBlankCanvas(page, 800, 600);
    await createBlankCanvas(page, 1000, 800);
    // Should have 2 tabs, second is active
    const tabs = page.locator("[data-document-tab]");
    await expect(tabs).toHaveCount(2);

    const layerItem = page.locator("[data-layer-idx]").first();
    const firstTab = tabs.first();
    await page.evaluate(() => {
      const sourceEl = document.querySelector("[data-layer-idx]") as HTMLElement;
      const targetEl = document.querySelector("[data-document-tab]") as HTMLElement;
      if (!sourceEl || !targetEl) throw new Error("Layer item or target tab not found");
      const dataTransfer = new DataTransfer();
      sourceEl.dispatchEvent(new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      targetEl.dispatchEvent(new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    });
    await page.waitForTimeout(600);

    // First tab should now be active (bottom border accent visible)
    const firstTabClass = await firstTab.getAttribute("class");
    expect(firstTabClass).toContain("bg-editor-bg");
    await layerItem.dispatchEvent("dragend");
  });

  test("drop on tool rail is no-op for layer drag", async ({ page }) => {
    await createBlankCanvas(page);
    await createBlankCanvas(page);

    const beforeLayerCount = await getLayerCount(page);
    const beforeTabCount = await page.locator("[data-document-tab]").count();

    await simulateLayerDrag(page, "[data-layer-idx]", "aside");

    await expect(page.locator("[data-document-tab]")).toHaveCount(beforeTabCount);
    expect(await getLayerCount(page)).toBe(beforeLayerCount);
  });
});
