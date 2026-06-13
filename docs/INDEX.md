# docs/INDEX.md — Photrez Documentation Guide

> AI agents: use this index to know **when** to read each file. Do NOT load all files at once.

---

## 🔴 Always Read (Core AI Docs)

These are loaded via `AGENTS.md` read order on every task:

| File | Purpose |
|---|---|
| `AI_CONTEXT.md` | **START HERE** — strict AI rules, stack, protocol |
| `AI_CURRENT_TASK.md` | Active task tracking |
| `AI_HISTORY.md` | Change history log |
| `FEATURES.md` | Feature implementation status |
| `ARCHITECTURE.md` | Runtime architecture reference |
| `CONVENTIONS.md` | Code patterns, SolidJS, Tauri IPC, Move Tool |

---

## 🟡 Read When Relevant (Subfolder References)

Load these only when working on the related subsystem:

### Specifications (`spec/`)

| File | Read when... |
|---|---|
| `spec/product-scope.md` | Checking MVP scope boundaries |
| `spec/prd.md` | Need product requirements or acceptance criteria |
| `spec/trd.md` | Need technical requirement details or contract specs |
| `spec/data-model.md` | Working on document model or data structures |
| `spec/build-plan.md` | Reviewing milestone timeline and dependencies |

### Decisions & Risks (`decisions/`)

| File | Read when... |
|---|---|
| `decisions/id-decision-log.md` | Making or reviewing architectural decisions |
| `decisions/risk-register.md` | Milestone gate review or assessing active project risks |
| `decisions/adr/` | Architectural Decision Records (deep-dive design decisions) |

### Technical Reference (`reference/`)

| File | Read when... |
|---|---|
| `reference/command-contract-spec.md` | Modifying or adding Tauri IPC commands |
| `reference/design-tokens.md` | Working on UI styling (token values) |
| `reference/dependency-inventory.md` | Adding or auditing dependencies |
| `reference/keyboard-shortcut-map.md` | Adding or modifying keyboard shortcuts |
| `reference/file-format-support.md` | Working on import/export logic |
| `reference/save-and-document-lifecycle.md` | Working on save/open/new/close flows |
| `reference/error-code-registry.md` | Adding error handling or new error codes |
| `reference/glossary.md` | Need consistent terminology |
| `reference/ui-style-guide-preview.html` | Visual preview of design tokens |
| `reference/ui-full-editor-mockup.html` | Full editor shell mockup (visual reference) |

---

## 🔵 Milestone & Archive Reference

| File | Purpose |
|---|---|
| `archive/usable-mvp-recovery-plan.md` | Recovery planning reference |
| `archive/planning/` | Planning-phase documents and templates (26 files) |
| `plans/` | Active execution plans and task details |
| `superpowers/` | Core AI tool/skill profiles and workflows |
