import { expect, test } from "@playwright/test";

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

    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();

    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();
    await expect(page.getByText("800 × 600 px")).toBeVisible();
    await expect(page.getByText("Active:")).toBeVisible();
    await expect(page.getByText("Selected Layer:")).toBeVisible();

    await page.getByRole("button", { name: "Crop Tool" }).click();
    await expect(page.getByTitle("Delete Cropped Pixels (Destructive)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Rotate 90 degrees clockwise" })).toBeVisible();

    await page.getByRole("button", { name: "Move Tool" }).click();
    await expect(page.getByRole("button", { name: "Align left" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Flip horizontal" })).toBeVisible();
  });

  test("toggles side panels without losing the active document", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto("/");

    await page.getByRole("button", { name: "Hide side panels" }).click();
    await expect(page.getByRole("button", { name: "Show side panels" })).toBeVisible();

    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();

    await page.getByRole("button", { name: "Show side panels" }).click();
    await expect(page.getByRole("button", { name: "Hide side panels" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();

    await page.getByRole("button", { name: "Hide side panels" }).click();
    await expect(page.getByRole("button", { name: "Show side panels" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Untitled Canvas")).toBeVisible();
  });

  test("hides and restores crop preview from pasteboard and canvas click", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();
    await page.getByRole("button", { name: "Crop Tool" }).click();

    // Verify it is visible by default
    await expect(page.locator("[data-crop-overlay]")).toBeVisible();

    await page.locator("#canvas-container").click({ position: { x: 10, y: 10 } });
    await expect(page.locator("[data-crop-overlay]")).toHaveCount(0);

    const canvas = page.locator("canvas").first();
    await canvas.click({ position: { x: 100, y: 100 } });
    await expect(page.locator("[data-crop-overlay]")).toBeVisible();
  });

  test("creates replacement crop preview from pasteboard drag", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.message().includes("width") ? "800" : "600");
    });
    await page.getByRole("button", { name: "New Canvas" }).click();
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

    await expect(page.locator("[data-crop-overlay]")).toBeVisible();
  });
});
