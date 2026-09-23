// Mirror SCHEDULES dari app.js. Kalau app di-update, sync manual ke sini.
const mk = (start, end, icon, title, desc, cat) => ({ start, end, icon, title, desc, cat });

export const SCHEDULES = {
  weekday: {
    items: [
      mk("05:00","05:15","🌙","Bangun & sholat Subuh","Cuci muka dulu biar melek","pray"),
      mk("05:15","06:00","🛏️","Ngumpet di kasur","Dingin! Scroll HP atau merem lagi sebentar","rest"),
      mk("06:00","07:00","🧹","Beres kamar & olahraga","Kamar rapi, badan anget","move"),
      mk("07:00","08:00","🚿","Mandi & sarapan","Isi tenaga sebelum kerja","rest"),
      mk("08:00","12:00","💻","Kerja sesi pagi","Fokus mode on","work"),
      mk("12:00","13:00","🍱","Sholat Dzuhur & istirahat","Rehat sejenak","pray"),
      mk("13:00","17:00","⌨️","Kerja sesi siang","Lanjut sampai sore","work"),
      mk("17:00","18:00","🚿","Mandi, sholat Ashar, beres-beres","Tutup laptop, kerjaan selesai","pray"),
      mk("18:00","19:20","🌅","Sholat Maghrib & makan malam","Makan enak setelah seharian","pray"),
      mk("19:20","19:30","⭐","Sholat Isya","Penutup ibadah hari ini","pray"),
      mk("19:30","20:00","🎬","Edit video TikTok","Waktunya kreatif","fun"),
      mk("20:00","22:00","🧸","Santai & siap-siap bobo","Pelan-pelan matikan layar","rest"),
      mk("22:00","05:00","😴","Tidur nyenyak","Sampai jam 5 pagi, lalu ulang lagi","sleep"),
    ]
  },
  weekend: {
    items: [
      mk("05:00","05:15","🌙","Bangun & sholat Subuh","Cuci muka dulu biar melek","pray"),
      mk("05:15","06:00","🛏️","Ngumpet di kasur","Dingin! Scroll HP atau merem lagi sebentar","rest"),
      mk("06:00","07:00","🧹","Beres kamar & olahraga","Kamar rapi, badan anget","move"),
      mk("07:00","08:00","🚿","Mandi & sarapan","Isi tenaga buat hari yang santai","rest"),
      mk("08:00","12:00","💜","Waktu luang","Santai, hobi, apa aja yang bikin senang","fun"),
      mk("12:00","13:00","🍱","Sholat Dzuhur & istirahat","Rehat sejenak","pray"),
      mk("13:00","17:00","💜","Waktu luang","Lanjut have fun sampai sore","fun"),
      mk("17:00","18:00","🚿","Mandi, sholat Ashar, beres-beres","Seger-seger sore, siap lanjut santai","pray"),
      mk("18:00","19:20","🌅","Sholat Maghrib & makan malam","Makan enak setelah seharian","pray"),
      mk("19:20","19:30","⭐","Sholat Isya","Penutup ibadah hari ini","pray"),
      mk("19:30","20:00","🎬","Edit video TikTok","Waktunya kreatif","fun"),
      mk("20:00","22:00","🧸","Santai & siap-siap bobo","Pelan-pelan matikan layar","rest"),
      mk("22:00","05:00","😴","Tidur nyenyak","Sampai jam 5 pagi, lalu ulang lagi","sleep"),
    ]
  }
};
