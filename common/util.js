// ---------- small helpers every tool needs ----------
// Per-browser settings in localStorage. Every access is guarded: a blocked or full store just means nothing is remembered.
const Prefs = {
  get(k, def = null){ try { const v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; } },   // a string
  set(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} },     // null removes it
  json(k, def = null){ try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } },
  setJson(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
// hand a file to the browser's downloads (bytes, text or a Blob)
function saveFile(data, name, type = 'application/octet-stream'){
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);   // generous: a big recording may take a moment to start saving
}
