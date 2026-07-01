import { expect, test } from "@playwright/test";

async function createBlankCanvas(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const editor = (window as unknown as {
      __photrezEditor?: {
        workspace: { addDocument: (doc: unknown) => void };
        scheduler: { requestRender: () => void };
      };
    }).__photrezEditor;
    if (!editor) throw new Error("Editor context handle not found on window");
    const { WorkspaceManager } = await import("/src/engine/workspace");
    const id = `doc-${crypto.randomUUID()}`;
    const name = "Untitled Canvas";
    const session = WorkspaceManager.createBlankDocument(id, name, 320, 240);
    editor.workspace.addDocument(session);
    editor.scheduler.requestRender();
  });
}

test.describe("Precision Workbench dialogs", () => {
  test("About dialog matches the desktop contract and restores menu focus", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Help" }).click();
    await page.getByRole("menuitem", { name: "About Photrez" }).click();

    const dialog = page.getByRole("dialog", { name: "About Photrez" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-dialog-kind", "alert");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();

    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const titlebar = element.querySelector<HTMLElement>("[data-dialog-titlebar]")!;
      const style = getComputedStyle(element);
      return {
        width: rect.width,
        titlebarHeight: titlebar.getBoundingClientRect().height,
        radius: style.borderRadius,
        shadow: style.boxShadow,
      };
    });
    expect(geometry.width).toBeGreaterThanOrEqual(320);
    expect(geometry.width).toBeLessThanOrEqual(420);
    expect(geometry.titlebarHeight).toBe(36);
    expect(geometry.radius).toBe("8px");
    expect(geometry.shadow).not.toBe("none");
    await dialog.screenshot({ path: testInfo.outputPath("about-dialog.png") });

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Help" })).toBeFocused();
  });

  test("delete layer removes immediately without confirmation dialog", async ({ page }) => {
    await page.goto("/");
    await createBlankCanvas(page);
    // 1 layer from blank canvas
    await expect(page.locator("[data-layer-idx]")).toHaveCount(1);

    // Add a second layer so Delete is not disabled
    await page.getByRole("button", { name: "New Layer" }).click();
    await expect(page.locator("[data-layer-idx]")).toHaveCount(2);

    // Delete second layer — immediate, no confirmation dialog
    await page.getByRole("button", { name: "Delete Layer" }).click();
    await expect(page.locator("[data-layer-idx]")).toHaveCount(1);
  });

  test("Resize and Export share the compact frame and complete keyboard workflows", async ({ page }, testInfo) => {
    await page.goto("/");
    await createBlankCanvas(page);

    await page.getByRole("button", { name: "Image" }).click();
    await page.getByRole("menuitem", { name: "Resize Canvas" }).click();
    const resize = page.getByRole("dialog", { name: "Resize Canvas" });
    const width = resize.getByLabel("Width");
    await expect(width).toBeFocused();
    await expect(width).toHaveValue("320");
    await page.keyboard.press("Shift+Tab");
    await expect(resize.getByRole("button", { name: "Resize", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(width).toBeFocused();
    await width.fill("640");
    await expect(resize.getByLabel("Height")).toHaveValue("480");
    await resize.screenshot({ path: testInfo.outputPath("resize-canvas-dialog.png") });
    await resize.getByRole("button", { name: "Resize", exact: true }).click();
    await expect(resize).toHaveCount(0);

    await page.getByRole("button", { name: "File" }).click();
    await page.getByRole("menuitem", { name: "Export" }).click();
    const exportDialog = page.getByRole("dialog", { name: "Export Image" });
    await expect(exportDialog.locator('button[aria-haspopup="listbox"]')).toBeFocused();
    // Open the format dropdown, then select JPEG
    await exportDialog.locator('button[aria-haspopup="listbox"]').click();
    await page.getByRole("button", { name: "JPEG" }).click();
    await expect(exportDialog.getByLabel("Quality")).toHaveValue("90");
    await expect(exportDialog.locator("[data-dialog-titlebar]")).toHaveCSS("height", "36px");
    await exportDialog.screenshot({ path: testInfo.outputPath("export-image-dialog.png") });
    // Refocus inside the dialog so Escape is captured
    await exportDialog.locator('button[aria-haspopup="listbox"]').focus();
    await page.keyboard.press("Escape");
    await expect(exportDialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "File" })).toBeFocused();
  });
});
