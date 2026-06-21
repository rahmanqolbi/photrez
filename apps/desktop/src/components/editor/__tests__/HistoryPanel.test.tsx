import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "../EditorContext";
import { HistoryPanel } from "../HistoryPanel";
import { WorkspaceManager, type DocumentSession } from "@/engine/workspace";
import type { WebGL2Backend } from "@/renderer/webgl2";
import type { RenderScheduler } from "@/renderer/scheduler";

function renderHistoryPanel(session?: DocumentSession) {
  const workspace = new WorkspaceManager();
  const renderer = {
    uploadImage: vi.fn(),
    destroyTexture: vi.fn(),
  } as unknown as WebGL2Backend;
  const scheduler = { requestRender: vi.fn() } as unknown as RenderScheduler;
  const container = document.createElement("div");
  document.body.appendChild(container);

  if (session) workspace.addDocument(session);

  const dispose = render(
    () => (
      <EditorProvider workspace={workspace} renderer={renderer} scheduler={scheduler}>
        <HistoryPanel />
      </EditorProvider>
    ),
    container,
  );

  return { workspace, renderer, scheduler, container, dispose };
}

describe("HistoryPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("shows a useful empty state when no document is active", () => {
    const { container, dispose } = renderHistoryPanel();

    expect(container.textContent).toContain("No image open");

    dispose();
  });

  it("uses an edge-to-edge list and explains the baseline-only state", async () => {
    const session = WorkspaceManager.createBlankDocument("test-hist-baseline", "History Baseline", 800, 600);
    const { container, dispose } = renderHistoryPanel(session);

    await Promise.resolve();

    const list = container.querySelector<HTMLElement>("[data-history-list]");
    expect(list).not.toBeNull();
    expect(list).not.toHaveClass("rounded-[3px]");
    expect(list).not.toHaveClass("border");
    expect(container.textContent).toContain("Edits appear here");

    dispose();
  });

  it("renders chronological operations and exposes the active state accessibly", async () => {
    const session = WorkspaceManager.createBlankDocument("test-hist", "History Test", 800, 600);
    session.history.commit(session.engine.snapshot(), "Brush Stroke");
    session.history.commit(session.engine.snapshot(), "New Layer");
    const { container, dispose } = renderHistoryPanel(session);

    await Promise.resolve();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Open",
      "Brush Stroke",
      "New Layer",
    ]);
    expect(buttons[2]).toHaveAttribute("aria-current", "step");
    expect(buttons[0]).not.toHaveAttribute("aria-current");

    dispose();
  });

  it("marks future states and navigates one step backward", async () => {
    const session = WorkspaceManager.createBlankDocument("test-hist-click", "History Click Test", 800, 600);
    const { history, engine } = session;
    history.commit(engine.snapshot(), "Brush Stroke");
    history.commit(engine.snapshot(), "New Layer");
    history.commit(engine.snapshot(), "Resize Canvas");
    const previous = history.undo(engine.snapshot());
    if (previous) engine.restore(previous);
    const { container, dispose } = renderHistoryPanel(session);
    const undoSpy = vi.spyOn(history, "undo");

    await Promise.resolve();

    let buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Open",
      "Brush Stroke",
      "New Layer",
      "Resize Canvas",
    ]);
    expect(buttons[2]).toHaveAttribute("aria-current", "step");
    expect(buttons[3]).toHaveAttribute("data-history-state", "future");

    buttons[1].click();
    await Promise.resolve();

    expect(undoSpy).toHaveBeenCalledTimes(1);
    buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons[1]).toHaveAttribute("aria-current", "step");

    dispose();
  });

  it("preserves intermediate snapshots during multi-step time travel", async () => {
    const session = WorkspaceManager.createBlankDocument("test-hist-multi", "History Multi", 800, 600);
    const { history, engine } = session;

    history.commit(engine.snapshot(), "New Layer");
    engine.addLayer("Layer 2");
    history.commit(engine.snapshot(), "New Layer");
    engine.addLayer("Layer 3");
    history.commit(engine.snapshot(), "New Layer");
    engine.addLayer("Layer 4");

    const { container, dispose } = renderHistoryPanel(session);
    await Promise.resolve();

    let buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    buttons[1].click();
    expect(engine.getLayers()).toHaveLength(2);

    buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    buttons[2].click();
    expect(engine.getLayers()).toHaveLength(3);

    dispose();
  });
});
