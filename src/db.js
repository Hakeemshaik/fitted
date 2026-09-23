/* Small state in localStorage, photos in IndexedDB (localStorage fills up after a few dozen photos). */

export const store = {
  get(k, d) { try { const v = localStorage.getItem('fitted:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fitted:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

const DB = 'fitted', ST = 'img';
let dbp = null;
function open() {
  if (!dbp) dbp = new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
  return dbp;
}
const tx = (mode, fn) => open().then(db => new Promise((res, rej) => {
  const t = db.transaction(ST, mode), s = t.objectStore(ST), out = fn(s);
  t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
  t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
}));

export const imgs = {
  ok: () => open().then(() => true, () => false),
  put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
  del: id => tx('readwrite', s => s.delete(id)).catch(() => {}),
  /** Map of id -> Blob for every stored photo. */
  all: () => open().then(db => new Promise((res, rej) => {
    const out = {}, r = db.transaction(ST, 'readonly').objectStore(ST).openCursor();
    r.onsuccess = () => { const c = r.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
    r.onerror = () => rej(r.error);
  })).catch(() => ({}))
};

export const blobToDataUrl = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
export const dataUrlToBlob = d => fetch(d).then(r => r.blob());
