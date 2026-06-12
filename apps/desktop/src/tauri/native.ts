import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

interface ApiResponse<T = unknown> {
  ok: boolean;
  contract_version: string;
  data: T;
}

// ─── File Dialog ───
export async function showOpenImageDialog(): Promise<string[] | null> {
  const selected = await open({
    multiple: true,
    filters: [{
      name: "Images",
      extensions: ["png", "jpg", "jpeg", "webp", "bmp"]
    }]
  });

  if (!selected) return null;
  return Array.isArray(selected) ? selected : [selected];
}

export async function showSaveDialog(defaultName: string): Promise<string | null> {
  const ext = defaultName.split(".").pop() || "png";
  return await save({
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
}

// ─── File I/O ───
export async function readFileBytes(path: string): Promise<Uint8Array> {
  const result = await invoke("read_file_bytes", { path }) as ApiResponse<{ data: string }>;
  if (!result.ok) throw new Error("Failed to read file");

  // Decode base64 to Uint8Array
  const binaryString = atob(result.data.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function writeFileBytes(path: string, data: Uint8Array): Promise<void> {
  // Encode Uint8Array to base64
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const b64 = btoa(binary);

  const result = await invoke("write_file_bytes", { path, data: b64 }) as ApiResponse;
  if (!result.ok) throw new Error("Failed to write file");
}

// ─── Ping ───
export async function ping(): Promise<boolean> {
  try {
    const result = await invoke("ping") as ApiResponse;
    return result.ok;
  } catch {
    return false;
  }
}
