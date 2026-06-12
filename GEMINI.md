# Photrez Design Context & Standards (LITM)

## 1) Visual Aesthetic: Soft & Snappy
Photrez uses a **"Soft & Snappy"** aesthetic. It avoids both "Mechanical Rigidity" (2px sharp corners) and "AI Slop" (generic glassmorphism/deep blurry shadows).

- **Global Radius**:
  - `8px` (`--radius-lg`) for outer panels and main containers.
  - `6px` (`--radius-md`) for buttons and tabs.
  - `4px` (`--radius-sm`) for inputs and small elements.
- **Color Strategy**: Zero-tint neutral grays for UI surfaces to prevent color bias during image editing. Signature accent is **Photon Amber** (`#E15A17`).
- **Surfaces**: Solid surfaces only. No `backdrop-filter: blur`.

## 2) Technical Standards: Strict TypeScript (TSX)
- **100% TypeScript**: This project is strictly TypeScript. **NO `.js` or `.jsx` files are allowed** in the frontend source (`src/`).
- **File Integrity**: Any detection of `.js` or `.jsx` files in `src/` is considered a critical engineering failure. They must be deleted immediately.
- **Styling**: strictly **Tailwind-first** (Tailwind v4).
- All design tokens are defined in `@theme` within `src/index.css`.
- Use custom component classes via `@layer components` for complex precision (e.g., `.studio-input`, `.tool-btn`).

## 3) Layout: Docked Precision
- **Docking**: Main side panels (Tool Rail, Inspector) must be **docked** to the window edges. No external margins or floating shadows.
- **Rounding Logic**: Only round the **inner corners** (facing the canvas). Outer corners (touching window edges) must remain sharp (`0px`).
- **Tool Rail (Raw Pro)**:
  - Must use **Mechanical Dividers** (1px lines) to group tools (Nav, Draw, Edit).
  - Active tool must use an **Inset Shadow** state and a solid accent bar (No glows).
  - Tools with variants must use the **Micro-Indicator** (3px triangle) in the bottom-right corner.
- **Shadows**: Use `--shadow-pro` (tight 1px stroke + sharp shadow) only on the inner side that borders the canvas.

## 4) Anti-Slop Safeguards
- **NO** deep blurry shadows (`shadow-2xl` or generic SaaS shadows).
- **NO** glassmorphism unless functionally justified.
- **YES** pixel-perfect 1px borders using `--color-border-subtle`.
- **YES** inset depth for inputs to provide clear affordance.

## 6) Research Protocol: Context7
To prevent runtime crashes and build errors (like the Tauri/Vite initialization issues), **Context7 MUST be used** for all library-specific documentation and API references (Tauri, SolidJS, Tailwind v4, etc.).
- Never rely on training data for API signatures.
- Always use `resolve-library-id` before querying docs.
