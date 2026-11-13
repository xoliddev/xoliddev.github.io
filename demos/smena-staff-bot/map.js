/* Fake-GPS picker for the check-in demo: click the map to move the phone. 1 px = 2 m. */
(function () {
  const WORK = { lat: 41.311081, lon: 69.240562 };
  const svg = document.getElementById("geo");
  const M_PER_PX = 2, CX = 200, CY = 130;
  let pos = { x: CX + 18, y: CY - 10 }, radius = 100;
  const circle = svg.querySelector("#geo-radius"), pin = svg.querySelector("#geo-pin"), out = document.getElementById("geo-dist");
  function toLatLon(p) {
    const dx = (p.x - CX) * M_PER_PX, dy = (CY - p.y) * M_PER_PX;
    return { lat: WORK.lat + dy / 111320, lon: WORK.lon + dx / (111320 * Math.cos((WORK.lat * Math.PI) / 180)) };
  }
  function draw() {
    circle.setAttribute("r", radius / M_PER_PX);
    pin.setAttribute("transform", "translate(" + pos.x + " " + pos.y + ")");
    const ll = toLatLon(pos);
    const d = window.Smena ? window.Smena.distance(ll.lat, ll.lon, WORK.lat, WORK.lon) : Math.hypot(pos.x - CX, pos.y - CY) * M_PER_PX;
    const inside = d <= radius;
    pin.classList.toggle("out", !inside);
    out.innerHTML = window.Site.bi("Phone is <b>" + Math.floor(d) + " m</b> from Demo Cafe: " + (inside ? "inside" : "outside") + " the " + radius + " m radius.",
      "Telefon Demo Cafe'dan <b>" + Math.floor(d) + " m</b> uzoqlikda: " + radius + " m radiusning " + (inside ? "ichida" : "tashqarisida") + ".");
  }
  svg.addEventListener("click", (e) => {
    const r = svg.getBoundingClientRect();
    pos = { x: ((e.clientX - r.left) / r.width) * 400, y: ((e.clientY - r.top) / r.height) * 260 };
    draw();
  });
  document.querySelectorAll("[data-geo]").forEach((b) => b.addEventListener("click", () => {
    pos = b.dataset.geo === "in" ? { x: CX + 14, y: CY + 12 } : { x: CX + 150, y: CY - 90 };
    draw();
  }));
  window.SmenaMap = { position: () => toLatLon(pos), setRadius: (r) => { radius = r; draw(); } };
  draw();
})();
