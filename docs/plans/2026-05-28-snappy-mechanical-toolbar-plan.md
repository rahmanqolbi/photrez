# Snappy & Mechanical Toolbar Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Overhaul the Contextual Tool Options Bar (Toolbar) to a high-density, professional desktop CAD/graphics style with absolute height alignment, mechanical separators, unit suffixes, stroke spinners, and interactive toggle indicators.

**Architecture:** Inject reactive SolidJS signals for tool properties (`strokeWidth`, `strokeStyle`) and workspace configuration (`inspectorOpen`). Toggle the right inspector visibility dynamically, resizing the main artboard viewport grid automatically. Implement custom pixel-perfect markup for unified tool buttons and inputs.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS v4, Lucide Icons.

---

### Task 1: Add Signals and State in App.tsx

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Add signals for `strokeWidth`, `strokeStyle`, and `inspectorOpen`)

**Step 1: Write the changes**
- Near the other signals (lines 20-30), add:
  ```typescript
  const [strokeWidth, setStrokeWidth] = createSignal(2.5);
  const [strokeStyle, setStrokeStyle] = createSignal("solid");
  const [inspectorOpen, setInspectorOpen] = createSignal(true);
  ```

**Step 2: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat: add signals for strokeWidth, strokeStyle, and inspectorOpen"
```

---

### Task 2: Implement Dynamic Grid Resizing in App.tsx

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Update main workspace columns and aside visibility)

**Step 1: Modify workspace wrapper**
- Target the `.workspace` div (around line 310) and replace it with:
  ```tsx
  <div class={`workspace grid ${inspectorOpen() ? "grid-cols-[48px_1fr_320px]" : "grid-cols-[48px_1fr]"} min-h-0 h-full overflow-hidden bg-studio-bg p-1.5 gap-1.5`}>
  ```

**Step 2: Modify Inspector aside visibility**
- Wrap the `<aside class="inspector ...">` panel (around lines 468-631) in a SolidJS `<Show>` block:
  ```tsx
  <Show when={inspectorOpen()}>
    <aside class="inspector bg-studio-panel border border-studio-border rounded-[8px] shadow-pro flex flex-col min-h-0 overflow-hidden h-full">
      {/* ... inspector body ... */}
    </aside>
  </Show>
  ```

**Step 3: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat: implement dynamic grid workspace resizing on inspector toggle"
```

---

### Task 3: Overhaul Contextual Options Bar (Toolbar) Markup in App.tsx

