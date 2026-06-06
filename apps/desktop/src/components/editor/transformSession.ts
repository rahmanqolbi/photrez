import type { DocumentModel, Transform2D } from "@/engine/types";
import type { LayerTransformSession } from "./editorState";

export interface TransformSessionEngine {
  getId(): string;
  snapshot(): DocumentModel;
  restore(snapshot: DocumentModel): void;
  getLayer(id: string): { id: string; transform: Transform2D } | null | undefined;
  transformLayer(id: string, transform: Partial<Transform2D>): void;
}

export interface TransformSessionHistory {
  commit(snapshot: DocumentModel): void;
}

export function isSessionForEngine(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): session is LayerTransformSession {
  return Boolean(session && engine && session.documentId === engine.getId());
}

export function commitLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined,
  history: TransformSessionHistory | null | undefined
): boolean {
  if (!session || !engine || !history) return false;
  if (!isSessionForEngine(session, engine)) return false;
  const layer = engine.getLayer(session.layerId);
  if (!layer) return true;
  history.commit(session.originalSnapshot);
  return true;
}

export function cancelLayerTransformSession(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): boolean {
  if (!session || !engine) return false;
  if (!isSessionForEngine(session, engine)) return false;
  engine.restore(session.originalSnapshot);
  return true;
}

export function resetLayerTransformPreview(
  session: LayerTransformSession | null,
  engine: TransformSessionEngine | null | undefined
): boolean {
  if (!session || !engine) return false;
  if (!isSessionForEngine(session, engine)) return false;
  engine.transformLayer(session.layerId, session.originalTransform);
  return true;
}
