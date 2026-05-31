import { describe, it, expect } from 'vitest';
import { CommandHistory } from '../history';
import type { DocumentModel } from '../types';

const createMockModel = (name: string): DocumentModel => ({
  id: 'doc-1',
  name,
  width: 800,
  height: 600,
  layers: [],
  activeLayerId: null,
  selection: null,
  viewport: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
  dirty: false
});

describe('CommandHistory', () => {
  it('starts with empty stacks', () => {
    const history = new CommandHistory();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.getUndoCount()).toBe(0);
    expect(history.getRedoCount()).toBe(0);
  });

  it('commit pushes to undo stack and clears redo stack', () => {
    const history = new CommandHistory();
    const state1 = createMockModel('State 1');
    const state2 = createMockModel('State 2');

    history.commit(state1);
    expect(history.canUndo()).toBe(true);
    expect(history.getUndoCount()).toBe(1);

    // Pretend we did undo
    history.undo(state2);
    expect(history.canRedo()).toBe(true);

    // Commit a new state -> discards redo branch
    history.commit(state2);
    expect(history.canRedo()).toBe(false);
  });

  it('performs undo and redo round-trips correctly', () => {
    const history = new CommandHistory();
    const state1 = createMockModel('State 1');
    const state2 = createMockModel('State 2');
    const state3 = createMockModel('State 3');

    history.commit(state1); // Save state 1
    history.commit(state2); // Save state 2 (current is state 3)

    expect(history.getUndoCount()).toBe(2);

    // Undo from state 3 -> returns state 2 snapshot, saves state 3 to redo
    const undonState = history.undo(state3);
    expect(undonState?.name).toBe('State 2');
    expect(history.getRedoCount()).toBe(1);

    // Undo again -> returns state 1 snapshot, saves state 2 to redo
    const undonState2 = history.undo(state2);
    expect(undonState2?.name).toBe('State 1');
    expect(history.getRedoCount()).toBe(2);

    // Redo -> returns state 2, saves state 1 to undo
    const redonState = history.redo(state1);
    expect(redonState?.name).toBe('State 2');
  });

  it('respects maximum stack depth and evicts oldest', () => {
    const history = new CommandHistory(3);
    history.commit(createMockModel('S1'));
    history.commit(createMockModel('S2'));
    history.commit(createMockModel('S3'));
    history.commit(createMockModel('S4')); // Evicts S1

    expect(history.getUndoCount()).toBe(3);
    
    // Undo multiple times to see if S1 was indeed evicted
    const u1 = history.undo(createMockModel('S5')); // returns S4
    const u2 = history.undo(u1!); // returns S3
    const u3 = history.undo(u2!); // returns S2
    const u4 = history.undo(u3!); // returns null (S1 is evicted)

    expect(u4).toBeNull();
  });
});
