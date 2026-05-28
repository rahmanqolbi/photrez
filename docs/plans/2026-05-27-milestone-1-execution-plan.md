# Milestone 1: Foundation Setup Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Establish the repository structure, initialize the Tauri 2 desktop shell, Rust core skeleton, and wgpu renderer skeleton, and wire a minimal deterministic IPC command bridge under the new Professional Studio Gray (True Neutral) style guidelines.

**Architecture:** A modular workspace separating the desktop shell (Tauri 2, SolidJS, TS) from the core document state (Rust) and drawing capabilities (wgpu). Communication will flow deterministically via IPC command envelopes.

**Tech Stack:** Tauri 2, SolidJS, TypeScript, Vite, Rust, wgpu.

---

## Proposed Changes

### 1. Workspace Root Bootstrap
- Setup the Rust workspace and package infrastructure.
- Setup npm workspaces for the frontend shell.

#### [NEW] [Cargo.toml](file:///d:/Project/image-studio/Cargo.toml)
#### [NEW] [package.json](file:///d:/Project/image-studio/package.json)
#### [NEW] [pnpm-workspace.yaml](file:///d:/Project/image-studio/pnpm-workspace.yaml)

### 2. Desktop Shell Initializer (Tauri 2 + SolidJS)
- Bootstrap Tauri 2 desktop application.
- Setup basic app frame using SolidJS + TS styled with the new Professional Studio Gray tokens.

#### [NEW] [apps/desktop/src/index.tsx](file:///d:/Project/image-studio/apps/desktop/src/index.tsx)
#### [NEW] [apps/desktop/src/App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx)
#### [NEW] [apps/desktop/src/index.css](file:///d:/Project/image-studio/apps/desktop/src/index.css)
#### [NEW] [apps/desktop/src-tauri/tauri.conf.json](file:///d:/Project/image-studio/apps/desktop/src-tauri/tauri.conf.json)

### 3. Rust Core Skeleton Crate
- Bootstrap `crates/core` with document, layers, and basic transforms placeholder.

#### [NEW] [crates/core/Cargo.toml](file:///d:/Project/image-studio/crates/core/Cargo.toml)
#### [NEW] [crates/core/src/lib.rs](file:///d:/Project/image-studio/crates/core/src/lib.rs)

### 4. Renderer Skeleton Crate (wgpu)
- Bootstrap `crates/render` with minimal viewport rendering pipeline.

#### [NEW] [crates/render/Cargo.toml](file:///d:/Project/image-studio/crates/render/Cargo.toml)
#### [NEW] [crates/render/src/lib.rs](file:///d:/Project/image-studio/crates/render/src/lib.rs)

### 5. Shell-Core-Renderer Command Bridge
- Wire Tauri commands to Rust Core/Renderer.
- Return deterministic success/error payloads matching ADR 0002.

---

## Detailed Tasks

### Task 5: Repository and Workspace Bootstrap

**Files:**
- Create: [Cargo.toml](file:///d:/Project/image-studio/Cargo.toml)
- Create: [package.json](file:///d:/Project/image-studio/package.json)
- Create: [pnpm-workspace.yaml](file:///d:/Project/image-studio/pnpm-workspace.yaml)

**Step 1: Write root configurations**
Create a root `Cargo.toml` defining the workspace members (`apps/desktop/src-tauri`, `crates/core`, `crates/render`). Setup `package.json` and workspace manifests.

**Step 2: Verify compiling skeleton**
Run: `.\rtk.exe cargo check`
Expected: Succeeds (no crates created yet, empty workspace should be valid or require minimal crates placeholders).

---

### Task 6: Initialize Tauri Desktop Shell

**Files:**
- Create: `apps/desktop` folder layout
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src/App.tsx` (using Professional Studio design system)

**Step 1: Bootstrap Tauri 2 SolidJS App**
Use Tauri CLI or setup manually to ensure exact dependency lock for SolidJS, TS, Vite.

**Step 2: Apply Professional Studio Gray**
Ensure `index.css` defines the Studio Neutral Grays, Studio Indigo aksen (`#5C6AEA`), sharp radius, and `tabular-nums`.

**Step 3: Verify dev launch**
Run: `.\rtk.exe npm run tauri dev` or equivalent.
Expected: App launches successfully, displaying a neutral dark gray frame.

---

### Task 7: Rust Core Skeleton

**Files:**
- Create: [crates/core/Cargo.toml](file:///d:/Project/image-studio/crates/core/Cargo.toml)
- Create: [crates/core/src/lib.rs](file:///d:/Project/image-studio/crates/core/src/lib.rs)

**Step 1: Write core interfaces**
Implement minimal structs for Document, Layer, Transform with unit test asserts.

**Step 2: Verify compiling and tests**
Run: `.\rtk.exe cargo test -p photrez-core`
Expected: 100% tests passing.

---

### Task 8: Renderer Skeleton (wgpu)

**Files:**
- Create: [crates/render/Cargo.toml](file:///d:/Project/image-studio/crates/render/Cargo.toml)
- Create: [crates/render/src/lib.rs](file:///d:/Project/image-studio/crates/render/src/lib.rs)

**Step 1: Write wgpu viewport pipeline skeleton**
Bootstrap wgpu adapter selection and device/queue creation safely, failing closed if unsupported.

**Step 2: Verify wgpu targets**
Run: `.\rtk.exe cargo check -p photrez-render`
Expected: Crate compiles cleanly.

---

### Task 9: Shell-Core-Renderer Command Bridge

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Wire Tauri Command Handlers**
Implement commands accepting deterministic payload envelope. Wire to Core and Renderer.

**Step 2: Verify deterministic payloads**
Run tests on command handler interfaces.
Expected: Core/Shell IPC exchanges return correct versions and success envelopes.

---

## Verification Plan

### Automated Tests
- `.\rtk.exe cargo test --workspace` (Rust logic)
- `.\rtk.exe npm run test` (Frontend logic, if any tests available)

### Manual Verification
- Launch application: `.\rtk.exe npm run tauri dev` or `.\rtk.exe cargo tauri dev`
- Inspect application UI visually: Check that background matches `#1A1A1C`, accent color is `#5C6AEA`, fonts are native, borders are sharp.
