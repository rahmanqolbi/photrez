# 10.b - Desktop Behavior Spec (MVP)

Dokumen ini melengkapi panduan "Anti-Webapp" dengan mendefinisikan *behavior* (perilaku interaksi) tingkat lanjut yang wajib diimplementasikan agar Photrez terasa dan berfungsi seperti *software desktop* profesional.

## 1. Global Shortcut Hijacking & Stateful Keys

SolidJS dan Tauri harus dikonfigurasi untuk memblokir aksi bawaan browser dan mendukung interaksi *power user*.

- **Block Default Browser Shortcuts**: Cegah kombinasi tombol web standar yang bisa merusak sesi editor.
  - Cegah: `Ctrl+S` (Save Webpage), `Ctrl+O` (Open Webpage), `Ctrl+P` (Print Webpage), `Ctrl+R` (Reload), `F5`, `Alt+Left/Right` (History Navigation).
- **Stateful Modifiers (Hold/Release)**: Tool utama harus bisa diakses sementara dengan menekan dan menahan tombol:
  - `Hold Space`: Beralih sementara ke Pan/Hand tool.
  - `Hold Alt`: Beralih sementara ke Color Picker (saat menggunakan Brush).
  - *Catatan Developer*: Dibutuhkan *state machine* global untuk `keydown` dan `keyup`. Jika *window* kehilangan fokus (Alt-Tab) saat tombol ditahan, *state machine* harus di-reset otomatis agar tool tidak menyangkut (stuck).

## 2. Native OS File Dialogs

Aplikasi dilarang keras menggunakan elemen `<input type="file">` bawaan HTML untuk berinteraksi dengan file system.

- **Buka, Simpan, dan Ekspor**: Semua dialog pemilihan file (Open, Save, Save As, Export) wajib menggunakan API asli dari Tauri (`@tauri-apps/plugin-dialog`).
- **Keuntungan**: Ini akan membuka *File Explorer* bawaan OS (Windows/Mac) yang memberi dukungan penuh terhadap *quick access*, *network drives*, dan tampilan OS native, sehingga membedakan Photrez dari *web app* standar.

## 3. Dukungan Stylus/Pen & Pointer Events API

Interaksi di area *Canvas Viewport* tidak boleh mengandalkan *Mouse Events* biasa (`mousedown`, `mousemove`) karena fiturnya tidak memadai untuk editor grafis.

- **Wajib Pointer Events**: Gunakan API `pointerdown`, `pointermove`, dan `pointerup`.
- **Pressure Sensitivity (Tekanan)**: Ambil nilai dari `event.pressure` (dari 0.0 hingga 1.0) untuk mendeteksi tekanan dari Pen Tablet (seperti Wacom, Huion, atau XP-Pen). Hubungkan nilai ini ke ukuran (size) atau opasitas (opacity) Brush.
- **High-Frequency Input**: Layar modern dan *tablet* dapat mengirimkan input lebih cepat dari *refresh rate* layar. Gunakan `event.getCoalescedEvents()` pada `pointermove` untuk mendapatkan titik-titik koordinat ekstra di antara *frame render* agar goresan kuas tetap mulus (smooth).

## 4. Window State & Mencegah "White Flash"

Pengalaman membuka aplikasi *desktop* harus solid dan tidak seperti memuat situs web.

- **Background Native Window**: Setel warna *background window* di file konfigurasi Tauri (`tauri.conf.json` atau via Rust) menjadi sama dengan warna `--color-bg-app` (`#0a0b0d`). Ini akan mencegah layar berkedip putih ("White Flash of Death") sebelum CSS SolidJS selesai dimuat.
- **Window State Retention**: Integrasikan *plugin* window state Tauri (`@tauri-apps/plugin-window-state`). Aplikasi harus mengingat:
  - Posisi koordinat (X, Y) jendela di monitor.
  - Ukuran lebar dan tinggi jendela.
  - Status Maximized/Windowed.
  *Sehingga ketika Photrez dibuka kembali, ia berada di posisi yang persis sama seperti terakhir kali ditutup.*

## 5. Hardware-Aware Status Bar

Aplikasi profesional memberi visibilitas ke *resource* mesin secara transparan.

- Tambahkan blok informasi *hardware* di bagian pojok kanan **Bottom Status Bar**.
- Di MVP, blok ini wajib menampilkan sekurang-kurangnya:
  - Dimensi kanvas aktif (misal: `1920 x 1080 px`).
  - *Estimasi* penggunaan memori dokumen atau *app footprint* (sesuai API Rust/Tauri yang tersedia).
- **Tool Hint Dynamic**: Bagian kiri/tengah Status Bar harus berubah secara dinamis berdasarkan *tool* yang aktif (contoh: "Hold Space to Pan" atau "Click and drag to select").
