# Rencana Desain UI/UX Photrez: Carbon Studio (2026-05-27)

> **WARNING (2026-05-27)**: Arah warna dan tipografi di dokumen perencanaan ini sudah USANG (DEPRECATED). Kita telah beralih ke skema warna **Professional Studio Gray** (True Neutral) dan ukuran font desktop native (`12px-13px` base) dengan `tabular-nums`. Segala referensi `font-mono` untuk input dan warna biru gelap SaaS di sini sudah tidak berlaku. Rujuk ke `docs/22-ui-style-guide.md` dan `docs/23-design-tokens.md` terbaru.

Dokumen ini mendokumentasikan keputusan desain visual dan interaksi untuk antarmuka pengguna (UI/UX) **Photrez**. Arah desain ini dipilih untuk memberikan estetika yang modern, sangat premium, fungsional, adaptif secara global, dan sepenuhnya terbebas dari kesan "AI Slop" (desain generik kaku cetakan AI).

---

## 1. Visi Desain & Arah Visual

Photrez diposisikan sebagai editor gambar desktop yang ringan dan praktis. Desain visual **Carbon Studio** dirancang untuk membedakan Photrez secara tegas dari Photoshop (untuk mencegah persepsi klon) sekaligus memberikan lingkungan kerja dengan densitas tinggi yang sangat ergonomis untuk penggunaan profesional jangka panjang.

### Prinsip Desain Utama:
1.  **Functional First (Fokus Pekerjaan)**: UI dirancang sangat tenang dan tidak mengganggu. Kanvas kerja adalah satu-satunya fokus visual utama.
2.  **Native Desktop Feel**: Mengeliminasi total seluruh pola navigasi, perilaku scroll, dan estetika kaku khas "aplikasi web/SaaS".
3.  **High Density & Precision**: Memaksimalkan efisiensi piksel pada layar desktop agar seluruh panel informasi kritis dapat diakses tanpa menggulung halaman (no scrolling wrap).

---

## 2. Visual Token System (Carbon Studio)

Desain sistem ini menggunakan palet warna bertemperatur gelap dengan aksen biru safir royal yang mewah dan tipografi utilitarian yang presisi.

### A. Palet Warna (Obsidian Carbon & Lapis Sapphire)

| Token Nama | Nilai HEX / CSS | Peruntukan Visual |
| :--- | :--- | :--- |
| `bg-app-frame` | `#0e1013` | Warna frame aplikasi terluar / base wrapper |
| `bg-panel` | `#16181c` | Latar belakang panel samping, menubar, dan inspector |
| `bg-control` | `#20232a` | Latar belakang tombol, input text, dan dropdown |
| `bg-control-hover` | `#2b2f38` | State hover untuk kontrol interaktif |
| `bg-canvas-wrap` | `#090a0c` | Area kerja terdalam pembungkus kanvas editing |
| `color-accent` | `#2f8ff5` | **Lapis Sapphire**: Aksen seleksi aktif, kursor alat, status |
| `color-accent-hover`| `#4fa3ff` | State hover aksen aktif |
| `border-subtle` | `#252830` | Garis pembatas tipis antar panel (`1px` border) |
| `text-primary` | `#e7ebf0` | Teks utama menu dan label |
| `text-secondary` | `#9ea8b6` | Teks keterangan, properti tidak aktif |
| `text-muted` | `#677385` | Shortcut hint, angka penggaris, properti redup |

### B. Tipografi Profesional (Dual-Font Pairing)

1.  **UI & Label Utama: Archivo Sans-Serif**
    *   *Google Fonts Import*: `@import url('https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300..900;1,300..900&display=swap');`
    *   *Karakteristik*: Bertipe "Grotesque" khas desain Swiss modern. Sangat efisien secara spasial (lebih sempit dari font biasa), tegap, dan profesional.
    *   *Ukuran Standard*: `text-[13px]` untuk menubar/panel, `text-[12px]` untuk label sekunder.
2.  **Angka & Koordinat Properti: JetBrains Mono / Geist Mono (Monospace)**
    *   *Karakteristik*: Karakter monospaced memastikan angka koordinat X/Y, Width/Height, dan persentase Zoom tidak melompat-lompat (*jitter*) saat nilainya diubah secara dinamis.
    *   *Ukuran Standard*: `text-[11px]` font-mono.

