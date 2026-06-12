# Desain UI/UX Photrez: Photon Amber & Ergonomic Workstation (2026-05-27)

Dokumen ini menetapkan spesifikasi desain visual dan interaksi antarmuka (UI/UX) untuk **Photrez**, yang dirancang agar ergonomis, fleksibel (multi-theme/light mode), mudah dipelihara, dan memiliki identitas visual yang khas.

---

## 1. Visi Desain & Warna Ciri Khas (*Signature Color*)

Photrez diposisikan sebagai editor gambar desktop lokal yang **ringan, sangat cepat, dan mekanis presisi**. 

Untuk memperkuat identitas ini, proyek secara resmi mengadopsi warna aksen khas:

### **Photon Amber (`#E15A17`)**
*   **Filosofi:** Jingga hangat berenergi tinggi yang terinspirasi dari indikator fisik alat optik presisi, lensa kamera kelas atas (seperti Leica/Sony Alpha), dan workstation perangkat keras.
*   **Aturan Penerapan (Invisible UI):** Warna aksen ini hanya digunakan pada indikator seleksi aktif, tanda penunjuk alat aktif, tombol tindakan utama, dan koordinat parameter terpilih untuk menghindari bias mata terhadap warna gambar kanvas.
*   **Hover & Active States:**
    *   `--color-accent-hover`: `#F97316` (Photon Amber Bright)
    *   `--color-accent-active`: `#C2410C` (Photon Amber Deep)

---

## 2. Skala Ukuran Ergonomis (*Aksentuasi Utilitarian*)

Untuk kenyamanan visual jangka panjang dan presisi target klik mouse, kita memperbesar skala tipografi dan ikon Lucide ke standar berikut:

*   **Teks Dasar (Menubar, Label, Menu):** `13px` (sebelumnya `11px`) menggunakan font native `"Segoe UI Variable Text", "Segoe UI"`.
*   **Header Panel / Judul Seksi:** `14px` font-medium.
*   **Teks Properti / Angka Status:** `12px` monospaced native (`font-mono`) yang dibantu dengan CSS `tabular-nums` untuk mencegah *jitter* pergeseran digit.
*   **Ikon Lucide Utama (Tool Rail):** `18px` - `20px` (sebelumnya `16px`).
*   **Tombol Pembungkus Alat (Tool Wrap):** `36px * 36px` dengan margin yang renggang agar nyaman diklik.
*   **Radius Jendela / Kontrol:** Radius sangat kecil `--radius-sm: 2px` dan `--radius-md: 4px` untuk memancarkan presisi mekanikal yang tegas.

---

## 3. Arsitektur Fleksibel & Multi-Tema (*Scalable Theme System*)

Semua styling warna dan ukuran tata letak wajib menggunakan **CSS Custom Properties (CSS Variables)** di root `index.css` agar Photrez siap untuk penambahan tema Light Mode atau perubahan layout dinamis di masa depan secara instan:

```css
:root {
  /* Surface Colors (True Neutral Grays - Zero Tint) */
  --color-bg-app: #1A1A1C;         /* Editor Shell / Menubar */
  --color-bg-panel: #202022;       /* Inspector & Sidebars */
  --color-bg-elevated: #29292B;    /* Controls / Active Tabs */
  --color-bg-canvas-wrap: #161618; /* Deepest backdrop behind artboard */

  --color-border-subtle: #343438;
  --color-border-strong: #424246;

  /* Typography Colors */
  --color-text-primary: #D4D4D8;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #71717A;

  /* Signature: Photon Amber */
  --color-accent: #E15A17;
  --color-accent-hover: #F97316;
  --color-accent-active: #C2410C;

  /* Focus Ring */
  --color-focus-ring: #E15A17;

  /* Dynamic Layout Variables */
  --sidebar-width: 320px;
  --tool-rail-width: 48px;
}

/* Dukungan Light Mode Masa Depan */
.theme-light {
  --color-bg-app: #F4F4F5;
  --color-bg-panel: #FFFFFF;
  --color-bg-elevated: #E4E4E7;
  --color-bg-canvas-wrap: #E4E4E7;

  --color-border-subtle: #D4D4D8;
  --color-border-strong: #A1A1AA;

  --color-text-primary: #18181B;
  --color-text-secondary: #52525B;
  --color-text-muted: #71717A;
}
```

Di dalam SolidJS, transisi tema cukup dilakukan dengan menambahkan atau menghapus kelas `.theme-light` di tingkat paling atas (`<html>` atau `<body>`).

---

## 4. Kepatuhan Ketat MVP v1 (YAGNI & KISS)

Meskipun kita mengadopsi kematangan visual dari *Image Studio* Electron, kita **mengharamkan** pemindahan fitur yang di luar cakupan MVP v1:
*   **DILARANG** membuat panel diagnostik WASM, histogram, atau dialog penyuntingan komplek (Curves, Levels, Color Balance, ReMask, Denoise).
*   **HANYA** menyusun tata letak untuk alat dasar yang masuk cakupan: Move, Crop, Brush, Eraser, dan navigasi Zoom In/Out.
*   Logika data dan state di-porting secara sederhana menggunakan SolidJS *signals* langsung pada tingkat komponen `App.tsx` (KISS & DRY).
