# 23 - Design Tokens (MVP Baseline)

Token ini menjadi sumber tunggal styling UI Photrez di MVP.

> **Last synced**: 2026-05-27 â€” Accent migrated from Studio Indigo â†’ Photon Amber. Layout dimensions scaled up for ergonomics.

## 1) Usage Rules

1. Jangan hardcode nilai warna/spacing/radius di komponen.
2. Semua style baru harus memakai token di file ini.
3. Jika token baru diperlukan, tambahkan di file ini dulu.

## 2) Color Tokens (Professional Studio)

```css
:root {
  /* Studio Neutral Grays (Zero-Tint for accurate color perception) */
  --color-bg-app: #1A1A1C;         /* Editor Shell / Menubar */
  --color-bg-panel: #202022;       /* Inspector & Sidebars */
  --color-bg-elevated: #29292B;    /* Controls / Active Tabs */
  --color-bg-input: #121214;       /* Deep input fields (studio-input) */
  --color-bg-canvas-wrap: #161618; /* Deepest backdrop behind artboard */

  --color-border-subtle: #343438;
  --color-border-strong: #424246;

  /* Low Eye-Strain Typography */
  --color-text-primary: #D4D4D8;   /* Muted White/Silver */
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #8E8E93;      /* Increased brightness for 4.5:1 contrast ratio */

  /* Signature Accent: Photon Amber (changed from Studio Indigo 2026-05-27) */
  --color-accent: #E15A17;          /* Base â€” warm orange */
  --color-accent-hover: #F97316;    /* Hover â€” brighter */
  --color-accent-active: #C2410C;   /* Pressed â€” deeper */

  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #E15A17;             /* Matches accent */

  --color-focus-ring: #E15A17;
}
```

## 3) Typography Tokens

```css
:root {
  --font-family-ui: "Segoe UI Variable Text", "Segoe UI", sans-serif;
  --font-size-xs: 11px;  /* Micro Labels / Coordinates / Shortcuts */
  --font-size-sm: 12px;  /* Secondary / Meta / Toolbar */
  --font-size-md: 13px;  /* Base UI / General Text */
  --font-size-lg: 14px;  /* Panel Headers */

  --font-weight-regular: 400;
  --font-weight-medium: 500;  /* Strict Baseline */
  --font-weight-semibold: 600;

  --line-height-tight: 1.2;
  --line-height-normal: 1.4;
}
```

## 4) Spacing Tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}
```

## 5) Radius and Border Tokens

```css
:root {
  --radius-sm: 4px;   /* Inputs / Small Elements */
  --radius-md: 6px;   /* Buttons / Tabs */
  --radius-lg: 8px;   /* Outer Panels / Main Containers */

  --border-thin: 1px;
  --border-strong: 2px;
}
```

## 6) Shadow Tokens

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6);
}
```

## 7) Layout Dimension Tokens (Live Implementation)

Nilai berikut mencerminkan dimensi layout aktual di `App.tsx`.

| Elemen | Nilai | Catatan |
| --- | --- | --- |
| Menubar (header) height | `36px` | Scaled up dari 32px (ergonomics) |
| Tool Options Bar height | `42px` | Scaled up dari 38px |
| Status Bar height | `28px` | Scaled up dari 26px |
| Left Tool Rail width | `52px` | Standard Pro Scale (updated 2026-05-27) |
| Tool button size | `40×40 px` (`w-10 h-10`) | Ergonomic Hit Area |
| Active tool indicator | `2px × 20px` solid bar | Left edge docked |
| Right Inspector Panel width | `320px` | Unchanged |
| Inspector tab height | `36px` | Unchanged |
| Layer row height | `32px` | Unchanged |
| Properties header height | `36px` (`h-9`) | Unchanged |
| Input field height | `28px` | Unchanged |
| Canvas ruler thickness | `22px` | Unchanged |
| Lucide icon size (tools) | `20Ã—20 px` (`w-5 h-5`) | Scaled up dari 18Ã—18 |
| Lucide icon size (controls) | `16Ã—16 px` (`w-4 h-4`) | Unchanged |
| Lucide icon size (inspector header) | `18Ã—18 px` | Unchanged |

## 8) Motion Tokens

```css
:root {
  --motion-fast: 80ms;
  --motion-normal: 100ms;
  --motion-slow: 150ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 9) Z-Index Tokens

```css
:root {
  --z-base: 1;
  --z-toolbar: 10;
  --z-panel: 20;
  --z-dropdown: 40;
  --z-modal: 60;
  --z-toast: 80;
}
```

## 10) Token Change Policy

- Perubahan token wajib dicatat di `docs/01-id-decision-log.md` jika memengaruhi UI global.
- Hindari perubahan sering selama satu milestone kecuali ada alasan usability/performa kuat.

## 11) Scrollbar Tokens (Native Feel)

Implementasi aktual di `index.css` menggunakan scrollbar 4px ultra-slim:

```css
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: var(--color-text-muted);  /* #71717A */
  border-radius: var(--radius-sm);            /* 4px */
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-secondary); /* #A1A1AA */
}
```

## 12) Range Slider Tokens (Premium Control)

```css
input[type="range"]::-webkit-slider-runnable-track {
  background: #161618;
  border: 1px solid #343438;
  height: 6px;
  border-radius: 3px;
}
input[type="range"]::-webkit-slider-thumb {
  background-color: #E15A17;     /* Photon Amber */
  height: 14px;
  width: 14px;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(225, 90, 23, 0.45);
}
input[type="range"]::-webkit-slider-thumb:hover {
  background-color: #F97316;     /* Photon Amber Hover */
  transform: scale(1.15);
}
```

## 13) Change History

| Tanggal | Perubahan | Alasan |
| --- | --- | --- |
| 2026-05-27 | Accent: Studio Indigo â†’ Photon Amber | Identitas visual hardware-tooling yang hangat, sesuai arah branding |
| 2026-05-27 | Layout dimensions scaled up (+4px header, +8px tool rail, etc.) | Ergonomics â€” target area terlalu kecil di monitor HD |
| 2026-05-27 | Scrollbar: 10px â†’ 4px ultra-slim | Mengurangi visual noise, feel lebih native |
| 2026-05-27 | Info color = Accent color | Konsistensi â€” info state mengikuti brand identity |

