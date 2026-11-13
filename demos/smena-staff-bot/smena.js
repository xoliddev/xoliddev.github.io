/* Smena staff bot simulator. Texts and keyboards come from the bot's handlers (common.py, worker_handlers.py,
   admin_workers.py, admin_finance.py, admin_attendance.py, reports.py), utils/geo.py (Haversine) and
   utils/excel_generator.py (report columns). The business name is the sample restaurant "Demo Cafe". */
(function () {
  "use strict";
  const { bi } = window.Site;
  const esc = window.tgEsc;
  const BIZ = "Demo Cafe";
  const SEP = "━━━━━━━━━━━━━━━━━━━━";
  const MONTH_NAMES = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  const WORK = { lat: 41.311081, lon: 69.240562 };
  let radius = 100;

  // ------------------------------------------------------------ utils/geo.py
  function distance(lat1, lon1, lat2, lon2) {
    const R = 6371000, r = Math.PI / 180;
    const p1 = lat1 * r, p2 = lat2 * r, dp = (lat2 - lat1) * r, dl = (lon2 - lon1) * r;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
  }
  // ------------------------------------------------------------ config.py
  const money = (v) => (v == null ? "0 so'm" : Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm");
  function hoursMins(h) { if (!h) return "0 soat"; const t = Math.round(h * 60), H = Math.floor(t / 60), M = t % 60; return M ? H + " soat " + M + " daqiqa" : H + " soat"; }
  let clockOffset = 0; // the "skip ahead" button moves the demo clock
  const now = () => new Date(Date.now() + clockOffset);
  const hm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const dmy = (d) => String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();

  // ------------------------------------------------------------ sample data
  const ROLES = [{ id: 1, name: "Oshpaz" }, { id: 2, name: "Ofitsiant" }, { id: 3, name: "Kassir" }, { id: 4, name: "Farrosh" }];
  let staff, me, app, txs, flow;
  function reset() {
    staff = [
      { id: 1, name: "Sardor Karimov", role: "Oshpaz", type: "monthly", salary: 6500000, days: 10, hours: 104.5, adv: 1000000, today: { in: "08:52", out: null } },
      { id: 2, name: "Malika Yusupova", role: "Ofitsiant", type: "daily", salary: 180000, days: 9, hours: 88, adv: 300000, today: null, rest: true },
      { id: 3, name: "Jasur Rahimov", role: "Kassir", type: "monthly", salary: 4800000, days: 11, hours: 112, adv: 500000, today: { in: "09:05", out: null } },
    ];
    me = null; app = null; txs = []; flow = { worker: "name", admin: null }; clockOffset = 0;
  }
  const earned = (w) => (w.type === "daily" ? w.salary * w.days : (w.salary / 26) * w.days);
  const stats = (w) => ({ days: w.days, hours: w.hours, earned: earned(w), adv: w.adv, balance: earned(w) - w.adv });
  const salDisplay = (w) => money(w.salary) + " (" + (w.type === "daily" ? "kunlik" : "oylik") + ")";

  // ------------------------------------------------------------ keyboards
  const workerMenu = () => [[{ t: "🟢 Ishga keldim", d: "worker:clock_in" }, { t: "🔴 Ishdan ketdim", d: "worker:clock_out" }], [{ t: "🌙 Dam oldim", d: "worker:rest" }, { t: "📊 Mening hisobotim", d: "worker:stats" }], [{ t: "👤 Profilim", d: "worker:profile" }, { t: "📞 Bog'lanish", d: "worker:contact" }]];
  const adminMenu = () => [[{ t: "👥 Xodimlar", d: "admin:workers" }, { t: "💰 Moliya", d: "admin:finance" }], [{ t: "⏰ Bugungi davomat", d: "admin:attendance" }, { t: "📊 Excel hisobot", d: "admin:reports" }], [{ t: "🎭 Rollar", d: "admin:roles" }, { t: "⚙️ Sozlamalar", d: "admin:settings" }]];
  const back = (d) => [[{ t: "⬅️ Ortga", d }]];
  const LOC_KB = [[{ t: "📍 Hozirgi joylashuvimni yuborish", loc: true }], [{ t: "⬅️ Bekor qilish" }]];
  const detailsKb = (id) => [[{ t: "💵 Avans Berish", d: "fin_advance_" + id }, { t: "💳 Raschyot Qilish", d: "fin_settle_" + id }], [{ t: "🕒 Davomat Tarixi", d: "na" }, { t: "📋 To'lovlar Tarixi", d: "na" }], [{ t: "⬅️ Xodimlar Ro'yxatiga", d: "admin:workers" }]];

  // ------------------------------------------------------------ chats + tabs
  const roles = window.tgRoles(document.getElementById("roles"));
  const W = new TGChat(document.getElementById("chat-worker"), { title: "Smena · " + BIZ, sub: "bot", ava: "🧑‍🍳", placeholder: "Xabar yozing...", onReset: restart });
  const A = new TGChat(document.getElementById("chat-admin"), { title: "Smena · " + BIZ, sub: "bot · admin", ava: "👑", placeholder: "Xabar yozing...", onReset: restart });
  const toAdmin = (html, kb) => { roles.bump("admin"); return A.say(html, { kb, delay: 500 }); };

  async function restart() {
    reset(); W.clear(); A.clear(); renderSide();
    A.me("/start");
    await A.say("Assalomu alaykum, <b>Admin</b>!\n👑 <b>" + BIZ + "</b> boshqaruv paneliga xush kelibsiz.", { kb: adminMenu(), delay: 300 });
    W.me("/start");
    await W.say("Assalomu alaykum, <b>Mehmon</b>!\n\n🍽 <b>" + BIZ + "</b> korxonasining rasmiy botiga xush kelibsiz.\nAgar siz korxonamiz xodimi bo'lsangiz yoki ishga kirmoqchi bo'lsangiz, iltimos ro'yxatdan o'tish arizasini to'ldiring.\n\n✍️ Iltimos, <b>to'liq ism va familiyangizni</b> kiriting (Masalan: <i>Ali Valiyev</i>):", { delay: 500 });
  }

  // ------------------------------------------------------------ worker side
  W.on("text", async (text) => {
    if (text === "/start") return restart();
    if (text === "⬅️ Bekor qilish") { W.reply(null); flow.worker = me ? "menu" : flow.worker; return W.say("Amal bekor qilindi.", { kb: me ? workerMenu() : undefined, delay: 200 }); }
    if (flow.worker === "name") {
      const name = text.trim();
      if (name.length < 3 || name.length > 100) return W.say("⚠️ Iltimos, ism va familiyangizni to'liq va to'g'ri kiriting:");
      app = { name };
      flow.worker = "phone";
      return W.say("Rahmat, <b>" + esc(name) + "</b>!\n\n📱 Endi telefon raqamingizni yozing yoki kontakt sifatida yuboring:\n<i>Masalan: +998 90 123 45 67</i>");
    }
    if (flow.worker === "phone") {
      let digits = text.replace(/[^\d+]/g, "");
      if (digits.replace(/\D/g, "").length < 7) return W.say("⚠️ Iltimos, to'g'ri telefon raqam kiriting (masalan: <code>+998901234567</code>):");
      if (!digits.startsWith("+")) digits = "+" + digits;
      app.phone = digits;
      flow.worker = "role";
      const rows = []; for (let i = 0; i < ROLES.length; i += 2) rows.push(ROLES.slice(i, i + 2).map((r) => ({ t: r.name, d: "app_role_" + r.id })));
      rows.push([{ t: "⬅️ Ortga", d: "app:cancel" }]);
      return W.say("🎭 Qaysi lavozim / rolda ishlamoqchisiz? Tanlang:", { kb: rows });
    }
    if (flow.worker === "pending") return W.say("⏳ Hurmatli <b>" + esc(app.name) + "</b>!\n\nSizning <b>" + esc(app.role) + "</b> lavozimiga topshirgan arizangiz ma'muriyat tomonidan ko'rib chiqilmoqda.\nTez orada javob beriladi. Iltimos kuting!");
    if (me) return W.say("👋 <b>" + esc(me.name) + "</b> (<i>" + esc(me.role) + "</i>)\n🏢 <b>" + BIZ + "</b> ishchi kabinetiga xush kelibsiz.", { kb: workerMenu() });
  });

  W.on("location", async () => {
    const pos = window.SmenaMap.position();
    W.reply(null);
    const dist = distance(pos.lat, pos.lon, WORK.lat, WORK.lon);
    W.location("<small>" + pos.lat.toFixed(5) + ", " + pos.lon.toFixed(5) + "</small>");
    if (flow.worker !== "await_in" && flow.worker !== "await_out") return;
    const mode = flow.worker;
    flow.worker = "menu";
    if (dist > radius) {
      return W.say("⚠️ <b>Siz korxona hududida emassiz!</b>\n\n📏 Belgilangan radius: <b>" + radius + " metr</b>\n📍 Sizning masofangiz: <b>" + Math.floor(dist) + " metr</b>\n\nIltimos, korxona hududiga kelib qaytadan urinib ko'ring.", { kb: workerMenu(), delay: 700 });
    }
    const t = now();
    if (mode === "await_in") {
      me.today = { in: t, out: null, dist };
      await W.say("✅ <b>Xush kelibsiz! Ishga kelganingiz qayd etildi.</b>\n\n⏰ Vaqt: <b>" + hm(t) + "</b>\n📍 Masofa: <b>" + Math.floor(dist) + " metr</b>\n\nBugungi ish kuningizga omad tilaymiz! 👨‍🍳", { kb: workerMenu(), delay: 700 });
      toAdmin("🟢 <b>#ISHGA_KELDI</b>\n👤 <b>Xodim:</b> " + esc(me.name) + " (<i>" + esc(me.role) + "</i>)\n⏰ <b>Kelgan vaqti:</b> " + hm(t) + " (📍 Masofa: " + Math.floor(dist) + "m)\n🏢 <b>Joy:</b> " + BIZ);
    } else {
      me.today.out = t;
      const hrs = Math.max(0, (t - me.today.in) / 36e5);
      me.days += 1; me.hours += hrs;
      await W.say("✅ <b>Ish kuni yakunlandi! Rahmat!</b>\n\n⏰ Ketgan vaqtingiz: <b>" + hm(t) + "</b>\n⏱ Bugun ishladingiz: <b>" + hoursMins(hrs) + "</b>\n\nYaxshi dam oling! 🌙", { kb: workerMenu(), delay: 700 });
      toAdmin("🔴 <b>#ISHDAN_KETDI</b>\n👤 <b>Xodim:</b> " + esc(me.name) + " (<i>" + esc(me.role) + "</i>)\n⏰ <b>Ketgan vaqti:</b> " + hm(t) + "\n⏱ <b>Bugun ishladi:</b> " + hoursMins(hrs));
    }
    renderSide();
  });

  W.on("cb", async (d, msg) => {
    if (d === "app:cancel") { flow.worker = "name"; return W.edit(msg, "Amal bekor qilindi. Qaytadan boshlash uchun /start bosing.", null); }
    if (d.startsWith("app_role_")) {
      if (flow.worker !== "role") return;
      const role = ROLES.find((r) => r.id === +d.slice(9));
      app.role = role.name; flow.worker = "pending";
      W.edit(msg, "✅ <b>Arizangiz muvaffaqiyatli qabul qilindi!</b>\n\n👤 <b>F.I.O:</b> " + esc(app.name) + "\n📱 <b>Telefon:</b> " + esc(app.phone) + "\n🎭 <b>Tanlangan rol:</b> " + esc(role.name) + "\n\n⏳ Ma'muriyat arizangizni tasdiqlashi bilan sizga xabar beriladi.", null);
      W.toast("Arizangiz yuborildi!");
      return toAdmin("📩 <b>YANGI ISHGA KIRISH ARIZASI!</b>\n" + SEP + "\n👤 <b>Nomzod:</b> " + esc(app.name) + "\n📱 <b>Telefon:</b> " + esc(app.phone) + "\n🎭 <b>Lavozim:</b> " + esc(role.name) + "\n🔗 <b>Username:</b> mavjud_emas\n🆔 <b>Telegram ID:</b> <code>100000042</code>\n" + SEP + "\nQabul qilasizmi?", [[{ t: "✅ Ishga Qabul Qilish", d: "app_accept_1" }, { t: "❌ Rad Etish", d: "app_reject_1" }]]);
    }
    if (!me) return W.toast("Siz xodimlar ro'yxatida emassiz.");
    if (d === "worker:home") return W.edit(msg, "👋 <b>" + esc(me.name) + "</b> (<i>" + esc(me.role) + "</i>)\n🏢 <b>" + BIZ + "</b> ishchi kabinetiga xush kelibsiz.", workerMenu());
    if (d === "worker:clock_in") {
      if (me.today && me.today.out) return W.say("Siz bugun ishni yakunlagansiz (" + hm(me.today.in) + " - " + hm(me.today.out) + ")!", { kb: back("worker:home") });
      if (me.today) return W.say("Siz bugun soat " + hm(me.today.in) + " da ishga kelgansiz. Hozir ishdasiz!", { kb: back("worker:home") });
      flow.worker = "await_in";
      return W.say("📍 <b>Ishga kelganingizni tasdiqlash uchun</b> pastdagi tugmani bosing va joylashuvingizni (GPS) yuboring:", { reply: LOC_KB, oneTime: true });
    }
    if (d === "worker:clock_out") {
      if (!me.today || !me.today.in) return W.say("Siz bugun ishga kelishni qayd etmagansiz!", { kb: back("worker:home") });
      if (me.today.out) return W.say("Siz allaqachon soat " + hm(me.today.out) + " da ishni yakunlagansiz!", { kb: back("worker:home") });
      flow.worker = "await_out";
      return W.say("📍 <b>Ishdan ketishingizni tasdiqlash uchun</b> pastdagi tugmani bosing va joylashuvingizni (GPS) yuboring:", { reply: LOC_KB, oneTime: true });
    }
    if (d === "worker:rest") {
      if (me.today && me.today.in) return W.say("⚠️ Siz bugun ishga kelgansiz, dam olish deb belgilay olmaysiz.", { kb: back("worker:home") });
      me.rest = true;
      toAdmin("🌙 <b>#DAM_OLISH</b>\n👤 <b>Xodim:</b> " + esc(me.name) + " (<i>" + esc(me.role) + "</i>)\n📅 <b>Bugun:</b> Dam olish kuni deb belgilandi.");
      return W.say("🌙 <b>Bugungi kuningiz dam olish kuni deb belgilandi.</b>\nYaxshi hordiq chiqaring!", { kb: back("worker:home") });
    }
    if (d === "worker:stats") {
      const s = stats(me), m = now();
      return W.edit(msg, "📊 <b>SHAXSIY HISOBOT — " + MONTH_NAMES[m.getMonth()] + " " + m.getFullYear() + "</b>\n" + SEP + "\n👤 <b>Xodim:</b> " + esc(me.name) + "\n🎭 <b>Lavozim:</b> " + esc(me.role) + "\n💰 <b>Belgilangan stavka:</b> " + salDisplay(me) + "\n" + SEP + "\n📅 <b>Ishlangan kunlar:</b> " + s.days + " kun\n🌙 <b>Dam olingan kunlar:</b> " + (me.rest ? 1 : 0) + " kun\n⏱ <b>Jami ishlangan soat:</b> " + hoursMins(s.hours) + "\n" + SEP + "\n💵 <b>Hisoblangan ish haqi:</b> " + money(s.earned) + "\n💸 <b>Olingan avanslar:</b> " + money(s.adv) + "\n💳 <b>Hozirgi qoldiq (Raschyot):</b> <b>" + money(s.balance) + "</b>\n" + SEP, back("worker:home"));
    }
    if (d === "worker:profile") return W.edit(msg, "👤 <b>SIZNING PROFILINGIZ</b>\n" + SEP + "\n📝 <b>F.I.O:</b> " + esc(me.name) + "\n🎭 <b>Lavozim:</b> " + esc(me.role) + "\n📱 <b>Telefon:</b> " + esc(me.phone) + "\n🆔 <b>Telegram ID:</b> <code>100000042</code>\n💰 <b>Oylik maosh:</b> " + money(me.salary) + "\n📅 <b>Ishga qabul qilingan:</b> " + dmy(now()) + "\n🏢 <b>Korxona:</b> " + BIZ + "\n" + SEP, back("worker:home"));
    if (d === "worker:contact") return W.edit(msg, "📞 <b>Ma'muriyat bilan bog'lanish:</b>\n\nSavollar yoki murojaatlar bo'lsa: +998 •• ••• •• •• (demo)\n🏢 <b>" + BIZ + "</b> ma'muriyati", back("worker:home"));
  });

  // ------------------------------------------------------------ admin side
  function workersList() {
    const all = staff.concat(me ? [me] : []);
    const btns = all.map((w) => ({ t: w.name, d: "worker_view_" + w.id })), rows = [];
    for (let i = 0; i < btns.length; i += 2) rows.push(btns.slice(i, i + 2));
    rows.push([{ t: "⬅️ Bosh menyuga", d: "admin:home" }]);
    return ["👥 <b>XODIMLAR RO'YXATI</b>\n" + SEP + "\n📊 <b>Jami faol xodimlar:</b> " + all.length + " nafar\nKerakli xodim ustiga bosing:", rows];
  }
  const byId = (id) => staff.concat(me ? [me] : []).find((w) => w.id === id);
  const fmtT = (t) => (t instanceof Date ? hm(t) : t);
  function card(w) {
    const s = stats(w);
    const st = w.today && w.today.out ? "🔴 Ishni yakunlagan (" + fmtT(w.today.in) + " - " + fmtT(w.today.out) + ")" : w.today ? "🟢 Ishda (Kelgan: " + fmtT(w.today.in) + ")" : w.rest ? "🌙 Dam olish kuni" : "⚪️ Hali kelmagan";
    return "👤 <b>XODIM PROFILI</b>\n" + SEP + "\n📝 <b>F.I.O:</b> <b>" + esc(w.name) + "</b>\n🎭 <b>Lavozimi:</b> " + esc(w.role) + "\n📱 <b>Telefon:</b> " + esc(w.phone || "+998 •• ••• •• ••") + "\n🔗 <b>Telegram:</b> mavjud_emas (<code>1000000" + (40 + w.id) + "</code>)\n💰 <b>Belgilangan stavka:</b> <b>" + salDisplay(w) + "</b>\n" + SEP + "\n📅 <b>Bugungi holat:</b> " + st + "\n⏰ <b>Ish jadvali:</b> 08:00 - 20:00\n⏱ <b>Shu oygi ishlagan:</b> " + s.days + " kun (" + hoursMins(s.hours) + ")\n💵 <b>Hisoblangan haq:</b> " + money(s.earned) + "\n💸 <b>Olingan avanslar:</b> " + money(s.adv) + "\n💳 <b>Hozirgi qoldiq (Raschyot):</b> <b>" + money(s.balance) + "</b>\n" + SEP;
  }
  function attendance() {
    const all = staff.concat(me ? [me] : []), t = now();
    const present = all.filter((w) => w.today), rest = all.filter((w) => !w.today && w.rest), absent = all.filter((w) => !w.today && !w.rest);
    let s = "⏱ <b>BUGUNGI DAVOMAT — " + dmy(t) + "</b>\n" + SEP + "\n👥 <b>Jami xodimlar:</b> " + all.length + " nafar\n🟢 <b>Ishga kelganlar:</b> " + present.length + " nafar\n🌙 <b>Damdagilar:</b> " + rest.length + " nafar\n❌ <b>Hali kelmaganlar:</b> " + absent.length + " nafar\n" + SEP + "\n\n";
    if (present.length) { s += "🟢 <b>ISHGA KELGANLAR:</b>\n"; for (const w of present) s += w.today.out ? "• <b>" + esc(w.name) + "</b> (<i>" + esc(w.role) + "</i>)\n  ⏰ " + fmtT(w.today.in) + " ➔ 🔴 " + fmtT(w.today.out) + "\n" : "• <b>" + esc(w.name) + "</b> (<i>" + esc(w.role) + "</i>)\n  ⏰ Keldi: " + fmtT(w.today.in) + " (🟢 Hozir ishda)\n"; s += "\n"; }
    if (rest.length) { s += "🌙 <b>DAM OLISH KUNIDAGILAR:</b>\n"; for (const w of rest) s += "• " + esc(w.name) + " (<i>" + esc(w.role) + "</i>)\n"; s += "\n"; }
    if (absent.length) { s += "❌ <b>HALI KELMAGANLAR:</b>\n"; for (const w of absent) s += "• " + esc(w.name) + " (<i>" + esc(w.role) + "</i>)\n"; }
    return s.trimEnd();
  }

  A.on("text", async (text) => {
    if (text === "/start") return A.say("Assalomu alaykum, <b>Admin</b>!\n👑 <b>" + BIZ + "</b> boshqaruv paneliga xush kelibsiz.", { kb: adminMenu() });
    const f = flow.admin;
    if (f && f.step === "amount") {
      const amount = parseFloat(text.replace(/\s/g, "").replace(",", "."));
      if (!(amount > 0)) return A.say("⚠️ Iltimos, musbat raqamlarda to'g'ri summa kiriting:");
      f.amount = amount; f.step = "comment";
      return A.say("💰 Summa: <b>" + money(amount) + "</b>\n\nUshbu avans uchun <b>izoh (sabab)</b> yozing:\n<i>(Agar izoh kerak bo'lmasa, 'yo'q' deb yuboring)</i>", { kb: back("worker_view_" + f.worker) });
    }
    if (f && f.step === "comment") {
      f.comment = /^yo'?q$/i.test(text.trim()) ? null : text.trim(); f.step = "confirm";
      const w = byId(f.worker);
      return A.say("⚠️ <b>AVANS BERISHNI TASDIQLAYSIZMI?</b>\n\n👤 <b>Xodim:</b> " + esc(w.name) + "\n💰 <b>Summa:</b> <b>" + money(f.amount) + "</b>\n" + (f.comment ? "💬 <b>Izoh:</b> <i>" + esc(f.comment) + "</i>\n" : ""), { kb: [[{ t: "✅ Ha, berilsin", d: "fin_adv_confirm_" + w.id }, { t: "❌ Bekor qilish", d: "worker_view_" + w.id }]] });
    }
    return A.say("👑 <b>" + BIZ.toUpperCase() + " BOSHQARUV PANELI</b>\n\nKerakli bo'limni tanlang:", { kb: adminMenu() });
  });

  A.on("cb", async (d, msg) => {
    if (d === "na") return A.toast(window.Site.lang() === "uz" ? "Bu bo'lim demoda yo'q" : "Not part of this demo");
    if (d === "admin:home") { flow.admin = null; return A.edit(msg, "👑 <b>" + BIZ.toUpperCase() + " BOSHQARUV PANELI</b>\n\nKerakli bo'limni tanlang:", adminMenu()); }
    if (d === "admin:roles" || d === "admin:settings") return A.toast(window.Site.lang() === "uz" ? "Rollar va sozlamalar demoda ko'rsatilmagan. Radiusni o'ngdagi xaritada o'zgartiring." : "Roles and settings are not in the demo. Change the radius on the map instead.", 2800);
    if (d.startsWith("app_accept_") || d.startsWith("app_reject_")) {
      if (!app || flow.worker !== "pending") return A.toast("Ushbu ariza allaqachon ko'rib chiqilgan!");
      if (d.startsWith("app_reject_")) {
        flow.worker = "name";
        A.edit(msg, "❌ <b>Ariza rad etildi.</b>\n👤 Nomzod: " + esc(app.name) + "\nRad etdi: Admin", null);
        return A.toast("Ariza rad etildi.");
      }
      me = { id: 9, name: app.name, phone: app.phone, role: app.role, type: "monthly", salary: 5200000, days: 0, hours: 0, adv: 0, today: null };
      flow.worker = "menu";
      A.edit(msg, "✅ <b>Xodim ishga qabul qilindi!</b>\n\n👤 <b>F.I.O:</b> " + esc(me.name) + "\n🎭 <b>Lavozim:</b> " + esc(me.role) + "\n📱 <b>Telefon:</b> " + esc(me.phone) + "\nTasdiqladi: Admin", [[{ t: "💰 Maosh belgilash", d: "na" }], [{ t: "👤 Xodim profili", d: "worker_view_9" }]]);
      A.toast("Xodim qabul qilindi!");
      roles.bump("worker");
      renderSide();
      return W.say("🎉 <b>TABRIKLAYMIZ!</b>\n\nHurmatli <b>" + esc(me.name) + "</b>, sizning <b>" + BIZ + "</b> korxonasiga <b>" + esc(me.role) + "</b> lavozimiga topshirgan arizangiz ma'muriyat tomonidan tasdiqlandi!\n\nEndi bot orqali ishga keldi-ketdilaringizni qayd etishingiz mumkin.", { kb: workerMenu(), delay: 600 });
    }
    if (d === "admin:workers") { flow.admin = null; const [t, kb] = workersList(); return A.edit(msg, t, kb); }
    if (d.startsWith("worker_view_")) { flow.admin = null; const w = byId(+d.slice(12)); return A.edit(msg, card(w), detailsKb(w.id)); }
    if (d === "admin:attendance") return A.edit(msg, attendance(), back("admin:home"));
    if (d === "admin:finance") {
      const t = now(), today = txs.filter((x) => x.date === dmy(t));
      return A.edit(msg, "💵 <b>MOLIYA VA ISH HAQI BOSHQARUVI</b>\n" + SEP + "\n📅 <b>Bugungi sana:</b> " + dmy(t) + "\n📊 <b>Bugungi amallar soni:</b> " + today.length + " ta\n💸 <b>Bugun berilgan avanslar:</b> " + money(today.filter((x) => x.type === "advance").reduce((a, x) => a + x.amount, 0)) + "\n💳 <b>Bugun to'langan raschyotlar:</b> " + money(today.filter((x) => x.type === "settlement").reduce((a, x) => a + x.amount, 0)) + "\n" + SEP + "\nXodimlarga avans yoki oylik raschyot berish uchun xodimlar ro'yxatidan kerakli shaxsni tanlang:", [[{ t: "👥 Xodimlar ro'yxatiga o'tish", d: "admin:workers" }], [{ t: "⬅️ Bosh menyuga", d: "admin:home" }]]);
    }
    if (d.startsWith("fin_advance_")) {
      const w = byId(+d.slice(12)), s = stats(w);
      flow.admin = { step: "amount", worker: w.id };
      return A.edit(msg, "💵 <b>AVANS BERISH</b>\n" + SEP + "\n👤 <b>Xodim:</b> " + esc(w.name) + "\n🎭 <b>Lavozim:</b> " + esc(w.role) + "\n💰 <b>Shu oygi hisoblangan:</b> " + money(s.earned) + "\n💸 <b>Olingan avanslar:</b> " + money(s.adv) + "\n💳 <b>Hozirgi qoldiq:</b> " + money(s.balance) + "\n" + SEP + "\nBerilayotgan <b>avans summasini</b> so'mda kiriting:\n<i>(Masalan: <code>200000</code> yoki <code>500000</code>)</i>", back("worker_view_" + w.id));
    }
    if (d.startsWith("fin_adv_confirm_")) {
      const f = flow.admin; if (!f || f.step !== "confirm") return A.toast("Amal muddati o'tgan. Qaytadan urinib ko'ring.");
      const w = byId(f.worker), t = now(), when = dmy(t) + " " + hm(t);
      w.adv += f.amount; txs.push({ type: "advance", amount: f.amount, worker: w.name, date: dmy(t) });
      flow.admin = null;
      A.edit(msg, "✅ <b>Avans muvaffaqiyatli berildi!</b>\n\n👤 <b>Xodim:</b> " + esc(w.name) + "\n💰 <b>Summa:</b> " + money(f.amount) + "\n⏰ <b>Vaqt:</b> " + when, back("worker_view_" + w.id));
      renderSide();
      return A.say("💸 <b>#AVANS_BERILDI</b>\n" + SEP + "\n👤 <b>Xodim:</b> " + esc(w.name) + " (<i>" + esc(w.role) + "</i>)\n💰 <b>Summa:</b> <b>" + money(f.amount) + "</b>\n📝 <b>Turi:</b> 💵 Avans\n👨‍💼 <b>Bergan admin:</b> Admin\n🕑 <b>Vaqt:</b> " + when + "\n" + (f.comment ? "💬 <b>Izoh:</b> <i>" + esc(f.comment) + "</i>\n" : ""), { delay: 500 });
    }
    if (d.startsWith("fin_settle_")) {
      const w = byId(+d.slice(11)), s = stats(w), t = now();
      return A.edit(msg, "💳 <b>RASCHYOT QILISH — " + MONTH_NAMES[t.getMonth()] + " " + t.getFullYear() + "</b>\n" + SEP + "\n👤 <b>Xodim:</b> " + esc(w.name) + " (<i>" + esc(w.role) + "</i>)\n💰 <b>Belgilangan stavka:</b> " + salDisplay(w) + "\n⏱ <b>Ishlangan:</b> " + s.days + " kun (" + hoursMins(s.hours) + ")\n💵 <b>Jami hisoblangan haq:</b> " + money(s.earned) + "\n💸 <b>Olingan avanslar:</b> " + money(s.adv) + "\n" + SEP + "\n✅ <b>TO'LANISHI KERAK BO'LGAN QOLDIQ:</b> <b>" + money(s.balance) + "</b>\n" + SEP + "\nTasdiqlaysizmi yoki boshqa summa kiritasizmi?", [[{ t: "✅ Raschyotni Tasdiqlash", d: "na" }, { t: "✏️ Boshqa summa", d: "na" }], [{ t: "❌ Bekor qilish", d: "worker_view_" + w.id }]]);
    }
    if (d === "admin:reports") {
      const t = now(), p = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return A.edit(msg, "📊 <b>Excel hisobot</b>\n\nQaysi oy uchun hisobot kerak?", [[{ t: "📅 " + MONTH_NAMES[t.getMonth()] + " " + t.getFullYear() + " (Joriy oy)", d: "excel_rep" }], [{ t: "📁 " + MONTH_NAMES[p.getMonth()] + " " + p.getFullYear() + " (O'tgan oy)", d: "na" }], [{ t: "⬅️ Bosh menyuga", d: "admin:home" }]]);
    }
    if (d === "excel_rep") {
      const t = now(), m = MONTH_NAMES[t.getMonth()], all = staff.concat(me ? [me] : []);
      await A.say("📊 <b>" + m + " " + t.getFullYear() + "</b> oyi uchun qisqacha hisobot:", { delay: 400 });
      const byRole = {};
      all.forEach((w) => (byRole[w.role] = byRole[w.role] || []).push(w));
      for (const [r, ws] of Object.entries(byRole)) {
        A.bot("🎭 <b>LAVOZIM: " + esc(r) + "</b>\n" + SEP + "\n" + ws.map((w) => { const s = stats(w); return "👤 <b>" + esc(w.name) + "</b>\n▪️ <b>Ishlangan:</b> " + s.days + " kun (" + hoursMins(s.hours) + ")\n▪️ <b>Hisoblandi:</b> " + money(s.earned) + "\n▪️ <b>Avans oldi:</b> " + money(s.adv) + "\n▪️ <b>Qoldiq (Raschyot):</b> <b>" + money(s.balance) + "</b>\n──────────────"; }).join("\n"));
      }
      await A.typing(700);
      A.doc("Demo_Cafe_" + m + "_" + t.getFullYear() + "_Hisoboti.xlsx", "9.4 KB", "📊 <b>" + BIZ + " — " + m + " " + t.getFullYear() + " oylik to'liq hisoboti (Excel)</b>\n\n✅ Davomat tabeli va barcha xodimlarning hisoblangan maoshi, avanslari va qoldiqlari kiritilgan.", { kb: [[{ t: window.Site.lang() === "uz" ? "👁 Ko'rib chiqish (demo)" : "👁 Preview (demo)", d: "preview" }]] });
      renderExcel();
      return;
    }
    if (d === "preview") { renderExcel(); document.getElementById("excel").scrollIntoView({ behavior: window.Site.reducedMotion() ? "auto" : "smooth", block: "start" }); }
  });

  // ------------------------------------------------------------ Excel preview (utils/excel_generator.py columns)
  function renderExcel() {
    const el = document.getElementById("excel"); if (!el) return;
    const t = now(), all = staff.concat(me ? [me] : []);
    let tot = [0, 0, 0];
    const rows = all.map((w, i) => { const s = stats(w); tot[0] += s.earned; tot[1] += s.adv; tot[2] += s.balance; return "<tr><td>" + (i + 1) + "</td><td>" + esc(w.name) + "</td><td>" + esc(w.role) + "</td><td>" + (w.type === "daily" ? "Kunlik" : "Oylik") + "</td><td class='n'>" + money(w.salary) + "</td><td class='n'>" + s.days + "</td><td class='n'>" + (Math.round(s.hours * 10) / 10) + "</td><td class='n'>" + money(s.earned) + "</td><td class='n'>" + money(s.adv) + "</td><td class='n'>" + money(s.balance) + "</td></tr>"; }).join("");
    el.innerHTML = "<div class='xl-title'>" + BIZ.toUpperCase() + " — " + MONTH_NAMES[t.getMonth()] + " " + t.getFullYear() + " OYLIK MOLIYA VA ISH HAQI HISOBOTI</div><div class='xl-scroll'><table><thead><tr><th>№</th><th>F.I.O</th><th>Lavozimi / Roli</th><th>Stavka Turi</th><th>Belgilangan Stavka</th><th>Ishlagan Kuni</th><th>Jami Soat</th><th>Hisoblangan Haq</th><th>Berilgan Avanslar</th><th>Qoldiq (Raschyot)</th></tr></thead><tbody>" + rows + "<tr class='tot'><td></td><td>JAMI:</td><td></td><td></td><td></td><td></td><td></td><td class='n'>" + money(tot[0]) + "</td><td class='n'>" + money(tot[1]) + "</td><td class='n'>" + money(tot[2]) + "</td></tr></tbody></table></div><p class='muted xl-note'>" + bi("Sheet 1 of 2 (“Ish haqi”). The second sheet, “Davomat”, lists every check-in with arrival, departure, hours and distance in metres.", "1-varaq (“Ish haqi”). 2-varaq “Davomat” har bir keldi-ketdini kelgan va ketgan vaqt, soat va metrdagi masofa bilan ko'rsatadi.") + "</p>";
  }

  // ------------------------------------------------------------ side panel: map + clock
  function renderSide() {
    const s = document.getElementById("who");
    if (s) s.innerHTML = me ? bi("Worker", "Xodim") + ": <b>" + esc(me.name) + "</b> · " + esc(me.role) + (me.today ? " · " + (me.today.out ? "🔴" : "🟢") : "") : bi("No worker yet: finish the application in the worker chat.", "Xodim hali yo'q: xodim chatida arizani to'ldiring.");
  }
  document.getElementById("skip").addEventListener("click", () => { clockOffset += 8 * 36e5; document.getElementById("clock").textContent = hm(now()); });
  setInterval(() => { const c = document.getElementById("clock"); if (c) c.textContent = hm(now()); }, 1000);
  document.getElementById("radius").addEventListener("input", (e) => { radius = +e.target.value; document.getElementById("radius-val").textContent = radius; window.SmenaMap.setRadius(radius); });

  document.querySelectorAll("[data-w]").forEach((b) => b.addEventListener("click", () => { roles.select("worker"); W.sendText(b.dataset.w); }));
  reset();
  renderSide();
  renderExcel();
  restart();
  window.Smena = { distance, get me() { return me; }, W, A };
})();
