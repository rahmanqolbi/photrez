# ADR 0001: Adopt Hybrid Modular Architecture (Tauri + Rust Core + wgpu)

## Status

Accepted

## Context

The product targets low-end Windows devices with strict footprint and performance constraints while preserving familiar editing workflows.

## Decision

Adopt a three-layer architecture:

- Shell: Tauri
- Core: Rust image and document engine
- Renderer: wgpu

## Consequences

### Positive

- Better control over memory and startup profile.
- Clear module boundaries for long-term maintainability.
- Distinct product implementation while preserving familiar UX patterns.

### Negative

- Higher initial architecture/setup complexity.
- Requires discipline in interface contracts between modules.

## Follow-up

- Define command contracts in TRD.
- Add benchmark checks for startup/memory/package size.
