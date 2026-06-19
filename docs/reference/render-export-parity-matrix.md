# Render / Export Parity Matrix

Status date: 2026-06-19

This matrix is the release gate for blend modes that affect both WebGL preview and Canvas2D export. A mode may be exposed in the product UI only when it is listed in `BLEND_MODE_OPTIONS` and has matching preview/export behavior documented here.

## Blend Modes

| Mode | UI exposed | Engine `BlendMode` | WebGL preview | Canvas2D export | Status |
| --- | --- | --- | --- | --- | --- |
| Normal | Yes | `normal` | `u_blendMode = 0` | `source-over` | Verified MVP |
| Multiply | Yes | `multiply` | `u_blendMode = 1` | `multiply` | Verified MVP |
| Screen | Yes | `screen` | `u_blendMode = 2` | `screen` | Verified MVP |
| Overlay | Yes | `overlay` | `u_blendMode = 3` | `overlay` | Verified MVP |
| Darken | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Lighten | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Color Dodge | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Color Burn | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Hard Light | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Soft Light | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Difference | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |
| Exclusion | No | Not allowed | Shader branch exists | Not product-gated | Blocked until parity tests exist |

## Gate

- The product UI renders blend modes from `apps/desktop/src/engine/blendModes.ts`.
- `LayersPanel` must not cast arbitrary select values to `BlendMode`.
- Export compositing must use the registry's Canvas2D operation mapping.
- Adding a new blend mode requires updating this matrix, the `BlendMode` type, the registry, WebGL shader mapping, export mapping, and preview/export parity tests.
