# 37 - Internationalization Strategy Note (MVP)

This document records the i18n strategy decision for Photrez to prevent
early architecture decisions that block localization later.

## 1) MVP Decision

- **UI language for MVP: English only.**
- Internal documentation: bilingual (English + Bahasa Indonesia) where needed.
- No runtime i18n framework is required in MVP.

## 2) Architecture Guardrails (Even Without i18n in MVP)

To avoid blocking future localization, follow these rules during MVP development:

### Do

- Keep all user-facing strings in one dedicated file or module per component (not scattered inline).
- Use semantic keys for error messages in Core (e.g., `E_VALIDATION` + `message` field), not hardcoded prose in business logic.
- Follow `docs/28-ui-copy-guidelines.md` for consistent wording patterns.
- Keep date, number, and currency formatting locale-aware where possible (use `Intl` API in frontend).

### Do Not

- Do not hardcode user-facing strings directly in Rust core business logic.
- Do not embed English phrases in enum variants or struct field names that become user-visible.
- Do not concatenate strings for user messages (makes translation difficult).
- Do not assume LTR text direction in layout calculations (even though MVP is English only).

## 3) Planned Post-MVP Approach

When i18n is implemented:

1. **Framework**: evaluate `@solid-primitives/i18n` or simple JSON-based key-value system.
2. **Key format**: `namespace.section.key` (e.g., `file.export.success`, `error.layer.locked`).
3. **Fallback**: English as default fallback language.
4. **Priority languages** (tentative):
   - Bahasa Indonesia (primary market)
   - English (default)
5. **Translation workflow**: key extraction → translation → review → integration.

## 4) Error Message Strategy

Even in MVP, error messages from Core should follow a pattern that supports future i18n:

```rust
// Good: structured error with code and template
Error {
    code: "E_VALIDATION",
    message: "Opacity must be between 0% and 100%.",
    details: { field: "opacity", received: 1.7 }
}

// Bad: hardcoded prose deep in business logic
panic!("Opacity harus antara 0 sampai 100 persen")
```

The `message` field is always English in MVP. Post-MVP, the frontend can map
`code` + `details` to localized strings.

## 5) Change Control

- This note is informational for MVP. No action required unless i18n timeline changes.
- If i18n moves into MVP scope, promote this to a full TRD section and add ADR.
