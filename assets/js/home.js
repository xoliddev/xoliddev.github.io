/* Home hero: a Telegram window that replays real replies from three of the bots. */
(function () {
  "use strict";
  const root = document.getElementById("hero-chat");
  if (!root || !window.TGChat) return;
  const chat = new TGChat(root, { title: "Oila Hamyon", sub: "bot", ava: "👛" });
  root.classList.add("hero-chat");
  const titleEl = root.querySelector(".tg-title b"), avaEl = root.querySelector(".tg-ava");
  const tabs = [...document.querySelectorAll("[data-scene]")];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const scenes = [
    { title: "Oila Hamyon", ava: "👛", run: async () => {
      chat.me("nonga 15 ming, taksi 18 ming");
      await chat.say("✅ <b>Yozildi</b>\n\n🛒 Non — <b>15 000 so'm</b>\n🚕 Taksi — <b>18 000 so'm</b>\n──────────────────\nJami chiqim: <b>33 000 so'm</b> · <i>Naqd</i>\n\n📅 Bugun: 33 000 so'm · Noyabr: 1 240 500 so'm", { delay: 1400, kb: [[{ t: "↩️ Bekor qilish", d: "x" }, { t: "✏️ Tuzatish", d: "x" }]] });
      await sleep(1600);
      chat.me("bu oy ovqatga qancha ketdi?");
      await chat.say("🧮 1–13-noyabr: 🛒 <b>Oziq-ovqat</b> uchun <b>612 000 so'm</b> ketdi (23 ta yozuv, jami chiqimning 49,3%).", { delay: 1500 });
    } },
    { title: "Smena · Demo Cafe", ava: "🧑‍🍳", run: async () => {
      chat.bot("📍 <b>Ishga kelganingizni tasdiqlash uchun</b> pastdagi tugmani bosing va joylashuvingizni (GPS) yuboring:");
      await sleep(1300);
      chat.location("<small>41.31120, 69.24074</small>");
      await chat.say("✅ <b>Xush kelibsiz! Ishga kelganingiz qayd etildi.</b>\n\n⏰ Vaqt: <b>08:57</b>\n📍 Masofa: <b>36 metr</b>\n\nBugungi ish kuningizga omad tilaymiz! 👨‍🍳", { delay: 1400 });
    } },
    { title: "Word Chain", ava: "🔤", run: async () => {
      chat.bot("🤖 <b>Emma</b>: <b>Garden</b> <i>(A1)</i>\n➡️ Sizga: <b>N</b> harfi · ⏱ 60s");
      await sleep(1400);
      const m = chat.me("nature");
      await sleep(500); chat.react(m, "👍");
      await chat.say("🤖 <b>Emma</b>: <b>Energy</b> <i>(A2)</i>\n➡️ Sizga: <b>Y</b> harfi · ⏱ 60s", { delay: 1700 });
      await sleep(1200);
      const m2 = chat.me("yesterday");
      await sleep(500); chat.react(m2, "🔥");
      await chat.say("🤖 <b>Emma</b>: <i>Wow, fancy one 😮</i>", { delay: 900 });
    } },
  ];
  let idx = 0, token = 0;
  async function show(i) {
    const my = ++token;
    idx = i;
    const s = scenes[i];
    chat.clear();
    titleEl.textContent = s.title; avaEl.textContent = s.ava;
    tabs.forEach((t, k) => t.setAttribute("aria-current", k === i ? "true" : "false"));
    await s.run();
    if (my !== token || window.Site.reducedMotion()) return;
    await sleep(3200);
    if (my === token) show((idx + 1) % scenes.length);
  }
  tabs.forEach((t, k) => t.addEventListener("click", () => show(k)));
  if (window.Site.reducedMotion()) chat.speed = 50;
  show(0);
})();
