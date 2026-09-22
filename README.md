# Indah's Daily

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Aplikasi jadwal harian pribadi. HTML + CSS + JS vanilla, tanpa framework,
tanpa build step.

Made by [**Indah Fadhila**](https://github.com/IndahFadhila).

## Fitur

- 3 tab: **Weekday**, **Weekend**, **Laporan** (auto-pilih Weekday/Weekend sesuai hari)
- Kartu **SEKARANG** otomatis nunjukin kegiatan sesuai jam device + pulse dot
- Hitung mundur ke kegiatan berikutnya
- Checklist per kegiatan, tersimpan di `localStorage`
- Tombol **Centang semua** & **Kosongkan** (dengan modal konfirmasi)
- **Ke sekarang** untuk lompat ke kegiatan yang lagi berjalan
- Progress bar harian dari checklist
- Tab **Laporan**: hari ini (%), 7 hari terakhir (bar chart), streak (hari beruntun ≥50%)
- **Notifikasi browser** saat ganti kegiatan (butuh permission, disimpan pref)
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
├── index.html      # markup + PWA meta + SW register
├── styles.css      # semua styling
├── app.js          # semua logic + data jadwal
├── manifest.json   # PWA manifest (nama, icon, standalone)
├── sw.js           # service worker (offline cache)
├── icon.svg        # icon PWA (sun+cloud+stars, sky gradient)
└── README.md
```

## PWA / Install ke HP

Situs ini installable sebagai PWA:
- **Android Chrome/Edge**: buka situs → menu → "Add to Home Screen" atau "Install app". Bakal jadi standalone app dengan icon dedicated.
- **iOS Safari**: buka situs → Share → "Add to Home Screen". Buka dari homescreen → jalan standalone.
- **Desktop Chrome/Edge**: icon install muncul di address bar.

Notifikasi jalan selama PWA masih running (foreground/background). Kalau di-swipe close dari recent apps, notif berhenti sampai app dibuka lagi. Nggak butuh server (murni client-side).

Offline: setelah kunjungan pertama, service worker cache semua asset. Bisa dibuka tanpa internet.

## Kustomisasi jadwal

Data ada di object `SCHEDULES` di `app.js`. Format tiap item:

```js
mk("HH:MM", "HH:MM", "🌙", "Judul", "Deskripsi singkat", "cat")
//  start    end     icon  title    description         category
```

Kategori: `pray`, `work`, `rest`, `move`, `fun`, `sleep`. Warna tiap kategori
diatur di blok `:root` di `styles.css`.

Nambah tab baru: tambah key di `SCHEDULES` (di `app.js`) dengan `label` + `items`.

## Lisensi & Atribusi

Rilis di bawah [MIT License](LICENSE) — silakan pakai, fork, atau modifikasi,
**tapi tetap tolong cantumkan credit** ke pemilik asli:

```
Copyright (c) 2026 Indah Fadhila
https://github.com/IndahFadhila/My-Daily-Schedule
```

Kalau kamu re-publish/deploy versi hasil fork, jangan hapus:
- File `LICENSE`
- Comment banner copyright di source file (`index.html`, `styles.css`, `app.js`, `sw.js`)
- Baris credit di footer app (link ke author + source)

Bug report, PR, dan feedback welcome di [GitHub Issues](https://github.com/IndahFadhila/My-Daily-Schedule/issues).

## Catatan teknis

- Butuh browser modern (2023+) karena pakai `color-mix()` di CSS.
- Auto-refresh kartu SEKARANG tiap 30 detik + saat tab kembali ke foreground.
- Data checklist di-scope per tanggal, jadi tanggal baru = checklist kosong,
  tapi data hari-hari sebelumnya (max 30 hari) tetap disimpan buat laporan.
- Streak threshold: 50% (hari dianggap "beruntun" kalau minimal setengah kegiatan
  dicentang). Kalau hari ini belum sampai 50%, streak nggak putus, cuma nggak nambah.
