# 27 - Key User Flows (MVP)

Dokumen ini mengunci alur UX utama untuk MVP Photrez.

## 1) Scope

Flow prioritas hanya untuk fitur MVP:

1. Open file
2. Basic edit (layer/select/transform/crop/brush)
3. Export image

## 2) Flow A - Open File to Ready Canvas

### Goal

User membuka gambar dan siap mulai edit dalam langkah minimal.

### Steps

1. User klik `Open` (top bar) atau shortcut open.
2. Dialog file muncul.
3. User pilih file valid.
4. App load document ke canvas + buat layer awal.
5. Status bar tampilkan dimensi dasar dokumen.

### Success Criteria

- Canvas tampil tanpa error.
- Layer panel menunjukkan layer aktif.
- User bisa langsung memilih tool.

### Error Cases

- File tidak valid -> tampil error ringkas + opsi retry.
- Load gagal -> document state tetap aman (tidak corrupt).

## 3) Flow B - Basic Edit Session

### Goal

User menyelesaikan edit dasar tanpa kebingungan navigasi UI.

### Steps

1. User pilih tool (move/select/crop/brush).
2. User manipulasi objek/layer di canvas.
3. User ubah properti layer (opacity/reorder/visibility) dari inspector.
4. User gunakan undo/redo bila perlu.

### Success Criteria

- Interaksi tool terasa konsisten.
- State aktif (tool/layer) selalu jelas di UI.
- Undo/redo tidak mematahkan flow.

### Error Cases

- Aksi tidak valid -> warning ringan, tidak crash.
- Command gagal -> error terstruktur + state tetap konsisten.

## 4) Flow C - Export Result

### Goal

User mengekspor hasil ke format target dengan langkah jelas.

### Steps

1. User klik `Export`.
2. Pilih format (`JPG/PNG/WebP`) dan quality/settings tersedia.
3. Pilih lokasi simpan.
4. Proses export berjalan.
5. App tampilkan status sukses/gagal.

### Success Criteria

- File output tersedia di lokasi target.
- Feedback sukses jelas.
- Kegagalan export memberi pesan yang bisa ditindaklanjuti.

### Error Cases

- Path tidak bisa ditulis -> error `E_IO` ringkas.
- Setting invalid -> error `E_VALIDATION`.

## 5) UX Guardrails

- Jangan menambah langkah ekstra tanpa alasan kuat.
- Action kritis harus terlihat, bukan tersembunyi default.
- Shortcut boleh menambah kecepatan, tapi flow mouse-first tetap harus jelas.

## 6) Handoff Rule

Jika ada redesign flow, update dokumen ini sebelum implementasi luas.
