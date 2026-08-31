// ── Server access ─────────────────────────────────────────
// One place that knows the base URL, the token and what a failure means, so
// every screen reports the same thing when the server is down.
const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'mitrasamadi_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

// Money is Indonesian Rupiah everywhere in this app.
export const idr = (n) =>
  'IDR ' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    if (!navigator.onLine) throw new Error("You're offline. Check your internet.");
    throw new Error("Can't reach the server. It may be starting up — try again in a moment.");
  }
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('app:unauth'));
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    if (res.status >= 500) msg = `Server error (${res.status}). Try again.`;
    throw new Error(msg);
  }
  return res;
}

export async function api(path, opts = {}) {
  const res = await request(path, opts);
  if (res.status === 204) return null;
  return res.json();
}

// A CSV download needs the auth header, so it cannot be a plain <a href>.
// Fetched as a blob and handed to the browser under the filename the server
// asked for in Content-Disposition.
export async function download(path) {
  const res = await request(path);
  const blob = await res.blob();
  const disp = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(disp);
  const name = match ? match[1] : path.split('?')[0].split('/').pop() || 'export.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return name;
}
