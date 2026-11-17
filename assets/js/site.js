/* xoliddev — header/footer, theme and EN/UZ language switching (no dependencies) */
(function () {
  const root = document.documentElement;
  const base = (document.body.dataset.root || "/").replace(/\/?$/, "/");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const listeners = [];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const MARK = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)"/><path d="M16 5.5l3.2 7.3 7.3 3.2-7.3 3.2L16 26.5l-3.2-7.3L5.5 16l7.3-3.2z" fill="var(--accent-ink)"/><circle cx="16" cy="16" r="2.6" fill="var(--accent)"/></svg>';
  const SUN = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  const MOON = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';

  function bi(en, uz) {
    return '<span class="l-en">' + en + '</span><span class="l-uz">' + (uz == null ? en : uz) + "</span>";
  }

  function applyAttrs() {
    const lang = root.dataset.lang;
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(",").forEach((attr) => {
        const v = el.getAttribute("data-" + lang + "-" + attr.trim());
        if (v != null) el.setAttribute(attr.trim(), v);
      });
    });
    const t = document.querySelector('meta[name="x-title-' + lang + '"]');
    if (t) document.title = t.content;
  }

  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang === "uz" ? "uz" : "en";
    store.set("lang", lang);
    document.querySelectorAll("[data-set-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
    applyAttrs();
    listeners.forEach((fn) => fn(lang));
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    store.set("theme", theme);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = theme === "light" ? "#eef2f7" : "#0b1322";
  }

  function header() {
    const el = document.querySelector(".site-head");
    if (!el) return;
    el.innerHTML =
      '<div class="wrap">' +
      '<a class="brand" href="' + base + '">' + MARK + "<span>xoliddev</span></a>" +
      '<nav class="nav" aria-label="Main">' +
      '<a href="' + base + '#products">' + bi("Products", "Mahsulotlar") + "</a>" +
      '<a href="' + base + '#open-source">' + bi("Open source", "Ochiq kod") + "</a>" +
      '<a href="' + base + '#contact">' + bi("Contact", "Aloqa") + "</a>" +
      "</nav>" +
      '<div class="head-tools">' +
      '<div class="seg" role="group" aria-label="Language">' +
      '<button type="button" data-set-lang="en" aria-pressed="false">EN</button>' +
      '<button type="button" data-set-lang="uz" aria-pressed="false">UZ</button>' +
      "</div>" +
      '<button type="button" class="icon-btn" data-toggle-theme data-i18n-attr="aria-label" data-en-aria-label="Switch colour theme" data-uz-aria-label="Rang mavzusini almashtirish" aria-label="Switch colour theme">' + SUN + MOON + "</button>" +
      "</div></div>";
  }

  function footer() {
    const el = document.querySelector(".site-foot");
    if (!el) return;
    el.innerHTML =
      '<div class="wrap">' +
      "<span>© " + new Date().getFullYear() + " xoliddev · " + bi("Full-stack developer, Uzbekistan", "Full-stack dasturchi, O'zbekiston") + "</span>" +
      '<a href="https://github.com/xoliddev" rel="me noopener">github.com/xoliddev</a>' +
      "</div>";
  }

  header();
  footer();
  document.addEventListener("click", (e) => {
    const l = e.target.closest("[data-set-lang]");
    if (l) setLang(l.dataset.setLang);
    if (e.target.closest("[data-toggle-theme]")) setTheme(root.dataset.theme === "light" ? "dark" : "light");
  });
  setLang(root.dataset.lang || "en");
  setTheme(root.dataset.theme || "dark");

  window.Site = {
    bi,
    esc,
    store,
    lang: () => root.dataset.lang,
    onLang: (fn) => listeners.push(fn),
    reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
})();
