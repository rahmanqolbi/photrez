// apps/desktop/src/lib/desktop/__tests__/useTauriCloseHandler.test.tsx
//
// Wiring contract tests for useTauriCloseHandler.
//
// What this catches: the "tests pass but app fails" anti-pattern.
// If the Tauri close-requested listener is not wired, or the sequential
// save/discard/cancel dialog flow is broken, data will be silently lost
// when the user closes the window with unsaved documents.
//
// These tests verify:
//   1. Listener is set up in Tauri runtime only
//   2. Listener is cleaned up on unmount
//   3. Sequential dialog flow for multiple dirty documents
//   4. Cancel stops close entirely
//   5. Discard skips to next dirty doc
//   6. Save persists and continues
// 7. All docs handled → window.destroy() is called

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";

// ─── Hoisted state: capture Tauri event listener callback ───
const tauriState = vi.hoisted(() => ({
  listenEvent: null as string | null,
  listenCallback: null as ((event: unknown) => void) | null,
  unlisten: vi.fn().mockReturnThis(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, cb: (event: unknown) => void) => {
    tauriState.listenEvent = event;
    tauriState.listenCallback = cb;
    return Promise.resolve(tauriState.unlisten);
  },
}));

const destroyWindowMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ destroy: destroyWindowMock }),
}));

vi.mock("@/tauri/native", () => ({
  writeFileBytes: vi.fn().mockResolvedValue(undefined),
  showSaveDialogAllFormats: vi.fn().mockResolvedValue("/fake/path/doc.png"),
}));

