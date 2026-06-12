import { describe, it, expect } from 'vitest';
import { WorkspaceManager } from '../workspace';

describe('WorkspaceManager', () => {
  it('starts with no documents', () => {
    const wm = new WorkspaceManager();
    expect(wm.getDocumentCount()).toBe(0);
    expect(wm.getActiveDocumentId()).toBeNull();
    expect(wm.isFull()).toBe(false);
  });

  it('creates blank document correctly via factory', () => {
    const session = WorkspaceManager.createBlankDocument('doc-1', 'Untitled-1', 400, 300);
    
    expect(session.displayName).toBe('Untitled-1');
    expect(session.engine.getWidth()).toBe(400);
    expect(session.engine.getHeight()).toBe(300);
    expect(session.engine.getLayers().length).toBe(1);
    expect(session.engine.getLayers()[0].name).toBe('Background');
  });

  it('manages document lifecycle sessions correctly', () => {
    const wm = new WorkspaceManager();
    const session1 = WorkspaceManager.createBlankDocument('doc-1', 'Doc 1', 800, 600);
    const session2 = WorkspaceManager.createBlankDocument('doc-2', 'Doc 2', 400, 300);

    let changeTriggered = 0;
    wm.onChange(() => {
      changeTriggered++;
    });

    wm.addDocument(session1);
    expect(wm.getDocumentCount()).toBe(1);
    expect(wm.getActiveDocumentId()).toBe('doc-1');
    expect(changeTriggered).toBe(1);

    wm.addDocument(session2);
    expect(wm.getDocumentCount()).toBe(2);
    expect(wm.getActiveDocumentId()).toBe('doc-2');

    wm.switchDocument('doc-1');
    expect(wm.getActiveDocumentId()).toBe('doc-1');

    wm.removeDocument('doc-1');
    expect(wm.getDocumentCount()).toBe(1);
    expect(wm.getActiveDocumentId()).toBe('doc-2');
  });
});
