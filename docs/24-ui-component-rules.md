# 24 - UI Component Rules (MVP)

Dokumen ini berisi aturan implementasi komponen agar hasil UI antar agent konsisten.

## 1) Scope

Komponen prioritas MVP:

1. Button
2. Icon Button (toolbar)
3. Input / Number Input
4. Select / Dropdown
5. Panel Container
6. Layer List Item
7. Status Badge
8. Tooltip
9. Dialog / Modal
10. Divider

## 2) Global Rules

1. Semua komponen wajib pakai token dari `docs/23-design-tokens.md`.
2. Semua komponen interaktif wajib punya state: default/hover/active/focus-visible/disabled.
3. Jangan buat varian baru tanpa dokumentasi varian.

## 3) Button Rules

- Height default: `32px` (Standard), `24px` (Dense/Toolbar).
- Padding horizontal default: `12px` (Standard), `8px` (Dense).
- **Radius**: Dilarang keras menggunakan bentuk "Pill" (`rounded-full`). Gunakan sudut tajam atau radius sangat minim `--radius-sm` (sekitar 2px - 4px) untuk memancarkan presisi alat profesional.
- Primary action pakai `--color-accent`.
- Destructive action pakai `--color-danger`.

## 4) Icon Button Rules

- Ukuran area klik minimum: `28px x 28px`.
- Icon default: `16px`.
- Toolbar dense mode: `24px x 24px` dengan icon `14px` (opsional area padat).

## 5) Input Rules

- Height default: `32px` (Standard), `26px` (Dense/Inspector).
- Style: **Defined Box (Recessed)**. 
- Background: `--color-bg-input` (#121214).
- Border: `1px solid var(--color-border-subtle)`.
- **Inset Effect**: Berikan `border-top-color: #101012` (lebih gelap dari border lainnya) untuk memberikan efek visual "masuk" ke dalam panel.
- Focus: Border color berubah menjadi `--color-accent` (#E15A17).
- **Typography Input**: Dilarang keras menggunakan font monospace (`font-mono`) atau `font-bold` di dalam input angka (seperti koordinat). Gunakan font UI utama biasa. Keutuhan lebar angka akan dijaga otomatis oleh CSS `tabular-nums` yang di-set di root.

## 6) Panel Rules

- **Docked Precision Logic**: Panel utama (Sidebar/Inspector) wajib menempel (*anchored/docked*) ke tepi window samping, atas, dan bawah.
- **Visual Separation**: Pemisahan area tidak lagi menggunakan margin luar (`m-2`), melainkan border tipis `1px solid var(--color-studio-border)` di sisi yang berbatasan dengan Canvas.
- **Rounding Strategy**: 
  - Hanya sudut yang menghadap ke arah Canvas (inner corners) yang diberikan `--radius-lg` (8px). 
  - Sudut yang menempel ke window (outer corners) wajib tajam (`0px`).
- **Panel Header**:
  - Background: `--color-studio-elevated` (#29292B).
  - Height: `32px`.
  - Typography: `11px`, `font-bold`, `uppercase`, `tracking-wider`.
- **Shadow**: Gunakan *subtle shadow* di sisi dalam panel yang berbatasan dengan Canvas untuk memberikan efek kedalaman (*workspace well*).

## 7) Global Radius Discipline (Soft & Snappy)

- **Outer Containers (Inner Corners Only)**: `8px` (`--radius-lg`).
- **Buttons / Tabs / Group Containers**: `6px` (`--radius-md`).
- **Inputs / Small Interactive Elements**: `4px` (`--radius-sm`).
- **Tool Indicators / Swatches**: `1px - 2px` (Hampir kotak untuk presisi).
- Dilarang menggunakan radius di luar variabel token tersebut kecuali untuk Artboard (minimal 1px).

## 8) Layer List Item Rules

- Height item default: `30px`.
- State aktif wajib jelas kontras.
- Aksi visibility/lock harus tetap terlihat di density default.
- Reorder affordance harus konsisten di semua item.

## 8) Tooltip Rules

- Tooltip hanya untuk bantuan singkat.
- Jangan simpan informasi kritis hanya di tooltip.
- Delay tampil harus singkat dan konsisten.

## 9) Dialog Rules

- Dialog wajib punya:
1. judul,
2. isi ringkas,
3. action utama,
4. action batal.
- Escape key menutup dialog non-destruktif.
- Destructive dialog wajib teks konfirmasi jelas.

## 10) Empty / Loading / Error States

- Empty state harus memberi next action.
- Loading state gunakan indikator ringan (hindari animasi berat).
- Error state harus menampilkan:
1. ringkasan masalah,
2. action retry atau close.

## 11) Component Naming Convention

- Gunakan prefix domain bila perlu, contoh:
`StudioButton`, `StudioPanel`, `LayerItemRow`.
- Hindari nama generik yang ambigu seperti `Card2` atau `WidgetNew`.

## 12) Review Checklist (Before Merge)

- [ ] Komponen pakai design token.
- [ ] Semua state interaktif lengkap.
- [ ] Akses keyboard dasar berfungsi.
- [ ] Tidak ada hardcoded color/spacing global.
- [ ] Nama komponen konsisten.
] Akses keyboard dasar berfungsi.
- [ ] Tidak ada hardcoded color/spacing global.
- [ ] Nama komponen konsisten.
