# 00 - Vision and Strategy

## Product Name (Working)

- `Photrez`
- Suggested subtitle: `Lightweight Image Editor for Practical Design`

## Product Vision

Photrez is a lightweight desktop image editor designed for practical digital and print workflows.

## Positioning

- Familiar enough for fast switching from mainstream editors.
- Different enough to avoid clone perception and establish unique product identity.
- Practical for content creators, UMKM, and print shops.

Suggested line:

- `A lightweight desktop image editor for practical design and print workflows.`

## Target Users (Priority Order)

1. Content creator / UMKM
2. Small print shops and digital printing operators
3. Freelance designers and students

## Product Principles

1. Lightweight by default (`<80 MB` installer, low idle RAM, fast startup).
2. Rust core is source of truth for document and heavy operations.
3. UI familiarity with Photrez-owned identity.
4. PSD compatibility is progressive and transparent.
5. Print workflow is a strategic differentiator.
6. Open format and open plugin ecosystem are long-term strategy.

## Non-Clone Guardrails

- Do not copy third-party trademarks, logos, or product identity.
- Do not mirror panel/toolbar layout one-to-one.
- Keep naming, iconography, and visual system distinct.
- Reuse generic editor concepts only (layers, selection, transform, blend, export).

## Technology Direction

- Desktop shell: Tauri 2
- Frontend: SolidJS + TypeScript + Vite
- Core engine: Rust
- Renderer: wgpu
- License direction: AGPL-3.0-or-later

## Communication Rule

- Product messaging is performance-first and workflow-first.
- Open-source status is documented in licensing/governance docs, not treated as the primary headline.

## Scope Layers

### Layer A: MVP v1 (Now)

- Strictly defined in `00-product-scope.md` and `01-prd.md`.

### Layer B: Near-term Expansion (After v1)

- PSD preview/basic edit workflow
- Command palette
- Print checker (DPI/resolution/bleed/safe-area)
- Native project document format (extension TBD)

### Layer C: Longer-term Platform

- Plugin API
- Template ecosystem
- Optional cloud/pro features

## Roadmap Communication Rule

- Never market by positioning against a named third-party product in early phases.
- Use transparent capability statements (for example: `PSD Preview & Basic Edit`).
