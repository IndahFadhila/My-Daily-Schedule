/*!
 * Indah's Daily
 * Copyright (c) 2026 Indah Fadhila
 * Source: https://github.com/IndahFadhila/My-Daily-Schedule
 * Licensed under MIT (see LICENSE)
 */
(function(){
  'use strict';

  const DAY_MIN = 1440;
  const STORAGE_PREFIX = "jadwal_v1_";
  const HISTORY_DAYS = 30;
  const TICK_MS = 30000;
  const DATE_CHECK_MS = 60000;
  const STREAK_THRESHOLD = 50;
  const NOTIF_PREF_KEY = "jadwal_notif_v1";
  // ==== Push notification config (Cloudflare Worker) ====
  // Isi setelah deploy worker. Kalau kosong, push server di-skip
  // dan notif jalan lokal doang (cuma pas app dibuka).
  const PUSH_WORKER_URL = "https://jadwal-push.indahfadhila.workers.dev";
  const PUSH_VAPID_PUBLIC = "BDNruPZMz0p-3fSmSkL4srHVx-rYPPbL-N257NdMQdzftIapCxzQsF4mAqMUnzWCiEvXG6Pm2_FAFje22uw62n8";
  const PUSH_SUB_KEY = "jadwal_push_sub_v1";
  const BELL_ON_SVG = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const BELL_OFF_SVG = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.888 17.888 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><path d="m2 2 20 20"/></svg>';

  const CATS = {
    pray:  {name:"Ibadah",     color:"var(--pray)"},
    work:  {name:"Kerja",      color:"var(--work)"},
    rest:  {name:"Istirahat",  color:"var(--rest)"},
    move:  {name:"Gerak",      color:"var(--move)"},
    fun:   {name:"Waktu luang",color:"var(--fun)"},
    sleep: {name:"Tidur",      color:"var(--sleep)"},
  };
  const CAT_BG = {
    pray:"var(--pray-bg)", work:"var(--work-bg)", rest:"var(--rest-bg)",
    move:"var(--move-bg)", fun:"var(--fun-bg)", sleep:"var(--sleep-bg)",
  };
  // Solid SVG icon per kategori (buat legend day-chart)
  const CAT_ICONS = {
    pray:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
    work:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4z"/></svg>',
    rest:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8v9a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-2h1a4 4 0 1 0 0-8zm14 3h1a2 2 0 0 1 0 4h-1z"/></svg>',
    move:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    fun:   '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-4 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-4 8a5 5 0 0 1-4.58-3h9.15A5 5 0 0 1 12 18z"/></svg>',
    sleep: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };

  const mk = (start,end,icon,title,desc,cat) => ({start,end,icon,title,desc,cat});

  const SCHEDULES = {
    weekday: {
      label: "Weekday",
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
      label: "Weekend",
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

  const TABS = [
    { key:"weekday", label:"Weekday" },
    { key:"weekend", label:"Weekend" },
    { key:"laporan", label:"Laporan" },
  ];

  const $ = (id) => document.getElementById(id);
  const dom = {
    tabs: $("tabs"),
    hero: document.querySelector(".hero"),
    nowIcon: $("nowIcon"),
    nowTitle: $("nowTitle"),
    nowDesc: $("nowDesc"),
    nowClock: $("nowClock"),
    nextInfo: $("nextInfo"),
    progressTrack: $("progressTrack"),
    progressFill: $("progressFill"),
    progressPct: $("progressPct"),
    actions: $("actions"),
    jumpBtn: $("jumpBtn"),
    checkAllBtn: $("checkAllBtn"),
    clearAllBtn: $("clearAllBtn"),
    notifBtn: $("notifBtn"),
    testNotifBtn: $("testNotifBtn"),
    settingsBtn: $("settingsBtn"),
    settingsPanel: $("settingsPanel"),
    settingsBackdrop: $("settingsBackdrop"),
    settingsClose: $("settingsClose"),
    testNotifDesc: $("testNotifDesc"),
    soundToggle: $("soundToggle"),
    backupBtn: $("backupBtn"),
    restoreBtn: $("restoreBtn"),
    restoreFileInput: $("restoreFileInput"),
    resetAllBtn: $("resetAllBtn"),
    scheduleView: $("scheduleView"),
    reportView: $("reportView"),
    timeline: $("timeline"),
    legend: $("legend"),
    modalBackdrop: $("modalBackdrop"),
    modalIcon: $("modalIcon"),
    modalTitle: $("modalTitle"),
    modalMsg: $("modalMsg"),
    modalOk: $("modalOk"),
    modalCancel: $("modalCancel"),
  };

  // ---------- helpers ----------
  const pad2 = (n) => String(n).padStart(2,"0");
  const ymd = (d) => d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  function parseDate(dateStr){
    const [y,m,d] = dateStr.split("-").map(Number);
    return new Date(y, m-1, d);
  }
  function toMinutes(hhmm){
    const [h,m] = hhmm.split(":").map(Number);
    return h*60 + m;
  }
  function durText(startMin, endMinRaw){
    let end = endMinRaw;
    if(end <= startMin) end += DAY_MIN;
    const total = end - startMin;
    const h = Math.floor(total/60), m = total%60;
    if(h && m) return h+" j "+m+" mnt";
    if(h) return h+" j";
    return m+" mnt";
  }
  // Handle slot yang lewat tengah malam (contoh: 22:00-05:00).
  function findCurrentIndex(items, nowMin){
    for(let i=0; i<items.length; i++){
      const s = toMinutes(items[i].start);
      let e = toMinutes(items[i].end);
      if(e <= s) e += DAY_MIN;
      if(nowMin >= s && nowMin < e) return i;
      if(nowMin + DAY_MIN >= s && nowMin + DAY_MIN < e) return i;
    }
    return 0;
  }

  // ---------- storage ----------
  function todayKey(){ return ymd(new Date()); }
  function storageKey(schedKey, date){
    return STORAGE_PREFIX + schedKey + "_" + (date || todayKey());
  }
  function loadChecked(schedKey){
    try{
      const raw = localStorage.getItem(storageKey(schedKey));
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveChecked(schedKey, obj){
    try{ localStorage.setItem(storageKey(schedKey), JSON.stringify(obj)); }catch(e){}
  }
  // Buang key jadwal_v1_* yang lebih tua dari HISTORY_DAYS hari.
  // Data terbaru tetap disimpan buat laporan/streak.
  function pruneOldStorage(){
    try{
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);
      const cutoffKey = ymd(cutoff);
      const toRemove = [];
      for(let i=0; i<localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.startsWith(STORAGE_PREFIX)){
          const dateSuffix = k.slice(-10);
          if(/^\d{4}-\d{2}-\d{2}$/.test(dateSuffix) && dateSuffix < cutoffKey){
            toRemove.push(k);
          }
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }catch(e){}
  }

  // ---------- summary / streak ----------
  function scheduleForDate(dateStr){
    const d = parseDate(dateStr);
    return [0,6].includes(d.getDay()) ? "weekend" : "weekday";
  }
  function getDaySummary(dateStr){
    const schedKey = scheduleForDate(dateStr);
    const total = SCHEDULES[schedKey].items.length;
    let done = 0;
    try{
      const raw = localStorage.getItem(storageKey(schedKey, dateStr));
      if(raw){
        const data = JSON.parse(raw);
        done = Object.values(data).filter(Boolean).length;
      }
    }catch(e){}
    return {
      pct: total ? Math.round(done/total*100) : 0,
      done, total, schedKey
    };
  }
  function getLastNDays(n){
    const now = new Date();
    const dayNames = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
    const list = [];
    for(let i=n-1; i>=0; i--){
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = ymd(d);
      list.push({
        dateStr,
        dayLabel: dayNames[d.getDay()],
        isToday: i === 0,
        ...getDaySummary(dateStr)
      });
    }
    return list;
  }
  // Streak: berapa hari berturut-turut dengan pct >= threshold.
  // Kalau hari ini belum sampai threshold, mulai hitung dari kemarin
  // (biar streak nggak "putus" cuma karena hari belum selesai).
  function calcStreak(threshold){
    const now = new Date();
    let streak = 0;
    let startI = 0;
    if(getDaySummary(ymd(now)).pct < threshold) startI = 1;
    for(let i=startI; i<HISTORY_DAYS + 5; i++){
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const summary = getDaySummary(ymd(d));
      if(summary.pct >= threshold) streak++;
      else break;
    }
    return streak;
  }
  // Celestial theme (matches streak emoji): dawn -> moon -> spark -> sparkle -> star -> supernova
  function streakMessage(streak){
    if(streak >= 30) return "Legendary! You're glowing bright.";
    if(streak >= 14) return "Your star shines strong.";
    if(streak >= 7)  return "A whole week of sparkle!";
    if(streak >= 3)  return "Sparks are lighting up!";
    if(streak >= 1)  return "First glow - keep going.";
    return "Let's start tonight!";
  }
  function streakEmoji(streak){
    if(streak >= 30) return "🌟";
    if(streak >= 14) return "⭐";
    if(streak >= 7)  return "✨";
    if(streak >= 3)  return "💫";
    if(streak >= 1)  return "🌙";
    return "🌤️";
  }

  // ---------- sound (web audio, no external file) ----------
  let _audioCtx = null;
  function getAudioCtx(){
    try{
      if(!_audioCtx){
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if(_audioCtx.state === "suspended") _audioCtx.resume();
      return _audioCtx;
    }catch(e){ return null; }
  }
  function playTones(notes){
    const ctx = getAudioCtx();
    if(!ctx) return;
    const now = ctx.currentTime;
    notes.forEach(({f, t, dur, vol}) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(vol || 0.12, now + t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + (dur || 0.22));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + (dur || 0.22));
    });
  }
  // Sound preference (default: on)
  const SOUND_PREF_KEY = "jadwal_sound_v1";
  function isSoundEnabled(){
    try{ return localStorage.getItem(SOUND_PREF_KEY) !== "0"; }
    catch(e){ return true; }
  }
  function setSoundEnabled(v){
    try{ localStorage.setItem(SOUND_PREF_KEY, v ? "1" : "0"); }catch(e){}
  }
  // "Ding" pas ceklis — 2 nada cepet
  function playCheckSound(){
    if(!isSoundEnabled()) return;
    playTones([
      {f: 880,  t: 0,    dur: 0.22, vol: 0.12},  // A5
      {f: 1174, t: 0.06, dur: 0.22, vol: 0.10},  // D6
    ]);
  }
  // Arpeggio C major naik pas semua kelar
  function playCelebrationSound(){
    if(!isSoundEnabled()) return;
    playTones([
      {f: 523.25, t: 0,    dur: 0.4, vol: 0.14},  // C5
      {f: 659.25, t: 0.12, dur: 0.4, vol: 0.14},  // E5
      {f: 783.99, t: 0.24, dur: 0.4, vol: 0.14},  // G5
      {f: 1046.5, t: 0.36, dur: 0.5, vol: 0.16},  // C6
    ]);
  }

  // ---------- celebration (all done) ----------
  const CELEBRATE_KEY = "jadwal_celebrated_v1";
  function loadCelebrated(){
    try{
      const raw = localStorage.getItem(CELEBRATE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveCelebrated(map){
    try{ localStorage.setItem(CELEBRATE_KEY, JSON.stringify(map)); }catch(e){}
  }
  function celebrateFlagKey(schedKey){ return schedKey + "_" + todayKey(); }
  function hasCelebratedToday(schedKey){
    return !!loadCelebrated()[celebrateFlagKey(schedKey)];
  }
  function markCelebrated(schedKey){
    // Simpan flag hari ini, buang entry hari lain
    const today = todayKey();
    const map = loadCelebrated();
    const fresh = {};
    Object.keys(map).forEach(k => {
      if(k.endsWith("_" + today)) fresh[k] = map[k];
    });
    fresh[celebrateFlagKey(schedKey)] = true;
    saveCelebrated(fresh);
  }
  async function checkAndCelebrate(schedKey){
    const items = SCHEDULES[schedKey].items;
    const total = items.length;
    const done = Object.values(checkedState).filter(Boolean).length;
    if(done !== total || total === 0) return;
    if(hasCelebratedToday(schedKey)) return;
    markCelebrated(schedKey);
    playCelebrationSound();
    // Fire notif juga (buat kasus tab background / minimize)
    fireDoneNotif(schedKey);
    await showConfirm({
      icon: "🎉",
      title: "Semua selesai!",
      message: "Hari ini kamu kelar seluruh kegiatan. Keep shining ⭐",
      okText: "Yeay!",
      cancelText: ""
    });
  }

  // ---------- notif motivasi (done + incomplete end-of-day) ----------
  const NOTIF_FIRED_KEY = "jadwal_notif_fired_v1";
  const END_OF_DAY_MIN = 22 * 60; // 22:00 - waktu incomplete notif fire

  function loadNotifFired(){
    try{
      const raw = localStorage.getItem(NOTIF_FIRED_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveNotifFired(map){
    try{ localStorage.setItem(NOTIF_FIRED_KEY, JSON.stringify(map)); }catch(e){}
  }
  function notifFiredKey(schedKey, kind){
    return kind + "_" + schedKey + "_" + todayKey();
  }
  function hasFiredNotif(schedKey, kind){
    return !!loadNotifFired()[notifFiredKey(schedKey, kind)];
  }
  function markFiredNotif(schedKey, kind){
    const today = todayKey();
    const map = loadNotifFired();
    const fresh = {};
    // Buang entry hari-hari sebelumnya
    Object.keys(map).forEach(k => {
      if(k.endsWith("_" + today)) fresh[k] = map[k];
    });
    fresh[notifFiredKey(schedKey, kind)] = true;
    saveNotifFired(fresh);
  }

  function fireDoneNotif(schedKey){
    if(!notifEnabled) return;
    if(hasFiredNotif(schedKey, "done")) return;
    markFiredNotif(schedKey, "done");
    fireNotif("Semua kelar hari ini! ٩(◕‿◕)۶", {
      body: "Kamu keren banget, istirahat yang cukup ya ✨🌟",
      tag: "jadwal-done"
    });
  }

  function fireIncompleteNotif(schedKey){
    if(!notifEnabled) return;
    if(hasFiredNotif(schedKey, "incomplete")) return;
    markFiredNotif(schedKey, "incomplete");
    const items = SCHEDULES[schedKey].items;
    const total = items.length;
    const state = loadChecked(schedKey);
    const done = Object.values(state).filter(Boolean).length;
    const pct = total ? Math.round(done/total*100) : 0;
    let body;
    if(pct >= 80)      body = done + "/" + total + " selesai, hampir sempurna! Besok lebih konsisten ya (｡◕‿◕｡)";
    else if(pct >= 50) body = done + "/" + total + " selesai. Lumayan produktif, besok bisa lebih baik (￣︶￣)↗";
    else if(pct >= 1)  body = done + "/" + total + " selesai. Nggak apa-apa, besok mulai lagi ya 💪";
    else               body = "Belum ada yang di-ceklis nih. Besok coba lagi ya (¯▿¯)";
    fireNotif("Sisa dilanjut besok ya (￣︶￣)↗", {
      body: body,
      tag: "jadwal-incomplete"
    });
  }

  // Cek jam 22:00 ke atas - fire incomplete notif atau done notif (once/day)
  function checkEndOfDayNotif(){
    if(!notifEnabled) return;
    const now = new Date();
    const nowMin = now.getHours()*60 + now.getMinutes();
    if(nowMin < END_OF_DAY_MIN) return;
    const schedKey = todayScheduleKey();
    const items = SCHEDULES[schedKey].items;
    const total = items.length;
    const state = loadChecked(schedKey);
    const done = Object.values(state).filter(Boolean).length;
    if(done < total) fireIncompleteNotif(schedKey);
    else fireDoneNotif(schedKey);
  }

  // ---------- state ----------
  // Fresh helper: today's schedule key. Dipanggil ulang tiap kali biar
  // tetap akurat kalau app dibiarin terbuka nyeberang tengah malam.
  function todayScheduleKey(){
    return [0,6].includes(new Date().getDay()) ? "weekend" : "weekday";
  }
  let currentTab = todayScheduleKey();
  let lastScheduleTab = currentTab;
  let checkedState = {};
  let lastDateKey = todayKey();
  let previousFocus = null;
  let notifEnabled = false;
  let lastActivityTitle = null;

  // Di Laporan, SEKARANG & progress harus ikut hari ini (bukan tab terakhir).
  function activeScheduleKey(){
    return currentTab === "laporan" ? todayScheduleKey() : currentTab;
  }

  // ---------- render tabs ----------
  function renderTabs(){
    dom.tabs.innerHTML = "";
    const todaySched = todayScheduleKey();
    TABS.forEach(t => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.role = "tab";
      btn.className = "tab" + (t.key === currentTab ? " active" : "");
      btn.textContent = t.label;
      btn.setAttribute("aria-selected", t.key === currentTab ? "true" : "false");
      if(t.key === todaySched){
        btn.classList.add("is-today");
        btn.title = "Hari ini";
        btn.setAttribute("aria-label", t.label + " (hari ini)");
      }
      btn.addEventListener("click", () => selectTab(t.key));
      dom.tabs.appendChild(btn);
    });
  }

  function selectTab(key){
    if(key === currentTab) return;
    currentTab = key;
    if(key !== "laporan") lastScheduleTab = key;
    renderTabs();
    if(key === "laporan"){
      dom.scheduleView.hidden = true;
      dom.reportView.hidden = false;
      dom.actions.hidden = true;
      renderReport();
    } else {
      dom.scheduleView.hidden = false;
      dom.reportView.hidden = true;
      dom.actions.hidden = false;
      renderTimeline();
    }
    updateNow();
  }

  // ---------- render legend ----------
  function renderLegend(){
    dom.legend.innerHTML = "";
    Object.values(CATS).forEach(c => {
      const s = document.createElement("span");
      s.className = "chip";
      s.style.setProperty("--chip", c.color);
      s.textContent = c.name;
      dom.legend.appendChild(s);
    });
  }

  // ---------- render timeline ----------
  function renderTimeline(){
    const schedKey = lastScheduleTab;
    checkedState = loadChecked(schedKey);
    dom.timeline.innerHTML = "";
    const items = SCHEDULES[schedKey].items;
    const frag = document.createDocumentFragment();

    items.forEach((it, idx) => {
      const cat = CATS[it.cat];
      const bg = CAT_BG[it.cat];

      const li = document.createElement("li");
      li.className = "item" + (checkedState[idx] ? " done" : "");
      li.dataset.idx = idx;
      li.style.setProperty("--accent", cat.color);

      const timeEl = document.createElement("div");
      timeEl.className = "time-label";
      const timeText = document.createElement("span");
      timeText.textContent = it.start;
      timeEl.appendChild(timeText);

      const dotCol = document.createElement("div");
      dotCol.className = "dot-col";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden","true");
      dotCol.appendChild(dot);

      const card = document.createElement("div");
      card.className = "card";
      card.style.setProperty("--bg", bg);
      card.style.setProperty("--accent", cat.color);

      const srTime = document.createElement("span");
      srTime.className = "sr-only";
      srTime.textContent = "Mulai jam " + it.start + ". ";

      const icon = document.createElement("div");
      icon.className = "icon-badge";
      icon.setAttribute("aria-hidden","true");
      icon.textContent = it.icon;

      const h2 = document.createElement("h2");
      h2.textContent = it.title;

      const desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = it.desc;

      const meta = document.createElement("div");
      meta.className = "meta-row";

      const dur = document.createElement("span");
      dur.className = "dur-pill";
      dur.textContent = durText(toMinutes(it.start), toMinutes(it.end));

      const label = document.createElement("label");
      label.className = "check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!checkedState[idx];
      cb.setAttribute("aria-label", "Tandai selesai: " + it.title);
      label.append(cb, document.createTextNode("selesai"));

      cb.addEventListener("change", () => {
        checkedState[idx] = cb.checked;
        saveChecked(schedKey, checkedState);
        li.classList.toggle("done", cb.checked);
        updateProgress();
        if(cb.checked){
          playCheckSound();
          checkAndCelebrate(schedKey);
        }
      });

      meta.append(dur, label);
      card.append(srTime, icon, h2, desc, meta);
      li.append(timeEl, dotCol, card);
      frag.appendChild(li);
    });

    dom.timeline.appendChild(frag);
    updateProgress();
  }

  function updateProgress(){
    const schedKey = activeScheduleKey();
    const items = SCHEDULES[schedKey].items;
    const total = items.length;
    // Di Laporan, load fresh dari storage (checkedState in-memory mungkin
    // milik tab schedule lain). Di Weekday/Weekend, checkedState udah sesuai.
    const state = (currentTab === "laporan") ? loadChecked(schedKey) : checkedState;
    const done = Object.values(state).filter(Boolean).length;
    const pct = total ? Math.round((done/total)*100) : 0;
    dom.progressFill.style.width = pct + "%";
    dom.progressPct.textContent = pct + "%";
    dom.progressTrack.setAttribute("aria-valuenow", String(pct));
  }

  function updateNow(){
    const schedKey = activeScheduleKey();
    const now = new Date();
    const nowMin = now.getHours()*60 + now.getMinutes();
    const items = SCHEDULES[schedKey].items;
    const idx = findCurrentIndex(items, nowMin);
    const cur = items[idx];
    const next = items[(idx + 1) % items.length];

    dom.nowIcon.textContent = cur.icon;
    dom.nowTitle.textContent = cur.title;
    dom.nowDesc.textContent = cur.desc;
    dom.nowClock.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes());

    const nextStart = toMinutes(next.start);
    let diff = nextStart - nowMin;
    if(diff <= 0) diff += DAY_MIN;
    const dh = Math.floor(diff/60), dm = diff%60;
    const diffTxt = dh ? (dh + " j " + dm + " mnt") : (dm + " mnt");
    dom.nextInfo.textContent = "Lanjut " + next.title.toLowerCase() + " dalam " + diffTxt;

    dom.hero.style.setProperty("--accent", CATS[cur.cat].color);

    if(currentTab !== "laporan"){
      const prev = dom.timeline.querySelector("li.item.current");
      if(prev) prev.classList.remove("current");
      const curLi = dom.timeline.querySelector('li.item[data-idx="' + idx + '"]');
      if(curLi) curLi.classList.add("current");
    }

    // Notifikasi: pake schedule hari ini (bukan tab yang lagi dibuka).
    // Bandingin pake title biar sleep weekday -> sleep weekend nggak trigger notif.
    const todayKey_ = todayScheduleKey();
    const todayItems = SCHEDULES[todayKey_].items;
    const todayIdx = findCurrentIndex(todayItems, nowMin);
    const todayCur = todayItems[todayIdx];
    if(lastActivityTitle !== null && lastActivityTitle !== todayCur.title){
      fireActivityNotif(todayCur);
    }
    lastActivityTitle = todayCur.title;

    // Cek end-of-day notif (fire jam 22:00+ kalau incomplete/done)
    checkEndOfDayNotif();
  }

  // ---------- notifications ----------
  function notifSupported(){ return "Notification" in window; }
  function notifPermission(){ return notifSupported() ? Notification.permission : "unsupported"; }
  function loadNotifPref(){
    try{ return localStorage.getItem(NOTIF_PREF_KEY) === "1"; }catch(e){ return false; }
  }
  function saveNotifPref(v){
    try{ localStorage.setItem(NOTIF_PREF_KEY, v ? "1" : "0"); }catch(e){}
  }
  function emojiIcon(emoji){
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + emoji + '</text></svg>'
    );
  }
  function updateNotifBtnUI(){
    const on = notifEnabled && notifPermission() === "granted";
    dom.notifBtn.innerHTML = (on ? BELL_ON_SVG : BELL_OFF_SVG) + " Notif";
    dom.notifBtn.classList.toggle("primary", on);
    dom.notifBtn.setAttribute("aria-pressed", on ? "true" : "false");
    dom.notifBtn.title = on
      ? "Notifikasi aktif - klik buat matiin"
      : "Klik buat aktifin notifikasi kegiatan";
  }

  // Trigger fake activity notif buat testing - pake kegiatan yang lagi berlangsung
  async function fireTestNotif(){
    const now = new Date();
    const nowMin = now.getHours()*60 + now.getMinutes();
    const schedKey = todayScheduleKey();
    const items = SCHEDULES[schedKey].items;
    const idx = findCurrentIndex(items, nowMin);
    const cur = items[idx];
    const ok = await fireNotif("Waktunya " + cur.title, {
      body: cur.desc,
      tag: "jadwal-activity",
    });
    if(!ok){
      await showConfirm({
        icon: "⚠️",
        title: "Test notif gagal",
        message: "Notif nggak berhasil dikirim. Kalau di HP, install dulu sebagai PWA (Add to Home Screen), buka dari icon PWA (bukan browser tab), terus test lagi.",
        okText: "OK",
        cancelText: ""
      });
    }
  }
  // Fire notif via Service Worker (wajib buat Chrome Android + iOS PWA).
  // Fallback ke constructor Notification() kalau SW nggak available (desktop tanpa SW).
  async function fireNotif(title, opts){
    if(notifPermission() !== "granted"){
      console.warn("[Notif] skip - permission:", notifPermission());
      return false;
    }
    opts = opts || {};
    // Notif icon: 🌸 emoji. Query string ?v=N buat cache-bust
    // (Android/SW cache icon notif agresif - bump v tiap ganti icon).
    const iconUrl = new URL("notif-icon.svg?v=3", location.href).href;
    if(!opts.icon)  opts.icon  = iconUrl;
    if(!opts.badge) opts.badge = iconUrl;
    // Coba SW dulu (mobile-compatible)
    try{
      if('serviceWorker' in navigator){
        const reg = await navigator.serviceWorker.ready;
        if(reg && reg.showNotification){
          await reg.showNotification(title, opts);
          return true;
        }
      }
    }catch(e){
      console.warn("[Notif] SW showNotification failed:", e);
    }
    // Fallback: konstruktor langsung
    try{
      const n = new Notification(title, opts);
      setTimeout(() => { try{ n.close(); }catch(e){} }, 10000);
      return true;
    }catch(e){
      console.warn("[Notif] constructor failed:", e);
      return false;
    }
  }

  function fireActivityNotif(activity){
    if(!notifEnabled) return;
    fireNotif("Waktunya " + activity.title, {
      body: activity.desc,
      tag: "jadwal-activity",
    });
  }
  // ---------- Push subscribe (Cloudflare Worker) ----------
  function pushConfigured(){ return !!(PUSH_WORKER_URL && PUSH_VAPID_PUBLIC); }
  function urlB64ToUint8Array(base64String){
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for(let i=0; i<raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function subscribeToPush(){
    if(!pushConfigured()){
      console.info("[Push] worker URL / VAPID key belum diisi, skip subscribe");
      return { ok: false, reason: "not-configured" };
    }
    if(!("serviceWorker" in navigator) || !("PushManager" in window)){
      return { ok: false, reason: "unsupported" };
    }
    try{
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if(!sub){
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(PUSH_VAPID_PUBLIC),
        });
      }
      const res = await fetch(PUSH_WORKER_URL + "/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if(!res.ok) throw new Error("subscribe HTTP " + res.status);
      try{ localStorage.setItem(PUSH_SUB_KEY, JSON.stringify({ endpoint: sub.endpoint })); }catch(e){}
      return { ok: true };
    }catch(e){
      console.warn("[Push] subscribe gagal:", e);
      return { ok: false, reason: String(e) };
    }
  }
  async function unsubscribeFromPush(){
    if(!pushConfigured()) return;
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub){
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch(PUSH_WORKER_URL + "/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      try{ localStorage.removeItem(PUSH_SUB_KEY); }catch(e){}
    }catch(e){
      console.warn("[Push] unsubscribe gagal:", e);
    }
  }

  async function toggleNotif(){
    if(!notifSupported()){
      await showConfirm({
        icon: "😕",
        title: "Browser nggak dukung notifikasi",
        message: "Fitur ini butuh Notification API. Coba pakai browser lain (Chrome/Firefox/Edge terbaru).",
        okText: "OK",
        cancelText: ""
      });
      return;
    }
    if(notifEnabled){
      notifEnabled = false;
      saveNotifPref(false);
      updateNotifBtnUI();
      unsubscribeFromPush();
      return;
    }
    const perm = notifPermission();
    if(perm === "denied"){
      await showConfirm({
        icon: "🔕",
        title: "Notifikasi diblokir",
        message: "Kamu udah blokir notifikasi buat site ini. Buka setting browser (icon gembok di address bar), aktifin Notifications, terus refresh.",
        okText: "OK",
        cancelText: ""
      });
      return;
    }
    if(perm === "default"){
      const result = await Notification.requestPermission();
      if(result !== "granted") return;
    }
    notifEnabled = true;
    saveNotifPref(true);
    updateNotifBtnUI();
    // Subscribe ke push server (jalan di background bareng notif test)
    const pushRes = await subscribeToPush();
    const bodyMsg = pushRes.ok
      ? "Kamu bakal dapet notif tiap kegiatan mulai, walau app ketutup ✨"
      : "Notif jalan pas app dibuka. (Push server: " + (pushRes.reason || "off") + ")";
    const ok = await fireNotif("Notifikasi aktif!", {
      body: bodyMsg,
      tag: "jadwal-test"
    });
    if(!ok){
      await showConfirm({
        icon: "⚠️",
        title: "Notif gagal dikirim",
        message: "Permission udah granted tapi notif nggak muncul. Coba install PWA (Add to Home Screen) terus buka dari icon.",
        okText: "OK",
        cancelText: ""
      });
    }
  }

  // ---------- render report ----------
  const REPORT_ICONS = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  };

  // Pie chart 24-jam: kegiatan hari ini sebagai slice bewarna
  function renderDayChart(schedKey){
    const items = SCHEDULES[schedKey].items;
    const cx = 100, cy = 100, r = 82, holeR = 44;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("class", "day-chart-svg");
    svg.setAttribute("aria-hidden", "true");

    // Background ring (light bg untuk contrast slice)
    const bg = document.createElementNS(svgNS, "circle");
    bg.setAttribute("cx", cx);
    bg.setAttribute("cy", cy);
    bg.setAttribute("r", r);
    bg.setAttribute("fill", "#F5F1F9");
    svg.appendChild(bg);

    // Ambil warna aktual dari CSS var
    const rootStyle = getComputedStyle(document.documentElement);
    const catColor = (cat) => rootStyle.getPropertyValue("--" + cat).trim() || "#ccc";

    // Draw slice dari startMin ke endMin (same day, no wrap)
    const drawSlice = (startMin, endMin, color) => {
      if(endMin <= startMin) return;
      const toAngle = (min) => (min / 1440) * 360 - 90; // 0 min = top
      const sRad = toAngle(startMin) * Math.PI / 180;
      const eRad = toAngle(endMin) * Math.PI / 180;
      const x1 = cx + r * Math.cos(sRad);
      const y1 = cy + r * Math.sin(sRad);
      const x2 = cx + r * Math.cos(eRad);
      const y2 = cy + r * Math.sin(eRad);
      const largeArc = (endMin - startMin) > 720 ? 1 : 0;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d",
        "M " + cx + " " + cy +
        " L " + x1 + " " + y1 +
        " A " + r + " " + r + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z"
      );
      path.setAttribute("fill", color);
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "1");
      svg.appendChild(path);
    };

    items.forEach(item => {
      const color = catColor(item.cat);
      const s = toMinutes(item.start);
      let e = toMinutes(item.end);
      if(e <= s){
        // Slot lewat midnight - split jadi 2 slice
        drawSlice(s, 1440, color);
        drawSlice(0, e, color);
      } else {
        drawSlice(s, e, color);
      }
    });

    // Donut hole di tengah
    const hole = document.createElementNS(svgNS, "circle");
    hole.setAttribute("cx", cx);
    hole.setAttribute("cy", cy);
    hole.setAttribute("r", holeR);
    hole.setAttribute("fill", "#fff");
    svg.appendChild(hole);

    // Jam markers (0/6/12/18)
    const markers = [
      {label:"0",  x:cx,     y:cy - r - 6, anchor:"middle"},
      {label:"6",  x:cx + r + 10, y:cy + 3,  anchor:"start"},
      {label:"12", x:cx,     y:cy + r + 14, anchor:"middle"},
      {label:"18", x:cx - r - 10, y:cy + 3,  anchor:"end"},
    ];
    markers.forEach(m => {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", m.x);
      t.setAttribute("y", m.y);
      t.setAttribute("text-anchor", m.anchor);
      t.setAttribute("class", "day-chart-hour");
      t.textContent = m.label;
      svg.appendChild(t);
    });

    // Jarum jam: garis dari edge donut hole ke inner outer ring
    const now = new Date();
    const nowMin = now.getHours()*60 + now.getMinutes();
    const nowAngle = (nowMin/1440)*360 - 90;
    const nowRad = nowAngle * Math.PI / 180;
    const hand = document.createElementNS(svgNS, "line");
    hand.setAttribute("x1", cx + (holeR + 3) * Math.cos(nowRad));
    hand.setAttribute("y1", cy + (holeR + 3) * Math.sin(nowRad));
    hand.setAttribute("x2", cx + (r - 3) * Math.cos(nowRad));
    hand.setAttribute("y2", cy + (r - 3) * Math.sin(nowRad));
    hand.setAttribute("stroke", "#2A2140");
    hand.setAttribute("stroke-width", "2.5");
    hand.setAttribute("stroke-linecap", "round");
    svg.appendChild(hand);

    // Titik "sekarang" di outer ring
    const dotR = r + 2;
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", cx + dotR * Math.cos(nowRad));
    dot.setAttribute("cy", cy + dotR * Math.sin(nowRad));
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", "#fff");
    dot.setAttribute("stroke", "#2A2140");
    dot.setAttribute("stroke-width", "2");
    svg.appendChild(dot);

    // Center: jam sekarang + label
    const timeLabel = document.createElementNS(svgNS, "text");
    timeLabel.setAttribute("x", cx);
    timeLabel.setAttribute("y", cy - 2);
    timeLabel.setAttribute("text-anchor", "middle");
    timeLabel.setAttribute("class", "day-chart-time");
    timeLabel.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
    svg.appendChild(timeLabel);

    const subLabel = document.createElementNS(svgNS, "text");
    subLabel.setAttribute("x", cx);
    subLabel.setAttribute("y", cy + 13);
    subLabel.setAttribute("text-anchor", "middle");
    subLabel.setAttribute("class", "day-chart-sub");
    subLabel.textContent = "SEKARANG";
    svg.appendChild(subLabel);

    return svg;
  }

  function makeReportCard(iconSvg, title){
    const card = document.createElement("section");
    card.className = "report-card";
    const head = document.createElement("div");
    head.className = "report-head";
    const iconWrap = document.createElement("span");
    iconWrap.className = "report-icon-wrap";
    iconWrap.setAttribute("aria-hidden","true");
    iconWrap.innerHTML = iconSvg;
    const t = document.createElement("h2");
    t.className = "report-title";
    t.textContent = title;
    head.append(iconWrap, t);
    card.appendChild(head);
    return card;
  }

  function renderReport(){
    dom.reportView.innerHTML = "";
    const today = todayKey();
    const todaySummary = getDaySummary(today);
    const weekData = getLastNDays(7);
    const streak = calcStreak(STREAK_THRESHOLD);

    // --- Hari Ini ---
    const c1 = makeReportCard(REPORT_ICONS.today, "Hari Ini");
    const c1Body = document.createElement("div");
    c1Body.className = "report-today";
    const big = document.createElement("div");
    big.className = "big-pct";
    big.textContent = todaySummary.pct + "%";
    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = todaySummary.pct + "%";
    track.appendChild(fill);
    const sub = document.createElement("div");
    sub.className = "report-sub";
    sub.textContent = todaySummary.done + " dari " + todaySummary.total + " kegiatan udah dicentang";
    c1Body.append(big, track, sub);
    c1.appendChild(c1Body);
    dom.reportView.appendChild(c1);

    // --- 24 Jam Kegiatan ---
    const todaySchedKey = todayScheduleKey();
    const cPie = makeReportCard(REPORT_ICONS.clock, "24 Jam Kegiatan");
    cPie.appendChild(renderDayChart(todaySchedKey));
    const pieHint = document.createElement("div");
    pieHint.className = "day-chart-hint";
    pieHint.textContent = "Titik putih = jam sekarang";
    cPie.appendChild(pieHint);
    // Legend list dengan detail per kegiatan
    const legend = document.createElement("div");
    legend.className = "day-chart-legend";
    SCHEDULES[todaySchedKey].items.forEach(item => {
      const row = document.createElement("div");
      row.className = "day-chart-legend-item";
      const icon = document.createElement("span");
      icon.className = "day-chart-legend-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.style.color = "var(--" + item.cat + ")";
      icon.innerHTML = CAT_ICONS[item.cat] || "";
      const time = document.createElement("span");
      time.className = "day-chart-legend-time";
      time.textContent = item.start;
      const name = document.createElement("span");
      name.className = "day-chart-legend-name";
      name.textContent = item.title;
      row.append(icon, time, name);
      legend.appendChild(row);
    });
    cPie.appendChild(legend);
    dom.reportView.appendChild(cPie);

    // --- 7 Hari Terakhir ---
    const c2 = makeReportCard(REPORT_ICONS.chart, "7 Hari Terakhir");
    const list = document.createElement("div");
    list.className = "week-list";
    weekData.forEach(day => {
      const row = document.createElement("div");
      row.className = "week-row" + (day.isToday ? " today" : "");
      row.setAttribute("aria-label",
        day.dayLabel + (day.isToday ? " (hari ini)" : "") + ", " + day.pct + " persen");
      const l = document.createElement("span");
      l.className = "week-day";
      l.textContent = day.dayLabel;
      const bar = document.createElement("div");
      bar.className = "week-bar";
      const barFill = document.createElement("div");
      barFill.className = "week-bar-fill";
      barFill.style.width = day.pct + "%";
      bar.appendChild(barFill);
      const pct = document.createElement("span");
      pct.className = "week-pct";
      pct.textContent = day.pct + "%";
      row.append(l, bar, pct);
      list.appendChild(row);
    });
    c2.appendChild(list);
    dom.reportView.appendChild(c2);

    // --- Streak ---
    const c3 = makeReportCard(REPORT_ICONS.flame, "Streak");
    const sv = document.createElement("div");
    sv.className = "streak-view";
    const emoji = document.createElement("div");
    emoji.className = "streak-emoji";
    emoji.setAttribute("aria-hidden","true");
    emoji.textContent = streakEmoji(streak);
    const numWrap = document.createElement("div");
    const num = document.createElement("span");
    num.className = "streak-num";
    num.textContent = streak;
    numWrap.appendChild(num);
    const lbl = document.createElement("div");
    lbl.className = "streak-label";
    lbl.textContent = "day streak (≥50% done)";
    const msg = document.createElement("div");
    msg.className = "streak-msg";
    msg.textContent = streakMessage(streak);
    sv.append(emoji, numWrap, lbl, msg);
    c3.appendChild(sv);
    dom.reportView.appendChild(c3);
  }

  // ---------- bulk actions ----------
  function setAllChecked(value){
    const schedKey = lastScheduleTab;
    const items = SCHEDULES[schedKey].items;
    checkedState = {};
    if(value){
      items.forEach((_, idx) => { checkedState[idx] = true; });
    }
    saveChecked(schedKey, checkedState);
    dom.timeline.querySelectorAll('li.item').forEach(li => {
      li.classList.toggle('done', value);
      const cb = li.querySelector('input[type="checkbox"]');
      if(cb) cb.checked = value;
    });
    updateProgress();
    if(value){
      playCheckSound();
      checkAndCelebrate(schedKey);
    }
  }

  function checkAll(){ setAllChecked(true); }

  async function clearAll(){
    const anyChecked = Object.values(checkedState).some(Boolean);
    if(!anyChecked) return;
    const ok = await showConfirm({
      icon: "🧹",
      title: "Kosongkan semua centang?",
      message: "Progres hari ini bakal hilang dan nggak bisa dikembalikan.",
      okText: "Ya, kosongkan",
      cancelText: "Batal"
    });
    if(ok) setAllChecked(false);
  }

  // ---------- modal ----------
  function showConfirm(opts){
    return new Promise(resolve => {
      dom.modalIcon.textContent = opts.icon || "🤔";
      dom.modalTitle.textContent = opts.title || "";
      dom.modalMsg.textContent = opts.message || "";
      dom.modalOk.textContent = opts.okText || "Ya";
      // cancelText === "" -> sembunyiin (modal jadi info-only, cuma tombol OK)
      if(opts.cancelText === ""){
        dom.modalCancel.hidden = true;
      } else {
        dom.modalCancel.hidden = false;
        dom.modalCancel.textContent = opts.cancelText || "Batal";
      }

      previousFocus = document.activeElement;
      dom.modalBackdrop.hidden = false;
      requestAnimationFrame(() => dom.modalOk.focus());

      let done = false;
      const cleanup = (val) => {
        if(done) return;
        done = true;
        dom.modalOk.removeEventListener("click", ok);
        dom.modalCancel.removeEventListener("click", cancel);
        dom.modalBackdrop.removeEventListener("click", bdClick);
        document.removeEventListener("keydown", escKey);
        dom.modalBackdrop.hidden = true;
        if(previousFocus && previousFocus.focus) previousFocus.focus();
        resolve(val);
      };
      const ok = () => cleanup(true);
      const cancel = () => cleanup(false);
      const bdClick = (e) => { if(e.target === dom.modalBackdrop) cleanup(false); };
      const escKey = (e) => { if(e.key === "Escape") cleanup(false); };

      dom.modalOk.addEventListener("click", ok);
      dom.modalCancel.addEventListener("click", cancel);
      dom.modalBackdrop.addEventListener("click", bdClick);
      document.addEventListener("keydown", escKey);
    });
  }

  // ---------- date rollover ----------
  function handleDateRollover(){
    const k = todayKey();
    if(k !== lastDateKey){
      lastDateKey = k;
      pruneOldStorage();
      renderTabs(); // refresh dot "hari ini" kalau ganti hari
      if(currentTab === "laporan") renderReport();
      else renderTimeline();
      updateNow();
    }
  }

  // ---------- init ----------
  dom.jumpBtn.addEventListener("click", () => {
    const cur = dom.timeline.querySelector("li.item.current");
    if(cur) cur.scrollIntoView({behavior:"smooth", block:"center"});
  });
  dom.checkAllBtn.addEventListener("click", checkAll);
  dom.clearAllBtn.addEventListener("click", clearAll);
  dom.notifBtn.addEventListener("click", toggleNotif);
  dom.testNotifBtn.addEventListener("click", fireTestNotif);

  // ---------- settings modal ----------
  let settingsPrevFocus = null;
  function openSettings(){
    settingsPrevFocus = document.activeElement;
    // Test notif state
    const notifOn = notifEnabled && notifPermission() === "granted";
    dom.testNotifBtn.disabled = !notifOn;
    dom.testNotifDesc.textContent = notifOn
      ? "Kirim notif percobaan buat cek jalan atau nggak"
      : "Aktifin Notif di halaman utama dulu, terus balik ke sini";
    // Sound toggle state
    dom.soundToggle.checked = isSoundEnabled();
    dom.settingsPanel.hidden = false;
    requestAnimationFrame(() => dom.settingsClose.focus());
    document.addEventListener("keydown", settingsKeyHandler);
  }
  function closeSettings(){
    dom.settingsPanel.hidden = true;
    document.removeEventListener("keydown", settingsKeyHandler);
    if(settingsPrevFocus && settingsPrevFocus.focus) settingsPrevFocus.focus();
  }
  function settingsKeyHandler(e){
    if(e.key === "Escape") closeSettings();
  }
  dom.settingsBtn.addEventListener("click", openSettings);
  dom.settingsClose.addEventListener("click", closeSettings);
  dom.settingsBackdrop.addEventListener("click", closeSettings);

  // Sound toggle
  dom.soundToggle.addEventListener("change", () => {
    const on = dom.soundToggle.checked;
    setSoundEnabled(on);
    if(on) playCheckSound(); // preview
  });

  // Backup: download semua jadwal_* localStorage jadi file JSON
  function backupData(){
    const data = {};
    for(let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if(key && key.startsWith("jadwal_")){
        data[key] = localStorage.getItem(key);
      }
    }
    const payload = {
      app: "Indah's Daily",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "indahs-daily-backup-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  dom.backupBtn.addEventListener("click", backupData);

  // Restore: baca file JSON, konfirmasi, replace semua jadwal_* keys
  async function restoreData(file){
    let parsed;
    try{
      const text = await file.text();
      parsed = JSON.parse(text);
    }catch(e){
      await showConfirm({
        icon: "❌", title: "File nggak valid",
        message: "File-nya bukan JSON atau rusak.",
        okText: "OK", cancelText: ""
      });
      return;
    }
    if(!parsed || typeof parsed.data !== "object" || parsed.app !== "Indah's Daily"){
      await showConfirm({
        icon: "❌", title: "Format nggak cocok",
        message: "File ini bukan backup Indah's Daily yang valid.",
        okText: "OK", cancelText: ""
      });
      return;
    }
    const ok = await showConfirm({
      icon: "⚠️", title: "Restore backup?",
      message: "Data yang sekarang bakal di-replace sama data dari file. Yakin lanjut?",
      okText: "Ya, restore", cancelText: "Batal"
    });
    if(!ok) return;
    // Clear existing jadwal_* keys
    const existing = [];
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith("jadwal_")) existing.push(k);
    }
    existing.forEach(k => localStorage.removeItem(k));
    // Load new data
    Object.keys(parsed.data).forEach(k => {
      try{ localStorage.setItem(k, parsed.data[k]); }catch(e){}
    });
    location.reload();
  }
  dom.restoreBtn.addEventListener("click", () => dom.restoreFileInput.click());
  dom.restoreFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if(file) restoreData(file);
    e.target.value = ""; // reset supaya bisa pilih file yg sama lagi
  });

  // Reset all: hapus semua jadwal_* localStorage, reload
  async function resetAllData(){
    const ok = await showConfirm({
      icon: "🗑️", title: "Hapus semua data?",
      message: "Checklist, streak, dan preferensi bakal hilang. Nggak bisa di-undo. Backup dulu kalau perlu!",
      okText: "Ya, hapus semua", cancelText: "Batal"
    });
    if(!ok) return;
    const keys = [];
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith("jadwal_")) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    location.reload();
  }
  dom.resetAllBtn.addEventListener("click", resetAllData);

  // Init notif state: nyala kalau user udah pernah aktifin & permission masih granted.
  if(notifSupported()){
    if(loadNotifPref() && notifPermission() === "granted"){
      notifEnabled = true;
      // Refresh push subscription (endpoint bisa expire, atau baru install)
      subscribeToPush().catch(() => {});
    }
  } else {
    dom.notifBtn.hidden = true;
  }
  updateNotifBtnUI();

  document.addEventListener("visibilitychange", () => {
    if(!document.hidden){
      handleDateRollover();
      updateNow();
    }
  });

  pruneOldStorage();
  renderTabs();
  renderLegend();
  renderTimeline();
  updateNow();
  setInterval(updateNow, TICK_MS);
  setInterval(handleDateRollover, DATE_CHECK_MS);
})();