---

## 3. 7 Aturan Emas UI Desktop Native (Anti-Webapp Slop)

Untuk membunuh total karakteristik visual "aplikasi web" dan memastikan antarmuka terasa sepenuhnya sebagai aplikasi desktop asli, implementasi wajib mengikuti 7 aturan ini:

1.  **Zero Web Selection (`select-none`)**
    *   Seluruh elemen UI (selain teks kanvas jika ada) wajib diberi kelas `select-none`. Pengguna tidak dapat memblokir, menyeret, atau menyalin teks UI. Kursor utama disetel ke default OS (`cursor-default`), bukan penunjuk teks web.
2.  **Scrollbar Kustom & Super Tipis**
    *   Scrollbar bawaan browser dibuang total. Menggunakan kustom scrollbar setebal `4px` yang transparan dan melayang di atas konten (tidak memakan ruang panel).
3.  **No Text Wrapping (Layout Rigid)**
    *   Semua label properti dan layer menggunakan kelas `whitespace-nowrap overflow-hidden text-ellipsis`. Konten tidak boleh pecah ke bawah saat panel menyusut.
4.  **Flat Workstation Controls**
    *   Tombol kontrol menggunakan tinggi tetap (`26px` atau `28px`), berbentuk kotak bersudut minimalis (`rounded-md` setara `6px`), berwarna abu-abu gelap solid tanpa efek gradasi tebal yang membal khas SaaS.
5.  **Keyboard Shortcut Alignment**
    *   Menu dropdown menampilkan shortcut di ujung kanan paling luar (`text-[10px] text-muted font-mono whitespace-nowrap`) terpisah rapi dari label teks utama.
6.  **Custom Integrated Focus-Ring**
    *   Fokus keyboard tidak menggunakan outline default browser yang kasar, melainkan garis tipis terintegrasi di dalam border kontrol itu sendiri (`ring-1 ring-[#2f8ff5]`).
7.  **Sub-pixel Borders & Panel Depth**
    *   Menggunakan border setebal `1px` berwarna gelap solid (`border-[#252830]`) untuk membagi area kerja dengan presisi tinggi tanpa membuang piksel.

---

## 4. Struktur Tata Letak (Editor Shell)

UI Mockup dirancang dalam struktur grid kaku dengan 5 area utama:
1.  **Menubar (Top Bar)**: Melayang ramping berisi navigasi file, status nama dokumen, dan tombol cepat Command Palette (`Ctrl+K`).
2.  **Left Tool Rail**: Panel alat vertikal tipis yang dipisahkan berdasarkan fungsi kelompok dengan garis batas sub-pixel tipis. Tombol aktif ditandai dengan **titik indikator Lapis Sapphire** di sisi kiri ikon.
3.  **Canvas Viewport (Center)**: Area pengerjaan gambar berlatar pekat dengan ruler (penggaris koordinat) minimalis di atas dan kiri yang menggunakan angka font monospaced redup.
4.  **Right Inspector Panels**: Panel tab (Layers, Properties, History) menggunakan kontrol *segmented pill slider* melengkung tipis yang sangat intuitif.
5.  **Bottom Status Bar**: Menampilkan metadata kanvas secara presisi (dimensi, profil warna sRGB, status zoom) dan shortcut universal.

---

## 5. Rencana Pengujian & Langkah Selanjutnya

1.  **Pembaruan Mockup**: Mengubah total file [docs/30-ui-full-editor-mockup.html](file:///d:/Project/image-studio/docs/30-ui-full-editor-mockup.html) dengan menerapkan TailwindCSS v4 Play CDN, ikon Lucide SVG, font Archivo, JetBrains Mono, dan palet warna Carbon Studio.
2.  **Uji Coba Visual**: Membuka mockup di browser untuk memvalidasi interaksi hover, transisi slider tab, dan keterbacaan teks kontras gelap.
3.  **Sinkronisasi Token**: Memperbarui master design tokens di `docs/23-design-tokens.md` jika diperlukan integrasi lebih lanjut.
