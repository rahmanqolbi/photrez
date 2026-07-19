# Known Issues — Photrez v0.1.0-alpha.1

This document lists known limitations and bugs in the current alpha release.
For bug reports, please open an issue at https://github.com/rahmanqolbi/photrez/issues.

## 🚨 Critical Limitations

### 1. Startup Time
- **Symptom:** Cold launch takes ~3.7 seconds (target: <2s).
- **Workaround:** None. App is usable after launch.
- **Fix planned:** Beta release (lazy loading, shader precompilation).

### 2. Windows-Only
- **Symptom:** No macOS or Linux builds available for alpha.
- **Workaround:** Use Windows 10/11. For Mac/Linux, build from source (untested).
- **Fix planned:** Beta release (cross-platform CI matrix).

## 🎨 Editor Limitations

### 3. Blend Modes
- **Symptom:** Only Normal, Multiply, Screen, Overlay are available in UI.
- **Reason:** Other modes exist in shader but are blocked pending WebGL preview / Canvas2D export parity tests.
- **Fix planned:** Beta release.

### 4. Selection Tools
- **Symptom:** Only rectangular marquee is available.
- **Not available:** Lasso, magic wand, ellipse selection.
- **MVP scope:** Rectangular only. Advanced selection is post-v1.0.

### 5. Brush Engine
- **Symptom:** Only round brush tip with hardness/flow/smoothing.
- **Not available:** Custom brush shapes, texture brushes, dynamics (pressure/tilt/velocity).
- **MVP scope:** Round tip only.

### 6. High-Zoom Pixelation
- **Symptom:** At zoom levels where canvas backing buffer would exceed 4096px, preview becomes pixelated.
- **Reason:** 4096px clamp to prevent WebGL context loss on low-VRAM GPUs.
- **Workaround:** Pan to inspect different regions instead of extreme zoom.

### 7. Large Layer Bake Hitch
- **Symptom:** First "Apply & Paint" on a layer with active adjustments may cause a brief hitch (50-200ms) for large layers (4K+).
- **Reason:** Synchronous `gl.readPixels` for GPU→CPU transfer.
- **Fix planned:** v1.0 (PBO-based async readback).

## 💾 File Format

### 8. PSD Not Supported
- **Symptom:** Cannot open or export `.psd` files.
- **MVP scope:** PSD is non-goal. Use PNG/JPEG/WebP for export.

### 9. Project Format (`.ptz`) May Change
- **Symptom:** `.ptz` format is not stable. Future versions may break compatibility.
- **Workaround:** Export to PNG/JPEG/WebP for long-term storage.
- **Stabilization:** v1.0.0 will lock `.ptz` format.

## 🔧 Development Limitations

### 10. No Plugin/Scripting API
- **Symptom:** No plugin or scripting support.
- **MVP scope:** Non-goal. Plugin SDK is post-v1.0.

### 11. No Cloud Sync
- **Symptom:** No cloud sync or collaboration features.
- **MVP scope:** Non-goal. Local-only editing.

### 12. Autosave is Local Only
- **Symptom:** Autosave writes to local app config directory. No cloud backup.
- **Workaround:** Manually save to cloud-synced folder (OneDrive, Google Drive).

## 🐛 Known Bugs

### 13. Window State Restore on Multi-Monitor
- **Symptom:** If saved window position is on a disconnected external monitor, app snaps to primary monitor center (intended), but may briefly flash at default size.
- **Fix planned:** Beta release.

### 14. Custom Titlebar Accessibility
- **Symptom:** Custom titlebar may not fully support keyboard navigation (Alt+Space system menu, F10 menu activation).
- **Workaround:** Use standard keyboard shortcuts (Ctrl+N, Ctrl+O, etc.).
- **Fix planned:** Beta release.

### 15. CSP Allows `unsafe-inline` for Styles
- **Symptom:** Content Security Policy allows inline styles (required for Tailwind CSS v4).
- **Risk:** Low — does not affect scripts. CSS injection is limited risk.
- **Fix planned:** v1.0 (hash-based CSP).

## 📊 Performance Notes

### 16. Idle RAM: ~34 MB — well below 250 MB target.
### 17. Installer Size: 4-6 MB — well below 80 MB target.
### 18. Test Coverage: 2499 frontend + 113 Rust cases (incl. Playwright E2E).

## 🔄 Migration Path

### From v0.1.0-alpha.1 to v0.1.0-beta
- `.ptz` files saved in alpha should load in beta (no breaking change planned).
- Settings and window state will migrate automatically.
- If breaking change is required, it will be documented in beta release notes.

## 📞 Reporting Issues

- **Bug reports:** https://github.com/rahmanqolbi/photrez/issues
- **Security reports:** See `SECURITY.md` (report privately before public disclosure)
- **Feature requests:** Open a discussion or issue with `feature-request` label

Thank you for testing Photrez alpha! Your feedback helps shape the beta and v1.0 releases.
