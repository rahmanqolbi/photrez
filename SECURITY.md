# Security Policy

Photrez is pre-release desktop software. Security reports are welcome, especially for file handling, desktop shell boundaries, dependency risk, and unsafe native integration.

## Supported Scope

Security reports are accepted for:

- Tauri command bridge and desktop shell boundaries.
- Import, export, decode, encode, and file I/O paths.
- Dependency and supply-chain concerns.
- Denial-of-service issues caused by crafted image files or project inputs.
- Unsafe behavior around native dialogs, drag and drop, or filesystem access.

## Reporting a Vulnerability

Please report vulnerabilities privately before public disclosure. If GitHub private vulnerability reporting is enabled for the repository, use that channel. Otherwise, contact the maintainers privately before opening a public issue with exploit details.

Include:

- Reproduction steps.
- Affected commit, branch, or release.
- Impact assessment if known.
- Minimal sample files when safe to share privately.

Response targets:

- Initial acknowledgment: within 72 hours.
- Triage and severity classification: as soon as reproducible.
- Fix timeline: based on severity and release risk.

## Handling Guidelines

- Treat imported files as untrusted input.
- Prefer fail-closed behavior for parser, decode, and shell boundary errors.
- Do not include exploit details in public issues before a fix or mitigation is available.
- Keep reports scoped and reproducible.
