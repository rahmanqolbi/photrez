# 22 - UI Style Guide (MVP)

Dokumen ini mengunci arah visual UI Photrez agar hasil kerja AI agent konsisten.

## 1) Core Philosophy & Principles (Soft & Snappy)

Mengapa UI Photrez dirancang dengan estetika "Soft & Snappy"? Jawabannya adalah untuk mencapai keseimbangan antara **Profesionalitas** dan **Modernitas**. Berikut adalah pilar filosofis desain kita:

1. **Familiarity & Muscle Memory**: Jangan mereinventasi tata letak antarmuka. Pengguna harus langsung tahu cara menggunakan aplikasi di detik pertama berkat tata letak standar industri (Toolbar atas, Inspector kanan, Tool rail kiri).
2. **Invisible UI (Zero-Tint Neutrality)**: Antarmuka adalah alat, bukan pameran. Warna latar wajib menggunakan abu-abu netral sejati (True Neutral Gray tanpa rona biru/kuning) agar UI tidak mendistorsi atau meracuni persepsi warna mata pengguna terhadap gambar yang sedang diedit. 
3. **Soft & Snappy Aesthetic**: Menghindari "Mechanical Rigidity" yang terlalu kaku (2px) maupun "AI Slop" yang terlalu lembut (wide blurs). Penggunaan radius global **8px** memberikan kesan modern dan ramah, namun elemen internal tetap memiliki densitas tinggi untuk efisiensi kerja.
4. **Docked Precision**: Segala hal harus terstruktur dan geometris. Panel utama menempel (*docked*) ke tepi window untuk memaksimalkan ruang kerja, namun memiliki **inner rounding** pada sudut yang menghadap canvas untuk menjaga kelembutan visual.
5. **Distinct Identity**: Identitas Photrez ditanamkan pada warna aksen tunggal **Photon Amber (`#E15A17`)** yang hangat dan bertenaga, memberikan kontras tinggi pada UI yang netral.

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
- **Tabular Nums**: Wajib menggunakan `font-variant-numeric: tabular-nums;` secara global agar angka tidak bergeser saat nilainya berubah (sangat krusial untuk inspektur properties).
- Base font size: `13px` (Standar OS Desktop Native yang nyaman dibaca).
- Heading panel / Toolbar: `12px` atau `13px` font-medium.
- Secondary / Meta text: `12px`.
- Micro labels (koordinat, label input): `11px` atau `12px` uppercase.
- Jangan gunakan teks lebih kecil dari `11px`.

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
