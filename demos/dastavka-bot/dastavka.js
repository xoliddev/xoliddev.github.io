/* Dastavka bot simulator: one order travels customer → admin → courier → customer.
   Every bot text is taken from locales/lexicon.py (Uzbek), keyboards follow handlers/*.py. */
(function () {
  "use strict";
  const { bi } = window.Site;
  const esc = window.tgEsc;
  const L = {
    ask_for_location: "📍 Jo‘nating manzilingizni (lokatsiya):",
    address_confirmation_tpl: "📍 Sizning manzilingiz: <b>{address}</b>\nTo‘g‘rimi?",
    confirm_address_yes: "✅ To‘g‘ri", reenter_location: "🔄 Yana yuborish",
    customer_main_menu_title: "🏷 <b>Lazzatlar dunyosiga xush kelibsiz!</b>:",
    subcategory_title_tpl: "📂 <b>{name}</b> tarkibi:",
    price_label: "Narx: ", add_to_cart_button: "➕ Savatga qo‘shish", product_added_to_cart_tpl: "✅ “{name}” savatga qo‘shildi!",
    cart_button: "🛒 Savatcha", view_cart_title: "<b>🛒 Savatchangiz</b>:", cart_item_template: "{name} × {quantity} = {total_sum}",
    total_price: "Umumiy: <b>{total}</b>", cart_empty: "🛒 Savatcha bo‘sh.", clear_cart_button: "🗑 Savatni tozalash", cart_cleared_alert: "✅ Savat tozalandi!",
    place_order_button: "✅ Buyurtma berish", ask_for_customer_name: "Ismingizni kiriting:",
    ask_for_phone: "📞 Iltimos, pastdagi tugma orqali kontaktingizni yuboring YOKI telefon raqamingizni +998... formatida yozing:",
    send_phone_button: "📞 Telefon raqamni yuborish", invalid_phone_format: "❌ Telefon raqami noto‘g‘ri formatda. Qayta urinib ko‘ring.",
    order_placed_success: "✅ Buyurtmangiz qabul qilindi! Tez orada operator bog‘lanadi.",
    new_order_for_admin_tpl: "🆕 Buyurtma #{daily_id} (ID: {id})\nMijoz: {customer_name}\nTelefon: {phone}\nSumma: {total} so'm",
    accept_order_button: "✅ Qabul qilish", location_button: "📍 Xarita", order_accepted_alert: "Buyurtma qabul qilindi!",
    order_status_updated_tpl: "✅ Buyurtmangiz #{daily_id} qabul qilindi. Tez orada yetkazib beramiz!",
    order_details_tpl: "<b>Buyurtma #{daily_id} (ID: {id})</b>\n{customer_label}: {name}\n{phone_label}: {phone}\n{items_label}:\n{items}\n{status_label}: {status}\n\n<b>Jami:</b> {total} so'm",
    status_pending: "🆕 Yangi", status_processing: "🔄 Jarayonda", status_delivering: "🚚 Yetkazishda", status_delivered: "✅ Yetkazildi", status_completed: "🏁 Tugallangan", status_disputed: "❗️ Munozarali",
    assign_to_courier_btn: "🚚 Kuriyerga tayinlash", choose_courier_title: "🚚 Kuriyerni tanlang:", courier_assigned_success_alert: "✅ Kuryer muvaffaqiyatli tayinlandi!",
    assigned_courier_info_tpl: "🚚 Kuryer: {courier_name}",
    new_delivery_for_courier_tpl: "🚚 Yangi yetkazib berish: buyurtma #{daily_id}.\nMijoz: {customer_name}\nTelefon: {customer_phone}",
    view_location_button: "📍 Xaritani ko‘rish", courier_confirm_delivery_button: "✅ Yetkazildi",
    order_assigned_to_courier_for_customer_tpl: "✅ Buyurtma #{daily_id} muvaffaqiyatli kuryerga topshirildi!\n🚚 Kuryer: {courier_name}\n📞 Telefon: {courier_phone}\n🏁 Tez orada yetkaziladi.",
    courier_delivery_requested: "✅ Tasdiqlash mijozdan so‘ralmoqda…",
    ask_customer_delivery_confirmation_tpl: "Buyurtma #{daily_id} yetkazildimi?", customer_confirm_delivery_button: "✅ Ha", customer_reject_delivery_button: "❌ Yo‘q",
    customer_delivery_thanks: "✅ Yetkazib berish tasdiqlandi. Rahmat!", delivery_success_for_courier: "✅ Mijoz yetkazishni tasdiqladi!",
    order_completed_tpl: "🏁 Buyurtma #{daily_id} yakunlandi.", customer_dispute_info: "❗ Muammo qayd etildi. Tez orada administrator siz bilan bog‘lanadi.",
    alert_order_rejected_tpl: "❗️DIQQAT: Mijoz buyurtmani rad etdi! Buyurtma #{daily_id}", delivery_failed_for_courier: "❌ Mijoz yetkazishni tasdiqlamadi. Administrator bilan bog‘laning.",
    admin_welcome: "Admin paneliga xush kelibsiz!", orders_button: "📦 Buyurtmalar", new_orders_list_title: "📦 <b>Yangi buyurtmalar</b>:", no_new_orders: "Yangi buyurtmalar yo‘q.",
    order_list_item_tpl: "Buyurtma #{daily_id} — {total} so'm",
    courier_panel_title: "🏍 <b>Kuryer paneli</b>:", my_active_deliveries_button: "📦 Faol yetkazib berishlarim", active_deliveries_list_title: "📦 <b>Faol buyurtmalar</b>:",
    no_active_deliveries: "Hozircha faol yetkazib berishlar yo‘q.", active_delivery_item_tpl: "Buyurtma #{daily_id} — Mijoz: {customer_name}",
    my_orders_button: "👤 Buyurtmalarim", my_orders_list_title: "👤 <b>Mening buyurtmalarim</b>:", no_orders_yet_history: "Siz hali buyurtma qilmagansiz.",
    my_order_list_item_tpl: "Buyurtma #{daily_id} — {total} so'm — {status}", back_button: "⬅️ Orqaga", cart_is_empty_error: "❌ Savatchangiz bo‘sh.",
  };
  const tpl = (k, o = {}) => L[k].replace(/\{(\w+)\}/g, (_, n) => (o[n] != null ? o[n] : ""));
  const sum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ------------------------------------------------------------ Demo Cafe menu
  const tile = (emoji, c1, c2) => "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="560" height="340" fill="url(#g)"/><text x="280" y="215" font-size="150" text-anchor="middle">' + emoji + "</text></svg>");
  const CATS = [
    { id: 1, name: "🍔 Burgerlar", items: [
      { id: 11, name: "Klassik burger", desc: "Mol go'shti, pomidor, salat bargi, maxsus sous.", price: 32000, img: tile("🍔", "#f6c177", "#e07a3f") },
      { id: 12, name: "Chizburger", desc: "Ikki qavat pishloq, tuzlangan bodring, xantal.", price: 36000, img: tile("🍔", "#ffd166", "#ef8354") } ] },
    { id: 2, name: "🌯 Lavash", items: [
      { id: 21, name: "Tovuqli lavash", desc: "Tovuq, kartoshka fri, yangi sabzavotlar.", price: 30000, img: tile("🌯", "#c9e4a5", "#6aa84f") },
      { id: 22, name: "Pishloqli lavash", desc: "Tovuq, pishloq, achchiq sous.", price: 34000, img: tile("🌯", "#f9e79f", "#b8a14a") } ] },
    { id: 3, name: "🥤 Ichimliklar", items: [
      { id: 31, name: "Coca-Cola 0.5 l", desc: "", price: 10000, img: tile("🥤", "#ff9a9a", "#c0392b") },
      { id: 32, name: "Ko'k choy", desc: "Choynakda, 0.7 l.", price: 6000, img: tile("🍵", "#a8e6cf", "#3d8b6b") } ] },
  ];
  const product = (id) => CATS.flatMap((c) => c.items).find((p) => p.id === id);
  const COURIERS = [{ id: 1, name: "Bekzod", phone: "+998 90 000 00 01", busy: false }, { id: 2, name: "Sherzod", phone: "+998 90 000 00 02", busy: true }];
  const ADDRESS = "Toshkent, Yunusobod tumani, Amir Temur ko'chasi, 108";
  const LAT = 41.338, LON = 69.285;

  // ------------------------------------------------------------ state
  let st;
  function fresh() { return { step: "location", cart: {}, qty: {}, order: null, orders: [] }; }
  const cartTotal = () => Object.entries(st.cart).reduce((a, [id, q]) => a + product(+id).price * q, 0);

  // ------------------------------------------------------------ chats
  const roles = window.tgRoles(document.getElementById("roles"));
  const C = new TGChat(document.getElementById("chat-customer"), { title: "Demo Cafe — Yetkazib berish", sub: "bot", ava: "🍔", placeholder: "Xabar yozing...", onReset: restart });
  const K = new TGChat(document.getElementById("chat-courier"), { title: "Demo Cafe — Yetkazib berish", sub: "bot · kuryer", ava: "🏍", placeholder: "Xabar yozing...", onReset: restart });
  const A = new TGChat(document.getElementById("chat-admin"), { title: "Demo Cafe — Yetkazib berish", sub: "bot · admin", ava: "👑", placeholder: "Xabar yozing...", onReset: restart });
  const CH = { customer: C, courier: K, admin: A };
  const NAMES = { customer: bi("Customer", "Mijoz"), courier: bi("Courier", "Kuryer"), admin: "Admin" };

  // lifecycle track + "packet" animation between roles
  const STEPS = ["pending", "processing", "delivering", "delivered", "completed"];
  function setStatus(s) {
    if (st.order) st.order.status = s;
    document.querySelectorAll("#track [data-s]").forEach((el) => {
      const i = STEPS.indexOf(el.dataset.s), cur = STEPS.indexOf(s);
      el.classList.toggle("done", s !== "disputed" && i < cur);
      el.classList.toggle("now", el.dataset.s === s || (s === "disputed" && el.dataset.s === "completed"));
      if (el.dataset.s === "completed") el.querySelector("b").textContent = s === "disputed" ? L.status_disputed : L.status_completed;
    });
  }
  const logEl = document.getElementById("events");
  function hop(from, to, what) {
    roles.bump(to);
    const t = new Date(), hh = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0") + ":" + String(t.getSeconds()).padStart(2, "0");
    if (logEl) logEl.insertAdjacentHTML("afterbegin", "<li><span>" + hh + "</span> <b>" + NAMES[from] + "</b> → <b>" + NAMES[to] + "</b>: " + what + "</li>");
    const pane = document.querySelector('[data-pane="' + to + '"] .tg');
    if (pane && !window.Site.reducedMotion()) { pane.classList.remove("ping"); void pane.offsetWidth; pane.classList.add("ping"); }
  }
  const sayTo = (role, html, opts = {}) => CH[role].say(html, Object.assign({ delay: 500 }, opts));

  async function restart() {
    st = fresh();
    Object.values(CH).forEach((c) => c.clear());
    if (logEl) logEl.innerHTML = "";
    setStatus("none");
    A.me("/start"); A.bot(L.admin_welcome, { kb: adminMenu() });
    K.me("/start"); K.bot(L.courier_panel_title, { kb: courierMenu() });
    C.me("/start");
    await C.say(L.ask_for_location, { reply: [[{ t: L.ask_for_location, loc: true }]], oneTime: true, delay: 500 });
  }
  const adminMenu = () => [[{ t: L.orders_button, d: "adm:orders" }], [{ t: "🏍 Kuriyerlarni boshqarish", d: "na" }, { t: "⚙️ Sozlamalar", d: "na" }]];
  const courierMenu = () => [[{ t: L.my_active_deliveries_button, d: "cr:active" }]];
  const mainMenuKb = () => [...CATS.map((c) => [{ t: c.name, d: "cat:" + c.id }]), [{ t: L.cart_button, d: "cart" }, { t: L.my_orders_button, d: "myorders" }]];

  // ------------------------------------------------------------ customer
  C.on("location", async () => {
    if (st.step !== "location") return;
    C.reply(null);
    C.location("<small>" + LAT + ", " + LON + "</small>");
    st.step = "confirm";
    await C.say(tpl("address_confirmation_tpl", { address: esc(ADDRESS) }), { kb: [[{ t: L.confirm_address_yes, d: "addr:ok" }, { t: L.reenter_location, d: "addr:again" }]], delay: 900 });
  });
  function productCard(p) {
    const q = st.qty[p.id] || 1;
    return { caption: "<b>" + esc(p.name) + "</b>" + (p.desc ? "\n\n" + esc(p.desc) : "") + "\n\n" + L.price_label + "<b>" + sum(p.price) + " so'm</b>",
      kb: [[{ t: "➖", d: "q:-:" + p.id }, { t: String(q), d: "noop" }, { t: "➕", d: "q:+:" + p.id }], [{ t: L.add_to_cart_button, d: "add:" + p.id }], [{ t: L.cart_button, d: "cart" }, { t: L.back_button, d: "cat:" + CATS.find((c) => c.items.includes(p)).id }]] };
  }
  function cartView() {
    const ids = Object.keys(st.cart);
    if (!ids.length) return [L.cart_empty, [[{ t: L.back_button, d: "home" }]]];
    const lines = ids.map((id) => { const p = product(+id), q = st.cart[id]; return tpl("cart_item_template", { name: esc(p.name), quantity: q, total_sum: sum(p.price * q) + " so'm" }); });
    return [L.view_cart_title + "\n\n" + lines.join("\n") + "\n\n" + tpl("total_price", { total: sum(cartTotal()) + " so'm" }), [[{ t: L.place_order_button, d: "checkout" }], [{ t: L.clear_cart_button, d: "clear" }, { t: L.back_button, d: "home" }]]];
  }
  C.on("cb", async (d, msg) => {
    const [a, b, c] = d.split(":");
    if (a === "noop") return;
    if (a === "addr") {
      C.setKb(msg, null);
      if (b === "again") { st.step = "location"; return C.say(L.ask_for_location, { reply: [[{ t: L.ask_for_location, loc: true }]], oneTime: true, delay: 300 }); }
      st.step = "menu";
      return C.say(L.customer_main_menu_title, { kb: mainMenuKb(), delay: 500 });
    }
    if (a === "home") return C.edit(msg, L.customer_main_menu_title, mainMenuKb());
    if (a === "cat") {
      const cat = CATS.find((x) => x.id === +b);
      const kb = cat.items.map((p) => [{ t: p.name + " — " + sum(p.price) + " so'm", d: "p:" + p.id }]).concat([[{ t: L.back_button, d: "home" }]]);
      if (msg.querySelector(".tg-media")) return C.say(tpl("subcategory_title_tpl", { name: esc(cat.name) }), { kb, delay: 200 });
      return C.edit(msg, tpl("subcategory_title_tpl", { name: esc(cat.name) }), kb);
    }
    if (a === "p") { const p = product(+b), v = productCard(p); return C.photo(p.img, v.caption, { kb: v.kb, alt: p.name }); }
    if (a === "q") {
      const p = product(+c); st.qty[p.id] = Math.max(1, Math.min(20, (st.qty[p.id] || 1) + (b === "+" ? 1 : -1)));
      return C.setKb(msg, productCard(p).kb);
    }
    if (a === "add") {
      const p = product(+b); st.cart[p.id] = (st.cart[p.id] || 0) + (st.qty[p.id] || 1); st.qty[p.id] = 1;
      C.setKb(msg, productCard(p).kb);
      renderCart();
      return C.toast(tpl("product_added_to_cart_tpl", { name: p.name }));
    }
    if (a === "cart") { const [t, kb] = cartView(); return C.say(t, { kb, delay: 200 }); }
    if (a === "clear") { st.cart = {}; renderCart(); C.toast(L.cart_cleared_alert); return C.edit(msg, L.cart_empty, [[{ t: L.back_button, d: "home" }]]); }
    if (a === "checkout") {
      if (!Object.keys(st.cart).length) return C.toast(L.cart_is_empty_error);
      if (st.order && !["completed", "disputed"].includes(st.order.status)) return C.toast(window.Site.lang() === "uz" ? "Demo: avvalgi buyurtma tugashini kuting" : "Demo: finish the current order first", 2200);
      C.setKb(msg, null); st.step = "name";
      return C.say(L.ask_for_customer_name, { delay: 300 });
    }
    if (a === "myorders") {
      if (!st.orders.length) return C.say(L.no_orders_yet_history, { delay: 200 });
      return C.say(L.my_orders_list_title + "\n\n" + st.orders.map((o) => tpl("my_order_list_item_tpl", { daily_id: o.daily, total: sum(o.total), status: L["status_" + o.status] })).join("\n"), { delay: 200 });
    }
    if (a === "dlv") {
      if (!st.order || st.order.status !== "delivered") return;
      C.setKb(msg, null);
      if (b === "yes") {
        setStatus("completed");
        await C.say(L.customer_delivery_thanks, { delay: 300 });
        hop("customer", "courier", bi("confirmed receipt", "qabul qildi"));
        sayTo("courier", L.delivery_success_for_courier);
        COURIERS[0].busy = false;
        hop("customer", "admin", bi("order completed", "buyurtma yakunlandi"));
        sayTo("admin", tpl("order_completed_tpl", { daily_id: st.order.daily }));
        updateAdminCard();
      } else {
        setStatus("disputed");
        await C.say(L.customer_dispute_info, { delay: 300 });
        hop("customer", "admin", bi("reported a problem", "muammo bildirdi"));
        sayTo("admin", tpl("alert_order_rejected_tpl", { daily_id: st.order.daily }));
        hop("customer", "courier", bi("did not confirm", "tasdiqlamadi"));
        sayTo("courier", L.delivery_failed_for_courier);
        updateAdminCard();
      }
      document.dispatchEvent(new CustomEvent("dastavka:done", { detail: st.order.status }));
    }
  });
  C.on("text", async (text) => {
    if (text === "/start") return restart();
    if (st.step === "name") {
      st.name = text.trim().slice(0, 40); st.step = "phone";
      return C.say(L.ask_for_phone, { reply: [[{ t: L.send_phone_button, contact: true }]], oneTime: true });
    }
    if (st.step === "phone") {
      const ph = text.replace(/[\s-]/g, "");
      if (!/^\+998\d{9}$/.test(ph)) return C.say(L.invalid_phone_format);
      return placeOrder(ph);
    }
    if (st.step === "menu") return C.say(L.customer_main_menu_title, { kb: mainMenuKb() });
  });
  C.on("contact", () => { if (st.step === "phone") { C.reply(null); C.me("📞 +998 90 123 45 67"); placeOrder("+998901234567"); } });

  async function placeOrder(phone) {
    C.reply(null);
    const items = Object.entries(st.cart).map(([id, q]) => ({ p: product(+id), q }));
    st.order = { daily: st.orders.length + 1, id: 1041 + st.orders.length, name: st.name, phone, items, total: cartTotal(), status: "pending" };
    st.orders.push(st.order); st.cart = {}; st.step = "menu"; renderCart();
    setStatus("pending");
    await C.say(L.order_placed_success, { delay: 700 });
    hop("customer", "admin", bi("new order", "yangi buyurtma") + " #" + st.order.daily);
    const m = await sayTo("admin", tpl("new_order_for_admin_tpl", { daily_id: st.order.daily, id: st.order.id, customer_name: esc(st.order.name), phone: esc(phone), total: sum(st.order.total) }),
      { kb: [[{ t: L.accept_order_button, d: "acc:" + st.order.id }, { t: L.location_button, url: "https://www.google.com/maps?q=" + LAT + "," + LON }]] });
    st.order.adminMsg = m;
  }

  // ------------------------------------------------------------ admin
  function details(o) {
    return tpl("order_details_tpl", { daily_id: o.daily, id: o.id, customer_label: "Mijoz", name: esc(o.name), phone_label: "Telefon", phone: esc(o.phone), items_label: "Mahsulotlar",
      items: o.items.map((i) => "• " + esc(i.p.name) + " × " + i.q + " = " + sum(i.p.price * i.q) + " so'm").join("\n"), status_label: "Holat", status: L["status_" + o.status], total: sum(o.total) }) +
      (o.courier ? "\n" + tpl("assigned_courier_info_tpl", { courier_name: esc(o.courier.name) }) : "");
  }
  function updateAdminCard() { const o = st.order; if (o && o.adminMsg && o.adminMsg.isConnected) A.edit(o.adminMsg, details(o), o.status === "processing" ? [[{ t: L.assign_to_courier_btn, d: "asg:" + o.id }]] : null); }
  A.on("cb", async (d, msg) => {
    const [a, b] = d.split(":");
    if (a === "na") return A.toast(window.Site.lang() === "uz" ? "Bu bo'lim demoda yo'q" : "Not part of this demo");
    if (a === "adm") {
      const list = st.orders.filter((o) => o.status === "pending");
      if (!list.length) return A.say(L.no_new_orders, { delay: 200 });
      return A.say(L.new_orders_list_title, { kb: list.map((o) => [{ t: tpl("order_list_item_tpl", { daily_id: o.daily, total: sum(o.total) }), d: "acc:" + o.id }]), delay: 200 });
    }
    const o = st.order;
    if (!o || o.id !== +b) return;
    if (a === "acc") {
      if (o.status !== "pending") return A.toast(L.order_accepted_alert);
      setStatus("processing"); o.adminMsg = msg.querySelector(".tg-media") ? o.adminMsg : msg;
      A.toast(L.order_accepted_alert);
      A.edit(o.adminMsg, details(o), [[{ t: L.assign_to_courier_btn, d: "asg:" + o.id }]]);
      hop("admin", "customer", bi("order accepted", "buyurtma qabul qilindi"));
      return sayTo("customer", tpl("order_status_updated_tpl", { daily_id: o.daily }));
    }
    if (a === "asg") {
      if (o.status !== "processing") return;
      return A.say(L.choose_courier_title, { kb: COURIERS.map((c) => [{ t: (c.busy ? "🔴 " : "🟢 ") + c.name + (c.busy ? " (band)" : " (bo'sh)"), d: "crs:" + o.id + ":" + c.id }]), delay: 200 });
    }
    if (a === "crs") {
      if (o.status !== "processing") return;
      const c = COURIERS.find((x) => x.id === +d.split(":")[2]);
      o.courier = c; c.busy = true;
      setStatus("delivering");
      A.toast(L.courier_assigned_success_alert);
      A.setKb(msg, null);
      updateAdminCard();
      hop("admin", "courier", bi("delivery assigned", "yetkazish tayinlandi") + " → " + esc(c.name));
      o.courierMsg = await sayTo("courier", tpl("new_delivery_for_courier_tpl", { daily_id: o.daily, customer_name: esc(o.name), customer_phone: esc(o.phone) }),
        { kb: [[{ t: L.view_location_button, url: "https://www.google.com/maps?q=" + LAT + "," + LON }], [{ t: L.courier_confirm_delivery_button, d: "done:" + o.id }]] });
      hop("admin", "customer", bi("courier on the way", "kuryer yo'lda"));
      sayTo("customer", tpl("order_assigned_to_courier_for_customer_tpl", { daily_id: o.daily, courier_name: esc(c.name), courier_phone: esc(c.phone) }));
    }
  });
  A.on("text", (t) => A.say(L.admin_welcome, { kb: adminMenu() }));

  // ------------------------------------------------------------ courier
  K.on("cb", async (d, msg) => {
    const [a, b] = d.split(":");
    if (a === "cr") {
      const o = st.order;
      if (!o || o.status !== "delivering") return K.say(L.no_active_deliveries, { delay: 200 });
      return K.say(L.active_deliveries_list_title + "\n\n" + tpl("active_delivery_item_tpl", { daily_id: o.daily, customer_name: esc(o.name) }), { delay: 200 });
    }
    if (a === "done") {
      const o = st.order;
      if (!o || o.id !== +b || o.status !== "delivering") return;
      setStatus("delivered");
      K.edit(msg, tpl("new_delivery_for_courier_tpl", { daily_id: o.daily, customer_name: esc(o.name), customer_phone: esc(o.phone) }) + "\n\n" + L.courier_delivery_requested, null);
      K.toast(L.courier_delivery_requested);
      updateAdminCard();
      hop("courier", "customer", bi("asks to confirm delivery", "yetkazishni tasdiqlashni so'radi"));
      sayTo("customer", tpl("ask_customer_delivery_confirmation_tpl", { daily_id: o.daily }), { kb: [[{ t: L.customer_confirm_delivery_button, d: "dlv:yes" }, { t: L.customer_reject_delivery_button, d: "dlv:no" }]] });
    }
  });
  K.on("text", () => K.say(L.courier_panel_title, { kb: courierMenu() }));

  function renderCart() {
    const el = document.getElementById("cart-sum");
    if (el) el.textContent = Object.keys(st.cart).length ? sum(cartTotal()) + " so'm" : "—";
  }
  st = fresh();
  restart();
  window.Dastavka = { get state() { return st; } };
})();
