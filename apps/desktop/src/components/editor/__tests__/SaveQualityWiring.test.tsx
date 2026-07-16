import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "solid-js/web";
import { EditorProvider } from "@/components/editor/shell/EditorContext";
import { WorkspaceManager } from "@/engine/workspace";
import { useEditorCommands, dispatchEditorCommand } from "../useEditorCommands";
import type { EditorCommand } from "../useEditorCommands";

// Mock encodeComposite so no real canvas/OffscreenCanvas work happens.
vi.mock("../exportDocument", () => ({
  encodeComposite: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

// Mock native write path.
vi.mock("@/tauri/native", () => ({
  writeFileBytes: vi.fn().mockResolvedValue(undefined),
  showSaveDialog: vi.fn(),
  showSaveDialogAllFormats: vi.fn(),
}));

// Controllable dialog.quality.
const qualitySpy = vi.fn();
vi.mock("@/components/editor/dialogs/DialogProvider", () => ({
  DialogProvider: (props: { children: unknown }) => props.children,
  useDialog: () => ({
    quality: qualitySpy,
    confirm: vi.fn(),
    alert: vi.fn(),
    confirmWithCheckbox: vi.fn(),
    confirmSave: vi.fn(),
    colorPicker: vi.fn(),
    newDocument: vi.fn().mockResolvedValue(null),
  }),
}));

function makeSession(sourcePath: string) {
  const ws = new WorkspaceManager();
  const session = WorkspaceManager.createBlankDocument("save-doc", "Save Doc", 800, 600);
  ws.addDocument(session);
  session.sourcePath = sourcePath;
  session.displayName = sourcePath.split(/[/\\]/).pop() || sourcePath;
  return { ws, session };
}

function harness() {
  useEditorCommands(() => undefined);
  return null;
}

async function run(command: EditorCommand) {
  dispatchEditorCommand(command);
  // flush the async save IIFE + dialog promise
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("file.save quality prompt (lossy vs lossless)", () => {
  beforeEach(() => {
    qualitySpy.mockReset();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks quality for JPEG and passes it to encodeComposite", async () => {
    const { ws, session } = makeSession("C:/img/save.jpg");
    qualitySpy.mockResolvedValue(80);
    const { writeFileBytes } = await import("@/tauri/native");
    const { encodeComposite } = await import("../exportDocument");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={{ uploadImage: vi.fn() } as any} scheduler={{ requestRender: vi.fn() } as any}>
          {harness()}
        </EditorProvider>
      ),
      container,
    );

    await run("file.save");

    expect(qualitySpy).toHaveBeenCalledTimes(1);
    expect(qualitySpy).toHaveBeenCalledWith(expect.objectContaining({ format: "jpeg", defaultQuality: 92 }));
    expect(encodeComposite).toHaveBeenCalledWith(session.engine, "jpeg", 80);
    expect(writeFileBytes).toHaveBeenCalledWith("C:/img/save.jpg", expect.any(Uint8Array));

    dispose();
    container.remove();
  });

  it("does NOT ask quality for PNG (lossless) and saves directly", async () => {
    const { ws } = makeSession("C:/img/save.png");
    const { writeFileBytes } = await import("@/tauri/native");
    const { encodeComposite } = await import("../exportDocument");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={{ uploadImage: vi.fn() } as any} scheduler={{ requestRender: vi.fn() } as any}>
          {harness()}
        </EditorProvider>
      ),
      container,
    );

    await run("file.save");

    expect(qualitySpy).not.toHaveBeenCalled();
    expect(encodeComposite).toHaveBeenCalledWith(expect.anything(), "png", 92);
    expect(writeFileBytes).toHaveBeenCalledWith("C:/img/save.png", expect.any(Uint8Array));

    dispose();
    container.remove();
  });

  it("cancelling the quality dialog aborts the save (no write)", async () => {
    const { ws } = makeSession("C:/img/save.webp");
    qualitySpy.mockResolvedValue(null); // user cancelled
    const { writeFileBytes } = await import("@/tauri/native");
    const { encodeComposite } = await import("../exportDocument");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(
      () => (
        <EditorProvider workspace={ws} renderer={{ uploadImage: vi.fn() } as any} scheduler={{ requestRender: vi.fn() } as any}>
          {harness()}
        </EditorProvider>
      ),
      container,
    );

    await run("file.save");

    expect(qualitySpy).toHaveBeenCalledTimes(1);
    expect(encodeComposite).not.toHaveBeenCalled();
    expect(writeFileBytes).not.toHaveBeenCalled();

    dispose();
    container.remove();
  });
});
