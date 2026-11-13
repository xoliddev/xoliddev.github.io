/* Minimal Telegram chat UI for the bot simulators.
   Bot texts are HTML (Telegram "HTML" parse mode); user text is always escaped. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const SEND = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.2 1l1.9 6.5 9 .9-9 .9-1.9 6.5c-.2.7.5 1.3 1.2 1z"/></svg>';
  const KB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10" stroke-linecap="round"/></svg>';
  const RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';

  function now() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  class TGChat {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      this.speed = opts.speed || 1;
      this.handlers = { text: null, cb: null, location: null, contact: null };
      root.classList.add("tg");
      root.innerHTML =
        '<div class="tg-head"><div class="tg-ava" aria-hidden="true"></div><div class="tg-title"><b></b><small></small></div>' +
        '<button type="button" class="tg-reset" title="Restart" aria-label="Restart demo">' + RESET + "</button></div>" +
        '<div class="tg-log" role="log" aria-live="polite"></div>' +
        '<div class="tg-toast" role="status"></div>' +
        '<div class="tg-bottom"><div class="tg-rkb" hidden></div>' +
        '<form class="tg-form" autocomplete="off"><button type="button" class="tg-kbtoggle" aria-label="Show keyboard" hidden>' + KB + "</button>" +
        '<input type="text" maxlength="300" aria-label="Message">' +
        '<button type="submit" class="tg-send" aria-label="Send">' + SEND + "</button></form></div>";
      this.log = root.querySelector(".tg-log");
      this.rkb = root.querySelector(".tg-rkb");
      this.input = root.querySelector("input");
      this.toastEl = root.querySelector(".tg-toast");
      this.kbToggle = root.querySelector(".tg-kbtoggle");
      root.querySelector(".tg-ava").textContent = opts.ava || "🤖";
      root.querySelector(".tg-title b").textContent = opts.title || "Bot";
      this.subEl = root.querySelector(".tg-title small");
      this.setSub(opts.sub || "bot");
      this.basePlaceholder = opts.placeholder || "Message";
      this.input.placeholder = this.basePlaceholder;

      root.querySelector(".tg-reset").addEventListener("click", () => opts.onReset && opts.onReset());
      root.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const text = this.input.value.trim();
        if (!text) return;
        this.input.value = "";
        this.sendText(text);
      });
      this.kbToggle.addEventListener("click", () => { this.rkb.hidden = !this.rkb.hidden; });
      this.rkb.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const spec = this.rkbSpec[+b.dataset.r][+b.dataset.c];
        if (spec.loc) { this.handlers.location && this.handlers.location(spec); return; }
        if (spec.contact) { this.handlers.contact && this.handlers.contact(spec); return; }
        if (this.oneTime) this.reply(null);
        this.sendText(spec.t);
      });
      this.log.addEventListener("click", (e) => {
        const b = e.target.closest(".tg-ikb button");
        if (!b || b.disabled) return;
        const msg = b.closest(".tg-msg");
        this.handlers.cb && this.handlers.cb(b.dataset.d, msg, b);
      });
    }

    on(type, fn) { this.handlers[type] = fn; return this; }
    setSub(text) { this.subEl.textContent = text; }
    scroll() { requestAnimationFrame(() => { this.log.scrollTop = this.log.scrollHeight; }); }

    sendText(text) {
      const m = this.me(esc(text));
      this.handlers.text && this.handlers.text(text, m);
      return m;
    }

    _ikb(kb) {
      if (!kb || !kb.length) return "";
      return '<div class="tg-ikb">' + kb.map((row) =>
        '<div class="tg-ikb-row">' + row.map((b) => b.url
          ? '<a href="' + esc(b.url) + '" target="_blank" rel="noopener">' + esc(b.t) + "</a>"
          : '<button type="button" data-d="' + esc(b.d || "") + '">' + esc(b.t) + "</button>").join("") + "</div>").join("") + "</div>";
    }

    _append(cls, inner, kb) {
      const el = document.createElement("div");
      el.className = "tg-msg " + cls;
      el.innerHTML = '<div class="tg-bubble">' + inner + '<span class="tg-time">' + now() + "</span></div>" + this._ikb(kb);
      this.log.appendChild(el);
      this.scroll();
      return el;
    }

    bot(html, opts = {}) {
      const el = this._append("bot", html, opts.kb);
      if (opts.reply !== undefined) this.reply(opts.reply, opts.placeholder, opts.oneTime);
      return el;
    }

    async say(html, opts = {}) {
      await this.typing(opts.delay == null ? 450 + Math.min(900, html.length * 2) : opts.delay);
      return this.bot(html, opts);
    }

    me(html) { return this._append("me", html); }

    note(html) {
      const el = document.createElement("div");
      el.className = "tg-note";
      el.innerHTML = html;
      this.log.appendChild(el);
      this.scroll();
      return el;
    }

    async typing(ms, label) {
      if (!ms) return;
      const el = document.createElement("div");
      el.className = "tg-msg bot tg-typing";
      el.innerHTML = '<div class="tg-bubble"><span class="tg-dots"><i></i><i></i><i></i></span></div>';
      this.log.appendChild(el);
      const prev = this.subEl.textContent;
      this.setSub(label || "typing…");
      this.scroll();
      await sleep(ms / this.speed);
      el.remove();
      if (this.subEl.textContent === (label || "typing…")) this.setSub(prev);
    }

    photo(src, captionHtml, opts = {}, who = "bot") {
      const inner = '<img class="tg-media" src="' + esc(src) + '" alt="' + esc(opts.alt || "") + '" loading="lazy">' + (captionHtml || "");
      const el = this._append(who, inner, opts.kb);
      el.querySelector("img").addEventListener("load", () => this.scroll());
      return el;
    }

    doc(name, size, captionHtml, opts = {}) {
      const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
      const inner = '<div class="tg-doc"><span class="tg-doc-ico">' + esc(ext) + "</span><div><b>" + esc(name) + "</b><small>" + esc(size) + "</small></div></div>" + (captionHtml ? "\n" + captionHtml : "");
      return this._append("bot", inner, opts.kb);
    }

    location(label, who = "me") {
      return this._append(who, '<div class="tg-loc" role="img" aria-label="Map"></div>' + (label || ""));
    }

    edit(msg, html, kb) {
      const bubble = msg.querySelector(".tg-bubble");
      bubble.innerHTML = html + '<span class="tg-time">' + now() + "</span>";
      if (kb !== undefined) this.setKb(msg, kb);
      bubble.classList.remove("flash"); void bubble.offsetWidth; bubble.classList.add("flash");
      return msg;
    }

    setKb(msg, kb) {
      const old = msg.querySelector(".tg-ikb");
      if (old) old.remove();
      if (kb && kb.length) msg.insertAdjacentHTML("beforeend", this._ikb(kb));
      this.scroll();
    }

    react(msg, emoji) {
      const bubble = msg.querySelector(".tg-bubble");
      let r = bubble.querySelector(".tg-react");
      if (!r) { r = document.createElement("span"); r.className = "tg-react"; bubble.appendChild(r); }
      r.textContent = emoji;
      msg.classList.add("has-react");
      this.scroll();
    }

    reply(rows, placeholder, oneTime) {
      this.rkbSpec = rows || [];
      this.oneTime = !!oneTime;
      if (!rows || !rows.length) {
        this.rkb.hidden = true;
        this.rkb.innerHTML = "";
        this.kbToggle.hidden = true;
      } else {
        this.rkb.innerHTML = rows.map((row, r) => '<div class="tg-rkb-row">' + row.map((b, c) =>
          '<button type="button" data-r="' + r + '" data-c="' + c + '">' + esc(b.t) + "</button>").join("") + "</div>").join("");
        this.rkb.hidden = false;
        this.kbToggle.hidden = false;
      }
      this.input.placeholder = placeholder || this.basePlaceholder;
      this.scroll();
    }

    toast(text, ms = 1800) {
      this.toastEl.textContent = text;
      this.toastEl.classList.add("show");
      clearTimeout(this._tt);
      this._tt = setTimeout(() => this.toastEl.classList.remove("show"), ms);
    }

    clear() {
      this.log.innerHTML = "";
      this.reply(null);
      this.setSub(this.opts.sub || "bot");
    }
  }

  // Role tabs for simulators with several chats (worker/admin, customer/courier/admin)
  function tgRoles(root) {
    const tabs = [...root.querySelectorAll(".roles-tabs [data-tab]")];
    const panes = [...root.querySelectorAll(".roles-panes [data-pane]")];
    const wide = () => root.classList.contains("roles-wide") && window.matchMedia("(min-width: 1120px)").matches;
    let current = tabs[0] && tabs[0].dataset.tab;
    function select(name) {
      current = name;
      tabs.forEach((t) => { const on = t.dataset.tab === name; t.setAttribute("aria-selected", String(on)); if (on) { const b = t.querySelector(".badge"); if (b) { b.hidden = true; b.textContent = "0"; } } });
      panes.forEach((p) => p.classList.toggle("active", p.dataset.pane === name));
    }
    function bump(name) {
      if (name === current || wide()) return;
      const b = root.querySelector('.roles-tabs [data-tab="' + name + '"] .badge');
      if (b) { b.textContent = String((+b.textContent || 0) + 1); b.hidden = false; }
    }
    tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.tab)));
    if (current) select(current);
    return { select, bump, get current() { return current; } };
  }

  window.TGChat = TGChat;
  window.tgRoles = tgRoles;
  window.tgEsc = esc;
  window.tgSleep = sleep;
})();
