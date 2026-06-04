# Plugin Policy

## Purpose

This document defines baseline rules for plugin design and integration.

## Current Status

- Plugin runtime is out of MVP v1 scope.
- Policy is defined early to prevent architectural and legal drift.

## Technical Boundaries

- Plugins must use stable command interfaces, not internal module access.
- Plugin APIs must not bypass core validation, error handling, or resource guardrails.
- Core document state remains owned by Rust core.

## Security Baseline

- Treat plugin input/output as untrusted.
- Prefer sandboxed execution model where possible.
- Block plugin capabilities that can mutate filesystem/network without explicit policy.

## Licensing Baseline

- Official plugins must be AGPL-compatible.
- Third-party plugin compatibility is the plugin author's responsibility.
- Any future exceptions must be explicitly documented and approved.

## Future Expansion

- Define plugin SDK versioning.
- Define plugin review and signing policy.
- Define permission model and capability declarations.
