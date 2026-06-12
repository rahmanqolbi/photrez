# 24.b - Anti-Webapp & Native Desktop Guidelines (MVP)

Dokumen ini mendefinisikan aturan teknis untuk menghilangkan seluruh "sifat bawaan browser" (web artifacts) agar aplikasi Photrez yang berbasis SolidJS + Tauri terasa sepenuhnya seperti aplikasi desktop *native* (C++/Rust).

## 1) Global CSS Resets (Web Artifact Eradication)

Terapkan CSS berikut secara global pada root `body` atau `*` selector:

```css
/* 1. Hilangkan Text Selection (Blok Teks) secara global */
/* Hanya izinkan seleksi di elemen input, textarea, atau elemen spesifik yang butuh (misal panel kode) */
* {
  user-select: none;
  -webkit-user-select: none;
}

input, textarea {
  user-select: text;
  -webkit-user-select: text;
}

/* 2. Matikan Kursor I-Beam (Teks) */
/* Set cursor default (panah) secara paksa, kecuali pada input */
body {
  cursor: default;
}

/* 3. Matikan Ghost Dragging (Gambar dan Ikon) */
/* Mencegah browser menampilkan 'bayangan' saat user drag logo atau icon */
img, svg, a {
  -webkit-user-drag: none;
  user-drag: none;
}

/* 4. Matikan Overscroll Bounce (Rubber-banding) */
/* Mencegah aplikasi mantul saat men-scroll melebihi batas (khususnya Mac/Trackpad) */
html, body {
  overscroll-behavior: none;
}

/* 5. Tajamkan Rendering Typography (Native Font Smoothing) */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## 2) Tauri OS Integration

Aplikasi harus merespons sistem operasi layaknya jendela *native*:

- **Frameless Window**: Window Tauri tidak boleh menggunakan title bar OS default. Matikan window frame di `tauri.conf.json` (`"decorations": false`).
- **Drag Regions**: Top Bar Photrez harus berfungsi sebagai *titlebar grip*. Tambahkan atribut `data-tauri-drag-region` pada kontainer Top Bar agar user dapat menyeret aplikasi.

## 3) Override Native Browser Behavior (Events)

- **Context Menu (Klik Kanan)**: Matikan context menu default browser di seluruh aplikasi menggunakan event listener global `e.preventDefault()` pada `contextmenu`. Photrez harus memanggil API context menu Tauri atau merender komponen *custom dropdown* yang snapy.
- **Drag & Drop**: Cegah aksi default saat pengguna melakukan "drag and drop" file ke dalam aplikasi. Secara bawaan, browser akan mencoba me-load gambar dan menghilangkan UI editor.
  ```javascript
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
  // Tangani file drop secara manual melalui Tauri API / File Drop events.
  ```

## 4) Overlay Scrollbars

Scrollbar tebal default Windows dilarang digunakan karena merusak kepadatan UI.
- Gunakan *custom scrollbar* tipis yang *overlay* di atas konten (tidak mendorong layout/reflow).
- Gunakan token `--scrollbar-width` dan `--color-scrollbar-thumb`.
- Scrollbar default `transparent` dan hanya menjadi *opaque* (muncul/menebal) saat areanya di-*hover*.

```css
/* Contoh styling scrollbar Webkit */
::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background-color: var(--color-scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-thumb);
  border-radius: var(--scrollbar-thumb-radius);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-scrollbar-thumb-hover);
}
```

## 5) Snappy Motion

Aplikasi C++ native tidak memiliki transisi CSS panjang.
- Durasi maksimal untuk interaksi mikro (hover state, focus ring) adalah `100ms` (menggunakan `--motion-normal`).
- Durasi maksimal untuk panel/modal open adalah `150ms`.
- Sama sekali tidak boleh ada animasi yang elastis/mantul (*bounce*). Gunakan `cubic-bezier(0.2, 0, 0, 1)` (*ease-out*) agar UI terasa keras, solid, dan instan.
