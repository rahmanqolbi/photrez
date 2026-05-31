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
      session.dirty = session.engine.isDirty();
      this.notifyChange();
    });

    this.notifyChange();
  }

  removeDocument(id: DocumentId): void {
    if (this.sessions.has(id)) {
      const keys = Array.from(this.sessions.keys());
      const index = keys.indexOf(id);
      this.sessions.delete(id);

      // Adjust active document focus
      if (this.activeDocumentId === id) {
        if (this.sessions.size > 0) {
          const nextActiveIndex = Math.min(index, this.sessions.size - 1);
          this.activeDocumentId = keys[nextActiveIndex === index ? keys.indexOf(id) + 1 : nextActiveIndex];
          // Simple key switch
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
