# Photrez Unwired Features & Batch Performance Audit Report

This report details dead-code features, skipped integrations, and batch-processing inefficiencies found during the codebase audit.

---

## 1. Dead Code & Skipped Integrations

### 🚨 1. Unwired Memory Budget Check (`paintHistoryBudget.ts`)
- **Location:** `apps/desktop/src/engine/paintHistoryBudget.ts`
- **Issue:** A complete module for estimating memory budgets (`estimatePaintHistoryBudget`) exists in the engine directory. It calculates layer byte size and dirty regions against `MAX_PIXEL_BUDGET` (1 GB) to prevent heap exhaustion. However, this function is **only** referenced inside unit tests (`paintHistoryBudget.test.ts`).
- **Impact:** The application does not check memory budgets at runtime. If a user opens or creates layers exceeding the 1 GB pixel budget, the WebView2 process will experience an Out Of Memory (OOM) crash without warning.
- **Remedy:** Integrate `estimatePaintHistoryBudget` into layer creation, painting, and crop operations to reject sizes that exceed the memory ceiling.

---

## 2. Batch Processing Performance Risks

### ⚡ 2. Layout Thrashing on Batch File Opening
- **Location:** `apps/desktop/src/components/editor/editorOpenImage.ts` (lines 69-73)
- **Issue:** Opening multiple files triggers a sequential loop:
  ```typescript
  for (let i = 0; i < total; i++) {
    await openSingleFile(paths[i], params);
  }
  ```
  `openSingleFile` calls `workspace.addDocument(session)`, which immediately mutates the `activeDocumentId` and triggers workspace `onChange` listeners.
- **Impact:** The frontend reactivity loop is forced to execute full renders, fit-to-screen camera calculations, and layout updates for *every single document* in rapid succession. This causes significant interface flicker and layout thrashing during batch imports.
- **Remedy:** Refactor batch loading to load and decode files in parallel using `Promise.all` (leveraging multi-threaded image decoding in browser workers), add them to the workspace, and set the final active document in a single batch update.
