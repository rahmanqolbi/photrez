# 23 - Design Tokens (MVP Baseline)

Token ini menjadi sumber tunggal styling UI Photrez di MVP.

## 1) Usage Rules

1. Jangan hardcode nilai warna/spacing/radius di komponen.
2. Semua style baru harus memakai token di file ini.
3. Jika token baru diperlukan, tambahkan di file ini dulu.

## 2) Color Tokens

```css
:root {
  --color-bg-app: #0a0b0d;
  --color-bg-panel: #121316;
  --color-bg-elevated: #181a1f;
  --color-bg-canvas-wrap: #090a0c;

  --color-border-subtle: #23252a;
  --color-border-strong: #2f323a;

  --color-text-primary: #e7ebf0;
  --color-text-secondary: #9ea8b6;
  --color-text-muted: #677385;

  --color-accent: #2f8ff5;
  --color-accent-hover: #4fa3ff;
  --color-accent-active: #1a75d2;

  --color-success: #3dbb7c;
  --color-warning: #e3b04b;
  --color-danger: #df5d5d;
  --color-info: #2f8ff5;

  --color-focus-ring: #2f8ff5;
}
```

## 3) Typography Tokens

```css
:root {
  --font-family-ui: Archivo, "Segoe UI", sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
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
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --border-thin: 1px;
  --border-strong: 2px;
}
```

## 6) Shadow Tokens

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 10px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.34);
}
```

## 7) Motion Tokens

```css
:root {
  --motion-fast: 120ms;
  --motion-normal: 160ms;
  --motion-slow: 220ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 8) Z-Index Tokens

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

## 9) Token Change Policy

- Perubahan token wajib dicatat di `docs/01-id-decision-log.md` jika memengaruhi UI global.
- Hindari perubahan sering selama satu milestone kecuali ada alasan usability/performa kuat.

## 10) Scrollbar Tokens (Native Feel)

```css
:root {
  --scrollbar-width: 10px;
  --scrollbar-thumb-radius: 5px;
  --color-scrollbar-thumb: rgba(158, 168, 182, 0.2);
  --color-scrollbar-thumb-hover: rgba(158, 168, 182, 0.4);
  --color-scrollbar-track: transparent;
}
```
