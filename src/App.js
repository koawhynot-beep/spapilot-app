import React, { useState, useEffect, useCallback, Component, useMemo } from 'react';
import {
  Package, Store, Users, ShieldCheck, LogOut, Plus, Trash2, Edit2,
  Search, RefreshCw, Check, X, AlertTriangle, Copy, Megaphone, Settings,
  ChevronRight, ChevronLeft, Eye, EyeOff, Minus, ArrowLeft, Lock,
} from 'lucide-react';
import './App.css';

// ── Config ────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'stockpilot_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

// ── Error Boundary ────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Boundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-screen">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <AlertTriangle size={48} color="#c4453a" style={{ margin: '0 auto 16px' }} />
            <h2>Something went wrong</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>Try reloading the app.</p>
            <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── API client ────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
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
  if (res.status === 204) return null;
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────
function useCollection(path, enabled = true, pollMs = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!enabled) return;
    setError(null);
    api(path)
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [path, enabled]);

  useEffect(() => { if (enabled) reload(); }, [reload, enabled]);

  useEffect(() => {
    if (!enabled || !pollMs) return undefined;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') reload();
    }, pollMs);
    return () => clearInterval(interval);
  }, [enabled, pollMs, reload]);

  return { data, loading, error, reload, setData };
}

// ── Toast ─────────────────────────────────────────────────
const ToastCtx = React.createContext(null);
function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ── Modal ─────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '8px 12px' }} onClick={onClose} aria-label="close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LANDING (pre-auth)
// ═══════════════════════════════════════════════════════════
function LandingScreen({ onStart, onSignIn, onJoinTeam }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <h1>StockPilot</h1>
          <p>Multi-shop inventory tracking made simple.</p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <FeatureRow icon={Store} text="Manage stock across all your shops in one place" />
          <FeatureRow icon={Users} text="Invite your staff with simple one-use codes" />
          <FeatureRow icon={ShieldCheck} text="Big buttons, big text — easy for everyone" />
        </div>

        <button className="btn btn-primary btn-block btn-large" onClick={onStart}>
          Start 7-day free trial
        </button>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, margin: '14px 0 24px' }}>
          $10/month after trial · cancel anytime
        </p>

        <button className="btn btn-ghost btn-block" onClick={onJoinTeam}>
          I have an invite code
        </button>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginTop: 18 }}>
          Already have an account?{' '}
          <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: '#1e3a5f', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
      <div style={{ background: '#e8eef5', borderRadius: 10, padding: 10, color: '#1e3a5f', flexShrink: 0 }}>
        <Icon size={20} />
      </div>
      <div style={{ fontSize: 15, color: '#222', paddingTop: 2 }}>{text}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGN UP (owner)
