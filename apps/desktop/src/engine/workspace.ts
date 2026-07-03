import type { DocumentId, DocumentTabSummary } from "./types";
import { MAX_OPEN_DOCUMENTS } from "./types";
import { DocumentEngine } from "./document";
import { CommandHistory } from "./history";

export interface DocumentSession {
  engine: DocumentEngine;
  history: CommandHistory;
  displayName: string;
  sourcePath: string | null;
  dirty: boolean;
}

export class WorkspaceManager {
  private sessions: Map<DocumentId, DocumentSession> = new Map();
  private activeDocumentId: DocumentId | null = null;
  private onChangeCallback: (() => void) | null = null;
  private onVisualChangeCallback: (() => void) | null = null;

  // ─── Document Lifecycle ───
  addDocument(session: DocumentSession): void {
    if (this.sessions.size >= MAX_OPEN_DOCUMENTS) {
      throw new Error(`Maximum open document limit of ${MAX_OPEN_DOCUMENTS} reached`);
    }

    const id = session.engine.getId();
    this.sessions.set(id, session);
    this.activeDocumentId = id;

    // Connect document engine change triggers back to workspace context updates
    session.engine.onChange(() => {
      session.dirty = true;
      this.notifyChange();
    });
    session.engine.onVisualChange(() => {
      session.dirty = true;
      this.notifyVisualChange();
    });

    this.notifyChange();
  }

  removeDocument(id: DocumentId): void {
    if (this.sessions.has(id)) {
      const index = Array.from(this.sessions.keys()).indexOf(id);
      this.sessions.delete(id);

      // consecutive assignments to `this.activeDocumentId` where the
      // first (line 53) computed `keys.indexOf(id) + 1` against the
      // already-mutated `keys` array — `indexOf(id)` returned `-1`
      // after the delete, so `+ 1` resolved to `0`, picking the
      // first document instead of the neighbor. Line 56 then
      // immediately overwrote that value with a correct computation
      // against `remainingKeys`, so behavior was accidentally right
      // but the dead-code path was a foot-gun if anyone refactored
      // the trailing line.

      // Adjust active document focus: activate the neighbor at the
      // same index, or the new last document if the removed one was
      // last.
      if (this.activeDocumentId === id) {
        if (this.sessions.size > 0) {
          const remainingKeys = Array.from(this.sessions.keys());
          this.activeDocumentId = remainingKeys[Math.min(index, remainingKeys.length - 1)];
        } else {
          this.activeDocumentId = null;
        }
      }

      this.notifyChange();
    }
  }

  switchDocument(id: DocumentId): void {
    if (this.sessions.has(id)) {
      this.activeDocumentId = id;
      this.notifyChange();
    }
  }

  // ─── Accessors ───
  getActiveSession(): DocumentSession | null {
    if (!this.activeDocumentId) return null;
    return this.sessions.get(this.activeDocumentId) || null;
  }

  getActiveEngine(): DocumentEngine | null {
    const session = this.getActiveSession();
    return session ? session.engine : null;
  }

  getActiveHistory(): CommandHistory | null {
    const session = this.getActiveSession();
    return session ? session.history : null;
  }

  getSession(id: DocumentId): DocumentSession | null {
    return this.sessions.get(id) || null;
  }

  getEngine(id: DocumentId): DocumentEngine | null {
    return this.getSession(id)?.engine ?? null;
  }

  getHistory(id: DocumentId): CommandHistory | null {
    return this.getSession(id)?.history ?? null;
  }

  getDocumentCount(): number {
    return this.sessions.size;
  }

  isFull(): boolean {
    return this.sessions.size >= MAX_OPEN_DOCUMENTS;
  }

  getActiveDocumentId(): DocumentId | null {
    return this.activeDocumentId;
  }

  getTabSummaries(): DocumentTabSummary[] {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      displayName: session.displayName,
      isDirty: session.dirty
    }));
  }

  // ─── Change Notification ───
  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  onVisualChange(callback: () => void): void {
    this.onVisualChangeCallback = callback;
  }

  notifyVisualChange(): void {
    if (this.onVisualChangeCallback) {
      this.onVisualChangeCallback();
    }
  }

  // ─── Factory Methods ───
  static createBlankDocument(
    id: DocumentId,
    name: string,
    width: number,
    height: number
  ): DocumentSession {
    const engine = new DocumentEngine(id, name, width, height);
    engine.addLayer("Background"); // Default empty background layer
    engine.clearDirty();

    return {
      engine,
      history: new CommandHistory(),
      displayName: name,
      sourcePath: null,
      dirty: false
    };
  }

  static createDocumentFromImage(
    id: DocumentId,
    name: string,
    bitmap: ImageBitmap
  ): DocumentSession {
    const engine = new DocumentEngine(id, name, bitmap.width, bitmap.height);
    const bgLayer = engine.addLayer("Background", bitmap.width, bitmap.height);
    engine.setLayerImageBitmap(bgLayer.id, bitmap);
    engine.clearDirty();

    return {
      engine,
      history: new CommandHistory(),
      displayName: name,
      sourcePath: null,
      dirty: false
    };
  }
}
