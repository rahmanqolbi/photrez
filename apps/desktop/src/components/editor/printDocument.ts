import { invoke } from "@tauri-apps/api/core";
import { tempDir } from "@tauri-apps/api/path";
import { encodeComposite } from "./exportDocument";
import { writeFileBytes } from "@/tauri/native";
import type { DocumentEngine } from "@/engine/document";

export async function printDocument(engine: DocumentEngine): Promise<void> {
  // 1. Render composite image
  const bytes = await encodeComposite(engine, "png", 100);

  // 2. Save to temp file as PNG (better print verb support than WebP)
  const tmpDir = await tempDir();
  const filename = `photrez-print-${Date.now()}.png`;
  const filePath = `${tmpDir}${filename}`;
  await writeFileBytes(filePath, bytes);

  // 3. Call Rust command: shows native Windows print dialog via
  //    ShellExecuteW("print") — compact, with preview.
  //    No WebView2 window.print() involved.
  await invoke("print_image", { path: filePath });
}
