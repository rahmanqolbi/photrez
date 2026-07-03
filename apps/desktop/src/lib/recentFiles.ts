// ─── Recent Files (localStorage) ───
// Used by File > Open Recent submenu. Persisted across sessions.

const STORAGE_KEY = "photrez:recentFiles";
const MAX = 10;

export interface RecentFile {
  path: string;
  name: string;
}

function read(): RecentFile[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentFile[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(files: RecentFile[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files.slice(0, MAX)));
}

export function getRecentFiles(): RecentFile[] {
  return read();
}

export function addRecentFile(path: string, name: string): void {
  const files = read();
  // Remove duplicate by path, then prepend
  const filtered = files.filter((f) => f.path !== path);
  write([{ path, name }, ...filtered]);
}

export function removeRecentFile(path: string): void {
  write(read().filter((f) => f.path !== path));
}

export function clearRecentFiles(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
