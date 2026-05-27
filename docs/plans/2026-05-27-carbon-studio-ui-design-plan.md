# Carbon Studio UI Mockup Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the Photrez classic mockup (`docs/30-ui-full-editor-mockup.html`) into a highly polished, modern, native-feeling dark desktop UI using TailwindCSS v4 and Lucide icons.

**Architecture:** We will replace the custom raw CSS and inline emoji text elements in the existing standalone HTML mockup with TailwindCSS classes, high-fidelity Google Fonts (Archivo + JetBrains Mono), vector SVGs, custom dense interactive panels, and modern micro-interaction layers.

**Tech Stack:** HTML5, TailwindCSS v4 (via Play CDN), Lucide Icons (via CDN), Google Fonts.

---

### Task 1: Redesign the Menubar & Application Header

**Files:**
- Modify: `docs/30-ui-full-editor-mockup.html:1-729` (Complete refactor of the header area)

**Step 1: Write the HTML and CSS skeleton**
```html
<!-- We will inject Tailwind Play CDN, Google Fonts, and Lucide Icons in the head -->
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300..900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"></script>
```

**Step 2: Implement the new menubar with native style**
- Configure the menubar (`bg-[#16181c] border-b border-[#252830] h-[30px] flex items-center justify-between px-3 select-none font-['Archivo'] text-[13px]`)
- Add dropdown triggers with aligned keyboard shortcuts (`Ctrl+N`, `Ctrl+O`, etc.) in the submenus.
- Add active Lapis Sapphire highlights.

**Step 3: Verify visually in the browser**
- Run: Verify that the menu is properly aligned, font rendering is clean, and the dropdown shortcuts are right-aligned.
- Expected: High-precision native feel, no text selection, no wrapping.

**Step 4: Commit**
```bash
git add docs/30-ui-full-editor-mockup.html
git commit -m "style: implement modern menubar header"
```

---

### Task 2: Build the Vertical Tool Rail with Lapis Accent Indicators

**Files:**
- Modify: `docs/30-ui-full-editor-mockup.html`

**Step 1: Replace raw emoji text button rails with Lucide SVG vectors**
- Select the container: `aside.tool-rail`
- Implement vertical rail (`bg-[#16181c] border-r border-[#252830] w-[48px] flex flex-col items-center py-2 gap-1`)
- Group tools logically:
  - Transform tools (Move `lucide-move`, Crop `lucide-crop`, Select `lucide-mouse-pointer-square-dashed`)
  - Edit tools (Brush `lucide-brush`, Eraser `lucide-eraser`, Text `lucide-type`, Shape `lucide-square`)
  - View tools (Zoom In, Zoom Out)

**Step 2: Add sub-pixel Lapis Sapphire dot/bar active indicators**
- Active state: Add a tiny, glowing vertical indigo indicator (`w-[3px] h-[16px] bg-[#2f8ff5] rounded-full absolute left-1`) for active tools, removing the blocky background box.
- Hover state: A subtle transparent dark highlight (`hover:bg-[#20232a] duration-150`).

**Step 3: Verify visual alignment**
- Expected: All icons are perfectly centered, exactly 16px high, and have responsive cursor pointers.

**Step 4: Commit**
```bash
git add docs/30-ui-full-editor-mockup.html
git commit -m "style: build Left Tool Rail with Lucide icons"
```

---

### Task 3: Build the Right Inspector Panels with Segmented Slider Control

**Files:**
- Modify: `docs/30-ui-full-editor-mockup.html`

**Step 1: Refactor the Segmented Tabs Header**
- Replace the classic tabs bar with a segmented pill slider (`rounded-full bg-[#0e1013] p-[3px] border border-[#252830] mx-2 my-2 flex text-[12px]`)
- Active tab has a dark grey overlay (`bg-[#20232a] text-[#2f8ff5] rounded-full shadow-sm`) with soft transitions.

**Step 2: Redesign the Layer Stack with inline density**
- Layer items should be highly compact (`h-[28px] border-b border-[#252830] flex items-center px-2 text-[12px] font-['Archivo']`)
- Include highly clean active states with a subtle blue tint background (`bg-gradient-to-r from-[#2f8ff5]/10 to-transparent`) and solid active outline ring.
- Replace emojis with clean Lucide icons (eye, lock).

**Step 3: Redesign Properties Panel with jet-black Monospace coordinates**
- Create numeric inputs with a clean technical style (`font-['JetBrains_Mono'] text-[11px] bg-[#090a0c] border border-[#252830] text-[#9ea8b6] h-[24px] px-1.5 focus:ring-1 focus:ring-[#2f8ff5] focus:border-[#2f8ff5] outline-none`)

**Step 4: Commit**
```bash
git add docs/30-ui-full-editor-mockup.html
git commit -m "style: build Right Inspector panel and tabs slider"
```

---

### Task 4: Polish Canvas Viewport & Native Custom Scrollbar Integration

**Files:**
- Modify: `docs/30-ui-full-editor-mockup.html`

**Step 1: Refactor Rulers & Center Canvas Grid**
- Apply jet-black canvas backdrop (`bg-[#090a0c]`)
- Style the rulers with ultra-fine lines and monospaced gray numbers.
- Give the artboard element a clean drop shadow and a sleek thin border.

**Step 2: Add custom CSS to style native scrollbars and selection locks**
- Add:
```css
* {
  scrollbar-width: thin;
  scrollbar-color: #252830 transparent;
}
.select-none {
  user-select: none;
  -webkit-user-select: none;
}
```

**Step 3: Commit and deliver final polished mockup**
```bash
git add docs/30-ui-full-editor-mockup.html
git commit -m "style: final mockup polish with custom scrollbars and layout density"
```
