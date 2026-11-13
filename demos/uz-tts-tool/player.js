/* Waveform audio players for the uz-tts-tool samples. Peaks are decoded in the browser with Web Audio. */
(function () {
  "use strict";
  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
  const fmt = (s) => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00");
  const players = [];
  let ctx = null;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function setup(el) {
    const src = el.dataset.src, bars = +(el.dataset.bars || 120);
    el.innerHTML = '<button type="button" class="pl-btn" aria-label="Play">' + PLAY + '</button><div class="pl-wave"><canvas></canvas></div><span class="pl-time">0:00</span>';
    const btn = el.querySelector(".pl-btn"), canvas = el.querySelector("canvas"), time = el.querySelector(".pl-time"), wave = el.querySelector(".pl-wave");
    const audio = new Audio(); audio.preload = "metadata"; audio.src = src;
    let peaks = null;
    const p = { el, audio };
    players.push(p);
    function draw() {
      const w = wave.clientWidth, h = wave.clientHeight, dpr = window.devicePixelRatio || 1;
      if (!w) return;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      const g = canvas.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
      const n = Math.max(20, Math.min(bars, Math.floor(w / 4))), bw = w / n;
      const prog = audio.duration ? audio.currentTime / audio.duration : 0;
      const on = css("--accent"), off = css("--line");
      for (let i = 0; i < n; i++) {
        const v = peaks ? peaks[Math.floor((i / n) * peaks.length)] : 0.18 + 0.12 * Math.sin(i * 0.7) ** 2;
        const bh = Math.max(3, v * (h - 6));
        g.fillStyle = i / n < prog ? on : off;
        const x = i * bw + bw * 0.18, y = (h - bh) / 2, r = Math.min(2, (bw * 0.64) / 2);
        g.beginPath(); g.roundRect ? g.roundRect(x, y, bw * 0.64, bh, r) : g.rect(x, y, bw * 0.64, bh); g.fill();
      }
      time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
    }
    p.draw = draw;
    async function loadPeaks() {
      if (peaks || p.loading) return;
      p.loading = true;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const buf = await ctx.decodeAudioData(await (await fetch(src)).arrayBuffer());
        const data = buf.getChannelData(0), N = 400, step = Math.floor(data.length / N), out = [];
        for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j])); out.push(m); }
        const max = Math.max(...out) || 1;
        peaks = out.map((v) => Math.pow(v / max, 0.8));
      } catch (e) { peaks = null; }
      draw();
    }
    p.loadPeaks = loadPeaks;
    btn.addEventListener("click", () => {
      if (audio.paused) { players.forEach((o) => o !== p && o.audio.pause()); audio.play(); } else audio.pause();
    });
    audio.addEventListener("play", () => { btn.innerHTML = PAUSE; btn.setAttribute("aria-label", "Pause"); el.classList.add("playing"); loadPeaks(); tick(); });
    audio.addEventListener("pause", () => { btn.innerHTML = PLAY; btn.setAttribute("aria-label", "Play"); el.classList.remove("playing"); draw(); });
    audio.addEventListener("ended", () => { audio.currentTime = 0; draw(); });
    audio.addEventListener("loadedmetadata", draw);
    audio.addEventListener("timeupdate", () => el.dispatchEvent(new CustomEvent("time", { detail: audio.currentTime })));
    wave.addEventListener("click", (e) => {
      if (!audio.duration) return;
      const r = wave.getBoundingClientRect();
      audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
      draw();
    });
    function tick() { draw(); if (!audio.paused) requestAnimationFrame(tick); }
    draw();
  }

  document.querySelectorAll(".player[data-src]").forEach(setup);
  // decode waveforms once a player scrolls into view
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { const p = players.find((x) => x.el === en.target); if (p && p.el.dataset.wave !== "lazy") p.loadPeaks(); io.unobserve(en.target); }
  }), { rootMargin: "200px" });
  players.forEach((p) => io.observe(p.el));
  window.addEventListener("resize", () => players.forEach((p) => p.draw()));
  if (window.Site) window.Site.onLang(() => players.forEach((p) => p.draw()));
  new MutationObserver(() => players.forEach((p) => p.draw())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // follow-along text for samples with a timestamp file (toshkent_vaqtlar.txt)
  document.querySelectorAll(".player[data-times]").forEach((el) => {
    const times = el.dataset.times.split(",").map(Number);
    const paras = [...document.querySelectorAll(el.dataset.target + " p")];
    el.addEventListener("time", (e) => {
      let k = 0; times.forEach((t, i) => { if (e.detail >= t) k = i; });
      paras.forEach((p, i) => p.classList.toggle("now", i === k && e.detail > 0));
    });
  });
  window.TTSPlayers = players;
})();
