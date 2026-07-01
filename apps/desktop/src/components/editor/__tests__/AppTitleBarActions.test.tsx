import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";
import { WorkspaceManager } from "@/engine/workspace";
import { EditorProvider } from "../shell/EditorContext";
import { AppTitleBar } from "../shell/AppTitleBar";

// ─── Mocks ───

// For maximize state tracking (AppTitleBar's onMount uses import WITHOUT @vite-ignore)
const windowMock = vi.hoisted(() => ({
  isMaximized: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
  onResized: vi.fn<() => Promise<() => void>>().mockResolvedValue(vi.fn()),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    isMaximized: windowMock.isMaximized,
    onResized: windowMock.onResized,
  })),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

// Mock @/lib/desktop because runTauriWindowAction uses import(/* @vite-ignore */ ...)
// which bypasses vi.mock for @tauri-apps/api/window.
const runTauriActionMock = vi.hoisted(() => vi.fn());
const tauriRuntimeFlag = vi.hoisted(() => ({ value: true }));

vi.mock("@/lib/desktop", () => ({
  isTauriRuntime: () => tauriRuntimeFlag.value,
  // Replicate the runtime guard behavior of the real runTauriWindowAction
  runTauriWindowAction: (action: string) => {
    if (tauriRuntimeFlag.value) runTauriActionMock(action);
  },
}));

// ─── Helpers ───

function renderTitlebar(onToggleRightDock = vi.fn()) {
  const workspace = new WorkspaceManager();
  const renderer = {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
    resize: vi.fn(),
    resizeToViewport: vi.fn(),
  } as unknown as WebGL2Backend;
  const scheduler = { requestRender: vi.fn() } as unknown as RenderScheduler;
  const container = document.createElement("div");
  document.body.appendChild(container);

  const dispose = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer} scheduler={scheduler}>
        <AppTitleBar isRightDockOpen={false} onToggleRightDock={onToggleRightDock} />
      </EditorProvider>
    ),
    container,
  );

  return { container, workspace, scheduler, dispose };
}

// ─── Tests ───

describe("titlebar window action buttons", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("button click wiring", () => {
    it("minimize button calls runTauriWindowAction('minimize')", () => {
      const host = renderTitlebar();
      const btn = host.container.querySelector('button[aria-label="Minimize window"]') as HTMLElement | null;
      expect(btn).toBeTruthy();
      btn!.click();
      expect(runTauriActionMock).toHaveBeenCalledWith("minimize");
      host.dispose();
    });

    it("maximize/restore button calls runTauriWindowAction('toggleMaximize')", () => {
      const host = renderTitlebar();
      const btn = host.container.querySelector('[aria-label="Maximize window"]') as HTMLElement | null;
      expect(btn).toBeTruthy();
      btn!.click();
      expect(runTauriActionMock).toHaveBeenCalledWith("toggleMaximize");
      host.dispose();
    });

    it("close button calls runTauriWindowAction('close')", () => {
      const host = renderTitlebar();
      const btn = host.container.querySelector('button[aria-label="Close window"]') as HTMLElement | null;
      expect(btn).toBeTruthy();
      btn!.click();
      expect(runTauriActionMock).toHaveBeenCalledWith("close");
      host.dispose();
    });

    it("no-ops when not in Tauri runtime", () => {
      tauriRuntimeFlag.value = false;
      const host = renderTitlebar();
      (host.container.querySelector('button[aria-label="Minimize window"]') as HTMLElement)!.click();
      expect(runTauriActionMock).not.toHaveBeenCalled();
      tauriRuntimeFlag.value = true;
      host.dispose();
    });
  });

  describe("maximize/restore state indicator", () => {
    it("shows maximize (square) icon by default", () => {
      const host = renderTitlebar();
      expect(host.container.querySelector('[aria-label="Maximize window"]')).toBeTruthy();
      host.dispose();
    });
  });
});
