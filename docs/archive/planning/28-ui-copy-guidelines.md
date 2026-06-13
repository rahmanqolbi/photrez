# 28 - UI Copy Guidelines (MVP)

Dokumen ini mengatur gaya bahasa teks UI Photrez agar konsisten.

## 1) Tone of Voice

- Clear
- Direct
- Friendly-professional
- Tidak bertele-tele

## 2) Language Rule

- Bahasa UI default MVP: English.
- Internal docs boleh bilingual/Indonesia.
- Jangan campur bahasa dalam satu komponen UI kecuali untuk fallback teknis.

## 3) Label Writing Rules

1. Gunakan kata kerja jelas untuk action: `Open`, `Export`, `Resize`, `Undo`.
2. Hindari label ambigu: `Process`, `Do`, `Apply Now`.
3. Gunakan title case untuk tombol/menu utama.
4. Maksimal 2 kata untuk label toolbar jika memungkinkan.

## 4) Status and Feedback Rules

- Sukses: ringkas dan konfirmasi hasil.
  Example: `Export completed.`
- Proses: jelaskan sedang apa.
  Example: `Exporting image...`
- Gagal: jelaskan masalah + arah perbaikan sederhana.
  Example: `Cannot save file. Check destination path and try again.`

## 5) Error Message Rules

1. Mulai dari masalah inti, bukan kode teknis dulu.
2. Sertakan aksi lanjut jika ada.
3. Kode error teknis boleh ditampilkan sebagai suffix.

Format disarankan:

`<what happened>. <what user can do>. (Error: <CODE>)`

Contoh:

`Cannot open selected file. Please choose a valid image format. (Error: E_VALIDATION)`

## 6) Tooltip and Hint Rules

- Tooltip maksimal 1 kalimat.
- Hint shortcut ditulis konsisten, contoh: `Ctrl+K`.
- Jangan duplikasi informasi panjang dari panel ke tooltip.

## 7) Empty State Copy Rules

Setiap empty state minimal punya:

1. Context line: apa yang kosong.
2. Action line: apa langkah berikutnya.

Contoh:

- `No layers yet.`
- `Open an image to start editing.`

## 8) Prohibited Patterns

- Teks yang menyalahkan user.
- Pesan terlalu teknis tanpa konteks.
- Variasi istilah untuk aksi yang sama (contoh campur `Save` vs `Store` tanpa alasan).

## 9) Review Checklist

- [ ] Istilah action konsisten di semua screen.
- [ ] Error message punya next action.
- [ ] Tidak ada kalimat panjang sulit dipindai.
- [ ] Shortcut notation konsisten.

## 10) Reference

Gunakan bersama:

1. `docs/archive/planning/22-ui-style-guide.md`
2. `docs/archive/planning/27-key-user-flows.md`