// ═══════════════════════════════════════════════════════════
function SignupOwnerScreen({ onAuthed, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      const d = await api('/api/auth/signup', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password, businessName: businessName.trim() },
      });
      setToken(d.token);
      onAuthed(d.user, d.business);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="btn btn-ghost" style={{ marginBottom: 20, padding: '10px 16px', minHeight: 'auto', fontSize: 15 }} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="brand">
          <h1>Create account</h1>
          <p>Start your 7-day free trial</p>
        </div>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Your business name</label>
            <input className="input" required placeholder="e.g. Acme Stores" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 50 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 8 }}>
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-large" disabled={busy} type="submit">
            {busy ? 'Creating account…' : 'Create account & start trial'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// JOIN TEAM (staff via invite)
// ═══════════════════════════════════════════════════════════
function JoinTeamScreen({ onAuthed, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      const d = await api('/api/auth/signup-with-code', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password, code: code.trim().toUpperCase() },
      });
      setToken(d.token);
      onAuthed(d.user, d.business);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="btn btn-ghost" style={{ marginBottom: 20, padding: '10px 16px', minHeight: 'auto', fontSize: 15 }} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="brand">
          <h1>Join your team</h1>
          <p>Enter the invite code from your manager</p>
        </div>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Invite code</label>
            <input
              className="input"
              required
              placeholder="6-character code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase' }}
              maxLength={8}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 50 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 8 }}>
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-large" disabled={busy} type="submit">
            {busy ? 'Joining…' : 'Join team'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGN IN
// ═══════════════════════════════════════════════════════════
function SignInScreen({ onAuthed, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const d = await api('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      setToken(d.token);
      onAuthed(d.user, d.business);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="btn btn-ghost" style={{ marginBottom: 20, padding: '10px 16px', minHeight: 'auto', fontSize: 15 }} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="brand">
          <h1>Sign in</h1>
          <p>Welcome back to StockPilot</p>
        </div>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} required autoComplete="current-password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 50 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 8 }}>
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-large" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP (post-auth)
// ═══════════════════════════════════════════════════════════
function MainApp({ user, business, onLogout, onUserUpdate }) {
  const [tab, setTab] = useState('stock');
  const [showSettings, setShowSettings] = useState(false);

  const shops = useCollection('/api/shops', true);
  const [selectedShopId, setSelectedShopId] = useState(null);

  // Auto-select first shop or only shop
  useEffect(() => {
    if (!selectedShopId && shops.data.length > 0) {
      setSelectedShopId(shops.data[0].id);
    }
    if (selectedShopId && !shops.data.find(s => s.id === selectedShopId)) {
      setSelectedShopId(shops.data[0]?.id || null);
    }
  }, [shops.data, selectedShopId]);

  const isOwner = user.role === 'owner';

  const tabs = [
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'shops', label: 'Shops', icon: Store },
    ...(isOwner ? [
      { id: 'team', label: 'Team', icon: Users },
    ] : []),
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>StockPilot</h1>
          <div className="topbar-sub">{business?.name || 'Your business'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', minHeight: 'auto', padding: '10px 14px' }} onClick={() => setShowSettings(true)} aria-label="settings">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="container">
        <TrialBanner user={user} />

        <nav className="nav">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {tab === 'stock' && (
          <StockView
            shops={shops.data}
            selectedShopId={selectedShopId}
            onSelectShop={setSelectedShopId}
            user={user}
            onReloadShops={shops.reload}
          />
        )}
        {tab === 'shops' && (
          <ShopsView shops={shops} isOwner={isOwner} />
        )}
        {tab === 'team' && isOwner && (
          <TeamView />
        )}
        {tab === 'announcements' && (
          <AnnouncementsView user={user} />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
          onUserUpdate={onUserUpdate}
        />
      )}
    </div>
  );
}

// ── Trial banner ──────────────────────────────────────────
function TrialBanner({ user }) {
  if (user.subscriptionStatus === 'active') return null;
  const ends = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft = ends ? Math.max(0, Math.ceil((ends - new Date()) / (24 * 60 * 60 * 1000))) : 0;
  const expired = ends ? new Date() > ends : false;
  if (expired) {
    return (
      <div className="error-banner" style={{ background: 'rgba(196,69,58,0.08)' }}>
        <strong>Your free trial has ended.</strong> Subscribe for $10/month to keep using StockPilot.
      </div>
    );
  }
  if (daysLeft <= 3) {
    return (
      <div style={{ padding: 14, background: 'rgba(214,138,28,0.08)', borderRadius: 12, border: '1px solid rgba(214,138,28,0.3)', color: '#8a5a0e', marginBottom: 16, fontSize: 15 }}>
        <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'} left in your free trial.</strong>
      </div>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// STOCK VIEW
// ═══════════════════════════════════════════════════════════
function StockView({ shops, selectedShopId, onSelectShop, user, onReloadShops }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | item
  const isOwner = user.role === 'owner';
  const perms = isOwner ? { canEditStock: true, canAddItems: true, canDeleteItems: true } : user.permissions || {};

  const loadStock = useCallback(() => {
    if (!selectedShopId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const url = `/api/shops/${selectedShopId}/stock${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    api(url)
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedShopId, search]);

  useEffect(() => { loadStock(); }, [loadStock]);

  if (shops.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <Store size={48} color="#666" style={{ margin: '0 auto' }} />
          <h3>No shops yet</h3>
          <p>Go to the Shops tab to add your first shop, then come back here to track stock.</p>
        </div>
      </div>
    );
  }

  if (!selectedShopId) return <div className="loading">Loading shops…</div>;

  const updateQty = async (item, delta) => {
    const newQty = Math.max(0, item.qty + delta);
    try {
      const updated = await api(`/api/stock/${item.id}/qty`, { method: 'PATCH', body: { qty: newQty } });
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (e) { toast(e.message); }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await api(`/api/stock/${item.id}`, { method: 'DELETE' });
      toast('Item deleted');
      loadStock();
    } catch (e) { toast(e.message); }
  };

  return (
    <div>
      <ShopPicker shops={shops} selectedShopId={selectedShopId} onSelect={onSelectShop} />

      <div className="search-bar">
        <input
          className="input"
          placeholder="Search name, SKU, brand, category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {perms.canAddItems && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={20} /> Add item
          </button>
        )}
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="card">
          <div className="empty">
            <Package size={48} color="#666" style={{ margin: '0 auto' }} />
            <h3>{search ? 'No items match' : 'No stock yet'}</h3>
            <p>{search ? 'Try a different search.' : 'Add your first item to start tracking inventory.'}</p>
            {perms.canAddItems && !search && (
              <button className="btn btn-primary" onClick={() => setModal('new')}>
                <Plus size={18} /> Add first item
              </button>
            )}
          </div>
        </div>
      )}

      {items.map(item => {
        const low = item.qty > 0 && item.qty <= item.threshold;
        const out = item.qty === 0;
        return (
          <div key={item.id} className={`stock-row ${out ? 'out' : low ? 'low' : ''}`}>
            <div className="list-item-main">
              <div className="list-item-title">{item.name}</div>
              <div className="list-item-sub">
                {[item.category, item.brand, item.size, item.color].filter(Boolean).join(' · ') || 'No details'}
                {item.sku && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 13 }}>SKU: {item.sku}</span>}
              </div>
              {out && <span className="badge badge-danger" style={{ marginTop: 6, display: 'inline-block' }}>OUT OF STOCK</span>}
              {low && !out && <span className="badge badge-warning" style={{ marginTop: 6, display: 'inline-block' }}>LOW STOCK</span>}
            </div>
            <button className="qty-btn" disabled={!perms.canEditStock || item.qty === 0} onClick={() => updateQty(item, -1)} aria-label="decrease">
              <Minus size={18} />
            </button>
            <div className={`stock-qty-large ${out ? 'out' : low ? 'low' : ''}`}>{item.qty}</div>
            <button className="qty-btn" disabled={!perms.canEditStock} onClick={() => updateQty(item, 1)} aria-label="increase">
              <Plus size={18} />
            </button>
            <div className="list-item-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
              {perms.canEditStock && (
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => setModal(item)}>
                  <Edit2 size={16} /> Edit
                </button>
              )}
              {perms.canDeleteItems && (
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14, color: '#c4453a' }} onClick={() => removeItem(item)}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      {modal && (
        <StockModal
          item={modal === 'new' ? null : modal}
          shopId={selectedShopId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadStock(); toast(modal === 'new' ? 'Item added' : 'Item updated'); }}
        />
      )}
    </div>
  );
}

function ShopPicker({ shops, selectedShopId, onSelect }) {
  if (shops.length === 0) return null;
  if (shops.length === 1) {
    return (
      <div className="shop-picker">
        <Store size={20} color="#1e3a5f" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{shops[0].name}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="field">
      <label>Shop</label>
      <select className="select" value={selectedShopId || ''} onChange={e => onSelect(Number(e.target.value))}>
        {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

// ── Stock modal ───────────────────────────────────────────
function StockModal({ item, shopId, onClose, onSaved }) {
  const [f, setF] = useState(item ? {
    ...item,
    qty: String(item.qty ?? ''),
    threshold: String(item.threshold ?? ''),
  } : {
    name: '', category: '', size: '', color: '', sku: '', brand: '',
    qty: '0', threshold: '5', supplier: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        ...f,
        qty: f.qty === '' ? 0 : Number(f.qty),
        threshold: f.threshold === '' ? 0 : Number(f.threshold),
      };
      if (item) await api(`/api/stock/${item.id}`, { method: 'PUT', body: payload });
      else      await api(`/api/shops/${shopId}/stock`, { method: 'POST', body: payload });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title={item ? 'Edit item' : 'New item'} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <div className="field">
          <label>Name</label>
          <input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Cotton T-shirt" />
        </div>
        <div className="field">
          <label>Category</label>
          <input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="e.g. Clothing, Accessories" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Brand</label>
            <input className="input" value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>SKU</label>
            <input className="input" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} placeholder="Optional" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Size</label>
            <input className="input" value={f.size} onChange={e => setF({ ...f, size: e.target.value })} placeholder="S, M, L, etc." />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Color</label>
            <input className="input" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} placeholder="Optional" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Quantity</label>
            <input className="input" type="number" min="0" inputMode="numeric" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Low-stock alert</label>
            <input className="input" type="number" min="0" inputMode="numeric" value={f.threshold} onChange={e => setF({ ...f, threshold: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Supplier</label>
          <input className="input" value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} placeholder="Optional" />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea className="textarea" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Optional" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// SHOPS VIEW
// ═══════════════════════════════════════════════════════════
function ShopsView({ shops, isOwner }) {
  const toast = useToast();
  const [modal, setModal] = useState(null);

  const remove = async (shop) => {
    if (!window.confirm(`Delete "${shop.name}" and all its stock?`)) return;
    try {
      await api(`/api/shops/${shop.id}`, { method: 'DELETE' });
      toast('Shop deleted');
      shops.reload();
    } catch (e) { toast(e.message); }
  };

  return (
    <div>
      <div className="card-header" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Your shops</h2>
        {isOwner && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={20} /> Add shop
          </button>
        )}
      </div>

      {shops.loading && <div className="loading">Loading…</div>}
      {shops.error && <div className="error-banner">{shops.error}</div>}

      {!shops.loading && shops.data.length === 0 && (
        <div className="card">
          <div className="empty">
            <Store size={48} color="#666" style={{ margin: '0 auto' }} />
            <h3>No shops yet</h3>
            <p>{isOwner ? 'Add your first shop to start tracking stock.' : 'Your manager hasn\'t added any shops yet.'}</p>
            {isOwner && (
              <button className="btn btn-primary" onClick={() => setModal('new')}>
                <Plus size={18} /> Add first shop
              </button>
            )}
          </div>
        </div>
      )}

      {shops.data.map(shop => (
        <div key={shop.id} className="list-item">
          <Store size={28} color="#1e3a5f" />
          <div className="list-item-main">
            <div className="list-item-title">{shop.name}</div>
            {shop.address && <div className="list-item-sub">{shop.address}</div>}
          </div>
          {isOwner && (
            <div className="list-item-actions">
              <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => setModal(shop)}>
                <Edit2 size={16} /> Edit
              </button>
              <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14, color: '#c4453a' }} onClick={() => remove(shop)}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ))}

      {modal && (
        <ShopModal
          shop={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); shops.reload(); toast(modal === 'new' ? 'Shop added' : 'Shop updated'); }}
        />
      )}
    </div>
  );
}

function ShopModal({ shop, onClose, onSaved }) {
  const [f, setF] = useState(shop || { name: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (shop) await api(`/api/shops/${shop.id}`, { method: 'PUT', body: f });
      else      await api('/api/shops', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title={shop ? 'Edit shop' : 'New shop'} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <div className="field">
          <label>Shop name</label>
          <input className="input" required autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Main Store, Canggu Branch" />
        </div>
        <div className="field">
          <label>Address (optional)</label>
          <input className="input" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="Street, city" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// TEAM VIEW (owner only)
// ═══════════════════════════════════════════════════════════
const PERMISSIONS_DEF = [
  { key: 'canViewStock',         label: 'View stock' },
  { key: 'canEditStock',         label: 'Edit stock quantities' },
  { key: 'canAddItems',          label: 'Add new items' },
  { key: 'canDeleteItems',       label: 'Delete items' },
  { key: 'canViewAllShops',      label: 'View all shops' },
  { key: 'canSendAnnouncements', label: 'Send announcements' },
];

function TeamView() {
  const toast = useToast();
  const staff = useCollection('/api/staff', true);
  const invites = useCollection('/api/invites', true);
  const [editingStaff, setEditingStaff] = useState(null);
  const [busy, setBusy] = useState(false);

  const createInvite = async () => {
    setBusy(true);
    try {
      await api('/api/invites', { method: 'POST', body: {} });
      toast('Invite code created');
      invites.reload();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const copyCode = async (code) => {
    try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch {}
  };

  const revokeInvite = async (id) => {
    try {
      await api(`/api/invites/${id}`, { method: 'DELETE' });
      invites.reload();
      toast('Invite revoked');
    } catch (e) { toast(e.message); }
  };

  const removeStaff = async (member) => {
    if (!window.confirm(`Remove ${member.email} from your team?`)) return;
    try {
      await api(`/api/staff/${member.id}`, { method: 'DELETE' });
      staff.reload();
      toast('Staff removed');
    } catch (e) { toast(e.message); }
  };

  const activeInvites = invites.data.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date());
  const staffOnly = staff.data.filter(m => m.role === 'staff');

  return (
    <div>
      {/* Invite codes */}
      <div className="card">
        <div className="card-header">
          <h2>Invite codes</h2>
          <button className="btn btn-primary" onClick={createInvite} disabled={busy}>
            <Plus size={20} /> Generate code
          </button>
        </div>
        <p style={{ fontSize: 14, color: '#666', marginTop: 0 }}>
          Share a code with new staff. Codes expire in 24 hours and can only be used once.
        </p>
        {activeInvites.length === 0 && (
          <div className="empty" style={{ padding: 24 }}>
            <p>No active invite codes. Generate one above to invite staff.</p>
          </div>
        )}
        {activeInvites.map(inv => {
          const expiresIn = Math.max(0, Math.ceil((new Date(inv.expiresAt) - new Date()) / (60 * 60 * 1000)));
          return (
            <div key={inv.id} className="list-item">
              <div className="list-item-main">
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 3, color: '#1e3a5f' }}>
                  {inv.code}
                </div>
                <div className="list-item-sub">Expires in {expiresIn} hour{expiresIn === 1 ? '' : 's'}</div>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => copyCode(inv.code)}>
                  <Copy size={16} /> Copy
                </button>
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14, color: '#c4453a' }} onClick={() => revokeInvite(inv.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff list */}
      <div className="card">
        <div className="card-header">
          <h2>Staff</h2>
        </div>
        {staffOnly.length === 0 && (
          <div className="empty" style={{ padding: 24 }}>
            <p>No staff yet. Generate an invite code above and share it with your team.</p>
          </div>
        )}
        {staffOnly.map(m => (
          <div key={m.id} className="list-item">
            <div className="list-item-main">
              <div className="list-item-title">{m.email}</div>
              <div className="list-item-sub">
                {Object.entries(m.permissions || {}).filter(([k, v]) => v).length} permission{Object.entries(m.permissions || {}).filter(([k, v]) => v).length === 1 ? '' : 's'} enabled
              </div>
            </div>
            <div className="list-item-actions">
              <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => setEditingStaff(m)}>
                <Lock size={16} /> Permissions
              </button>
              <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14, color: '#c4453a' }} onClick={() => removeStaff(m)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingStaff && (
        <PermissionsModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => { setEditingStaff(null); staff.reload(); toast('Permissions updated'); }}
        />
      )}
    </div>
  );
}

function PermissionsModal({ staff, onClose, onSaved }) {
  const [perms, setPerms] = useState(() => {
    const base = {};
    for (const p of PERMISSIONS_DEF) base[p.key] = !!(staff.permissions && staff.permissions[p.key]);
    return base;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await api(`/api/staff/${staff.id}/permissions`, { method: 'PUT', body: perms });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title={`Permissions for ${staff.email}`} onClose={onClose}>
      {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
      {PERMISSIONS_DEF.map(p => (
        <div key={p.key} className="perm-row">
          <span className="perm-label">{p.label}</span>
          <div className={`toggle ${perms[p.key] ? 'on' : ''}`} onClick={() => setPerms({ ...perms, [p.key]: !perms[p.key] })} role="switch" aria-checked={perms[p.key]} />
        </div>
      ))}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// ANNOUNCEMENTS VIEW
// ═══════════════════════════════════════════════════════════
function AnnouncementsView({ user }) {
  const toast = useToast();
  const announcements = useCollection('/api/announcements', true, 60000);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const canSend = user.role === 'owner' || (user.permissions && user.permissions.canSendAnnouncements);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api('/api/announcements', { method: 'POST', body: { body: body.trim() } });
      setBody('');
      announcements.reload();
      toast('Announcement sent');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {canSend && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>New announcement</h2>
          <form onSubmit={send}>
            <div className="field">
              <textarea className="textarea" placeholder="Tell your team something…" value={body} onChange={e => setBody(e.target.value)} required maxLength={2000} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || !body.trim()} type="submit">
              <Megaphone size={18} /> Send to team
            </button>
          </form>
        </div>
      )}

      <h2 style={{ margin: '24px 0 16px' }}>Recent announcements</h2>
      {announcements.loading && <div className="loading">Loading…</div>}
      {!announcements.loading && announcements.data.length === 0 && (
        <div className="card">
          <div className="empty" style={{ padding: 24 }}>
            <Megaphone size={36} color="#666" style={{ margin: '0 auto' }} />
            <p>No announcements yet.</p>
          </div>
        </div>
      )}
      {announcements.data.map(a => (
        <div key={a.id} className="card">
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            {a.authorEmail || 'Team'} · {new Date(a.createdAt).toLocaleString()}
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.body}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ user, onClose, onLogout, onUserUpdate }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delErr, setDelErr] = useState(null);

  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000))) : 0;
  const isPaid = user.subscriptionStatus === 'active';

  const subscribe = async () => {
    setBusy(true);
    try {
      const d = await api('/api/billing/subscribe', { method: 'POST', body: {} });
      if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else toast(d.message || 'Coming soon');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/auth/export-data`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `stockpilot-data-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Data exported');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setDelErr(null);
    if (delConfirm !== 'DELETE') { setDelErr('Type DELETE to confirm'); return; }
    if (!delPw) { setDelErr('Password required'); return; }
    setBusy(true);
    try {
      await api('/api/auth/account', { method: 'DELETE', body: { password: delPw, confirmation: 'DELETE' } });
      toast('Account deleted');
      onLogout();
    } catch (e) { setDelErr(e.message); setBusy(false); }
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Email</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{user.email}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Role</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{user.role === 'owner' ? 'Owner' : 'Staff'}</div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, background: isPaid ? 'rgba(45,134,89,0.06)' : 'rgba(214,138,28,0.06)', borderRadius: 12, border: `1px solid ${isPaid ? 'rgba(45,134,89,0.2)' : 'rgba(214,138,28,0.2)'}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          {isPaid ? 'Active subscription — $10/month' : `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
        </div>
        {!isPaid && (
          <button className="btn btn-primary btn-block" onClick={subscribe} disabled={busy} style={{ marginTop: 10 }}>
            Subscribe — $10/month
          </button>
        )}
      </div>

      <button className="btn btn-ghost btn-block" onClick={exportData} disabled={busy} style={{ marginBottom: 10 }}>
        Export my data
      </button>

      <button className="btn btn-ghost btn-block" onClick={onLogout} style={{ marginBottom: 24 }}>
        <LogOut size={18} /> Sign out
      </button>

      <div style={{ paddingTop: 18, borderTop: '1px solid #e0e4eb' }}>
        {!showDelete ? (
          <button className="btn btn-ghost btn-block" style={{ color: '#c4453a' }} onClick={() => setShowDelete(true)}>
            <Trash2 size={18} /> Delete account
          </button>
        ) : (
          <div style={{ padding: 14, background: 'rgba(196,69,58,0.06)', borderRadius: 12, border: '1px solid rgba(196,69,58,0.3)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#c4453a', marginBottom: 10 }}>
              This permanently deletes your account and all data. Cannot be undone.
            </div>
            <input className="input" type="password" placeholder="Password" value={delPw} onChange={e => { setDelErr(null); setDelPw(e.target.value); }} style={{ marginBottom: 8 }} />
            <input className="input" type="text" placeholder="Type DELETE" value={delConfirm} onChange={e => { setDelErr(null); setDelConfirm(e.target.value); }} style={{ marginBottom: 8 }} />
            {delErr && <div style={{ color: '#c4453a', fontSize: 13, marginBottom: 8 }}>{delErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowDelete(false); setDelPw(''); setDelConfirm(''); setDelErr(null); }}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={deleteAccount}>{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
function AppInner() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState(null); // null | 'landing' | 'signup' | 'join' | 'signin'

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); setAuthMode('landing'); return; }
    api('/api/auth/me')
      .then(d => { setUser(d.user); setBusiness(d.business); setChecking(false); })
      .catch(() => { setToken(null); setChecking(false); setAuthMode('landing'); });
  }, []);

  useEffect(() => {
    const handler = () => { setUser(null); setBusiness(null); setAuthMode('landing'); };
    window.addEventListener('app:unauth', handler);
    return () => window.removeEventListener('app:unauth', handler);
  }, []);

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch {}
    setToken(null);
    setUser(null);
    setBusiness(null);
    setAuthMode('landing');
  };

  if (checking) {
    return (
      <div className="auth-screen">
        <div className="loading">
          <RefreshCw size={28} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'signup') return <SignupOwnerScreen onAuthed={(u, b) => { setUser(u); setBusiness(b); }} onBack={() => setAuthMode('landing')} />;
    if (authMode === 'join')   return <JoinTeamScreen   onAuthed={(u, b) => { setUser(u); setBusiness(b); }} onBack={() => setAuthMode('landing')} />;
    if (authMode === 'signin') return <SignInScreen     onAuthed={(u, b) => { setUser(u); setBusiness(b); }} onBack={() => setAuthMode('landing')} />;
    return <LandingScreen
      onStart={() => setAuthMode('signup')}
      onSignIn={() => setAuthMode('signin')}
      onJoinTeam={() => setAuthMode('join')}
    />;
  }

  return <MainApp user={user} business={business} onLogout={logout} onUserUpdate={setUser} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </ErrorBoundary>
  );
}
