import { DocumentEngine } from "@/engine/document";
import { saveProject } from "@/tauri/native";

export async function serializeAndSaveProject(engine: DocumentEngine, path: string): Promise<void> {
  const model = engine.snapshot();
  const layers: Record<string, string> = {};

  for (const layer of model.layers) {
    if (layer.imageBitmap) {
      const canvas = new OffscreenCanvas(layer.width, layer.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("projectSerialize: OffscreenCanvas.getContext('2d') returned null, skipping layer", layer.id);
        continue;
      }

      ctx.drawImage(layer.imageBitmap, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const commaIndex = result.indexOf(",");
          if (commaIndex !== -1) {
            resolve(result.substring(commaIndex + 1));
          } else {
            resolve(result);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      layers[layer.id] = base64Data;
    }
  }

  const serializedModel = {
    ...model,
    layers: model.layers.map((l) => ({
      ...l,
      imageBitmap: null,
    })),
  };

  const documentJson = JSON.stringify(serializedModel);
  await saveProject(path, documentJson, layers);
}
