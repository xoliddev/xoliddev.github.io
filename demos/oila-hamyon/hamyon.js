/* Oila Hamyon simulator. Texts, keyboards, categories, wallets and reply formats are copied from
   hamyon/bot/texts.py, keyboards.py, services/family.py, services/engine.py and services/reports.py.
   Production parses messages with Gemini; here a small rule-based parser stands in for it. */
(function () {
  "use strict";
  const { bi } = window.Site;
  const esc = window.tgEsc;

  // ------------------------------------------------------------ bot/texts.py
  const BTN = { REPORT: "📊 Hisobot", BALANCE: "💼 Balans", HISTORY: "📒 Tarix", DEBTS: "🤝 Qarzlar", BUDGET: "🎯 Limitlar", SETTINGS: "⚙️ Sozlamalar", RECURRING: "🔔 Oylik to'lovlar", UNDO: "↩️ Oxirgisini bekor qilish", HELP: "📖 Yordam" };
  const ASK_NAME = "Keling tanishamiz 🙂\nSizni qanday chaqiraylik? Ismingizni yozing yoki pastdagi tugmani bosing.";
  const ASK_ROLE = "Oilada kimsiz? Bu menga «onam», «ukam» kabi so'zlarni to'g'ri tushunishga yordam beradi.";
  const WELCOME = "✨ <b>Xush kelibsiz, {name}!</b>\n\nMen — oilangizning shaxsiy hisobchisiman. Hech qanday forma, tugma shart emas — shunchaki <b>odamga aytgandek yozing</b> yoki <b>ovozli xabar</b> yuboring:\n\n🛒 <i>non 2 ta 4500 dan, sut 12 ming</i>\n💡 <i>kecha kartadan svetga 186 400 to'ladim</i>\n💼 <i>maosh tushdi 6 mln 450 ming kartaga</i>\n🔁 <i>bankomatdan 1 mln yechdim</i>\n🤝 <i>Akmalga 500 ming qarz berdim</i>\n🧾 Chek rasmini yuboring — har bir qatorini o'qib, jamini tekshiraman\n❓ <i>bu oy ovqatga qancha ketdi?</i>\n\nHar bir summani <b>tiyinigacha</b> aniq hisoblayman, xato yozilsa — xabarga javob qilib tuzatasiz.\n\n👉 <b>Birinchi qadam:</b> hozir qo'lingizdagi pullarni yozing, masalan:\n<i>naqd pulim 850 ming, kartada 3 200 000, 300 dollar bor</i>";
  const HELP = "📖 <b>Qanday ishlatiladi</b>\n\n<b>Yozish</b> — oddiy tilda, lotin yoki kirillda, ovoz bilan ham:\n• <i>non 6 ming, taksi 18 ming</i>\n• <i>2 kg go'sht 98 mingdan, kartadan</i>\n• <i>onamga dori 87 500</i> — kim uchunligini ham tushunaman\n• <i>kecha / dushanba kuni ...</i> — sanani o'zim qo'yaman\n• <i>Makrodan nasiyaga 340 ming</i> — xarajat + qarz\n• <i>200$ ni 2 540 000 ga almashtirdim</i> — valyuta ayirboshlash\n• <i>kartamda hozir 2 300 000 bor</i> — qoldiqni tekshirib, farqni to'g'rilayman\n• 🧾 chek rasmi, 🎙 ovozli xabar\n\n<b>Qarzlar</b>: <i>Akmalga 300 ming qarz berdim</i>, <i>Akmal 100 ming qaytardi</i>, <i>qo'shniga qarzni berdim</i>\n<b>Limit</b>: <i>oziq-ovqatga oyiga 3 mln limit qo'y</i>\n<b>Eslatma</b>: <i>har oy 5-sanada internet 120 ming</i>\n\n<b>Savol bering</b>:\n• <i>bu oy qancha ketdi?</i>  • <i>o'tgan oyga nisbatan qanday?</i>\n• <i>sut oxirgi marta qanchadan edi?</i>  • <i>kim ko'p ishlatdi?</i>\n\n<b>Tuzatish</b>: bot xabariga <u>javob (reply)</u> qilib yozing: <i>15 ming edi</i>, <i>kartadan to'laganman</i>, <i>ikkinchisini o'chir</i>.\n<b>Bekor qilish</b>: ↩️ tugmasi yoki <i>oxirgisini o'chir</i>.\n\n<b>Pastdagi tugmalar</b>\n📊 Hisobot — davr hisoboti, diagramma, Excel, xulosa\n💼 Balans — hamyonlar qoldig'i\n📒 Tarix — oxirgi yozuvlar (raqamni bosib ko'rish, tuzatish, o'chirish)\n🤝 Qarzlar — kim kimga qarzdor\n🎯 Limitlar — oylik limitlar holati\n🔔 Oylik to'lovlar — har oy takrorlanadigan to'lovlar\n↩️ Oxirgisini bekor qilish\n⚙️ Sozlamalar — hamyonlar, kategoriyalar, oila a'zolari, taklif havolasi, kunlik xulosa vaqti\n\n<i>Tugmalar yo'qolib qolsa — klaviatura yonidagi 🎛 belgisini bosing.</i>";
  const ROLES = ["Ota", "Ona", "Katta o'g'il", "Kichik o'g'il", "O'g'il", "Qiz", "Buvi", "Bobo"];

  // ------------------------------------------------------- services/family.py
  const EXPENSE_CATS = [
    ["oziq_ovqat", "Oziq-ovqat", "🛒", "non, go'sht, tovuq, sut, qatiq, tuxum, guruch, un, yog', shakar, choy, sabzavot, meva, bozor, supermarket, korzinka, makro, havas, do'kon mahsulotlari, suv (ichimlik), shirinlik, non-pishiriq, kartoshka, piyoz, sabzi, olma, banan, pishloq, kolbasa, ovqat"],
    ["kafe", "Kafe va tashqarida ovqat", "🍽", "kafe, restoran, choyxona, fastfud, lavash, shaurma, burger, pitsa, somsa (ko'chada), osh (oshxonada), kofe, dostavka, yetkazib berish, wolt, yandex eda, tushlik (ishda)"],
    ["kommunal", "Kommunal to'lovlar", "💡", "svet, elektr, gaz, suv (kommunal), issiqlik, otopleniye, chiqindi, musor, kvartplata, uy-joy xizmati, TSJ, domofon, lift"],
    ["aloqa", "Aloqa va internet", "📱", "telefon balansi, mobil aloqa, beeline, ucell, mobiuz, uzmobile, internet, uzonline, TV, IPTV, paynet, telefon"],
    ["transport", "Transport", "🚕", "taksi, yandex go, mytaxi, avtobus, metro, marshrutka, poyezd, samolyot bileti, avia bilet"],
    ["avto", "Avtomobil", "⛽", "benzin, metan, propan, zapravka, moy almashtirish, ehtiyot qism, remont, moyka, avtoturargoh, parkovka, jarima, shtraf, sug'urta, texosmotr"],
    ["uy", "Uy-ro'zg'or", "🏠", "kir yuvish kukuni, sovun, shampun, gigiyena, tozalash vositalari, idish-tovoq, maishiy texnika, mebel, uy ta'miri, santexnika, lampochka, gilam"],
    ["kiyim", "Kiyim-kechak", "👕", "kiyim, poyabzal, oyoq kiyim, kurtka, ko'ylak, shim, sumka, tikuvchi, kimyoviy tozalash"],
    ["salomatlik", "Salomatlik", "💊", "dori, apteka, dorixona, shifokor, klinika, analiz, UZI, stomatolog, tish, ko'zoynak, vitamin, massaj"],
    ["talim", "Ta'lim", "📚", "kontrakt, o'qish, kurs, repetitor, kitob, daftar, ruchka, maktab, universitet, test markaz, sertifikat imtihoni"],
    ["shaxsiy", "Shaxsiy parvarish", "💇", "sartarosh, soch oldirish, salon, kosmetika, atir, manikyur"],
    ["marosim", "To'y va marosimlar", "🎉", "to'y, to'yona, ma'raka, osh berish, nikoh, tug'ilgan kun ziyofati, beshik to'y, sunnat to'y, aza, xudoyi"],
    ["sovga", "Sovg'alar", "🎁", "sovg'a, hadya, gul, tug'ilgan kun sovg'asi, bayram sovg'asi"],
    ["xayriya", "Xayriya va sadaqa", "🤲", "sadaqa, ehson, zakot, fitr, xayriya, masjidga, yordam"],
    ["dam_olish", "Dam olish va ko'ngilochar", "🎮", "kino, park, sayohat, mehmonxona, dam olish maskani, obuna, netflix, youtube premium, telegram premium, o'yin, sport zal, futbol"],
    ["kredit", "Kredit va bo'lib to'lash", "🏦", "kredit, mikroqarz, rassrochka, muddatli to'lov, ipoteka"],
    ["tolov", "Soliq, komissiya, rasmiy to'lovlar", "🧾", "soliq, davlat boji, notarius, komissiya, hujjat"],
    ["boshqa_chiqim", "Boshqa chiqimlar", "📦", ""],
  ];
  const INCOME_CATS = [
    ["maosh", "Maosh", "💼", "oylik, maosh, zarplata, avans, premiya, bonus"],
    ["biznes", "Biznes va qo'shimcha daromad", "💰", "savdo, foyda, frilans, buyurtma, xizmat haqi, daromad"],
    ["pensiya", "Pensiya va nafaqa", "🧓", "pensiya, nafaqa, stipendiya"],
    ["ijara_kirim", "Ijara daromadi", "🏘", "ijara"],
    ["sovga_kirim", "Sovg'a / hadya olindi", "🎁", "sovg'a qilishdi, to'yona tushdi"],
    ["foiz", "Foiz va keshbek", "📈", "foiz, keshbek"],
    ["boshqa_kirim", "Boshqa kirim", "➕", ""],
  ];
  const cat = (list, key) => { const c = list.find((x) => x[0] === key); return { key: c[0], name: c[1], emoji: c[2], kind: list === INCOME_CATS ? "income" : "expense" }; };
  const WALLETS = [{ id: 1, name: "Naqd", kind: "cash", cur: "UZS", def: true }, { id: 2, name: "Karta", kind: "card", cur: "UZS" }, { id: 3, name: "Dollar", kind: "cash", cur: "USD" }];
  const WALLET_ICON = { cash: "💵", card: "💳" };
  const USD_RATE = 12700; // fixed demo rate; production asks the Central Bank API (services/currency.py)

  // ------------------------------------------------------ core/money.py, text.py, dates.py
  const LINE = "─".repeat(18);
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const MT = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));
  const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function fmtNumber(v) { const neg = v < 0; v = Math.abs(v); const whole = Math.floor(v + 1e-9), frac = Math.round((v - whole) * 100); return (neg ? "-" : "") + group(whole) + (frac ? "," + String(frac).padStart(2, "0") : ""); }
  const SIGN = { UZS: "so'm", USD: "$" };
  const fmt = (v, cur = "UZS", signed = false) => (signed && v > 0 ? "+" : "") + fmtNumber(v) + " " + SIGN[cur];
  const bar = (p, w = 10) => { const f = Math.floor(Math.min(Math.max(p, 0), 100) * w / 100 + 0.5); return "▰".repeat(f) + "▱".repeat(w - f); };
  const fmtPct = (p) => (Math.round(p * 10) / 10).toString().replace(".", ",") + "%";
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtDate = (d) => d.getDate() + "-" + MONTHS[d.getMonth()] + (d.getFullYear() !== today().getFullYear() ? ", " + d.getFullYear() : "");
  const fmtShort = (d) => String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0");
  const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  function fmtRange(s, e) {
    if (+s === +e) return fmtDate(s);
    if (s.getDate() === 1 && +e === +monthEnd(s)) return MT[s.getMonth()] + " " + s.getFullYear();
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) return s.getDate() + "–" + e.getDate() + "-" + MONTHS[s.getMonth()];
    return fmtDate(s) + " – " + fmtDate(e);
  }
  const PERIODS = { today: "Bugun", yesterday: "Kecha", week: "Shu hafta", last7: "So'nggi 7 kun", month: "Shu oy", prev_month: "O'tgan oy", last30: "So'nggi 30 kun", year: "Shu yil" };
  function periodBounds(k) {
    const t = today();
    if (k === "today") return [t, t];
    if (k === "yesterday") return [addDays(t, -1), addDays(t, -1)];
    if (k === "week") return [addDays(t, -((t.getDay() + 6) % 7)), t];
    if (k === "last7") return [addDays(t, -6), t];
    if (k === "month") return [monthStart(t), t];
    if (k === "prev_month") { const p = new Date(t.getFullYear(), t.getMonth() - 1, 1); return [p, monthEnd(p)]; }
    if (k === "last30") return [addDays(t, -29), t];
    return [new Date(t.getFullYear(), 0, 1), t];
  }

  // ------------------------------------------------------------- state
  let state;
  function fresh() { return { member: null, txs: [], batches: [], debts: [], nextId: 1, onboarding: "start" }; }
  const KIND_EMOJI = { transfer: "🔁", debt_give: "📤", debt_take: "📥", debt_repay_in: "✅", debt_repay_out: "✅", adjustment: "⚖️" };
  const walletBy = (name) => WALLETS.find((w) => w.name === name);
  function balances() {
    const b = { 1: 0, 2: 0, 3: 0 };
    for (const t of state.txs) {
      if (t.deleted) continue;
      if (t.kind === "expense" || t.kind === "debt_give" || t.kind === "debt_repay_out") b[t.wallet] -= t.amount;
      else if (t.kind === "income" || t.kind === "debt_take" || t.kind === "debt_repay_in") b[t.wallet] += t.amount;
      else if (t.kind === "transfer") { b[t.wallet] -= t.amount; b[t.toWallet] += t.toAmount; }
      else if (t.kind === "adjustment") b[t.wallet] += t.walletAmount;
    }
    return b;
  }
  const base = (t) => (t.currency === "USD" ? Math.round(t.amount * USD_RATE) : t.amount);
  function aggregate(s, e, kinds = ["expense", "income"]) {
    const rows = state.txs.filter((t) => !t.deleted && kinds.includes(t.kind) && t.date >= s && t.date <= e);
    const a = { rows, income: 0, expense: 0, byCat: {}, top: [] };
    for (const r of rows) {
      const v = base(r);
      if (r.kind === "income") a.income += v; else a.expense += v;
      const c = (a.byCat[r.cat.key] = a.byCat[r.cat.key] || { ...r.cat, amount: 0 });
      c.amount += v;
    }
    a.net = a.income - a.expense;
    a.days = Math.round((e - s) / 864e5) + 1;
    a.top = rows.filter((r) => r.kind === "expense").sort((x, y) => base(y) - base(x)).slice(0, 5);
    return a;
  }

  // ---------------------------------------------- rule-based stand-in for the Gemini parser
  const MULT = [[/^(mlrd|milliard)/, 1e9], [/^(mln|million|millon)/, 1e6], [/^(ming|k$)/, 1e3]];
  const STOP = new Set(["to'ladim", "toladim", "oldim", "sotib", "berdim", "ketdi", "uchun", "va", "edi", "bo'ldi", "xarid", "qildim", "chiqdi", "kuni", "bugun", "hozir", "so'm", "som", "sum", "dan", "ga", "ta", "kg", "dona", "litr", "l"]);
  const FAMILY = /^(onam|otam|ukam|akam|opam|singlim|xotinim|erim|o'g'lim|qizim|buvim|bobom)(ga|ni)?$/;
  function parseAmounts(tokens) {
    // returns [{value, start, end, unit: 'qty'|'price'|'amount', cur}]
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      let m = tokens[i].match(/^(\d+(?:[.,]\d+)?)(\$|mln|ming|k)?(dan|ga|ni|lik)?$/);
      if (!m) continue;
      let value = parseFloat(m[1].replace(",", ".")), start = i, j = i + 1, mult = 1, cur = "UZS", suffix = m[3] || "";
      if (m[2] === "$") cur = "USD"; else if (m[2]) mult = m[2] === "mln" ? 1e6 : 1e3;
      // "3 200 000", "186 400": digit groups
      while (!m[2] && mult === 1 && j < tokens.length && /^\d{3}(dan|ga|ni)?$/.test(tokens[j]) && !/[.,]/.test(m[1])) { value = value * 1000 + parseInt(tokens[j], 10); suffix = tokens[j].replace(/^\d+/, "") || suffix; j++; }
      if (j < tokens.length && mult === 1) {
        const t = tokens[j];
        for (const [re, k] of MULT) if (re.test(t)) { mult = k; suffix = (t.match(/(dan|ga|ni)$/) || [""])[0]; j++; break; }
      }
      value *= mult;
      // "6 mln 450 ming"
      if (mult === 1e6 && j + 1 < tokens.length && /^\d+$/.test(tokens[j]) && /^ming/.test(tokens[j + 1])) { value += parseInt(tokens[j], 10) * 1e3; suffix = (tokens[j + 1].match(/(dan|ga|ni)$/) || [""])[0]; j += 2; }
      if (j < tokens.length && /^(\$|dollar)/.test(tokens[j])) { cur = "USD"; j++; }
      let unit = "amount";
      if (j < tokens.length && /^(ta|kg|dona|litr|l)$/.test(tokens[j])) { unit = "qty"; j++; }
      else if (suffix === "dan" || (j < tokens.length && tokens[j] === "dan")) { unit = "price"; if (tokens[j] === "dan") j++; }
      out.push({ value, start, end: j, unit, cur, qtyUnit: unit === "qty" ? tokens[j - 1] : null });
      i = j - 1;
    }
    return out;
  }
  const stem = (w) => w.replace(/(lariga|larga|lari|lar|imga|ga|ni|dan|da|ning|im)$/, "");
  function category(words, list) {
    for (const c of list) {
      if (!c[3]) continue;
      const hints = c[3].split(",").map((h) => h.trim().replace(/\s*\(.*\)/, ""));
      for (const w of words) for (const h of hints) if (h && (w === h || stem(w) === h || (h.length > 3 && w.startsWith(h)))) return cat(list, c[0]);
    }
    return cat(list, list[list.length - 1][0]);
  }
  function walletOf(text) { if (/\bkarta/.test(text)) return walletBy("Karta"); if (/\bnaqd/.test(text)) return walletBy("Naqd"); return walletBy("Naqd"); }

  function parse(raw) {
    const text = raw.toLowerCase().replace(/[’`ʻʼ‘]/g, "'").replace(/(\d)\s*(\$)/g, "$1 $").replace(/\s+/g, " ").trim();
    let date = today();
    if (/\bkecha\b/.test(text)) date = addDays(date, -1);
    const clean = text.replace(/\b(kecha|bugun)\b/g, " ");
    if (/\?$|\bqancha\b|\bnecha\b/.test(text) && !/\d/.test(text)) return { type: "question", text };
    if (/\b(oxirgisini|oxirgini)\b.*\b(o'chir|bekor)/.test(text)) return { type: "undo" };
    const tokens = (s) => s.replace(/[,;]/g, " ").split(" ").filter(Boolean);
    // balance statements: "naqd pulim 850 ming, kartada 3 200 000, 300 dollar bor"
    if (/\bbor\b|\bpulim\b/.test(text) && !/qarz/.test(text)) {
      const ops = [];
      for (const seg of clean.split(/,| va /)) {
        const am = parseAmounts(tokens(seg))[0];
        if (!am) continue;
        const w = am.cur === "USD" || /dollar/.test(seg) ? walletBy("Dollar") : /karta/.test(seg) ? walletBy("Karta") : walletBy("Naqd");
        ops.push({ kind: "adjustment", wallet: w.id, target: am.value });
      }
      if (ops.length) return { type: "ops", ops, date };
    }
    // ATM / exchange
    if (/bankomat|yechdim|yechib/.test(text)) {
      const am = parseAmounts(tokens(clean))[0];
      if (am) return { type: "ops", date, ops: [{ kind: "transfer", description: "Bankomatdan yechildi", amount: am.value, currency: "UZS", wallet: 2, toWallet: 1, toAmount: am.value }] };
    }
    if (/almashtir/.test(text)) {
      const ams = parseAmounts(tokens(clean));
      if (ams.length >= 2) return { type: "ops", date, ops: [{ kind: "transfer", description: "Valyuta ayirboshlash", amount: ams[0].value, currency: "USD", wallet: 3, toWallet: 1, toAmount: ams[1].value, note: "kurs: 1 USD = " + fmtNumber(Math.round((ams[1].value / ams[0].value) * 100) / 100) + " UZS" }] };
    }
    // debts
    let m = text.match(/^([a-z'ʻ]+?)(ga|ka)\s+(.+?)\s+qarz\s+berdim/);
    if (m) { const am = parseAmounts(tokens(m[3]))[0]; if (am) return { type: "ops", date, ops: [{ kind: "debt_give", counterparty: cap(m[1]), amount: am.value, currency: am.cur, wallet: walletOf(text).id }] }; }
    m = text.match(/^([a-z'ʻ]+?)dan\s+(.+?)\s+qarz\s+oldim/);
    if (m) { const am = parseAmounts(tokens(m[2]))[0]; if (am) return { type: "ops", date, ops: [{ kind: "debt_take", counterparty: cap(m[1]), amount: am.value, currency: am.cur, wallet: walletOf(text).id }] }; }
    m = text.match(/^([a-z'ʻ]+)\s+(.+?)\s+qaytardi/);
    if (m) { const am = parseAmounts(tokens(m[2]))[0]; if (am) return { type: "ops", date, ops: [{ kind: "debt_repay_in", counterparty: cap(m[1]), amount: am.value, currency: am.cur, wallet: walletOf(text).id }] }; }
    // income
    if (/\b(maosh|oylik|zarplata|avans|premiya|pensiya|daromad|tushdi)\b/.test(text)) {
      const am = parseAmounts(tokens(clean))[0];
      if (am) {
        const words = tokens(clean).filter((w) => !/\d/.test(w));
        const c = category(words, INCOME_CATS);
        return { type: "ops", date, ops: [{ kind: "income", description: c.key === "boshqa_kirim" ? "Kirim" : c.name, amount: am.value, currency: am.cur, wallet: (am.cur === "USD" ? walletBy("Dollar") : walletOf(text)).id, cat: c }] };
      }
    }
    // expenses: "non 6 ming, taksi 18 ming", "2 kg go'sht 98 mingdan", "nonga 15 ming"
    const wallet = walletOf(text);
    const ops = [];
    for (const seg of clean.split(/,|;| va /)) {
      const tk = tokens(seg);
      const ams = parseAmounts(tk);
      if (!ams.length) continue;
      const used = new Set();
      ams.forEach((a) => { for (let k = a.start; k < a.end; k++) used.add(k); });
      const words = tk.filter((w, k) => !used.has(k) && !/\d/.test(w) && !STOP.has(w) && !FAMILY.test(w) && !/^(kartadan|karta|kartaga|naqd|naqddan|naqdga)$/.test(w));
      const qty = ams.find((a) => a.unit === "qty"), price = ams.find((a) => a.unit === "price"), plain = ams.find((a) => a.unit === "amount");
      const amount = price ? price.value * (qty ? qty.value : 1) : plain ? plain.value : null;
      if (!amount) continue;
      const nameWords = words.map(stem).filter(Boolean);
      const c = category(words, EXPENSE_CATS);
      const desc = nameWords.length ? cap(nameWords.join(" ")) : c.name;
      ops.push({ kind: "expense", description: desc, amount, currency: (price || plain).cur, wallet: ((price || plain).cur === "USD" ? walletBy("Dollar") : wallet).id, cat: c, qty: qty && qty.value !== 1 ? qty.value : null, unit: qty ? (qty.qtyUnit === "dona" ? "ta" : qty.qtyUnit) : null, itemKey: nameWords.join(" ") });
    }
    if (ops.length) return { type: "ops", ops, date };
    return { type: "unknown" };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------------------------------------------- engine.commit + render_saved
  function commit(p) {
    const bal = balances();
    const batch = { id: state.batches.length + 1, txIds: [] };
    const ops = p.ops.map((o) => {
      const t = Object.assign({ id: state.nextId++, date: p.date, batch: batch.id, currency: o.currency || "UZS" }, o);
      if (t.kind === "adjustment") {
        const w = WALLETS.find((x) => x.id === t.wallet);
        t.currency = w.cur; t.current = bal[t.wallet]; t.walletAmount = t.target - t.current; t.amount = Math.abs(t.walletAmount);
        t.description = w.name + " qoldig'i tuzatildi";
      }
      if (t.kind === "debt_give") t.description = t.counterparty + "ga qarz";
      if (t.kind === "debt_take") t.description = t.counterparty + "dan qarz";
      if (t.kind === "debt_repay_in") t.description = t.counterparty + " qarzini qaytardi";
      if (t.kind === "expense" && t.itemKey) {
        const prev = state.txs.filter((x) => !x.deleted && x.kind === "expense" && x.itemKey === t.itemKey).pop();
        if (prev) t.prev = prev;
      }
      return t;
    });
    for (const t of ops) {
      state.txs.push(t); batch.txIds.push(t.id);
      if (t.kind === "debt_give" || t.kind === "debt_take") state.debts.push({ id: t.id, counterparty: t.counterparty, direction: t.kind === "debt_give" ? "lent" : "borrowed", amount: t.amount, remaining: t.amount, currency: t.currency, opened: t.date });
      if (t.kind === "debt_repay_in") {
        const d = state.debts.find((x) => x.direction === "lent" && x.remaining > 0 && x.counterparty.toLowerCase() === t.counterparty.toLowerCase());
        if (d) { d.remaining = Math.max(0, d.remaining - t.amount); t.debt = d; } else t.warning = "«" + esc(t.counterparty) + "» bo'yicha ochiq qarz topilmadi — oddiy kirim sifatida yozildi";
      }
    }
    state.batches.push(batch);
    return { batch, ops };
  }

  function opLines(op) {
    const t = today();
    const when = +op.date !== +t ? " · <i>" + fmtDate(op.date) + "</i>" : "";
    let money = "<b>" + fmt(op.amount, op.currency) + "</b>";
    if (op.currency !== "UZS" && op.kind !== "adjustment") money += " <i>(≈ " + fmt(base(op)) + ")</i>";
    const L = [];
    if (op.kind === "expense" || op.kind === "income") {
      L.push((op.cat.emoji || "•") + " " + esc(op.description) + " — " + (op.kind === "income" ? "+" : "") + money + when);
      if (op.qty) L.push("     <i>" + fmtNumber(op.qty) + " " + esc(op.unit || "ta") + " × " + fmt(Math.round(op.amount / op.qty), op.currency) + "</i>");
    } else if (op.kind === "transfer") {
      L.push("🔁 " + esc(op.description) + " — " + money + when);
      const from = WALLETS.find((w) => w.id === op.wallet), to = WALLETS.find((w) => w.id === op.toWallet);
      L.push("     <i>" + from.name + " → " + to.name + (from.cur !== to.cur ? " (" + fmt(op.toAmount, to.cur) + ")" : "") + "</i>");
    } else if (op.kind === "adjustment") {
      const w = WALLETS.find((x) => x.id === op.wallet);
      if (op.walletAmount === 0) L.push("⚖️ " + w.name + ": hisob va haqiqat bir xil — <b>" + fmt(op.target, w.cur) + "</b> ✅");
      else L.push("⚖️ " + w.name + " qoldig'i tekshirildi", "     hisobda: " + fmt(op.current, w.cur), "     aslida: <b>" + fmt(op.target, w.cur) + "</b>", "     tuzatildi: <b>" + fmt(op.walletAmount, w.cur, true) + "</b>");
    } else {
      L.push(KIND_EMOJI[op.kind] + " " + esc(op.description) + " — " + money + when);
    }
    if (op.note) L.push("     💬 <i>" + esc(op.note) + "</i>");
    if (op.warning) L.push("     ⚠️ <i>" + op.warning + "</i>");
    return L;
  }

  function renderSaved(ops, title = "Yozildi") {
    const t = today();
    const body = [];
    const expenses = ops.filter((o) => o.kind === "expense");
    const moneyOps = ops.filter((o) => o.kind === "expense" || o.kind === "income");
    const walletsUsed = new Set(moneyOps.map((o) => WALLETS.find((w) => w.id === o.wallet).name));
    const perLine = walletsUsed.size > 1 || expenses.length <= 1;
    for (const op of ops) {
      const L = opLines(op);
      if (perLine && moneyOps.includes(op)) L[0] += " · <i>" + WALLETS.find((w) => w.id === op.wallet).name + "</i>";
      body.push(...L);
      if (op.kind === "debt_repay_in" && op.debt) body.push(op.debt.remaining > 0 ? "     <i>qolgan qarz: " + fmt(op.debt.remaining, op.debt.currency) + "</i>" : "     🎉 <i>qarz to'liq yopildi</i>");
      if (op.prev && op.qty == null && op.prev.qty == null && op.prev.amount !== op.amount) {
        const diff = ((op.amount - op.prev.amount) / op.prev.amount) * 100;
        body.push("     " + (diff > 0 ? "📈" : "📉") + ": oldin " + fmt(op.prev.amount) + " edi (" + fmtDate(op.prev.date) + "), " + (diff > 0 ? "+" : "") + fmtPct(diff));
      }
    }
    const out = ["✅ <b>" + title + "</b>", "", ...body];
    if (expenses.length > 1) {
      out.push(LINE, "Jami chiqim: <b>" + fmt(expenses.reduce((a, o) => a + base(o), 0)) + "</b>" + (!perLine && walletsUsed.size ? " · <i>" + [...walletsUsed][0] + "</i>" : ""));
    }
    if (moneyOps.length) {
      const day = aggregate(t, t, ["expense"]), month = aggregate(monthStart(t), t, ["expense"]);
      out.push("", "📅 Bugun: " + fmt(day.expense) + " · " + MT[t.getMonth()] + ": " + fmt(month.expense));
    }
    return out.join("\n");
  }

  // ---------------------------------------------- reports.py / commands.py views
  function periodReport(k) {
    const [s, e] = periodBounds(k);
    const a = aggregate(s, e);
    const out = ["📊 <b>" + PERIODS[k] + "</b> · " + fmtRange(s, e), ""];
    if (!a.rows.length) { out.push("Bu davrda hech qanday kirim-chiqim yozilmagan. 🙂", "Harajatni oddiy yozib yuboring: <i>non 6 ming, taksi 18 ming</i>"); return out.join("\n"); }
    out.push("💰 Kirim:  <b>" + fmt(a.income) + "</b>", "💸 Chiqim: <b>" + fmt(a.expense) + "</b>");
    out.push((a.net >= 0 ? "🟢" : "🔴") + " Farq:   <b>" + fmt(a.net, "UZS", true) + "</b>" + (a.income > 0 && a.net > 0 ? " · tejaldi " + fmtPct((a.net / a.income) * 100) : ""));
    const ex = Object.values(a.byCat).filter((c) => c.kind === "expense").sort((x, y) => y.amount - x.amount);
    if (ex.length) { out.push("", "<b>Chiqimlar nimaga ketdi:</b>"); for (const c of ex) { const sh = (c.amount / a.expense) * 100; out.push(c.emoji + " " + esc(c.name) + " — <b>" + fmt(c.amount) + "</b> · " + fmtPct(sh), "     " + bar(sh)); } }
    const inc = Object.values(a.byCat).filter((c) => c.kind === "income").sort((x, y) => y.amount - x.amount);
    if (inc.length) { out.push("", "<b>Kirim manbalari:</b>"); for (const c of inc) out.push(c.emoji + " " + esc(c.name) + " — <b>" + fmt(c.amount) + "</b>"); }
    if (a.top.length) { out.push("", "<b>Eng katta chiqimlar:</b>"); a.top.forEach((r, i) => out.push((i + 1) + ". " + fmtShort(r.date) + " " + esc(r.description) + " — " + fmt(base(r)))); }
    if (a.expense && a.days > 1) out.push("", "📅 Kunlik o'rtacha chiqim: <b>" + fmt(Math.round(a.expense / a.days)) + "</b>");
    return out.join("\n");
  }
  function walletsText() {
    const b = balances();
    let total = 0;
    const L = ["💼 <b>Hamyonlar</b>", ""];
    for (const w of WALLETS) {
      const v = b[w.id];
      let line = WALLET_ICON[w.kind] + " " + w.name + (w.def ? " ⭐" : "") + ": <b>" + fmt(v, w.cur) + "</b>";
      if (w.cur !== "UZS") { const u = Math.round(v * USD_RATE); total += u; line += "  <i>≈ " + fmt(u) + "</i>"; } else total += v;
      if (v < 0) line += "  ⚠️";
      L.push(line);
    }
    L.push(LINE, "Jami: <b>" + fmt(total) + "</b>");
    let text = L.join("\n");
    const lent = state.debts.filter((d) => d.direction === "lent" && d.currency === "UZS").reduce((a, d) => a + d.remaining, 0);
    const borrowed = state.debts.filter((d) => d.direction === "borrowed" && d.currency === "UZS").reduce((a, d) => a + d.remaining, 0);
    if (lent || borrowed) { text += "\n"; if (lent) text += "\n📤 Bizga qarzdorlar: " + fmt(lent); if (borrowed) text += "\n📥 Bizning qarzimiz: " + fmt(borrowed); }
    return text + "\n\n<i>Qoldiq haqiqatga mos kelmasa, shunchaki yozing: «kartamda 1 230 000 bor» — farqni topib, to'g'rilab qo'yaman.</i>";
  }
  function historyText() {
    const rows = state.txs.filter((t) => !t.deleted).slice(-15).reverse();
    if (!rows.length) return ["📒 Hali hech narsa yozilmagan.", null];
    const L = ["📒 <b>Oxirgi yozuvlar</b>", "<i>Ko'rish, tuzatish yoki o'chirish uchun pastdagi raqamni bosing</i>", ""];
    rows.forEach((t, i) => {
      let sign = ["income", "debt_take", "debt_repay_in"].includes(t.kind) ? "+" : "";
      if (t.kind === "adjustment") sign = t.walletAmount > 0 ? "+" : "−";
      const emoji = (t.cat && t.cat.emoji) || KIND_EMOJI[t.kind] || "•";
      L.push("<b>" + (i + 1) + ".</b> " + fmtShort(t.date) + " " + emoji + " " + esc(t.description) + " — <b>" + sign + fmt(t.amount, t.currency) + "</b> · " + esc(state.member.name));
    });
    const btns = rows.map((t, i) => ({ t: String(i + 1), d: "tx:" + t.id }));
    const kb = []; for (let i = 0; i < btns.length; i += 5) kb.push(btns.slice(i, i + 5));
    return [L.join("\n"), kb];
  }
  function debtsView() {
    const open = state.debts.filter((d) => d.remaining > 0);
    if (!open.length) return ["🤝 Ochiq qarzlar yo'q. Zo'r! 🎉\n\n<i>Yozish: «Akmalga 300 ming qarz berdim» yoki «qo'shnidan 1 mln qarz oldim»</i>", null];
    const L = ["🤝 <b>Qarzlar</b>"], kb = [];
    for (const [title, dir] of [["📤 Bizga qarzdorlar", "lent"], ["📥 Biz qarzdormiz", "borrowed"]]) {
      const g = open.filter((d) => d.direction === dir);
      if (!g.length) continue;
      L.push("", "<b>" + title + ":</b>");
      for (const d of g) {
        let line = "• " + esc(d.counterparty) + " — <b>" + fmt(d.remaining, d.currency) + "</b>";
        if (d.remaining !== d.amount) line += " <i>(dastlab " + fmt(d.amount, d.currency) + ")</i>";
        L.push(line + "\n   <i>" + fmtDate(d.opened) + " dan beri</i>");
        kb.push([{ t: "✅ " + d.counterparty.slice(0, 18) + " — to'liq " + (dir === "lent" ? "qaytardi" : "to'landi"), d: "debt:" + d.id }]);
      }
    }
    L.push("", "<i>Qisman qaytarilsa yozing: «Akmal 100 ming qaytardi»</i>");
    return [L.join("\n"), kb];
  }
  function answer(q) {
    // production: Gemini writes this answer from SQL facts (services/queries.py); here it is templated
    const t = today(), s = /o'tgan oy/.test(q) ? periodBounds("prev_month")[0] : /bugun/.test(q) ? t : monthStart(t);
    const e = /o'tgan oy/.test(q) ? periodBounds("prev_month")[1] : t;
    const words = q.replace(/[?]/g, "").split(" ");
    const c = category(words, EXPENSE_CATS);
    const a = aggregate(s, e, ["expense"]);
    if (c.key !== "boshqa_chiqim" || /ovqat/.test(q)) {
      const key = /ovqat/.test(q) && c.key === "boshqa_chiqim" ? "oziq_ovqat" : c.key;
      const rows = a.rows.filter((r) => r.cat.key === key);
      const sum = rows.reduce((x, r) => x + base(r), 0);
      const cc = cat(EXPENSE_CATS, key);
      return "🧮 " + fmtRange(s, e) + ": " + cc.emoji + " <b>" + cc.name + "</b> uchun <b>" + fmt(sum) + "</b> ketdi" + (rows.length ? " (" + rows.length + " ta yozuv" + (a.expense ? ", jami chiqimning " + fmtPct((sum / a.expense) * 100) : "") + ")." : ".");
    }
    return "🧮 " + fmtRange(s, e) + ": jami chiqim <b>" + fmt(a.expense) + "</b>, " + a.rows.length + " ta yozuv.";
  }

  // ---------------------------------------------- keyboards.py
  const MAIN = [[{ t: BTN.REPORT }, { t: BTN.BALANCE }], [{ t: BTN.HISTORY }, { t: BTN.DEBTS }], [{ t: BTN.BUDGET }, { t: BTN.RECURRING }], [{ t: BTN.UNDO }], [{ t: BTN.SETTINGS }, { t: BTN.HELP }]];
  const recordKb = (id) => [[{ t: "↩️ Bekor qilish", d: "undo:" + id }, { t: "✏️ Tuzatish", d: "edit:" + id }]];
  const redoKb = (id) => [[{ t: "🔄 Qaytarish", d: "redo:" + id }]];
  const periodsKb = () => { const k = Object.entries(PERIODS).map(([d, t]) => ({ t, d: "rep:show:" + d })); const r = []; for (let i = 0; i < k.length; i += 2) r.push(k.slice(i, i + 2)); return r; };
  const reportActionsKb = (p) => [[{ t: "📈 Diagramma", d: "rep:chart:" + p }, { t: "🧠 Hisobchi xulosasi", d: "rep:insight:" + p }], [{ t: "📥 Excel", d: "rep:xlsx:" + p }, { t: "🗓 Boshqa davr", d: "rep:menu:" + p }]];

  // ---------------------------------------------- chart (services/charts.py draws with matplotlib)
  function chartPng(k) {
    const [s, e] = periodBounds(k), a = aggregate(s, e);
    const cats = Object.values(a.byCat).filter((c) => c.kind === "expense").sort((x, y) => y.amount - x.amount).slice(0, 7);
    const c = document.createElement("canvas"); c.width = 640; c.height = 400;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 640, 400);
    g.fillStyle = "#1f2937"; g.font = "600 20px Onest, sans-serif"; g.fillText(PERIODS[k] + ": " + fmtRange(s, e), 24, 38);
    g.font = "15px Onest, sans-serif"; g.fillStyle = "#6b7280"; g.fillText("Chiqim: " + fmt(a.expense) + "   Kirim: " + fmt(a.income), 24, 64);
    const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];
    const max = Math.max(1, ...cats.map((x) => x.amount));
    cats.forEach((x, i) => {
      const y = 92 + i * 42, w = Math.max(4, (x.amount / max) * 360);
      g.fillStyle = colors[i % colors.length]; g.fillRect(220, y, w, 26);
      g.fillStyle = "#111827"; g.font = "15px Onest, sans-serif"; g.fillText(x.name.slice(0, 22), 24, y + 18);
      g.fillStyle = "#374151"; g.fillText(fmt(x.amount), Math.min(230 + w, 520), y + 18);
    });
    if (!cats.length) { g.fillStyle = "#6b7280"; g.fillText("Bu davrda chiqim yo'q", 24, 120); }
    return c.toDataURL("image/png");
  }

  // ---------------------------------------------- chat wiring
  const chat = new TGChat(document.getElementById("chat"), {
    title: "Oila Hamyon", sub: "bot", ava: "👛", placeholder: "Xabar yozing...",
    onReset: () => { chat.clear(); start(); },
  });
  const NAME = "Dilshod";

  chat.on("text", async (text, msg) => {
    if (text === "/start") return start(true);
    if (state.onboarding === "name") {
      const n = text.trim();
      if (n.length < 1 || n.length > 30 || n.startsWith("/")) return chat.say("Ism 1–30 belgidan iborat bo'lsin. Qaytadan yozing:");
      return askRole(n);
    }
    if (state.onboarding === "role") return chat.say("👆 Iltimos, yuqoridagi tugmalardan birini tanlang.");
    if (text === BTN.HELP) return chat.say(HELP);
    if (text === BTN.BALANCE) return chat.say(walletsText());
    if (text === BTN.REPORT) return chat.say("📊 Qaysi davr uchun hisobot?", { kb: periodsKb() });
    if (text === BTN.HISTORY) { const [t, kb] = historyText(); return chat.say(t, { kb }); }
    if (text === BTN.DEBTS) { const [t, kb] = debtsView(); return chat.say(t, { kb }); }
    if (text === BTN.BUDGET) return chat.say("🎯 <b>Oylik limitlar</b>\n\nHali limit qo'yilmagan.\n\nYozing, masalan:\n<i>oziq-ovqatga oyiga 3 mln limit qo'y</i>\n<i>umumiy oylik limit 9 mln</i>\n\n80% va 100% ga yetganda ogohlantiraman.");
    if (text === BTN.RECURRING) return chat.say("🔔 <b>Har oylik to'lovlar</b>\n\nHali yo'q. Yozing, masalan:\n<i>har oy 5-sanada internetga 120 ming to'laymiz</i>\n<i>har oyning 10-sida kvartplata 350 ming</i>\n\nO'sha kuni eslataman, «To'landi» bossangiz o'zim yozib qo'yaman.");
    if (text === BTN.UNDO) return undoLast();
    if (text === BTN.SETTINGS) { chat.toast(window.Site.lang() === "uz" ? "Sozlamalar menyusi bu demoda yo'q" : "The settings menu is not part of this demo", 2400); return; }
    const p = parse(text);
    if (p.type === "unknown") return chat.say("Men shu yerdaman 🙂 Harajatni oddiy yozib yuboring.");
    if (p.type === "question") return chat.say(answer(p.text));
    if (p.type === "undo") return undoLast();
    const { batch, ops } = commit(p);
    await chat.say(renderSaved(ops), { kb: recordKb(batch.id), delay: 900 });
    refreshSide();
  });

  function undoBatch(id) {
    const b = state.batches.find((x) => x.id === id);
    const txs = state.txs.filter((t) => b && b.txIds.includes(t.id) && !t.deleted);
    if (!txs.length) return null;
    txs.forEach((t) => { t.deleted = true; if (t.debt) t.debt.remaining += t.amount; });
    state.debts.forEach((d) => { if (txs.some((t) => t.id === d.id)) d.remaining = 0; });
    refreshSide();
    return "↩️ Bekor qilindi: " + esc(txs.slice(0, 6).map((t) => t.description + " (" + fmt(t.amount, t.currency) + ")").join(", "));
  }
  function undoLast() {
    const b = [...state.batches].reverse().find((x) => state.txs.some((t) => x.txIds.includes(t.id) && !t.deleted));
    if (!b) return chat.say("Bekor qiladigan yozuv topilmadi.");
    return chat.say(undoBatch(b.id), { kb: redoKb(b.id) });
  }

  chat.on("cb", async (data, msg) => {
    const [a, b, c] = data.split(":");
    if (a === "name") { chat.setKb(msg, null); return askRole(NAME); }
    if (a === "role") return finishOnboarding(msg, b);
    if (a === "undo") { const t = undoBatch(+b); if (!t) return chat.toast("Bu yozuv allaqachon bekor qilingan."); chat.setKb(msg, null); return chat.say(t, { kb: redoKb(+b), delay: 300 }); }
    if (a === "redo") {
      const bt = state.batches.find((x) => x.id === +b);
      const txs = state.txs.filter((t) => bt.txIds.includes(t.id) && t.deleted);
      if (!txs.length) return chat.toast("Bu yozuv allaqachon saqlangan yoki bekor qilingan.");
      txs.forEach((t) => { t.deleted = false; if (t.debt) t.debt.remaining = Math.max(0, t.debt.remaining - t.amount); });
      state.debts.forEach((d) => { const t = txs.find((x) => x.id === d.id); if (t) d.remaining = d.amount; });
      chat.setKb(msg, null);
      refreshSide();
      return chat.say(renderSaved(txs, "Qaytarildi"), { kb: recordKb(bt.id), delay: 300 });
    }
    if (a === "edit") { chat.toast(window.Site.lang() === "uz" ? "Haqiqiy botda shu xabarga javob (reply) qilib tuzatasiz: «15 ming edi»" : "In the real bot you reply to this message with a fix, e.g. «15 ming edi»", 3000); return; }
    if (a === "tx") {
      const t = state.txs.find((x) => x.id === +b);
      if (!t || t.deleted) return chat.say("Bu yozuv topilmadi yoki o'chirilgan.");
      return chat.say("🧾 <b>Yozuv #" + t.id + "</b>\n\n" + opLines(t).join("\n") + "\n\n📅 " + fmtDate(t.date) + " · 👤 " + esc(state.member.name), { kb: [[{ t: "✏️ Tuzatish", d: "edit:" + t.id }, { t: "🗑 O'chirish", d: "del:" + t.id }]], delay: 300 });
    }
    if (a === "del") { const t = state.txs.find((x) => x.id === +b); if (t && !t.deleted) { t.deleted = true; refreshSide(); chat.setKb(msg, null); return chat.say("🗑 Yozuv o'chirildi.", { delay: 200 }); } return; }
    if (a === "debt") {
      const d = state.debts.find((x) => x.id === +b);
      if (!d || d.remaining <= 0) return chat.toast("Bu qarz allaqachon yopilgan.");
      const { batch, ops } = commit({ date: today(), ops: [{ kind: "debt_repay_in", counterparty: d.counterparty, amount: d.remaining, currency: d.currency, wallet: 1 }] });
      chat.setKb(msg, null);
      return chat.say(renderSaved(ops), { kb: recordKb(batch.id), delay: 400 });
    }
    if (a === "rep") {
      if (b === "menu") return chat.say("📊 Qaysi davr uchun hisobot?", { kb: periodsKb(), delay: 200 });
      if (b === "show") return chat.say(periodReport(c), { kb: reportActionsKb(c), delay: 600 });
      const [s, e] = periodBounds(c);
      if (b === "chart") { chat.toast("Chizyapman..."); await chat.typing(900); return chat.photo(chartPng(c), "📈 " + PERIODS[c] + " · " + fmtRange(s, e), { alt: "Report chart" }); }
      if (b === "xlsx") { chat.toast("Tayyorlayapman..."); await chat.typing(900); const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); return chat.doc("hamyon_" + iso(s) + "_" + iso(e) + ".xlsx", "7.2 KB", "📥 " + PERIODS[c] + " · " + fmtRange(s, e)); }
      if (b === "insight") {
        chat.toast("O'ylayapman... 🧠"); await chat.typing(1400);
        const ag = aggregate(s, e), top = Object.values(ag.byCat).filter((x) => x.kind === "expense").sort((x, y) => y.amount - x.amount)[0];
        const body = ag.rows.length
          ? "Bu davrda <b>" + fmt(ag.expense) + "</b> sarfladingiz" + (top ? ", eng ko'pi — " + top.emoji + " " + esc(top.name) + " (" + fmtPct((top.amount / Math.max(1, ag.expense)) * 100) + ")" : "") + ".\n" + (ag.income ? "Kirimning " + fmtPct(Math.max(0, (ag.net / ag.income) * 100)) + " qismi tejaldi." : "Kirim hali yozilmagan — maoshni ham yozib qo'ysangiz, tejashni hisoblayman.")
          : "Bu davrda yozuv yo'q.";
        return chat.bot("🧠 <b>Hisobchi xulosasi</b> · " + fmtRange(s, e) + "\n\n" + body + "\n\n<i>(demo: productionda bu xulosani Gemini yozadi)</i>");
      }
    }
  });

  // ---------------------------------------------- onboarding (bot/handlers/start.py)
  async function start(manual) {
    state = fresh();
    refreshSide();
    if (!manual) chat.me("/start");
    state.onboarding = "name";
    await chat.say(ASK_NAME, { kb: [[{ t: "✅ " + NAME, d: "name:ok" }]], delay: 600 });
  }
  async function askRole(name) {
    state.pendingName = name;
    state.onboarding = "role";
    const r = ROLES.map((x) => ({ t: x, d: "role:" + x })), kb = [];
    for (let i = 0; i < r.length; i += 2) kb.push(r.slice(i, i + 2));
    await chat.say(ASK_ROLE, { kb, delay: 500 });
  }
  async function finishOnboarding(msg, role) {
    if (state.onboarding !== "role") return;
    chat.setKb(msg, null);
    state.member = { name: state.pendingName, role, admin: true };
    state.onboarding = null;
    await chat.say(WELCOME.replace("{name}", esc(state.member.name)), { reply: MAIN, placeholder: "Masalan: non 6 ming, taksi 18 ming", delay: 700 });
    await chat.say("👨‍👩‍👦 <b>Oilangizni qo'shing</b>\nShu havolani onangiz va ukangizga yuboring — ular bosib qo'shiladi:\n\n<code>t.me/…?start=••••••••</code>\n\n<i>Havola faqat sizning oilangizga kiritadi. Keyin topish yoki yangilash: ⚙️ Sozlamalar → 🔗 Taklif havolasi</i>", { delay: 600 });
  }

  // ---------------------------------------------- side panel
  const sideEl = document.getElementById("ledger");
  function refreshSide() {
    if (!sideEl) return;
    const b = balances();
    const live = state.txs.filter((t) => !t.deleted);
    sideEl.innerHTML = WALLETS.map((w) => "<div><span>" + WALLET_ICON[w.kind] + " " + w.name + "</span><b>" + fmt(b[w.id], w.cur) + "</b></div>").join("") +
      "<div class='sub'><span>" + bi("Records", "Yozuvlar") + "</span><b>" + live.length + "</b></div>";
  }
  document.querySelectorAll("[data-say]").forEach((el) => el.addEventListener("click", () => {
    if (state.onboarding) { chat.toast(window.Site.lang() === "uz" ? "Avval ism va rolni tanlang" : "Pick a name and a role first", 2000); return; }
    chat.sendText(el.dataset.say);
  }));
  window.Hamyon = { parse, get state() { return state; } };
  start(false);
})();