**Files:**
- Modify: [App.tsx](file:///d:/Project/image-studio/apps/desktop/src/App.tsx) (Replace the whole `<section class="toolbar ...">` block)

**Step 1: Replace options bar markup**
- Replace lines 276-307 with the overhauled layout including:
  - Unified `h-[26px]` heights.
  - Active tool display.
  - Recessed color swatch button.
  - High-precision numerical input with transparent unit prefix and spinner controls.
  - Stroke Style segmented button capsule.
  - Inspector Toggle Button linked to `inspectorOpen()`.
  - Polished Export Button.
- The precise replacement markup:
  ```tsx
  {/* 2. CONTEXTUAL TOOL OPTIONS BAR */}
  <section class="toolbar flex items-center justify-between px-4 bg-studio-bg border-b border-studio-border h-10 text-[13px] text-text-secondary select-none" aria-label="Tool options bar">
    <div class="flex items-center gap-4">
      {/* Active Tool Group */}
      <div class="flex items-center gap-2 pr-4 h-[26px]">
        <PenTool size={15} class={activeTool() === "pen" ? "text-accent" : ""} />
        <span class="font-bold text-text-primary text-[11px] uppercase tracking-wider select-none">{activeTool()} tool</span>
      </div>
      
      {/* Divider */}
      <div class="h-4 border-r border-studio-border self-center"></div>

      {/* Fill Color Option */}
      <div class="flex items-center gap-2">
        <span class="text-text-muted text-[10px] font-bold uppercase select-none">Fill</span>
        <button class="h-[26px] bg-studio-input border border-studio-border hover:bg-studio-elevated rounded-md px-2.5 flex items-center gap-1.5 cursor-default transition-colors duration-75">
          <span class="w-2.5 h-2.5 rounded-[1px] bg-gradient-to-tr from-accent to-accent-hover border border-white/20 flex-shrink-0"></span>
          <span class="text-[12px] font-semibold text-text-primary">Photon Amber</span>
          <ChevronDown size={12} class="text-text-muted" />
        </button>
      </div>

      {/* Divider */}
      <div class="h-4 border-r border-studio-border self-center"></div>

      {/* Stroke Option with Spinners */}
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-studio-input border border-studio-border rounded-md overflow-hidden h-[26px] focus-within:border-accent transition-colors duration-100">
          <span class="text-[10px] font-bold text-text-muted px-2.5 select-none border-r border-studio-border/50 h-full flex items-center bg-white/[1%]">STROKE</span>
          <input 
            type="text" 
            class="w-10 text-center text-[12px] font-semibold text-text-primary bg-transparent border-none outline-none tabular-nums px-1" 
            value={strokeWidth().toFixed(1)} 
            onInput={(e: any) => {
              const val = parseFloat(e.currentTarget.value);
              if (!isNaN(val)) setStrokeWidth(Math.max(0, val));
            }}
          />
          <span class="text-[10px] font-bold text-text-muted select-none pr-1.5 pointer-events-none">px</span>
          
          {/* Micro-Spinner step triggers */}
          <div class="w-4 h-full flex flex-col divide-y divide-studio-border border-l border-studio-border">
            <button 
              onClick={() => setStrokeWidth(w => w + 0.5)}
              class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
              title="Increase Stroke"
            >
              ▲
            </button>
            <button 
              onClick={() => setStrokeWidth(w => Math.max(0, w - 0.5))}
              class="flex-1 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-default text-[7px]"
              title="Decrease Stroke"
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div class="h-4 border-r border-studio-border self-center"></div>

      {/* Stroke Style Option */}
      <div class="flex items-center gap-2">
        <span class="text-text-muted text-[10px] font-bold uppercase select-none">Style</span>
        <div class="bg-studio-input border border-studio-border rounded-md p-0.5 h-[26px] flex items-center gap-0.5 select-none">
          <button 
            onClick={() => setStrokeStyle("solid")}
            class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
              strokeStyle() === "solid"
                ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Solid Stroke"
          >
            <div class="w-4 h-[2px] bg-current"></div>
          </button>
          <button 
            onClick={() => setStrokeStyle("dashed")}
            class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
              strokeStyle() === "dashed"
                ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Dashed Stroke"
          >
            <div class="w-4 h-[2px] border-b-2 border-dashed border-current"></div>
          </button>
          <button 
            onClick={() => setStrokeStyle("dotted")}
            class={`px-2 h-full flex items-center justify-center rounded cursor-default transition-all duration-75 ${
              strokeStyle() === "dotted"
                ? "bg-studio-elevated text-accent border border-studio-border-strong shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Dotted Stroke"
          >
            <div class="w-4 h-[2px] border-b-2 border-dotted border-current"></div>
          </button>
        </div>
      </div>
    </div>

    {/* Right Action buttons */}
    <div class="flex items-center gap-3">
      {/* Inspector toggle with state representation */}
      <button 
        onClick={() => setInspectorOpen(!inspectorOpen())}
        class={`h-[26px] px-2.5 flex items-center gap-1.5 border rounded-md text-[11px] font-bold tracking-wider cursor-default transition-all duration-75 select-none ${
          inspectorOpen()
            ? "bg-studio-bg border-accent/40 text-accent shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)]"
            : "bg-studio-input border-studio-border text-text-secondary hover:text-white hover:bg-studio-elevated"
        }`}
        title="Toggle Inspector Panel"
      >
        <SlidersHorizontal size={13} />
        <span>INSPECTOR</span>
      </button>

      {/* Export Action */}
      <button class="h-[26px] px-3 flex items-center gap-1.5 bg-accent hover:bg-accent-hover active:bg-accent-active text-white text-[11px] font-bold tracking-wider rounded-md shadow-sm cursor-default transition-colors">
        <Share size={13} />
        <span>EXPORT</span>
      </button>
    </div>
  </section>
  ```

**Step 2: Commit**
```bash
git add apps/desktop/src/App.tsx
git commit -m "feat: overhaul contextual option bar layout and action triggers"
```

---

### Task 4: Verify Compilation and Run Build

**Files:**
- Test: Build pipeline check

**Step 1: Run build check**
Run: `pnpm run build`
Expected: Success build output within 7 seconds with zero warnings or errors.

**Step 2: Verify in browser/desktop environment**
- Hot reloading is instant under `pnpm tauri dev`. Verify that the toolbar is perfectly aligned, dividers appear, and clicking the "INSPECTOR" button cleanly collapses the panel and stretches the canvas viewport dynamically.
