/*!
 * VOGAUTO — widget public de listări mașini.
 * Utilizare (WordPress: bloc „HTML personalizat"):
 *   <div id="vogauto-listings"></div>
 *   <script src="https://crm-vogauto.vercel.app/embed/vogauto.js" async
 *           data-phone="+373XXXXXXXX"></script>
 * Opțional pe <script>: data-target="#selector", data-columns="3", data-phone="...".
 * Se poate pune și direct pe container:  data-vogauto  data-phone="..."
 */
(function () {
  "use strict";

  var script = document.currentScript;
  // Originea CRM-ului = de unde e încărcat scriptul (merge pe orice domeniu).
  var ORIGIN = (function () {
    try { return new URL(script.src).origin; } catch (e) { return ""; }
  })();

  var cfg = {
    target: (script && script.getAttribute("data-target")) || "#vogauto-listings",
    columns: parseInt((script && script.getAttribute("data-columns")) || "0", 10) || 0,
    phone: (script && script.getAttribute("data-phone")) || "",
  };

  var CSS = [
    ".vg-wrap{--vg-accent:#1e3a8a;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;box-sizing:border-box}",
    ".vg-wrap *,.vg-wrap *::before,.vg-wrap *::after{box-sizing:border-box}",
    ".vg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}",
    ".vg-card{border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s;cursor:pointer;display:flex;flex-direction:column}",
    ".vg-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.12)}",
    ".vg-photo{position:relative;aspect-ratio:4/3;background:#f1f5f9;overflow:hidden}",
    ".vg-photo img{width:100%;height:100%;object-fit:cover;display:block}",
    ".vg-count{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:2px 8px;border-radius:999px}",
    ".vg-noimg{display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px}",
    ".vg-body{padding:12px 14px;display:flex;flex-direction:column;gap:6px;flex:1}",
    ".vg-title{font-weight:700;font-size:15px;line-height:1.25}",
    ".vg-meta{font-size:13px;color:#64748b}",
    ".vg-price{margin-top:auto;font-weight:800;font-size:18px;color:var(--vg-accent)}",
    ".vg-empty,.vg-loading{padding:40px;text-align:center;color:#94a3b8}",
    ".vg-lb{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.85);display:flex;align-items:center;justify-content:center;padding:16px}",
    ".vg-lb-box{background:#fff;border-radius:16px;max-width:900px;width:100%;max-height:92vh;overflow:auto}",
    ".vg-lb-hd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff}",
    ".vg-lb-x{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:20px;cursor:pointer;line-height:1}",
    ".vg-hero{position:relative;background:#000;aspect-ratio:16/10}",
    ".vg-hero img{width:100%;height:100%;object-fit:contain;display:block}",
    ".vg-nav{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(0,0,0,.5);color:#fff;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer}",
    ".vg-prev{left:10px}.vg-next{right:10px}",
    ".vg-thumbs{display:flex;gap:8px;padding:10px 14px;overflow-x:auto}",
    ".vg-thumbs img{width:74px;height:56px;object-fit:cover;border-radius:8px;cursor:pointer;opacity:.6;border:2px solid transparent}",
    ".vg-thumbs img.on{opacity:1;border-color:var(--vg-accent)}",
    ".vg-lb-body{padding:14px 18px}",
    ".vg-lb-price{font-size:24px;font-weight:800;color:var(--vg-accent);margin-bottom:6px}",
    ".vg-desc{white-space:pre-wrap;color:#334155;font-size:14px;line-height:1.5;margin-top:8px}",
    ".vg-call{display:inline-block;margin-top:14px;background:var(--vg-accent);color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700}",
  ].join("");

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    try { return new Intl.NumberFormat("ro-RO").format(n) + " €"; } catch (e) { return n + " €"; }
  }

  function injectCss() {
    if (document.getElementById("vg-css")) return;
    var s = el("style"); s.id = "vg-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function lightbox(car) {
    var idx = 0;
    var photos = car.photos && car.photos.length ? car.photos : [];
    var lb = el("div", "vg-lb");
    var box = el("div", "vg-lb-box");
    var hd = el("div", "vg-lb-hd");
    hd.appendChild(el("strong", null, esc(car.title)));
    var x = el("button", "vg-lb-x", "&times;");
    hd.appendChild(x);
    box.appendChild(hd);

    var hero = el("div", "vg-hero");
    var img = el("img"); img.alt = esc(car.title);
    hero.appendChild(img);
    if (photos.length > 1) {
      var prev = el("button", "vg-nav vg-prev", "&#8249;");
      var next = el("button", "vg-nav vg-next", "&#8250;");
      prev.onclick = function () { idx = (idx - 1 + photos.length) % photos.length; render(); };
      next.onclick = function () { idx = (idx + 1) % photos.length; render(); };
      hero.appendChild(prev); hero.appendChild(next);
    }
    box.appendChild(hero);

    var thumbs = el("div", "vg-thumbs");
    box.appendChild(thumbs);

    var body = el("div", "vg-lb-body");
    body.appendChild(el("div", "vg-lb-price", money(car.price)));
    body.appendChild(el("div", "vg-meta", esc(car.brand + " " + car.model + " · " + car.year + (car.color ? " · " + car.color : ""))));
    if (car.description) body.appendChild(el("div", "vg-desc", esc(car.description)));
    if (cfg.phone) {
      var a = el("a", "vg-call", "Sună: " + esc(cfg.phone));
      a.href = "tel:" + cfg.phone.replace(/\s/g, "");
      body.appendChild(a);
    }
    box.appendChild(body);
    lb.appendChild(box);

    function render() {
      if (photos.length) { img.src = photos[idx]; } else { hero.style.display = "none"; }
      thumbs.innerHTML = "";
      photos.forEach(function (u, i) {
        var t = el("img"); t.src = u; if (i === idx) t.className = "on";
        t.onclick = function () { idx = i; render(); };
        thumbs.appendChild(t);
      });
    }
    render();

    function close() { document.body.removeChild(lb); document.removeEventListener("keydown", onKey); }
    x.onclick = close;
    lb.onclick = function (e) { if (e.target === lb) close(); };
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" && photos.length > 1) { idx = (idx - 1 + photos.length) % photos.length; render(); }
      else if (e.key === "ArrowRight" && photos.length > 1) { idx = (idx + 1) % photos.length; render(); }
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(lb);
  }

  function card(car) {
    var c = el("div", "vg-card");
    var ph = el("div", "vg-photo");
    if (car.photos && car.photos.length) {
      var im = el("img"); im.loading = "lazy"; im.src = car.photos[0]; im.alt = esc(car.title);
      ph.appendChild(im);
      if (car.photos.length > 1) ph.appendChild(el("span", "vg-count", car.photos.length + " foto"));
    } else {
      ph.appendChild(el("div", "vg-noimg", "Fără poză"));
    }
    c.appendChild(ph);
    var b = el("div", "vg-body");
    b.appendChild(el("div", "vg-title", esc(car.title)));
    b.appendChild(el("div", "vg-meta", esc(car.year + (car.color ? " · " + car.color : ""))));
    b.appendChild(el("div", "vg-price", money(car.price)));
    c.appendChild(b);
    c.onclick = function () { lightbox(car); };
    return c;
  }

  function render(container) {
    injectCss();
    var wrap = el("div", "vg-wrap");
    wrap.appendChild(el("div", "vg-loading", "Se încarcă mașinile..."));
    container.innerHTML = "";
    container.appendChild(wrap);

    fetch(ORIGIN + "/api/public/listings", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        wrap.innerHTML = "";
        var list = (data && data.listings) || [];
        if (cfg.columns) {
          // grid fix pe N coloane (altfel auto-fill responsive).
        }
        if (!list.length) { wrap.appendChild(el("div", "vg-empty", "Momentan nu sunt mașini disponibile.")); return; }
        var grid = el("div", "vg-grid");
        if (cfg.columns) grid.style.gridTemplateColumns = "repeat(" + cfg.columns + ",1fr)";
        list.forEach(function (car) { grid.appendChild(card(car)); });
        wrap.appendChild(grid);
      })
      .catch(function () {
        wrap.innerHTML = "";
        wrap.appendChild(el("div", "vg-empty", "Nu am putut încărca mașinile."));
      });
  }

  function boot() {
    var containers = [];
    var t = document.querySelector(cfg.target);
    if (t) containers.push(t);
    document.querySelectorAll("[data-vogauto]").forEach(function (n) {
      if (containers.indexOf(n) === -1) {
        var p = n.getAttribute("data-phone"); if (p) cfg.phone = p;
        containers.push(n);
      }
    });
    if (!containers.length) return;
    containers.forEach(render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
