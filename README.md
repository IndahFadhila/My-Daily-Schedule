# Jadwal Harianku

Aplikasi jadwal harian pribadi. HTML + CSS + JS vanilla, tanpa framework,
tanpa build step.

## Fitur

- 3 tab: **Weekday**, **Weekend**, **Laporan** (auto-pilih Weekday/Weekend sesuai hari)
- Kartu **SEKARANG** otomatis nunjukin kegiatan sesuai jam device + pulse dot
- Hitung mundur ke kegiatan berikutnya
- Checklist per kegiatan, tersimpan di `localStorage`
- Tombol **Centang semua** & **Kosongkan** (dengan modal konfirmasi)
- **Ke sekarang** untuk lompat ke kegiatan yang lagi berjalan
- Progress bar harian dari checklist
- Tab **Laporan**: hari ini (%), 7 hari terakhir (bar chart), streak (hari beruntun ≥50%)
- Handle slot yang lewat tengah malam (contoh: Tidur 22:00 - 05:00)
- History disimpan 30 hari (buat laporan/streak), data lebih lama auto-dibersihin
- Favicon SVG dari emoji 🌤️ (built-in, nggak butuh file terpisah)

## Cara jalanin lokal

Buka `index.html` langsung di browser. Nggak butuh server.

## Deploy ke GitHub Pages

1. Push isi folder ini ke repo GitHub (public).
2. Di repo, buka **Settings → Pages**.
3. Source: **Deploy from a branch**, Branch: `main` (folder `/root`), lalu **Save**.
4. Tunggu ~1 menit, buka `https://<username>.github.io/<nama-repo>/`.

## Struktur

```
jadwal-harian/
├── index.html    # markup
├── styles.css    # semua styling
├── app.js        # semua logic + data jadwal
└── README.md
```

## Kustomisasi jadwal

Data ada di object `SCHEDULES` di `app.js`. Format tiap item:

```js
mk("HH:MM", "HH:MM", "🌙", "Judul", "Deskripsi singkat", "cat")
//  start    end     icon  title    description         category
```

Kategori: `pray`, `work`, `rest`, `move`, `fun`, `sleep`. Warna tiap kategori
diatur di blok `:root` di `styles.css`.

Nambah tab baru: tambah key di `SCHEDULES` (di `app.js`) dengan `label` + `items`.

## Catatan teknis

- Butuh browser modern (2023+) karena pakai `color-mix()` di CSS.
- Auto-refresh kartu SEKARANG tiap 30 detik + saat tab kembali ke foreground.
- Data checklist di-scope per tanggal, jadi tanggal baru = checklist kosong,
  tapi data hari-hari sebelumnya (max 30 hari) tetap disimpan buat laporan.
- Streak threshold: 50% (hari dianggap "beruntun" kalau minimal setengah kegiatan
  dicentang). Kalau hari ini belum sampai 50%, streak nggak putus, cuma nggak nambah.