vi.mock("@/components/editor/exportDocument", () => ({
  encodeComposite: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

vi.mock("@/components/editor/projectSerialize", () => ({
  serializeAndSaveProject: vi.fn().mockResolvedValue(undefined),
}));

import { useTauriCloseHandler } from "../useTauriCloseHandler";

// ─── Helpers ───

/** Flush pending microtasks (dynamic import .then callbacks etc). */
function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

interface MockSession {
  engine: {
    getId: () => string;
    clearDirty: ReturnType<typeof vi.fn>;
  };
  history: Record<string, never>;
  displayName: string;
  sourcePath: string | null;
  dirty: boolean;
}

function makeSession(id: string, name: string, dirty: boolean, sourcePath: string | null): MockSession {
  return {
    engine: {
      getId: () => id,
      clearDirty: vi.fn(),
    },
    history: {},
    displayName: name,
    sourcePath,
    dirty,
  };
}

function makeWorkspace(sessions: MockSession[]) {
  const map = new Map(sessions.map((s) => [s.engine.getId(), s]));
  return {
    getTabSummaries: () =>
      Array.from(map.entries()).map(([id, s]) => ({
        id,
        displayName: s.displayName,
        isDirty: s.dirty,
      })),
    getSession: (id: string) => map.get(id) ?? null,
  };
}

/** Minimal harness that just runs the hook. */
function Harness(props: {
  workspace: ReturnType<typeof makeWorkspace>;
  dialog: Record<string, unknown>;
  scheduler: { requestRender: () => void };
}) {
  useTauriCloseHandler(props.workspace as any, props.dialog as any, props.scheduler);
  return null;
}

/**
 * Simulate a Tauri close-requested event by calling the captured listener.
 */
function fireCloseRequested(): Promise<void> {
  if (!tauriState.listenCallback) throw new Error("No listener captured — is Tauri runtime mock active?");
  return Promise.resolve(tauriState.listenCallback({}));
}

// ─── Tests ───

describe("useTauriCloseHandler", () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | null;

  beforeEach(() => {
    container = document.createElement("div");
    dispose = null;
    tauriState.listenEvent = null;
    tauriState.listenCallback = null;
    tauriState.unlisten.mockClear();
    destroyWindowMock.mockClear();
  });

  afterEach(() => {
    dispose?.();
    container.remove();
    delete (window as any).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  // ─── Listener Wiring ───

  it("sets up close-requested listener in Tauri runtime", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const workspace = makeWorkspace([]);
    const dialog = { confirmSave: vi.fn() };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    expect(tauriState.listenEvent).toBe("close-requested");
    expect(tauriState.listenCallback).toBeInstanceOf(Function);
  });

  it("calls listen() synchronously during render (no dynamic import deferral)", () => {
    // With static imports (replacing import(@vite-ignore) pattern),
    // listen() must be invoked inline, not deferred to a .then() callback.
    (window as any).__TAURI_INTERNALS__ = {};
    const workspace = makeWorkspace([]);
    const dialog = { confirmSave: vi.fn() };

    // Render WITHOUT await — after render() returns, listen() should have been called.
    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);

    expect(tauriState.listenEvent).toBe("close-requested");
    expect(tauriState.listenCallback).toBeInstanceOf(Function);
  });

  it("does not call unlisten if cleanup happens before listen promise resolves", async () => {
    // Edge case: the listen() promise resolves (microtask) after the component
    // has already been disposed. The cancelled flag prevents assigning unlisten
    // to a stale variable in the .then() callback.
    (window as any).__TAURI_INTERNALS__ = {};
    const workspace = makeWorkspace([]);
    const dialog = { confirmSave: vi.fn() };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);

    // Dispose immediately — before listen().then() microtask runs
    dispose();
    dispose = null;

    // Flush microtasks — .then() runs but cancelled=true prevents unlisten assignment
    await flush();

    // unlisten was never assigned (cancelled guarded), so unlisten?.() was no-op
    expect(tauriState.unlisten).not.toHaveBeenCalled();
  });

  it("does NOT set up listener outside Tauri runtime", async () => {
    const workspace = makeWorkspace([]);
    const dialog = { confirmSave: vi.fn() };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    expect(tauriState.listenEvent).toBeNull();
    expect(tauriState.listenCallback).toBeNull();
  });

  it("cleans up listener on unmount", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const workspace = makeWorkspace([]);
    const dialog = { confirmSave: vi.fn() };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    expect(tauriState.unlisten).not.toHaveBeenCalled();

    dispose();
    dispose = null;

    expect(tauriState.unlisten).toHaveBeenCalledTimes(1);
  });

  // ─── Dialog Flow: No Dirty Docs ───

  it("immediately closes window when no dirty documents exist", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [makeSession("doc-1", "Doc 1", false, "/path/doc1.png")];
    const workspace = makeWorkspace(sessions);
    const dialog = { confirmSave: vi.fn() };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).not.toHaveBeenCalled();
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });

  // ─── Dialog Flow: Cancel ───

  it("stops close on Cancel button (no dirty docs resolved)", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
      makeSession("doc-2", "Doc 2", true, "/path/doc2.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = { confirmSave: vi.fn().mockResolvedValue("cancel") };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).toHaveBeenCalledTimes(1);
    expect(destroyWindowMock).not.toHaveBeenCalled();
    expect(sessions[0].dirty).toBe(true);
    expect(sessions[1].dirty).toBe(true);
  });

  // ─── Dialog Flow: Discard ───

  it("discards dirty doc and moves to next dirty doc", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
      makeSession("doc-2", "Doc 2", true, "/path/doc2.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn()
        .mockResolvedValueOnce("discard")  // Discard doc-1
        .mockResolvedValueOnce("cancel"),  // Cancel on doc-2
    };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).toHaveBeenCalledTimes(2);
    expect(sessions[0].dirty).toBe(false);
    expect(sessions[0].engine.clearDirty).not.toHaveBeenCalled();
    expect(sessions[1].dirty).toBe(true);
    expect(destroyWindowMock).not.toHaveBeenCalled();
  });

  // ─── Dialog Flow: Save ───

  it("saves dirty doc with sourcePath and moves to next", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
      makeSession("doc-2", "Doc 2", true, "/path/doc2.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn()
        .mockResolvedValueOnce("save")    // Save doc-1
        .mockResolvedValueOnce("cancel"), // Cancel on doc-2
    };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).toHaveBeenCalledTimes(2);
    expect(sessions[0].engine.clearDirty).toHaveBeenCalled();
    expect(sessions[0].dirty).toBe(false);
    const { encodeComposite } = await import("@/components/editor/exportDocument");
    expect(encodeComposite).toHaveBeenCalledWith(expect.anything(), "png", 92);
    expect(sessions[1].dirty).toBe(true);
    expect(destroyWindowMock).not.toHaveBeenCalled();
  });

  // ─── Dialog Flow: Save All → Close ───

  it("saves all dirty docs then closes window", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
      makeSession("doc-2", "Doc 2", true, "/path/doc2.jpg"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn()
        .mockResolvedValueOnce("save")  // Save doc-1 (.png)
        .mockResolvedValueOnce("save"), // Save doc-2 (.jpg → jpeg)
    };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).toHaveBeenCalledTimes(2);
    expect(sessions[0].engine.clearDirty).toHaveBeenCalled();
    expect(sessions[1].engine.clearDirty).toHaveBeenCalled();
    expect(sessions[0].dirty).toBe(false);
    expect(sessions[1].dirty).toBe(false);
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });

  // ─── Dialog Flow: No sourcePath Save ───

  it("shows save dialog for docs without sourcePath, then saves", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, null),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = { confirmSave: vi.fn().mockResolvedValue("save") };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    const { showSaveDialogAllFormats, writeFileBytes } = await import("@/tauri/native");
    expect(showSaveDialogAllFormats).toHaveBeenCalledWith("Doc 1.png");
    expect(writeFileBytes).toHaveBeenCalled();
    expect(sessions[0].engine.clearDirty).toHaveBeenCalled();
    expect(sessions[0].dirty).toBe(false);
    expect(sessions[0].sourcePath).toBe("/fake/path/doc.png");
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });

  // ─── Dialog Flow: Save Failure ───

  it("shows retry dialog on save failure", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn().mockResolvedValue("save"),
      confirm: vi.fn(),
    };
    dialog.confirm.mockResolvedValue(true); // Retry: Discard

    const { writeFileBytes } = await import("@/tauri/native");
    (writeFileBytes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Disk full"));

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Save Failed" }),
    );
    expect(sessions[0].dirty).toBe(false);
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });

  it("stops close on retry Cancel", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn().mockResolvedValue("save"),
      confirm: vi.fn(),
    };

    const { writeFileBytes } = await import("@/tauri/native");
    (writeFileBytes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Disk full"));

    dialog.confirm.mockResolvedValue(false); // Retry: Cancel

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirm).toHaveBeenCalled();
    expect(sessions[0].dirty).toBe(true);
    expect(destroyWindowMock).not.toHaveBeenCalled();
  });

  // ─── Dialog Flow: Discard all → Close ───

  it("discards all dirty docs then closes window", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
      makeSession("doc-2", "Doc 2", true, "/path/doc2.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = {
      confirmSave: vi.fn()
        .mockResolvedValueOnce("discard")  // Discard doc-1
        .mockResolvedValueOnce("discard"), // Discard doc-2
    };

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirmSave).toHaveBeenCalledTimes(2);
    expect(sessions[0].dirty).toBe(false);
    expect(sessions[1].dirty).toBe(false);
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });

  // ─── Dialog Flow: no confirmSave (fallback) ───

  it("uses confirm() fallback when confirmSave is missing", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const sessions = [
      makeSession("doc-1", "Doc 1", true, "/path/doc1.png"),
    ];
    const workspace = makeWorkspace(sessions);
    const dialog = { confirm: vi.fn().mockResolvedValue(true) }; // Discard

    dispose = render(() => Harness({ workspace, dialog, scheduler: { requestRender: vi.fn() } }), container);
    await flush();

    await fireCloseRequested();

    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    expect(sessions[0].dirty).toBe(false);
    expect(destroyWindowMock).toHaveBeenCalledTimes(1);
  });
});
