/* Word Chain bot, ported from Python (bot/engine.py, levels.py, dictionary.py, ai.py,
   game_manager.py, texts.py, keyboards.py) to run in the browser against the real word list. */
(function () {
  "use strict";
  const { bi } = window.Site;
  const esc = window.tgEsc;

  // ---------------------------------------------------------------- levels.py
  const LV = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const VOCAB_SIZE = [1000, 2500, 5000, 10000, 20000, 1e9];
  const LEVEL_TITLES = ["Boshlang'ich", "Elementar", "O'rta", "O'rtadan yuqori", "Yuqori", "Professional"];
  const BOT_TURN_SECONDS = [60, 50, 45, 40, 35, 30];
  const shifted = (lv, d) => Math.min(Math.max(lv + d, 0), 5);
  const levelForRank = (rank) => { for (let i = 0; i < 6; i++) if (rank < VOCAB_SIZE[i]) return i; return 5; };

  // ------------------------------------------------------------ dictionary.py
  function bisectLeft(arr, x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return lo; }
  class Dictionary {
    constructor(words) {
      this._rank = new Map(); this._words = {}; this._ranks = {};
      words.forEach((w, rank) => {
        if (this._rank.has(w)) return;
        this._rank.set(w, rank);
        (this._words[w[0]] = this._words[w[0]] || []).push(w);
        (this._ranks[w[0]] = this._ranks[w[0]] || []).push(rank);
      });
    }
    has(w) { return this._rank.has(w); }
    get size() { return this._rank.size; }
    rank(w) { return this._rank.get(w); }
    levelOf(w) { const r = this._rank.get(w); return r == null ? null : levelForRank(r); }
    countKnown(letter, lv) { const r = this._ranks[letter]; return r ? bisectLeft(r, VOCAB_SIZE[lv]) : 0; }
    known(letter, lv) { return this._words[letter] ? this._words[letter].slice(0, this.countKnown(letter, lv)) : []; }
  }

  // ---------------------------------------------------------------- engine.py
  const EDGE = " \t\r\n.,!?;:\"'`«»“”‘’()[]{}";
  function normalize(text) {
    let s = 0, e = text.length;
    while (s < e && EDGE.includes(text[s])) s++;
    while (e > s && EDGE.includes(text[e - 1])) e--;
    const w = text.slice(s, e).toLowerCase();
    return /^[a-z]+$/.test(w) ? w : null;
  }
  const Reject = { FORMAT: "format", TOO_SHORT: "too_short", WRONG_LETTER: "wrong_letter", USED: "used", UNKNOWN: "unknown" };
  const Outcome = { TIMEOUT: "timeout", STRIKES: "strikes", RESIGN: "resign", STUCK: "stuck" };

  class GameState {
    constructor(players, dict, { minLength = 3, maxStrikes = 3, first = 0 } = {}) {
      this.players = players; this.dict = dict; this.minLength = minLength; this.maxStrikes = maxStrikes;
      this.turn = first; this.history = []; this.used = new Set();
    }
    get current() { return this.players[this.turn]; }
    get lastWord() { return this.history.length ? this.history[this.history.length - 1][1] : null; }
    get requiredLetter() { const l = this.lastWord; return l ? l[l.length - 1] : null; }
    check(word) {
      if (!word) return Reject.FORMAT;
      if (word.length < this.minLength) return Reject.TOO_SHORT;
      const letter = this.requiredLetter;
      if (letter && word[0] !== letter) return Reject.WRONG_LETTER;
      if (this.used.has(word)) return Reject.USED;
      if (!this.dict.has(word)) return Reject.UNKNOWN;
      return null;
    }
    play(word) {
      const r = this.check(word);
      if (r) return r;
      this.used.add(word); this.history.push([this.turn, word]); this.current.words.push(word);
      this.turn = 1 - this.turn;
      return null;
    }
    addStrike() { this.current.strikes += 1; return this.current.strikes >= this.maxStrikes; }
    longestWord() { let best = null; for (const [, w] of this.history) if (!best || w.length > best.length) best = w; return best; }
  }

  // -------------------------------------------------------------------- ai.py
  const PERSONAS = [
    [0.050, 0.0040, 0.00, [3.5, 8.0]], [0.040, 0.0035, 0.10, [3.0, 7.0]], [0.032, 0.0030, 0.20, [2.5, 6.0]],
    [0.025, 0.0025, 0.35, [2.0, 5.0]], [0.018, 0.0020, 0.50, [1.8, 4.5]], [0.012, 0.0015, 0.65, [1.5, 4.0]],
  ].map(([fail, fatigue, cunning, think]) => ({ fail, fatigue, cunning, think }));
  const BOT_NAMES = ["Alex", "Emma", "Liam", "Olivia", "Noah", "Sophia", "Jack", "Mia", "Leo", "Grace", "Ethan", "Lucy", "Ryan", "Chloe", "Adam", "Ella"];
  const HARD_LETTER_PHRASES = ["That's a tough letter... I give up!", "Ugh, I know so few words with that letter 😩 You win!", "Okay, you got me with that one. GG!"];
  const BLANK_PHRASES = ["Hmm... I can't think of anything. You win! 👏", "Oh no, my mind went blank 😅 You got me!", "Pass! Well played 🙌", "Wait, wait... no, I've got nothing. GG!", "My brain is tired after such a long game 😵 You win!"];
  const WIN_PHRASES = ["Good game! Want a rematch? 😉", "GG! You were close 💪", "That was fun! Try again?"];
  const COMPLIMENTS = ["Ooh, nice word! 👀", "Wow, fancy one 😮", "Great word!", "Didn't expect that one 😄"];
  const MAX_FAIL = 0.55, WARM_UP = 6, HARD_LETTER = 15, OPENING_LETTERS = "abcdefghilmnoprstw";
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function choices(pop, weights, k) {
    const cum = []; let acc = 0;
    for (const w of weights) { acc += w; cum.push(acc); }
    const out = [];
    for (let i = 0; i < k; i++) out.push(pop[Math.min(pop.length - 1, bisectLeft(cum, Math.random() * acc))]);
    return out;
  }
  class BotBrain {
    constructor(dict, level, speed) { this.dict = dict; this.level = level; this.p = PERSONAS[level]; this.speed = speed; this.name = choice(BOT_NAMES); this.lastOptions = 0; }
    thinkTime() { const [lo, hi] = this.p.think; return (lo + Math.random() * (hi - lo)) * this.speed; }
    failChance(moves, options) {
      const warm = Math.min(1, moves / WARM_UP);
      let p = (this.p.fail + this.p.fatigue * moves) * warm;
      if (options < 5) p += 0.25; else if (options < HARD_LETTER) p += 0.08;
      return Math.min(p, MAX_FAIL);
    }
    giveUpPhrase() { return choice(this.lastOptions < HARD_LETTER ? HARD_LETTER_PHRASES : BLANK_PHRASES); }
    choose(letter, used, moves) {
      letter = letter || choice(OPENING_LETTERS);
      const options = this.dict.known(letter, this.level).filter((w) => !used.has(w));
      this.lastOptions = options.length;
      if (!options.length || Math.random() < this.failChance(moves, options.length)) return null;
      const weights = options.map((_, i) => 1 / Math.pow(i + 20, 0.6));
      const picks = choices(options, weights, Math.min(10, options.length));
      if (Math.random() < this.p.cunning) {
        const uniq = [...new Set(picks)];
        uniq.sort((a, b) => (this.dict.countKnown(a[a.length - 1], this.level) - this.dict.countKnown(b[b.length - 1], this.level)) || (a < b ? -1 : a > b ? 1 : 0));
        return uniq[0];
      }
      return picks[0];
    }
  }

  // ----------------------------------------------------------------- texts.py
  const HINT_BTN = "💡 Yordam", RESIGN_BTN = "🏳️ Taslim bo'lish", DIVIDER = "━━━━━━━━━━━━━━";
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const wordTag = (w, lv) => "<b>" + esc(cap(w)) + "</b>" + (lv != null ? " <i>(" + LV[lv] + ")</i>" : "");
  const pct = (w, g) => (g ? Math.round((100 * w) / g) + "%" : "—");
  const T = {
    welcome: (p) => "👋 Salom, <b>" + esc(p.name) + "</b>!\n\n🔤 <b>Word Chain</b> — inglizcha so'z zanjiri o'yini.\nHar bir so'z oldingi so'zning <b>oxirgi harfi</b> bilan boshlanadi:\n<i>apple → egg → green → nice → ...</i>\n\nDarajangiz: <b>" + LV[p.level] + "</b> · ⭐ Reyting: <b>" + p.rating + "</b>\n\nO'yin turini tanlang 👇",
    rules: (pvp, strikes, hints, minLen) => "📖 <b>O'yin qoidalari</b>\n\n1️⃣ Har bir so'z oldingi so'zning <b>oxirgi harfi</b> bilan boshlanadi.\n2️⃣ Faqat inglizcha so'zlar, kamida <b>" + minLen + "</b> harf. Ismlar, shahar va davlat nomlari qabul qilinmaydi (hafta kunlari, oylar va tillar mumkin).\n3️⃣ Bitta o'yinda so'z <b>takrorlanmaydi</b>.\n4️⃣ Har bir yurishga vaqt beriladi:\n    🤖 " + LV.map((l, i) => l + " " + BOT_TURN_SECONDS[i] + "s").join(" · ") + "\n    👥 Odam bilan: " + pvp + "s\n5️⃣ <b>" + strikes + "</b> marta noto'g'ri so'z yozsangiz, yutqazasiz.\n6️⃣ Bot bilan o'yinda <b>" + hints + "</b> marta 💡 yordam olishingiz mumkin.\n\n🤖 <b>Bot qanday o'ynaydi?</b>\nBot faqat o'z darajasidagi so'zlarni biladi. U odamga o'xshab o'ylaydi, charchaydi va adashadi, shuning uchun uni yutish mumkin. Yuqori darajadagi bot esa sizga ataylab qiyin harflarni qoldiradi 😈\n\n⭐ <b>Reyting</b> (Elo) faqat odam bilan o'ynalgan o'yinlarda o'zgaradi.",
    levelPicker: (cur) => "<b>Ingliz tili darajangizni tanlang</b>\n\n" + LV.map((l, i) => (i === cur ? "✅" : "▫️") + " <b>" + l + "</b> — " + LEVEL_TITLES[i]).join("\n") + "\n\nBot sizning darajangizga moslashadi va raqib ham shu darajadan qidiriladi.",
    levelSet: (lv) => "✅ Darajangiz: <b>" + LV[lv] + "</b> — " + LEVEL_TITLES[lv],
    botDifficulty: (lv) => "🤖 <b>Bot bilan o'yin</b>\n\nSizning darajangiz: <b>" + LV[lv] + "</b>\nBot qanday darajada o'ynasin?",
    stats: (p, vocab) => {
      const unique = vocab.reduce((a, b) => a + b, 0);
      return "📊 <b>Statistika — " + esc(p.name) + "</b>\n" + DIVIDER + "\nDaraja: <b>" + LV[p.level] + "</b> · ⭐ Reyting: <b>" + p.rating + "</b>\n\n" +
        "🤖 Bot bilan: <b>" + p.botGames + "</b> o'yin · " + p.botWins + " g'alaba (" + pct(p.botWins, p.botGames) + ")\n" +
        "👥 Odam bilan: <b>0</b> o'yin · 0 g'alaba (—)\n" +
        "🔥 G'alaba seriyasi: <b>" + p.streak + "</b> (rekord: " + p.bestStreak + ")\n\n" +
        "📝 Yozilgan so'zlar: <b>" + p.wordsPlayed + "</b> · takrorlanmas: <b>" + unique + "</b>\n" +
        "📏 Eng uzun so'z: <b>" + (esc(p.longest || "") || "—") + "</b>\n\n📚 <b>Lug'atingiz darajalar bo'yicha:</b>\n" + LV.map((l, i) => l + " " + vocab[i]).join(" · ");
    },
    leaderboard: (p) => "🏆 <b>Reyting jadvali</b> (odam bilan o'yinlar)\n" + DIVIDER + "\nHali hech kim odam bilan o'ynamagan. Birinchi bo'ling! 💪" +
      (p.wordsPlayed ? "\n\n📝 <b>Eng ko'p so'z yozganlar</b>\n" + DIVIDER + "\n🥇 " + esc(p.name) + " — <b>" + p.wordsPlayed + "</b>" : "") +
      "\n\n👤 Siz: ⭐ <b>" + p.rating + "</b> · hali reytingda emassiz",
    QUEUE_WAITING: "🔎 <b>Raqib qidirilmoqda...</b>\n\nSizga mos darajadagi o'yinchi topilishi bilan o'yin boshlanadi.",
    QUEUE_OFFER: "😴 Hozircha bo'sh raqib yo'q.\n\nKutishda davom etishingiz yoki hozircha bot bilan o'ynab turishingiz mumkin.",
    QUEUE_LEFT: "❌ Qidiruv bekor qilindi.",
    BUSY: "🎮 Siz hozir o'yindasiz! Avval uni tugating yoki 🏳️ taslim bo'ling.",
    NOT_IN_GAME: "🤔 Hozir o'yinda emassiz. Menyudan o'yin turini tanlang 👇",
    botGameStarted: (name, lv, sec, strikes, hints) => "🎮 <b>O'yin boshlandi!</b>\n" + DIVIDER + "\n🤖 Raqib: <b>" + esc(name) + "</b> · " + LV[lv] + "\n⏱ Har yurishga: <b>" + Math.round(sec) + "s</b> · ❌ Xato chegarasi: " + strikes + "\n💡 Yordam: " + hints + " ta\n\n✍️ <b>Siz boshlaysiz</b> — istalgan inglizcha so'zni yozing!",
    yourTurn: (letter, sec) => "➡️ Sizga: <b>" + letter.toUpperCase() + "</b> harfi · ⏱ " + Math.round(sec) + "s",
    botMove: (name, w, lv, sec) => "🤖 <b>" + esc(name) + "</b>: " + wordTag(w, lv) + "\n" + T.yourTurn(w[w.length - 1], sec),
    botSays: (name, phrase) => "🤖 <b>" + esc(name) + "</b>: <i>" + esc(phrase) + "</i>",
    accepted: (w, lv) => "✅ " + wordTag(w, lv),
    notYourTurn: (name) => "⏳ Hozir <b>" + esc(name) + "</b> navbati, kuting.",
    timeWarning: (s) => "⏳ <b>" + s + " soniya</b> qoldi!",
    FORMAT_HINT: "⚠️ Faqat <b>bitta</b> inglizcha so'z yozing (lotin harflarida).",
    rejected: (reason, word, letter, strikes, max) => {
      const w = "<b>" + esc(word) + "</b>";
      const why = {
        too_short: "❌ " + w + " — juda qisqa so'z.",
        wrong_letter: "❌ " + w + " — so'z <b>" + (letter || "").toUpperCase() + "</b> harfi bilan boshlanishi kerak.",
        used: "❌ " + w + " — bu so'z bu o'yinda allaqachon ishlatilgan.",
        unknown: "❌ " + w + " — lug'atda bunday so'z topilmadi.",
      }[reason];
      return why + "\n⚠️ Xato: <b>" + strikes + "/" + max + "</b>" + (max - strikes === 1 ? " — ehtiyot bo'ling!" : "");
    },
    HINTS_OVER: "💡 Yordamlar tugadi.",
    HINT_NOT_FOUND: "💡 Afsus, bu harf uchun maslahat topilmadi.",
    HINT_WAIT: "💡 Yordamni o'z navbatingizda so'rashingiz mumkin.",
    hint: (word, left) => {
      const shown = word.length > 4 ? 2 : 1;
      const masked = [...word].map((c, i) => (i < shown || i === word.length - 1 ? c : "_")).join(" ");
      return "💡 Maslahat: <code>" + masked + "</code> (" + word.length + " harf)\nQolgan yordamlar: <b>" + left + "</b>";
    },
    RESIGN_CONFIRM: "🏳️ Rostdan ham taslim bo'lasizmi?",
    reason: (outcome, youLost, opp) => {
      const o = "<b>" + esc(opp) + "</b>";
      if (outcome === Outcome.TIMEOUT) return youLost ? "⏰ Vaqtingiz tugadi" : "⏰ " + o + " vaqtida javob bermadi";
      if (outcome === Outcome.STRIKES) return youLost ? "❌ Juda ko'p xato qildingiz" : "❌ " + o + " juda ko'p xato qildi";
      if (outcome === Outcome.RESIGN) return youLost ? "🏳️ Siz taslim bo'ldingiz" : "🏳️ " + o + " taslim bo'ldi";
      return "🤖 " + o + " so'z topa olmadi";
    },
    gameOver: ({ won, outcome, opponent, total, mine, theirs, longest, learn }) => {
      const out = [(won ? "🏆 <b>G'ALABA!</b>" : "😔 <b>Mag'lubiyat</b>") + "\n" + T.reason(outcome, !won, opponent) + "\n" + DIVIDER,
        "📝 Jami so'zlar: <b>" + total + "</b> (siz: " + mine + ", raqib: " + theirs + ")"];
      if (longest) out.push("📏 Eng uzun so'z: <b>" + esc(longest) + "</b>");
      if (learn.length) out.push("\n📚 <b>Raqib ishlatgan so'zlar</b> — yodlab oling:\n" + learn.map(([w, lv]) => "• <b>" + esc(w) + "</b>" + (lv != null ? " <i>(" + LV[lv] + ")</i>" : "")).join("\n"));
      return out.join("\n");
    },
    PLAY_AGAIN: "Yana o'ynaymizmi? 👇",
    REPORT_THANKS: "Rahmat! Admin ko'rib chiqadi ✅",
    REPORT_ALREADY_IN: "Bu so'z allaqachon lug'atda bor ✅",
  };

  // -------------------------------------------------------------- keyboards.py
  const BACK = { t: "⬅️ Orqaga", d: "menu" };
  const KB = {
    main: () => [[{ t: "🤖 Bot bilan o'ynash", d: "bot" }], [{ t: "👥 Tasodifiy raqib", d: "pvp" }, { t: "🔗 Do'st bilan", d: "friend" }], [{ t: "📊 Statistika", d: "stats" }, { t: "🏆 Reyting", d: "top" }], [{ t: "📶 Daraja", d: "level" }, { t: "📖 Qoidalar", d: "rules" }]],
    back: () => [[BACK]],
    levels: (cur) => { const b = LV.map((l, i) => ({ t: (i === cur ? "✅ " : "") + l, d: "lvl:" + i })); return [b.slice(0, 3), b.slice(3), [BACK]]; },
    botDifficulty: (lv) => {
      const rows = [[{ t: "🎯 Darajamda (" + LV[lv] + ")", d: "bot:0" }]], opt = [];
      if (lv > 0) opt.push({ t: "⬇️ Osonroq (" + LV[shifted(lv, -1)] + ")", d: "bot:-1" });
      if (lv < 5) opt.push({ t: "⬆️ Qiyinroq (" + LV[shifted(lv, 1)] + ")", d: "bot:1" });
      if (opt.length) rows.push(opt);
      rows.push([BACK]);
      return rows;
    },
    queueWaiting: () => [[{ t: "❌ Bekor qilish", d: "q:cancel" }]],
    queueOffer: () => [[{ t: "🤖 Bot bilan o'ynash", d: "q:bot" }], [{ t: "❌ Bekor qilish", d: "q:cancel" }]],
    gameControls: (withHint) => [[...(withHint ? [{ t: HINT_BTN }] : []), { t: RESIGN_BTN }]],
    resignConfirm: () => [[{ t: "🏳️ Ha, taslim", d: "resign:yes" }, { t: "▶️ Davom etish", d: "resign:no" }]],
    reportMissing: (w) => [[{ t: "📩 Bu so'z to'g'ri — xabar berish", d: "rep:missing:" + w }]],
    reportInvalid: (w) => [[{ t: "🚩 Bu so'z noto'g'ri", d: "rep:invalid:" + w }]],
    afterGame: (delta) => [[{ t: "🔄 Revansh", d: "bot:" + delta }], [{ t: "🏠 Menyu", d: "menu" }]],
  };

  // ------------------------------------------------------------------- config
  const SETTINGS = { pvpSeconds: 45, maxStrikes: 3, minLen: 3, maxHints: 2 };
  const WARN_BEFORE = 10, LEARN_WORDS = 12, BOT_SPEED = 0.6; // bot_speed is a GameManager option
  const QUEUE_OFFER_AFTER = 5; // 45 s in production; shortened because nobody else is in the demo queue

  // --------------------------------------------------------------- persistence
  const store = window.Site.store;
  const profile = Object.assign(
    { name: "Mehmon", level: 0, rating: 1000, botGames: 0, botWins: 0, streak: 0, bestStreak: 0, wordsPlayed: 0, longest: "", words: [] },
    (() => { try { return JSON.parse(store.get("wordchain.profile") || "{}"); } catch (e) { return {}; } })()
  );
  const save = () => store.set("wordchain.profile", JSON.stringify(profile));

  // --------------------------------------------------------------- the chat
  const chat = new TGChat(document.getElementById("chat"), {
    title: "Word Chain", sub: "bot", ava: "🔤", placeholder: "Xabar yozing...",
    onReset: () => { endSession(); profile.words = profile.words || []; chat.clear(); boot(true); },
  });
  let dict = null, session = null, queueTimer = null;
  const statusEl = document.getElementById("game-status");

  function show(msg, html, kb) { if (msg && msg.isConnected) chat.edit(msg, html, kb); else chat.bot(html, { kb }); }

  function vocab() {
    const v = [0, 0, 0, 0, 0, 0];
    for (const w of new Set(profile.words)) { const lv = dict.levelOf(w); if (lv != null) v[lv]++; }
    return v;
  }

  function renderStatus() {
    if (!statusEl) return;
    if (!session) { statusEl.innerHTML = bi("No game running. Press “🤖 Bot bilan o'ynash” in the chat.", "O'yin yo'q. Chatda “🤖 Bot bilan o'ynash” tugmasini bosing."); return; }
    const st = session.state, me = st.players[0], bot = st.players[1];
    const letter = st.requiredLetter;
    statusEl.innerHTML =
      "<div><b>" + esc(bot.name) + "</b> · " + LV[bot.level] + " " + bi("bot", "bot") + "</div>" +
      "<div>" + bi("Your mistakes", "Xatolaringiz") + ": <b>" + me.strikes + "/" + st.maxStrikes + "</b> · " + bi("Hints left", "Qolgan yordam") + ": <b>" + (SETTINGS.maxHints - session.hints) + "</b></div>" +
      "<div>" + bi("Words in chain", "Zanjirdagi so'zlar") + ": <b>" + st.history.length + "</b>" + (letter ? " · " + bi("Next letter", "Keyingi harf") + ": <b>" + letter.toUpperCase() + "</b>" : "") + "</div>";
  }

  // --------------------------------------------------------------- turn flow
  function endSession() {
    if (!session) return;
    session.finished = true;
    clearTimeout(session.timer); clearTimeout(session.warn); clearInterval(session.tick);
    session = null;
    chat.setSub("bot");
    renderStatus();
  }

  function startBotGame(delta) {
    if (session) { chat.toast(T.BUSY.replace(/<[^>]+>/g, "")); return false; }
    clearTimeout(queueTimer);
    const level = shifted(profile.level, delta);
    const brain = new BotBrain(dict, level, BOT_SPEED);
    const players = [
      { id: "me", name: profile.name, level: profile.level, isBot: false, strikes: 0, words: [] },
      { id: null, name: brain.name, level, isBot: true, strikes: 0, words: [] },
    ];
    session = { state: new GameState(players, dict, { minLength: SETTINGS.minLen, maxStrikes: SETTINGS.maxStrikes, first: 0 }), brain, delta, hints: 0, token: 0, finished: false, turnSeconds: BOT_TURN_SECONDS[profile.level] };
    chat.bot(T.botGameStarted(brain.name, level, session.turnSeconds, SETTINGS.maxStrikes, SETTINGS.maxHints), { reply: KB.gameControls(true), placeholder: "Inglizcha so'z yozing..." });
    beginTurn();
    return true;
  }

  function beginTurn() {
    const s = session;
    clearTimeout(s.timer); clearTimeout(s.warn); clearInterval(s.tick);
    s.token += 1;
    renderStatus();
    if (s.state.current.isBot) botTurn(s, s.token); else turnClock(s);
  }

  function turnClock(s) {
    const total = s.turnSeconds;
    let left = total;
    chat.setSub("⏱ " + left + "s");
    s.tick = setInterval(() => { left -= 1; if (left >= 0) chat.setSub("⏱ " + left + "s"); }, 1000);
    if (total > 2 * WARN_BEFORE) s.warn = setTimeout(() => { if (!s.finished) chat.bot(T.timeWarning(WARN_BEFORE)); }, (total - WARN_BEFORE) * 1000);
    s.timer = setTimeout(() => { if (!s.finished) finish(s, 0, Outcome.TIMEOUT); }, total * 1000);
  }

  async function botTurn(s, token) {
    chat.setSub("typing…");
    await chat.typing(s.brain.thinkTime() * 1000);
    if (s.finished || s.token !== token) return;
    const st = s.state, bot = st.current;
    const word = s.brain.choose(st.requiredLetter, st.used, bot.words.length);
    if (word == null || st.play(word) != null) {
      chat.bot(T.botSays(bot.name, s.brain.giveUpPhrase()));
      finish(s, 1, Outcome.STUCK);
      return;
    }
    chat.bot(T.botMove(bot.name, word, dict.levelOf(word), s.turnSeconds), { kb: KB.reportInvalid(word) });
    beginTurn();
  }

  function handleWord(text, msg) {
    const s = session, st = s.state;
    if (st.turn !== 0) { chat.bot(T.notYourTurn(st.players[1].name)); return; }
    const word = normalize(text);
    const reject = st.play(word);
    if (reject === Reject.FORMAT) { chat.bot(T.FORMAT_HINT); return; }
    const me = st.players[0], other = st.players[1];
    if (reject) {
      const out = st.addStrike();
      chat.bot(T.rejected(reject, word, st.requiredLetter, me.strikes, st.maxStrikes), { kb: reject === Reject.UNKNOWN ? KB.reportMissing(word) : undefined });
      renderStatus();
      if (out) finish(s, 0, Outcome.STRIKES);
      return;
    }
    chat.react(msg, word.length >= 8 ? "🔥" : "👍");
    if (word.length >= 8 && Math.random() < 0.35) chat.bot(T.botSays(other.name, choice(COMPLIMENTS)));
    beginTurn();
  }

  function hint() {
    const s = session, st = s.state;
    if (st.turn !== 0) { chat.bot(T.HINT_WAIT); return; }
    if (s.hints >= SETTINGS.maxHints) { chat.bot(T.HINTS_OVER); return; }
    const letter = st.requiredLetter || choice("bcdfmpst");
    let word = null;
    for (let lv = st.players[0].level; lv <= 5 && !word; lv++) {
      const options = dict.known(letter, lv).slice(0, 300).filter((w) => !st.used.has(w));
      if (options.length) word = choice(options.slice(0, 40));
    }
    if (!word) { chat.bot(T.HINT_NOT_FOUND); return; }
    s.hints += 1;
    chat.bot(T.hint(word, SETTINGS.maxHints - s.hints));
    renderStatus();
  }

  function finish(s, loser, outcome) {
    if (s.finished) return;
    const st = s.state, winner = 1 - loser;
    const me = st.players[0], o = st.players[1];
    endSession();
    const won = winner === 0;
    // persist like db.save_game does for the human player
    profile.botGames += 1;
    if (won) { profile.botWins += 1; profile.streak += 1; profile.bestStreak = Math.max(profile.bestStreak, profile.streak); } else profile.streak = 0;
    profile.wordsPlayed += me.words.length;
    for (const w of me.words) { if (w.length > (profile.longest || "").length) profile.longest = w; profile.words.push(w); }
    profile.words = [...new Set(profile.words)].slice(-3000);
    save();
    const rareFirst = [...new Set(o.words)].sort((a, b) => (dict.rank(b) || 0) - (dict.rank(a) || 0)).slice(0, LEARN_WORDS);
    chat.bot(T.gameOver({ won, outcome, opponent: o.name, total: st.history.length, mine: me.words.length, theirs: o.words.length, longest: st.longestWord(), learn: rareFirst.map((w) => [w, dict.levelOf(w)]) }), { reply: null });
    if (!won) chat.bot(T.botSays(o.name, choice(WIN_PHRASES)));
    chat.bot(T.PLAY_AGAIN, { kb: KB.afterGame(s.delta) });
    renderStatus();
    document.dispatchEvent(new CustomEvent("wordchain:over", { detail: { won, outcome, words: st.history.length } }));
  }

  // --------------------------------------------------------------- handlers
  chat.on("text", (text, msg) => {
    if (!dict) return;
    if (text === "/start" || text === "/menu") { chat.bot(T.welcome(profile), { kb: KB.main() }); return; }
    if (text === "/rules" || text === "/help") { chat.bot(T.rules(SETTINGS.pvpSeconds, SETTINGS.maxStrikes, SETTINGS.maxHints, SETTINGS.minLen), { kb: KB.back() }); return; }
    if (text === "/play") { chat.bot(T.botDifficulty(profile.level), { kb: KB.botDifficulty(profile.level) }); return; }
    if (text === HINT_BTN) { if (session) hint(); else chat.bot(T.NOT_IN_GAME, { kb: KB.main() }); return; }
    if (text === RESIGN_BTN || text === "/giveup") { if (session) chat.bot(T.RESIGN_CONFIRM, { kb: KB.resignConfirm() }); else chat.bot(T.NOT_IN_GAME, { reply: null }); return; }
    if (session) { handleWord(text, msg); return; }
    chat.bot(T.NOT_IN_GAME, { kb: KB.main() });
  });

  chat.on("cb", (data, msg) => {
    if (!dict) return;
    if (data === "menu") return show(msg, T.welcome(profile), KB.main());
    if (data === "rules") return show(msg, T.rules(SETTINGS.pvpSeconds, SETTINGS.maxStrikes, SETTINGS.maxHints, SETTINGS.minLen), KB.back());
    if (data === "level") return show(msg, T.levelPicker(profile.level), KB.levels(profile.level));
    if (data.startsWith("lvl:")) { profile.level = +data.split(":")[1]; save(); return show(msg, T.levelPicker(profile.level) + "\n\n" + T.levelSet(profile.level), KB.levels(profile.level)); }
    if (data === "stats") return show(msg, T.stats(profile, vocab()), KB.back());
    if (data === "top") return show(msg, T.leaderboard(profile), KB.back());
    if (data === "bot") return show(msg, T.botDifficulty(profile.level), KB.botDifficulty(profile.level));
    if (data.startsWith("bot:")) {
      const delta = Math.max(-1, Math.min(1, parseInt(data.split(":")[1], 10)));
      if (startBotGame(delta)) chat.setKb(msg, null);
      return;
    }
    if (data === "pvp") {
      if (session) return chat.toast(T.BUSY.replace(/<[^>]+>/g, ""));
      show(msg, T.QUEUE_WAITING, KB.queueWaiting());
      clearTimeout(queueTimer);
      queueTimer = setTimeout(() => chat.bot(T.QUEUE_OFFER, { kb: KB.queueOffer() }), QUEUE_OFFER_AFTER * 1000);
      return;
    }
    if (data === "q:cancel") { clearTimeout(queueTimer); return show(msg, T.QUEUE_LEFT + "\n\n" + T.welcome(profile), KB.main()); }
    if (data === "q:bot") { clearTimeout(queueTimer); if (startBotGame(0)) chat.setKb(msg, null); return; }
    if (data === "friend") { chat.toast(window.Site.lang() === "uz" ? "Do'st bilan o'yin faqat haqiqiy Telegram botida ishlaydi" : "Playing with a friend needs the real Telegram bot", 2600); return; }
    if (data === "resign:yes") { msg.remove(); if (session) finish(session, 0, Outcome.RESIGN); return; }
    if (data === "resign:no") { chat.toast("▶️ Davom etamiz!"); msg.remove(); return; }
    if (data.startsWith("rep:")) {
      const [, kind, word] = data.split(":");
      chat.toast(kind === "missing" && dict.has(word) ? T.REPORT_ALREADY_IN : T.REPORT_THANKS);
      return;
    }
  });

  // --------------------------------------------------------------- boot
  async function boot(again) {
    chat.me("/start");
    if (!dict) {
      chat.setSub("loading dictionary…");
      try {
        const txt = await (await fetch("words.txt")).text();
        dict = new Dictionary(txt.split(/\s+/).filter(Boolean));
      } catch (e) {
        chat.note(bi("Could not load the word list. Reload the page.", "So'zlar ro'yxati yuklanmadi. Sahifani yangilang."));
        return;
      }
      chat.setSub("bot");
      const c = document.getElementById("dict-size");
      if (c) c.textContent = dict.size.toLocaleString("en-US");
    }
    await chat.typing(again ? 300 : 600);
    chat.bot(T.welcome(profile), { kb: KB.main() });
    renderStatus();
  }

  document.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => chat.sendText(b.dataset.say)));
  window.WordChain = { get session() { return session; }, get dict() { return dict; }, normalize, Dictionary, GameState, BotBrain };
  boot(false);
})();
