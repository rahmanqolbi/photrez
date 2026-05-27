# 22 - UI Style Guide (MVP)

Dokumen ini mengunci arah visual UI Photrez agar hasil kerja AI agent konsisten.

## 1) Principles

1. Functional first: UI harus fokus pada kejelasan workflow editing.
2. Compact desktop density: efisien untuk panel tool, bukan layout web long-scroll.
3. Consistency over novelty: komponen baru harus mengikuti token dan pattern yang sama.
4. Predictable interaction: state dan feedback harus seragam di seluruh area.

## 2) Layout System (Editor Shell)

Struktur shell utama:

1. Top Bar: app title, file actions, quick commands.
2. Left Tool Rail: primary tools vertical.
3. Center Canvas Viewport: area kerja utama.
4. Right Inspector Panels: layers/properties/history.
5. Bottom Status Bar: zoom, hint shortcut, document status.

Aturan:

- Jangan ubah urutan area shell tanpa update dokumen ini.
- Panel boleh collapse, tapi slot area tidak berpindah konteks.

## 3) Visual Density

- Base spacing unit: `4px`.
- Standard gap antar elemen kontrol: `8px`.
- Panel internal padding: `12px`.
- Compact controls untuk mode editor desktop.

## 4) Typography Rules

- UI Font Family: `Inter, Segoe UI, sans-serif`.
- Base font size: `13px`.
- Heading panel: `14px` semibold.
- Secondary/meta text: `12px`.
- Minimum readable text: `12px` (hindari lebih kecil untuk UI utama).

## 5) Color and Surface Rules

- Gunakan design tokens dari `docs/23-design-tokens.md`.
- Canvas area visual boleh berbeda dari panel area.
- Hindari variasi warna bebas per fitur; semua wajib lewat token.

## 6) Iconography Rules

- Icon style: outline consistent.
- Default icon size: `16px`.
- Dense toolbar icon size: `14px` boleh untuk area sempit.
- Stroke visual weight harus seragam.

## 7) Interaction States

Setiap komponen interaktif wajib punya state:

1. `default`
2. `hover`
3. `active`
4. `focus-visible`
5. `disabled`

Focus ring wajib terlihat jelas untuk keyboard navigation.

## 8) Motion Rules

- Motion harus subtle dan cepat.
- Default transition duration: `120ms` sampai `180ms`.
- Jangan gunakan animasi dekoratif berat di MVP.
- Panel open/close boleh animate ringan, tanpa mengganggu performa canvas.

## 9) Accessibility Baseline

- Kontras teks utama vs background minimal memenuhi standar umum keterbacaan.
- Semua action penting harus bisa diakses keyboard.
- Tooltip tidak boleh jadi satu-satunya media informasi kritis.

## 10) Out-of-Scope for MVP UI

- Theme marketplace.
- Fully custom theme editor.
- Animated visual effects kompleks.

## 11) Enforcement

- Semua update UI harus mengacu:
1. `docs/23-design-tokens.md`
2. `docs/24-ui-component-rules.md`
3. `docs/24-b-anti-webapp-guidelines.md` (Aturan Native UX)
- Jika ada pattern baru, update dokumen ini dulu sebelum implementasi luas.
