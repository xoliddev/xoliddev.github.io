/* Animated, clearly labelled example of Claude calling the two MCP tools. Data is made up. */
(function () {
  "use strict";
  const { bi, esc } = window.Site;
  const el = document.getElementById("convo");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const URL = "https://www.youtube.com/playlist?list=PL_EXAMPLE_PLAYLIST";
  const ids = ["EXAMPLE_ID1", "EXAMPLE_ID2", "EXAMPLE_ID3"];
  const listResult = "Playlist: Python asoslari (example)\nVideos: 3\n\n" +
    ids.map((id, i) => (i + 1) + ". ID: " + id + " | Title: " + ["1-dars: o'zgaruvchilar", "2-dars: shartlar va sikllar", "3-dars: funksiyalar"][i] + " | URL: https://www.youtube.com/watch?v=" + id).join("\n");
  const trResult = ids.map((id, i) => "=== VIDEO ID: " + id + " ===\n" + [
    "Assalomu alaykum. Bugun o'zgaruvchilar bilan tanishamiz: o'zgaruvchi bu qiymatga berilgan nom...",
    "Endi if, elif va else operatorlarini ko'ramiz, keyin for va while sikllariga o'tamiz...",
    "[Transcript unavailable: No transcripts were found for any of the requested language codes]",
  ][i]).join("\n\n");
  const script = [
    ["user", bi("Here's a Python course playlist: " + URL + " — what does each lesson cover, and which one should I watch first?", "Mana Python kursi pleylisti: " + URL + " — har bir dars nimani o'rgatadi va qaysi biridan boshlay?")],
    ["ai", bi("I'll look at the playlist first.", "Avval pleylistni ko'rib chiqaman.")],
    ["call", "get_playlist_videos", '{ "playlist_url": "' + URL + '" }', listResult],
    ["ai", bi("Three lessons. Let me read their transcripts in one call.", "Uchta dars. Transkriptlarini bitta chaqiruvda o'qiyman.")],
    ["call", "get_multiple_transcripts", '{ "video_ids": ["' + ids.join('", "') + '"], "languages": ["uz", "en"] }', trResult],
    ["ai", bi("<b>Lesson 1</b> introduces variables: naming a value and changing it. <b>Lesson 2</b> covers <code>if/elif/else</code>, then <code>for</code> and <code>while</code> loops. <b>Lesson 3</b> has no captions, so I can only go by its title: functions.<br><br>Start with lesson 1: lessons 2 and 3 both use variables from the first minute.",
      "<b>1-dars</b> o'zgaruvchilar haqida: qiymatga nom berish va uni o'zgartirish. <b>2-dars</b> <code>if/elif/else</code>, so'ng <code>for</code> va <code>while</code> sikllari. <b>3-darsda</b> subtitr yo'q, shuning uchun faqat sarlavhasiga tayanaman: funksiyalar.<br><br>1-darsdan boshlang: 2 va 3-darslar birinchi daqiqadanoq o'zgaruvchilardan foydalanadi.")],
  ];
  let run = 0;
  async function play() {
    const me = ++run, fast = window.Site.reducedMotion();
    el.innerHTML = "";
    for (const step of script) {
      if (me !== run) return;
      const div = document.createElement("div");
      if (step[0] === "user") {
        div.className = "turn user";
        div.innerHTML = '<span class="who">' + bi("You", "Siz") + '</span><div class="msg">' + step[1] + "</div>";
        el.appendChild(div);
        await sleep(fast ? 0 : 1200);
      } else if (step[0] === "ai") {
        div.className = "turn ai";
        div.innerHTML = '<span class="who">Claude</span><div class="msg"><span class="dots"><i></i><i></i><i></i></span></div>';
        el.appendChild(div);
        await sleep(fast ? 0 : 1100);
        div.querySelector(".msg").innerHTML = step[1];
        await sleep(fast ? 0 : 900);
      } else {
        const [, fn, args, result] = step;
        div.className = "turn ai";
        div.innerHTML = '<details class="call" open><summary><span>🔧</span><span class="fn">' + fn + '</span><span class="state">' + bi("calling…", "chaqirilmoqda…") + "</span></summary><pre><b>" + esc(args) + "</b></pre></details>";
        el.appendChild(div);
        await sleep(fast ? 0 : 1500);
        if (me !== run) return;
        div.querySelector(".state").innerHTML = bi("result", "natija");
        div.querySelector("pre").insertAdjacentHTML("beforeend", "\n\n" + esc(result));
        await sleep(fast ? 0 : 1800);
        div.querySelector("details").open = false;
      }
    }
  }
  document.getElementById("replay").addEventListener("click", play);
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.2 });
  io.observe(el);
})();
