/* ==================================================================
   retro.js — Win98風ダイアログ / ページ遷移の演出（全ページ共通）
     retro.dialog({ title, message, buttons }) → 押されたボタン名を返す Promise
     retro.go(url) → ダウンロード風の演出をはさんでページ移動
   ================================================================== */
(function () {
  const R = (window.retro = {});
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WARN = '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M16 2 31 29H1Z" fill="#000" transform="translate(1.5 1.5)" opacity=".45"/><path d="M16 2 31 29H1Z" fill="#ff0" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/><rect x="14.4" y="10" width="3.2" height="11" fill="#000"/><rect x="14.4" y="23" width="3.2" height="3.2" fill="#000"/></svg>';

  const INFO = '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><circle cx="17.5" cy="17.5" r="14" fill="#000" opacity=".45"/><circle cx="16" cy="16" r="14" fill="#fff" stroke="#000" stroke-width="1.2"/><circle cx="16" cy="16" r="11" fill="#0000c0"/><rect x="14.5" y="13.5" width="3" height="9" fill="#fff"/><rect x="14.5" y="8.5" width="3" height="3" fill="#fff"/></svg>';
  const ERR = '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><circle cx="17.5" cy="17.5" r="14" fill="#000" opacity=".45"/><circle cx="16" cy="16" r="14" fill="#e00000" stroke="#000" stroke-width="1.2"/><path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke="#fff" stroke-width="3.2"/></svg>';
  const KEY = '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><circle cx="11" cy="16" r="7" fill="#ffd400" stroke="#000"/><circle cx="9" cy="16" r="2.2" fill="#c0c0c0" stroke="#000"/><path d="M17 14.5h13v3h-2.5v4h-3v-4h-2v3h-3v-3H17Z" fill="#ffd400" stroke="#000"/></svg>';
  const ICONS = { warn: WARN, info: INFO, error: ERR, key: KEY };

  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---- ダイアログ ---- */
  R.dialog = function ({ title = "RYOTO.EXE", message = "", buttons = ["OK"], icon = "warn", input = null } = {}) {
    return new Promise((resolve) => {
      const wrap = el(`<div class="w98-modal">
        <div class="w98 w98-dlg" role="alertdialog" aria-modal="true">
          <div class="w98-title"><span></span><button class="w98-x" aria-label="Close">✕</button></div>
          <div class="w98-body">${icon ? `<div class="w98-icon">${ICONS[icon] || WARN}</div>` : ""}<div class="w98-msg"></div></div>
          <div class="w98-btns"></div>
        </div></div>`);
      wrap.querySelector(".w98-title span").textContent = title;
      const msg = wrap.querySelector(".w98-msg");
      String(message).split("\n").forEach((line) => { const p = document.createElement("p"); p.textContent = line; msg.appendChild(p); });
      let field = null;
      if (input) { // 入力欄つき（パスワードなど）
        const lab = document.createElement("label"); lab.className = "w98-field";
        lab.append(input.label || "");
        field = document.createElement("input"); field.type = input.type || "text";
        field.autocomplete = "off"; field.spellcheck = false;
        lab.appendChild(field); msg.appendChild(lab);
      }
      const prev = document.activeElement;
      const opened = performance.now();
      const close = (v) => {
        if (performance.now() - opened < 250) return; // 前のダイアログを閉じたキーで、続けて押されないように
        wrap.remove(); document.removeEventListener("keydown", onKey); prev && prev.focus && prev.focus();
        resolve(field ? (v === buttons[0] ? field.value : null) : v);
      };
      const box = wrap.querySelector(".w98-btns");
      buttons.forEach((label, i) => {
        const b = document.createElement("button");
        b.className = "w98-btn" + (i === buttons.length - 1 ? " def" : "");
        const u = document.createElement("u"); u.textContent = label[0];
        b.append(u, label.slice(1));
        b.addEventListener("click", () => close(label));
        box.appendChild(b);
      });
      const cancel = buttons[buttons.length - 1];
      wrap.querySelector(".w98-x").addEventListener("click", () => close(cancel));
      const onKey = (e) => {
        if (e.key === "Escape") close(cancel);
        if (field) { if (e.key === "Enter") close(buttons[0]); return; }
        const hit = buttons.find((l) => l[0].toLowerCase() === e.key.toLowerCase());
        if (hit) close(hit);
      };
      document.addEventListener("keydown", onKey);
      document.body.appendChild(wrap);
      (field || box.lastChild).focus();
    });
  };

  /* ---- 全画面（404・ブルースクリーンなど）：タップかキーで閉じる ---- */
  R.screen = function (className, html) {
    return new Promise((resolve) => {
      const s = el(`<div class="w98-screen ${className}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`);
      const done = () => { s.remove(); document.removeEventListener("keydown", done); resolve(); };
      setTimeout(() => { s.addEventListener("click", done); document.addEventListener("keydown", done); }, 350);
      document.body.appendChild(s); s.focus();
    });
  };

  /* ---- ページ遷移：怪しいダウンロード ---- */
  R.go = function (href) {
    if (reduce) { location.href = href; return; }
    const url = new URL(href, location.href);
    const file = (url.pathname.split("/").pop().replace(/\.html?$/, "") || "home") + ".exe";
    const ov = el(`<div class="w98-trans">
      <div class="w98 w98-dlg w98-dl" role="status">
        <div class="w98-title"><span>Downloading ${file}</span><button class="w98-x" tabindex="-1" aria-hidden="true">✕</button></div>
        <div class="w98-body">
          <div class="anim">
            <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><path d="M2 4h9l2 2h15v18H2Z" fill="#ff0" stroke="#000"/></svg>
            <span class="fly"><i></i><i></i><i></i></span>
            <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><path d="M2 4h9l2 2h15v18H2Z" fill="#ff0" stroke="#000"/></svg>
          </div>
          <div class="path">Opening:<br><b>${file}</b> from ryoto109.github.io</div>
          <div class="w98-bar"><i></i></div>
          <div class="small">Estimated time left: <span class="eta">3 sec</span> (28.8 KB/sec)</div>
          <div class="small warn">⚠ Some files can harm your computer.</div>
        </div>
      </div></div>`);
    document.body.appendChild(ov);
    const bar = ov.querySelector(".w98-bar i"), eta = ov.querySelector(".eta");
    let p = 0;
    (function step() {
      // カクカク・たまに止まる進み方
      p = Math.min(100, p + (Math.random() < .2 ? 0 : 8 + Math.random() * 16));
      bar.style.width = p + "%";
      eta.textContent = Math.max(0, Math.ceil((100 - p) / 34)) + " sec";
      if (p < 100) setTimeout(step, 70 + Math.random() * 90);
      else setTimeout(() => { location.href = url.href; }, 140);
    })();
  };

  // サイト内リンクは全部この演出を通す
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    e.preventDefault();
    R.go(u.href);
  });

  /* ---- ページ到着：ブラウン管が点く ---- */
  function crtOn() {
    if (reduce) return;
    const c = el('<div class="crt-on" aria-hidden="true"></div>');
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
  if (document.body) crtOn(); else document.addEventListener("DOMContentLoaded", crtOn);
  // 戻るボタンで戻ってきたとき、演出の画面を消す
  addEventListener("pageshow", (e) => { if (e.persisted) document.querySelectorAll(".w98-trans").forEach((n) => n.remove()); });
})();
