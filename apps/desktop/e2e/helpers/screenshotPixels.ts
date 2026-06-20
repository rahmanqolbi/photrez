import type { Locator } from "@playwright/test";

export async function readRenderedPixel(
  target: Locator,
  screenX: number,
  screenY: number,
): Promise<number[] | null> {
  const box = await target.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) return null;

  const png = await target.screenshot({ animations: "disabled" });
  const xRatio = (screenX - box.x) / box.width;
  const yRatio = (screenY - box.y) / box.height;
  if (xRatio < 0 || yRatio < 0 || xRatio >= 1 || yRatio >= 1) return null;

  return target.page().evaluate(
    async ({ dataUrl, x, y }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(image, 0, 0);
      return Array.from(
        context.getImageData(
          Math.floor(x * canvas.width),
          Math.floor(y * canvas.height),
          1,
          1,
        ).data,
      );
    },
    { dataUrl: `data:image/png;base64,${png.toString("base64")}`, x: xRatio, y: yRatio },
  );
}

export async function readRenderedPixelAtRatio(
  target: Locator,
  xRatio: number,
  yRatio: number,
): Promise<number[] | null> {
  const box = await target.boundingBox();
  if (!box) return null;
  return readRenderedPixel(target, box.x + box.width * xRatio, box.y + box.height * yRatio);
}
