/* QR Code Generator bot simulator: bot.py texts and keyboard, the real landing template (page.html)
   and a real QR code drawn like bot.generate_qr_code (error correction H, box 12, border 3, rounded, navy). */
(function () {
  "use strict";
  const { bi } = window.Site;
  const esc = window.tgEsc;
  const SAMPLE_VOICE = "🎤 Ovozli xabar yuborish (namuna)";
  const SAMPLE_PHOTO = "🖼 Surat yuborish (namuna)";
  const AUDIO_SRC = "../uz-tts-tool/audio/toshkent.mp3", PHOTO_SRC = "sample-photo.svg";
  const DIV = "─────────────────────";
  let page, waiting;

  const status = () => "📋 <b>Sahifangiz holati:</b>\n\n🎵 Audio: " + (page.audio ? "✅" : "❌") + "\n📸 Surat: " + (page.image ? "✅" : "❌") + "\n📝 Matn: " + (page.text ? "✅" : "❌");
  const mainKb = () => [[{ t: "🎵 Audio qo'shish", d: "add_audio" }, { t: "📸 Surat qo'shish", d: "add_image" }], [{ t: "📝 Matn qo'shish", d: "add_text" }], [{ t: "🔳 QR kod olish", d: "get_qr" }, { t: "👁 Sahifani ko'rish", d: "view_page" }], [{ t: "🗑 Hammasini o'chirish", d: "delete_all" }]];
  function pageUrl() {
    const u = new URL("page.html", location.href);
    u.searchParams.set("demo", "1");
    if (page.text) u.searchParams.set("t", page.text.slice(0, 280));
    if (page.image) u.searchParams.set("img", "1");
    if (page.audio) u.searchParams.set("audio", "1");
    return u.toString();
  }
  const hasContent = () => !!(page.audio || page.image || page.text);

  // -------------------------------------------------- QR image, styled like generate_qr_code()
  function qrPng(data) {
    const qr = window.qrcode(0, "H");
    qr.addData(data, "Byte");
    qr.make();
    const n = qr.getModuleCount(), box = 12, border = 3, size = (n + border * 2) * box;
    const pad = 40, capH = 50;
    const c = document.createElement("canvas");
    c.width = size + pad * 2; c.height = size + pad + capH + pad;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "rgb(30,58,138)";
    const ox = pad, oy = pad / 2, r = box / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!qr.isDark(y, x)) continue;
      const px = ox + (x + border) * box, py = oy + (y + border) * box;
      // RoundedModuleDrawer: corners round off where the module has no dark neighbour
      const up = y > 0 && qr.isDark(y - 1, x), dn = y < n - 1 && qr.isDark(y + 1, x), lf = x > 0 && qr.isDark(y, x - 1), rt = x < n - 1 && qr.isDark(y, x + 1);
      const tl = up || lf ? 0 : r, tr = up || rt ? 0 : r, br = dn || rt ? 0 : r, bl = dn || lf ? 0 : r;
      g.beginPath();
      g.moveTo(px + tl, py); g.lineTo(px + box - tr, py); g.arcTo(px + box, py, px + box, py + tr, tr);
      g.lineTo(px + box, py + box - br); g.arcTo(px + box, py + box, px + box - br, py + box, br);
      g.lineTo(px + bl, py + box); g.arcTo(px, py + box, px, py + box - bl, bl);
      g.lineTo(px, py + tl); g.arcTo(px, py, px + tl, py, tl);
      g.fill();
    }
    g.fillStyle = "rgb(100,116,139)"; g.font = "18px Arial, sans-serif"; g.textAlign = "center";
    g.fillText("📱 QR Code Generator Bot", c.width / 2, size + pad + 18);
    return c.toDataURL("image/png");
  }

  // -------------------------------------------------- chat
  const chat = new TGChat(document.getElementById("chat"), { title: "QR Code Generator", sub: "bot", ava: "🔳", placeholder: "Xabar yozing...", onReset: () => { chat.clear(); boot(); } });
  const welcome = () => "👋 <b>Assalomu alaykum!</b>\n\n🔳 Men <b>QR Code Generator</b> botman.\n\n📱 Menga <b>audio, surat yoki matn</b> yuboring —\nmen chiroyli sahifa yarataman va QR kod beraman!\n\nQR kodni skanerlagan odam sizning sahifangizni\nko'radi — ovozingizni eshitadi! 🎧\n\n" + DIV + "\n\n" + status() + "\n\n" + DIV + "\n⬇️ Quyidagi tugmalardan birini tanlang:";
  const saved = (what) => "✅ <b>" + what + " saqlandi!</b>\n\n" + status() + "\n\nBosh menyu: /start";

  function boot() {
    page = { audio: false, image: false, text: "" }; waiting = null;
    chat.me("/start");
    chat.say(welcome(), { kb: mainKb(), delay: 600 });
    refreshPreview();
  }

  chat.on("cb", async (d) => {
    if (d === "add_audio") { waiting = "audio"; return chat.say("🎵 <b>Audio yuboring!</b>\n\nOvozli xabar yoki audio fayl yuboring.\nBekor qilish: /start", { reply: [[{ t: SAMPLE_VOICE }]], oneTime: true, delay: 300 }); }
    if (d === "add_image") { waiting = "image"; return chat.say("📸 <b>Surat yuboring!</b>\n\nRasm yuboring (faylsiz, surat sifatida).\nBekor qilish: /start", { reply: [[{ t: SAMPLE_PHOTO }]], oneTime: true, delay: 300 }); }
    if (d === "add_text") { waiting = "text"; chat.reply(null); return chat.say("📝 <b>Matn yozing!</b>\n\nSahifada ko'rsatiladigan matnni yozing.\nBekor qilish: /start", { delay: 300 }); }
    if (d === "get_qr") {
      if (!hasContent()) return chat.say("⚠️ <b>Sahifangiz bo'sh!</b>\n\nAvval audio, surat yoki matn qo'shing.", { delay: 300 });
      const tmp = await chat.say("⏳ QR kod yaratilmoqda...", { delay: 200 });
      await window.tgSleep(600);
      tmp.remove();
      const url = pageUrl();
      chat.photo(qrPng(url), "✅ <b>QR kodingiz tayyor!</b>\n\n🔗 <b>Sahifa:</b>\n<code>" + esc(url) + "</code>\n\n" + status() + "\n\n📷 QR kodni skanerlang — sahifangiz ochiladi!", { alt: "QR code" });
      refreshPreview(true);
      return;
    }
    if (d === "view_page") {
      const url = pageUrl();
      refreshPreview(true);
      return chat.say("👁 <b>Sahifangiz:</b>\n\n🔗 <a href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(url) + "</a>\n\nLinkni bosing yoki brauzerga nusxalang!", { delay: 300 });
    }
    if (d === "delete_all") { page = { audio: false, image: false, text: "" }; refreshPreview(); return chat.say("🗑 <b>Sahifangiz tozalandi!</b>\n\nYangi kontent qo'shish uchun /start bosing.", { delay: 300 }); }
  });

  chat.on("text", async (text, msg) => {
    if (text === "/start") { waiting = null; chat.reply(null); return chat.say(welcome(), { kb: mainKb(), delay: 400 }); }
    if (text === "/help") return chat.say("📖 <b>Yordam</b>\n\n🎵 <b>Audio qo'shish</b> — ovozli xabar yoki audio fayl yuboring\n📸 <b>Surat qo'shish</b> — rasm yuboring\n📝 <b>Matn qo'shish</b> — matn yozing\n🔳 <b>QR kod</b> — sahifangiz uchun QR kod olasiz\n👁 <b>Ko'rish</b> — sahifangizni brauzerda ko'ring\n🗑 <b>O'chirish</b> — hammasini tozalash\n\n" + DIV + "\n/start — Bosh menyu\n/help — Yordam\n/myqr — QR kodingizni olish");
    if (text === SAMPLE_VOICE && waiting === "audio") {
      msg.querySelector(".tg-bubble").innerHTML = '<audio controls preload="none" src="' + AUDIO_SRC + '" style="width:240px;max-width:100%"></audio>';
      page.audio = true; waiting = null; refreshPreview();
      return chat.say(saved("Audio"), { kb: mainKb(), delay: 700 });
    }
    if (text === SAMPLE_PHOTO && waiting === "image") {
      msg.remove();
      chat.photo(PHOTO_SRC, "", {}, "me");
      page.image = true; waiting = null; refreshPreview();
      return chat.say(saved("Surat"), { kb: mainKb(), delay: 700 });
    }
    if (waiting === "text") { page.text = text; waiting = null; refreshPreview(); return chat.say(saved("Matn"), { kb: mainKb(), delay: 500 }); }
    if (waiting === "audio" || waiting === "image") return chat.say(waiting === "audio" ? "🎵 Iltimos, ovozli xabar yoki audio fayl yuboring." : "📸 Iltimos, rasm yuboring.");
    const urls = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g);
    if (!urls) return chat.say("💡 <b>Nima qilmoqchisiz?</b>\n\nBosh menyu uchun /start bosing.\nYoki istalgan link yuboring — QR kod yarataman!");
    for (const u of urls) {
      const tmp = await chat.say("⏳ QR kod yaratilmoqda...", { delay: 200 });
      await window.tgSleep(500); tmp.remove();
      chat.photo(qrPng(u), "✅ <b>QR kod tayyor!</b>\n\n🔗 <code>" + esc(u) + "</code>\n\n📷 Skanerlang — link ochiladi!", { alt: "QR code" });
    }
  });

  // -------------------------------------------------- landing page preview (the real template)
  function refreshPreview(scroll) {
    const f = document.getElementById("landing");
    if (!f) return;
    const url = hasContent() ? pageUrl() : new URL("page.html?demo=1", location.href).toString();
    if (f.dataset.src !== url) { f.dataset.src = url; f.src = url; }
    const big = document.getElementById("qr-big");
    if (big) big.innerHTML = hasContent() ? '<img src="' + qrPng(url) + '" alt="QR code for your page">' : "<p class='muted'>" + bi("Add audio, a photo or text in the chat to get a QR code for your page.", "Sahifangiz QR kodini olish uchun chatda audio, surat yoki matn qo'shing.") + "</p>";
    if (scroll && window.matchMedia("(max-width: 979px)").matches) f.scrollIntoView({ behavior: window.Site.reducedMotion() ? "auto" : "smooth", block: "center" });
  }
  window.QRDemo = { qrPng, get page() { return page; } };
  boot();
})();
