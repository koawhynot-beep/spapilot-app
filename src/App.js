import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import {
  Package, Store, Plus, Trash2, Edit2,
  RefreshCw, Check, X, AlertTriangle, Copy, Settings,
  ChevronRight, Minus, ScanLine, Search, SlidersHorizontal,
  MoreHorizontal, Sun, Moon, Printer,
  Calendar, FolderOpen, FolderPlus, History, TrendingUp, TrendingDown,
} from 'lucide-react';
import './App.css';

// ── Config ────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'mitrasamadi_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

// Money is Indonesian Rupiah everywhere in this app.
const idr = (n) => 'IDR ' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// ── Fabric blocks ─────────────────────────────────────────
// The owner reads her stock fabric by fabric — all the cotton geisha, then
// all the cotton bubble. When the list is in fabric order we break it into
// labelled blocks with a gap before each, so scrolling past a heading tells
// her she has moved on to the next fabric. Any other sort order has no
// fabric runs to label, so the headings are suppressed there.
const fabricOf = (it) => ((it && it.fabric) || '').trim() || 'Other';
const isFabricGrouped = (sort) => sort === 'fabric-color';

// True for the first row of each fabric run.
const startsFabricBlock = (list, i) =>
  i === 0 || fabricOf(list[i - 1]) !== fabricOf(list[i]);

// { 'COTTON GEISHA': 42, … } — shown beside each heading.
const countByFabric = (list) => {
  const counts = {};
  for (const it of list) counts[fabricOf(it)] = (counts[fabricOf(it)] || 0) + 1;
  return counts;
};

const productCount = (n) => `${(n || 0).toLocaleString()} product${n === 1 ? '' : 's'}`;

// Sizes and styles of one colour belong together — no gap between them. The
// break she wants to see is the colour changing, so that is the only place a
// gap opens (a fabric change gets its own heading instead).
const colourKey = (it) => `${fabricOf(it)}|||${((it && it.color) || '').trim()}`;

// True for the last row of a colour run, unless the fabric changes next —
// in that case the fabric heading already provides the separation.
const endsColourBlock = (list, i) => {
  const next = list[i + 1];
  if (!next) return false;
  if (fabricOf(list[i]) !== fabricOf(next)) return false;
  return colourKey(list[i]) !== colourKey(next);
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
            <AlertTriangle size={48} color="var(--bad)" style={{ margin: '0 auto 16px' }} />
            <h2>Something went wrong</h2>
            <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Try reloading the app.</p>
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

// ── Shared UI primitives ──────────────────────────────────

// Search box with a leading icon and an inline clear button.
function SearchField({ value, onChange, placeholder }) {
  return (
    <div className="search-wrap">
      <Search size={17} className="search-icon" />
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="clear search">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// "•••" overflow menu. Collapses secondary row actions to one control.
function RowMenu({ children, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`menu-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button type="button" className={`menu-item ${danger ? 'is-danger' : ''}`} onClick={onClick} role="menuitem">
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

// Progressive disclosure: hides secondary content until asked for.
function Disclosure({ title, tail, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disclosure">
      <button
        type="button"
        className="disclosure-btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <ChevronRight size={16} className="disclosure-chev" />
        {title}
        {tail && <span className="disclosure-tail">{tail}</span>}
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  );
}

// Light / dark switch. index.html has already applied the stored (or
// system) choice before paint; this just reads it back and flips it.
function ThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  const toggle = () => {
    // Read the DOM rather than state: the <head> script owns the initial
    // value, so state is a mirror and could drift.
    const next = document.documentElement.getAttribute('data-theme') !== 'dark';
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('ms-theme', next ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next ? '#16130f' : '#f2efe9');
  };

  // Labelled, not just an icon: the light (cream) theme already existed but
  // was impossible to find behind a bare moon, so the app looked dark to
  // anyone whose phone is set to dark mode.
  return (
    <button
      className="topbar-btn topbar-btn-labelled"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

// ── Shop scope ────────────────────────────────────────────
// Looking at one shop is the everyday case and must be one tap. Combining a
// couple of shops is rare, so it hides behind "Compare shops" rather than
// making her unclick "All shops" before every single look.
// Value is an array of shop ids; empty means every shop.
function ShopScope({ shops, value, onChange, label = 'Showing' }) {
  const [combining, setCombining] = useState(value.length > 1);
  if (shops.length < 2) return null;

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  };

  if (!combining) {
    const single = value.length === 1 ? String(value[0]) : 'all';
    return (
      <div className="scope-picker">
        <span className="scope-picker-label">{label}</span>
        <select
          className="select select-inline"
          value={single}
          onChange={e => onChange(e.target.value === 'all' ? [] : [Number(e.target.value)])}
          aria-label="Which shop"
        >
          <option value="all">All shops</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          type="button"
          className="scope-link"
          onClick={() => { setCombining(true); if (value.length < 1) onChange([shops[0].id]); }}
        >
          Compare shops
        </button>
      </div>
    );
  }

  return (
    <div className="scope-picker">
      <span className="scope-picker-label">Comparing</span>
      {shops.map(s => (
        <button
          key={s.id}
          type="button"
          className={`scope-chip ${value.includes(s.id) ? 'is-active' : ''}`}
          onClick={() => toggle(s.id)}
        >
          {s.name}
        </button>
      ))}
      <button
        type="button"
        className="scope-link"
        onClick={() => { setCombining(false); onChange([]); }}
      >
        Done
      </button>
    </div>
  );
}

// ── Who is scanning ───────────────────────────────────────
// Remembered per device, so the shop tablet keeps whoever is on shift rather
// than asking on every scan.
const STAFF_KEY = 'ms-staff-id';
const readStaffId = () => {
  try { const v = localStorage.getItem(STAFF_KEY); return v ? Number(v) : null; } catch (e) { return null; }
};
const writeStaffId = (id) => {
  try {
    if (id) localStorage.setItem(STAFF_KEY, String(id));
    else localStorage.removeItem(STAFF_KEY);
  } catch (e) { /* ignore */ }
};

// Stat card. Clickable variants double as the stock-status filter.
function StatCard({ value, label, tone, active, onClick }) {
  const cls = `stat-card ${tone ? `tone-${tone}` : ''} ${active ? 'is-active' : ''}`;
  const body = (
    <>
      <div className="stat-num">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="stat-label">
        {tone && <span className="stat-dot" aria-hidden="true" />}
        {label}
      </div>
    </>
  );
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={!!active}>
      {body}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP (post-auth)
// ═══════════════════════════════════════════════════════════
function MainApp({ user, business }) {
  const [tab, setTab] = useState('stock');
  const [showSettings, setShowSettings] = useState(false);
  // Set when Overview's "Restock" jumps to the Stock tab pre-filtered to one SKU.
  const [stockJump, setStockJump] = useState(null);

  const shops = useCollection('/api/shops', true);
  const staff = useCollection('/api/staff', true);
  const [showStaff, setShowStaff] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState(null);

  // Auto-select first shop or only shop
  useEffect(() => {
    if (!selectedShopId && shops.data.length > 0) {
      setSelectedShopId(shops.data[0].id);
    }
    if (selectedShopId && selectedShopId !== 'all' && !shops.data.find(s => s.id === selectedShopId)) {
      setSelectedShopId(shops.data[0]?.id || null);
    }
  }, [shops.data, selectedShopId]);

  const isOwner = user.role === 'owner';

  const tabs = [
    { id: 'sell', label: 'Sell', icon: ScanLine },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: History },
    { id: 'shops', label: 'Shops', icon: Store },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Mitra Samadi</h1>
          <div className="topbar-sub">{business?.name || 'Your business'}</div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button className="topbar-btn" onClick={() => setShowSettings(true)} aria-label="settings">
            <Settings size={19} />
          </button>
        </div>
      </div>

      <div className="container">
        <nav className="nav">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {tab === 'sell' && (
          <SellView
            shops={shops.data}
            staff={staff.data}
            onManageStaff={() => setShowStaff(true)}
          />
        )}
        {tab === 'stock' && (
          <StockView
            shops={shops.data}
            selectedShopId={selectedShopId}
            onSelectShop={setSelectedShopId}
            user={user}
            onReloadShops={shops.reload}
            jump={stockJump}
            onJumpHandled={() => setStockJump(null)}
          />
        )}
        {tab === 'overview' && (
          <OverviewView shops={shops.data} />
        )}
        {tab === 'sales' && (
          <SalesView
            shops={shops.data}
            onFindStock={(sku) => { setStockJump({ sku, at: Date.now() }); setTab('stock'); }}
          />
        )}
        {tab === 'reports' && (
          <ReportsView shops={shops.data} />
        )}
        {tab === 'shops' && (
          <ShopsView shops={shops} isOwner={isOwner} />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onManageStaff={() => { setShowSettings(false); setShowStaff(true); }}
        />
      )}

      {showStaff && (
        <StaffModal
          staff={staff.data}
          shops={shops.data}
          onClose={() => setShowStaff(false)}
          onChanged={staff.reload}
        />
      )}
    </div>
  );
}

// ── Trial banner ──────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// STOCK VIEW
// ═══════════════════════════════════════════════════════════
function StockView({ shops, selectedShopId, onSelectShop, user, onReloadShops, jump, onJumpHandled }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);      // null | 'new' | item
  const [logModal, setLogModal] = useState(null); // null | item
  const [groupModalItem, setGroupModalItem] = useState(null); // item being moved
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all'); // 'all' | numeric id (as string)
  const [groupSelectorOpen, setGroupSelectorOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in' | 'low' | 'out'
  const [styleFilter, setStyleFilter] = useState('');
  const [fabricFilter, setFabricFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [facets, setFacets] = useState({ styles: [], fabrics: [], colors: [], sizes: [] });
  // Default browse order: fabric → colour → style.
  const [sortBy, setSortBy] = useState('fabric-color');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);   // product with "Details" open
  const isOwner = user.role === 'owner';
  const perms = isOwner ? { canEditStock: true, canAddItems: true, canDeleteItems: true } : user.permissions || {};
  const isAll = selectedShopId === 'all';  // combined read-only view across all shops

  const loadGroups = useCallback(() => {
    if (!selectedShopId || selectedShopId === 'all') { setGroups([]); return; }
    api(`/api/shops/${selectedShopId}/groups`)
      .then(d => setGroups(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [selectedShopId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Reset to "all" if currently-selected group disappears (e.g. shop switch)
  useEffect(() => {
    if (selectedGroup === 'all') return;
    if (!groups.find(g => String(g.id) === String(selectedGroup))) {
      setSelectedGroup('all');
    }
  }, [groups, selectedGroup]);

  const loadStock = useCallback(() => {
    if (!selectedShopId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (styleFilter) params.set('style', styleFilter);
    if (fabricFilter) params.set('fabric', fabricFilter);
    if (colorFilter) params.set('color', colorFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    params.set('sort', sortBy);

    if (selectedShopId === 'all') {
      // Combined view — aggregate across every shop (read-only).
      const qs = params.toString();
      api(`/api/business/stock-overview${qs ? `?${qs}` : ''}`)
        .then(d => {
          const items = (d?.items || []).map((it, i) => ({
            id: `all-${it.sku || i}-${i}`,
            name: it.name,
            sku: it.sku,
            category: it.style,
            fabric: it.fabric,
            color: it.color,
            size: it.size,
            price: it.price,
            qty: it.total || 0,
            threshold: 5,
            byShop: it.byShop || {},
          }));
          setItems(items);
          setLoading(false);
        })
        .catch(e => { setError(e.message); setLoading(false); });
      return;
    }

    if (selectedGroup !== 'all') params.set('group', selectedGroup);
    const qs = params.toString();
    const url = `/api/shops/${selectedShopId}/stock${qs ? `?${qs}` : ''}`;
    api(url)
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedShopId, search, selectedGroup, styleFilter, fabricFilter, colorFilter, sizeFilter, sortBy]);

  useEffect(() => { loadStock(); }, [loadStock]);

  // Load distinct style/fabric/color/size values for the current shop (populates dropdowns).
  const EMPTY_FACETS = { styles: [], fabrics: [], colors: [], sizes: [] };
  useEffect(() => {
    if (!selectedShopId) { setFacets(EMPTY_FACETS); return; }
    const url = selectedShopId === 'all' ? '/api/business/facets' : `/api/shops/${selectedShopId}/facets`;
    api(url)
      .then(d => setFacets({
        styles: Array.isArray(d?.styles) ? d.styles : [],
        fabrics: Array.isArray(d?.fabrics) ? d.fabrics : [],
        colors: Array.isArray(d?.colors) ? d.colors : [],
        sizes: Array.isArray(d?.sizes) ? d.sizes : [],
      }))
      .catch(() => setFacets(EMPTY_FACETS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopId]);

  // Reset filters when shop changes so a filter from shop A doesn't carry to shop B (may not apply).
  useEffect(() => {
    setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter('');
  }, [selectedShopId]);

  // Overview's "Restock" hands us a SKU — search for it and clear other narrowing.
  useEffect(() => {
    if (!jump) return;
    setSearch(jump.sku);
    setStatusFilter('all');
    setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter('');
    onJumpHandled();
  }, [jump, onJumpHandled]);

  const activeFilterCount =
    (styleFilter ? 1 : 0) + (fabricFilter ? 1 : 0) + (colorFilter ? 1 : 0) +
    (sizeFilter ? 1 : 0) + (selectedGroup !== 'all' ? 1 : 0);

  const moveItemToGroup = async (item, groupId) => {
    try {
      const updated = await api(`/api/stock/${item.id}/group`, { method: 'PATCH', body: { groupId } });
      setItems(items.map(i => i.id === item.id ? updated : i));
      setGroupModalItem(null);
      toast(groupId ? 'Moved to group' : 'Removed from group');
      // If a filter is active, the item may now be filtered out — reload to sync
      if (selectedGroup !== 'all') loadStock();
    } catch (e) { toast(e.message); }
  };

  // ── Drag-and-drop reorder ─────────────────────────────────
  const onDragStartRow = (id) => (e) => {
    if (!perms.canEditStock) { e.preventDefault(); return; }
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(id)); } catch {}
  };
  const onDragOverRow = (id) => (e) => {
    if (!dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(id);
  };
  const onDragLeaveRow = (id) => () => {
    if (overId === id) setOverId(null);
  };
  const onDropRow = (targetId) => async (e) => {
    e.preventDefault();
    const src = dragId;
    setDragId(null); setOverId(null);
    if (!src || src === targetId) return;
    const srcIdx = items.findIndex(i => i.id === src);
    const tgtIdx = items.findIndex(i => i.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const next = [...items];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    setItems(next);
    try {
      await api(`/api/shops/${selectedShopId}/stock/reorder`, {
        method: 'PATCH',
        body: { orderedIds: next.map(i => i.id) },
      });
    } catch (e) {
      toast(e.message);
      loadStock();
    }
  };
  const onDragEndRow = () => { setDragId(null); setOverId(null); };

  // Sorting happens server-side; only the stock-status filter is client-side.
  const displayedItems = useMemo(() => {
    if (statusFilter === 'in')  return items.filter(i => i.qty > i.threshold);
    if (statusFilter === 'low') return items.filter(i => i.qty > 0 && i.qty <= i.threshold);
    if (statusFilter === 'out') return items.filter(i => i.qty === 0);
    return items;
  }, [items, statusFilter]);

  // ── Aggregate summary for visible shop scope ─────────────
  const summary = useMemo(() => {
    let totalItems = 0, totalUnits = 0, inStockCount = 0, lowCount = 0, outCount = 0;
    for (const i of items) {
      totalItems += 1;
      totalUnits += i.qty || 0;
      if (i.qty === 0) outCount += 1;
      else if (i.qty <= i.threshold) lowCount += 1;
      else inStockCount += 1;   // healthy — above the low threshold
    }
    return { totalItems, totalUnits, inStockCount, lowCount, outCount };
  }, [items]);

  // Fabric headings only make sense while the list is in fabric order.
  const fabricBlocks = isFabricGrouped(sortBy);
  const fabricCounts = useMemo(
    () => (fabricBlocks ? countByFabric(displayedItems) : {}),
    [fabricBlocks, displayedItems]
  );

  const dragEnabled = perms.canEditStock && sortBy === 'custom' && statusFilter === 'all' && !isAll;

  if (shops.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <Store size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
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

  const currentGroup = groups.find(g => String(g.id) === String(selectedGroup));

  return (
    <div>
      {/* Row 1 — the three things needed most often. */}
      <div className="toolbar">
        <ShopPicker shops={shops} selectedShopId={selectedShopId} onSelect={onSelectShop} />
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search name, fabric, colour, size, code…"
        />
        {perms.canAddItems && !isAll && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={18} /> Add item
          </button>
        )}
      </div>

      {/* Row 2 — everything else stays folded away until asked for. */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-toggle ${filtersOpen ? 'is-open' : ''}`}
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
        {(summary.lowCount + summary.outCount) > 0 && !isAll && (
          <button type="button" className="filter-toggle" onClick={() => setReorderOpen(true)}>
            <AlertTriangle size={16} />
            Reorder list
            <span className="filter-count">{summary.lowCount + summary.outCount}</span>
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="filter-panel">
          {facets.styles.length > 0 && (
            <div className="field">
              <label>Style</label>
              <select className="select" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
                <option value="">All styles ({facets.styles.length})</option>
                {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {facets.fabrics.length > 0 && (
            <div className="field">
              <label>Fabric</label>
              <select className="select" value={fabricFilter} onChange={e => setFabricFilter(e.target.value)}>
                <option value="">All fabrics ({facets.fabrics.length})</option>
                {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          {facets.colors.length > 0 && (
            <div className="field">
              <label>Colour</label>
              <select className="select" value={colorFilter} onChange={e => setColorFilter(e.target.value)}>
                <option value="">All colours ({facets.colors.length})</option>
                {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {facets.sizes.length > 0 && (
            <div className="field">
              <label>Size</label>
              <select className="select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                <option value="">All sizes ({facets.sizes.length})</option>
                {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {!isAll && (
            <div className="field">
              <label>Group</label>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ justifyContent: 'space-between' }}
                onClick={() => setGroupSelectorOpen(true)}
              >
                {currentGroup ? currentGroup.name : 'All groups'}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <div className="field">
            <label>Sort</label>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="fabric-color">Fabric → Colour → Style</option>
              <option value="color">Colour A–Z</option>
              <option value="style">Style A–Z</option>
              <option value="name">Product name A–Z</option>
              <option value="qty-asc">Quantity (low first)</option>
              <option value="qty-desc">Quantity (high first)</option>
              {!isAll && <option value="custom">Custom (drag to reorder)</option>}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="filter-panel-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter('');
                  setSelectedGroup('all');
                }}
              >
                <X size={15} /> Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* The three numbers that matter — and the primary way to slice the list.
          The scope note matters: per-shop counts are naturally larger than the
          all-shops ones, because a product can be empty here but stocked elsewhere. */}
      <p className="scope-note">
        {isAll
          ? 'Counted across all shops combined.'
          : `Counted at ${shops.find(s => s.id === selectedShopId)?.name || 'this shop'} only — a product can be out here but still in stock at another shop.`}
      </p>
      <div className="stat-grid">
        <StatCard
          value={summary.inStockCount}
          label="In stock"
          tone="good"
          active={statusFilter === 'in'}
          onClick={() => setStatusFilter(statusFilter === 'in' ? 'all' : 'in')}
        />
        <StatCard
          value={summary.lowCount}
          label="Low stock"
          tone="warn"
          active={statusFilter === 'low'}
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
        />
        <StatCard
          value={summary.outCount}
          label="Out of stock"
          tone="bad"
          active={statusFilter === 'out'}
          onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
        />
      </div>

      <Disclosure
        title="Totals"
        tail={`${summary.totalItems.toLocaleString()} products · ${summary.totalUnits.toLocaleString()} pieces`}
      >
        <div className="metric-row">
          <div>
            <div className="metric-label">Different products</div>
            <div className="metric-value">{summary.totalItems.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>each colour and size counts once</div>
          </div>
          <div>
            <div className="metric-label">Total pieces</div>
            <div className="metric-value">{summary.totalUnits.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>actual garments on the rails</div>
          </div>
          <div>
            <div className="metric-label">Need reordering</div>
            <div className="metric-value">{(summary.lowCount + summary.outCount).toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>low stock plus out of stock</div>
          </div>
        </div>
      </Disclosure>

      {statusFilter !== 'all' && (
        <div className="filter-bar">
          <button type="button" className="filter-toggle is-open" onClick={() => setStatusFilter('all')}>
            {statusFilter === 'in' ? 'In stock' : statusFilter === 'low' ? 'Low stock' : 'Out of stock'} only
            <X size={15} />
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && displayedItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <Package size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
            <h3>{search ? 'No items match' : statusFilter !== 'all' ? `No ${statusFilter === 'low' ? 'low-stock' : 'out-of-stock'} items` : 'No stock yet'}</h3>
            <p>{search ? 'Try a different search.' : statusFilter !== 'all' ? 'Switch back to All to see everything.' : 'Add your first item to start tracking inventory.'}</p>
            {perms.canAddItems && !search && statusFilter === 'all' && (
              <button className="btn btn-primary" onClick={() => setModal('new')}>
                <Plus size={18} /> Add first item
              </button>
            )}
          </div>
        </div>
      )}

      {displayedItems.map((item, i) => {
        const showFabricHead = fabricBlocks && startsFabricBlock(displayedItems, i);
        const low = item.qty > 0 && item.qty <= item.threshold;
        const out = item.qty === 0;
        const itemGroup = groups.find(g => g.id === item.groupId);
        const isDragging = dragId === item.id;
        const isOver = overId === item.id && dragId !== null && dragId !== item.id;
        const expanded = expandedId === item.id;
        // One line: STYLE · FABRIC · PRINT · COLOUR · SIZE · BRAND.
        const title = [item.category, item.fabric, item.print, item.color, item.size, item.brand]
          .filter(Boolean).join(' · ') || item.name;
        return (
          <React.Fragment key={item.id}>
          {showFabricHead && (
            <div className="fabric-head">
              <span className="fabric-head-name">{fabricOf(item)}</span>
              <span className="fabric-head-count">
                {productCount(fabricCounts[fabricOf(item)])}
              </span>
            </div>
          )}
          <div
            className={`product ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''} ${dragEnabled ? 'draggable' : ''}`}
            draggable={dragEnabled}
            onDragStart={dragEnabled ? onDragStartRow(item.id) : undefined}
            onDragEnd={dragEnabled ? onDragEndRow : undefined}
            onDragOver={dragEnabled ? onDragOverRow(item.id) : undefined}
            onDragLeave={dragEnabled ? onDragLeaveRow(item.id) : undefined}
            onDrop={dragEnabled ? onDropRow(item.id) : undefined}
            title={dragEnabled ? 'Drag to reorder' : undefined}
          >
            <div className="product-top">
              {item.imageUrl && (
                <button
                  type="button"
                  className="product-thumb-btn"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.imageUrl); }}
                  aria-label="View photo"
                  draggable={false}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="product-thumb"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    draggable={false}
                  />
                </button>
              )}

              <div className="product-text">
                <div className="product-name">{title}</div>
                <div className="product-meta">
                  {item.sku && <span className="product-sku">{item.sku}</span>}
                  {item.sku && Number(item.price) > 0 && <span className="dot-sep">·</span>}
                  {Number(item.price) > 0 && <span className="product-price">{idr(item.price)}</span>}
                  {out && <span className="pill pill-bad">Out of stock</span>}
                  {low && <span className="pill pill-warn">Low stock</span>}
                </div>
              </div>

              {isAll ? (
                <div className="qty-value">{item.qty}</div>
              ) : (
                <div className="qty-group">
                  <button className="qty-btn" disabled={!perms.canEditStock || item.qty === 0} onClick={() => updateQty(item, -1)} aria-label="decrease">
                    <Minus size={16} />
                  </button>
                  <div className="qty-value">{item.qty}</div>
                  <button className="qty-btn" disabled={!perms.canEditStock} onClick={() => updateQty(item, 1)} aria-label="increase">
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {!isAll && (perms.canEditStock || perms.canDeleteItems) && (
                <RowMenu label={`Actions for ${item.name}`}>
                  {perms.canEditStock && <MenuItem icon={Calendar} onClick={() => setLogModal(item)}>Log entry</MenuItem>}
                  {perms.canEditStock && (
                    <MenuItem icon={FolderOpen} onClick={() => setGroupModalItem(item)}>
                      {itemGroup ? 'Move group' : 'Add to group'}
                    </MenuItem>
                  )}
                  {perms.canEditStock && <MenuItem icon={Edit2} onClick={() => setModal(item)}>Edit</MenuItem>}
                  {perms.canDeleteItems && <div className="menu-sep" />}
                  {perms.canDeleteItems && <MenuItem icon={Trash2} danger onClick={() => removeItem(item)}>Delete</MenuItem>}
                </RowMenu>
              )}
            </div>

            <button
              type="button"
              className="details-btn"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              aria-expanded={expanded}
            >
              {expanded ? 'Hide details' : 'Details'}
              <ChevronRight
                size={13}
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}
              />
            </button>

            {expanded && (
              <div className="details-body">
                {item.name && title !== item.name && (
                  <div><div className="detail-k">Product</div><div className="detail-v">{item.name}</div></div>
                )}
                {Number(item.price) > 0 && (
                  <div>
                    <div className="detail-k">Stock value</div>
                    <div className="detail-v">{idr(item.qty * Number(item.price))}</div>
                  </div>
                )}
                <div><div className="detail-k">Low-stock alert</div><div className="detail-v">{item.threshold}</div></div>
                {item.supplier && (
                  <div><div className="detail-k">Supplier</div><div className="detail-v">{item.supplier}</div></div>
                )}
                {item.createdAt && (
                  <div>
                    <div className="detail-k">Stocked</div>
                    <div className="detail-v">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                )}
                {item.lastSoldAt && (
                  <div>
                    <div className="detail-k">Last sold</div>
                    <div className="detail-v">{new Date(item.lastSoldAt).toLocaleDateString()}</div>
                  </div>
                )}
                {itemGroup && (
                  <div>
                    <div className="detail-k">Group</div>
                    <div className="detail-v"><span className="group-tag"><FolderOpen size={11} /> {itemGroup.name}</span></div>
                  </div>
                )}
                {isAll && Object.keys(item.byShop || {}).length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="detail-k">By shop</div>
                    <div className="detail-v" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {Object.entries(item.byShop).map(([shopName, q]) => (
                        <span key={shopName}>{shopName}: <strong>{q}</strong></span>
                      ))}
                    </div>
                  </div>
                )}
                {item.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="detail-k">Notes</div>
                    <div className="detail-v">{item.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          </React.Fragment>
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

      {logModal && (
        <MovementModal
          item={logModal}
          onClose={() => setLogModal(null)}
          onSaved={() => { setLogModal(null); loadStock(); toast('Entry saved'); }}
        />
      )}

      {groupModalItem && (
        <MoveToGroupModal
          item={groupModalItem}
          groups={groups}
          onClose={() => setGroupModalItem(null)}
          onPick={(groupId) => moveItemToGroup(groupModalItem, groupId)}
          onAddGroup={async (name) => {
            try {
              const g = await api(`/api/shops/${selectedShopId}/groups`, { method: 'POST', body: { name } });
              setGroups([...groups, g]);
              return g;
            } catch (e) { toast(e.message); return null; }
          }}
        />
      )}

      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      {reorderOpen && (
        <ReorderReportModal
          items={items}
          onClose={() => setReorderOpen(false)}
        />
      )}

      {groupSelectorOpen && (
        <GroupSelectorModal
          groups={groups}
          selectedGroup={selectedGroup}
          canDelete={perms.canDeleteItems}
          canAdd={perms.canAddItems}
          onPick={(g) => { setSelectedGroup(g); setGroupSelectorOpen(false); }}
          onAdd={async (name) => {
            try {
              const g = await api(`/api/shops/${selectedShopId}/groups`, { method: 'POST', body: { name } });
              setGroups([...groups, g]);
              return g;
            } catch (e) { toast(e.message); return null; }
          }}
          onDelete={async (group) => {
            if (!window.confirm(`Delete group "${group.name}"? Items in it stay but become ungrouped.`)) return;
            try {
              await api(`/api/groups/${group.id}`, { method: 'DELETE' });
              setGroups(groups.filter(g => g.id !== group.id));
              if (String(selectedGroup) === String(group.id)) setSelectedGroup('all');
              toast('Group deleted');
              loadStock();
            } catch (e) { toast(e.message); }
          }}
          onClose={() => setGroupSelectorOpen(false)}
        />
      )}
    </div>
  );
}

// ── Lightbox: full-image view ─────────────────────────────
function Lightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="close"
      >
        <X size={28} />
      </button>
      <img
        src={url}
        alt="full"
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Reorder report: items needing restock, grouped by supplier ──
function ReorderReportModal({ items, onClose }) {
  const needsReorder = useMemo(() => {
    return items.filter(i => i.qty === 0 || i.qty <= i.threshold);
  }, [items]);

  const bySupplier = useMemo(() => {
    const map = new Map();
    for (const it of needsReorder) {
      const key = (it.supplier || '').trim() || '(No supplier)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [needsReorder]);

  const copyList = async () => {
    const lines = [];
    for (const [supplier, group] of bySupplier) {
      lines.push(`== ${supplier} ==`);
      for (const it of group) {
        const need = Math.max(it.threshold * 2 - it.qty, it.threshold);
        const details = [it.category, it.fabric, it.print, it.size, it.color].filter(Boolean).join(' / ');
        lines.push(`- ${it.name}${details ? ' (' + details + ')' : ''} — have ${it.qty}, need ~${need}`);
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {}
  };

  return (
    <Modal title={`Reorder list — ${needsReorder.length} item${needsReorder.length === 1 ? '' : 's'}`} onClose={onClose}>
      {needsReorder.length === 0 ? (
        <div className="empty empty-sm">
          <Check size={28} color="var(--good)" style={{ margin: '0 auto' }} />
          <h3>Nothing to reorder</h3>
          <p>All stock is above the low-stock alert level.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyList}>
              <Copy size={15} /> Copy list
            </button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {bySupplier.map(([supplier, group]) => (
              <div key={supplier} style={{ marginBottom: 18 }}>
                <div className="detail-k" style={{ marginBottom: 6 }}>
                  {supplier} · {group.length} item{group.length === 1 ? '' : 's'}
                </div>
                {group.map(it => {
                  const need = Math.max(it.threshold * 2 - it.qty, it.threshold);
                  const out = it.qty === 0;
                  return (
                    <div key={it.id} className="rank-row" style={{ padding: '10px 0' }}>
                      <div className="rank-main">
                        <div className="rank-name">{it.name}</div>
                        <div className="rank-sub">
                          {[it.category, it.fabric, it.print, it.size, it.color].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <div className="rank-stat">
                        <div className={`rank-stat-num ${out ? 'trend-down' : ''}`} style={{ color: out ? 'var(--bad)' : 'var(--warn)' }}>{it.qty}</div>
                        <div className="rank-stat-label">have</div>
                      </div>
                      <div className="rank-stat" style={{ minWidth: 56 }}>
                        <div className="rank-stat-num">~{need}</div>
                        <div className="rank-stat-label">order</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Group selector modal (browse / pick / create / delete) ──
function GroupSelectorModal({ groups, selectedGroup, canDelete, canAdd, onPick, onAdd, onDelete, onClose }) {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const n = newName.trim();
    if (!n) return;
    setBusy(true);
    const g = await onAdd(n);
    setBusy(false);
    if (g) {
      setNewName('');
      onPick(String(g.id));
    }
  };

  return (
    <Modal title="Groups" onClose={onClose}>
      <div className="group-pick-list">
        <button
          type="button"
          className={`group-pick ${selectedGroup === 'all' ? 'group-pick-active' : ''}`}
          onClick={() => onPick('all')}
        >
          <FolderOpen size={18} />
          <span className="group-pick-name">All items</span>
          {selectedGroup === 'all' && <Check size={20} className="group-pick-check" />}
        </button>

        {groups.length === 0 && (
          <div style={{ color: 'var(--text-2)', fontSize: 14, padding: '14px 8px', textAlign: 'center' }}>
            No groups yet. Create one below.
          </div>
        )}

        {groups.map(g => {
          const active = String(selectedGroup) === String(g.id);
          return (
            <div key={g.id} className="group-pick-row">
              <button
                type="button"
                className={`group-pick ${active ? 'group-pick-active' : ''}`}
                onClick={() => onPick(String(g.id))}
              >
                <FolderOpen size={18} />
                <span className="group-pick-name">{g.name}</span>
                {active && <Check size={20} className="group-pick-check" />}
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="group-pick-delete"
                  onClick={() => onDelete(g)}
                  aria-label={`delete ${g.name}`}
                  title={`Delete "${g.name}"`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canAdd && (
        <div className="group-pick-add">
          <label>New group</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="e.g. Dress, Pant, Summer"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-primary group-create-btn" disabled={busy || !newName.trim()} onClick={create}>
              <FolderPlus size={18} /> Create
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Move-to-group modal ───────────────────────────────────
function MoveToGroupModal({ item, groups, onClose, onPick, onAddGroup }) {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const createAndAssign = async () => {
    const n = newName.trim();
    if (!n) return;
    setBusy(true);
    const g = await onAddGroup(n);
    if (g) {
      await onPick(g.id);
    }
    setBusy(false);
  };

  return (
    <Modal title={`Move "${item.name}"`} onClose={onClose}>
      <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ justifyContent: 'flex-start', marginBottom: 8 }}
          onClick={() => onPick(null)}
        >
          <X size={16} /> No group (remove from current)
        </button>
        {groups.length === 0 && (
          <div style={{ color: 'var(--text-2)', padding: 8, fontSize: 14 }}>No groups yet. Create one below.</div>
        )}
        {groups.map(g => (
          <button
            key={g.id}
            type="button"
            className={`btn ${item.groupId === g.id ? 'btn-primary' : 'btn-ghost'} btn-block`}
            style={{ justifyContent: 'flex-start', marginBottom: 8 }}
            onClick={() => onPick(g.id)}
          >
            <FolderOpen size={16} /> {g.name}
            {item.groupId === g.id && <Check size={16} style={{ marginLeft: 'auto' }} />}
          </button>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
        <label style={{ display: 'block', fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>Or create a new group</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Group name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" disabled={busy || !newName.trim()} onClick={createAndAssign}>
            <FolderPlus size={16} /> Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Compact shop selector that sits inline in the toolbar.
function ShopPicker({ shops, selectedShopId, onSelect }) {
  if (shops.length === 0) return null;
  if (shops.length === 1) {
    return (
      <div className="toolbar-shop" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 15, fontWeight: 550 }}>
        <Store size={17} />
        {shops[0].name}
      </div>
    );
  }
  return (
    <div className="toolbar-shop">
      <select
        className="select"
        aria-label="Shop"
        value={selectedShopId == null ? '' : String(selectedShopId)}
        onChange={e => onSelect(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      >
        <option value="all">All shops</option>
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
    price: item.price ? String(item.price) : '',
    imageUrl: item.imageUrl || '',
  } : {
    name: '', category: '', fabric: '', print: '', size: '', color: '', sku: '', brand: '',
    qty: '0', threshold: '5', supplier: '', notes: '',
    price: '', imageUrl: '',
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
        price: f.price === '' ? 0 : Number(f.price),
        imageUrl: (f.imageUrl || '').trim(),
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
          <label>Photo URL (optional)</label>
          <input
            className="input"
            type="url"
            value={f.imageUrl}
            onChange={e => setF({ ...f, imageUrl: e.target.value })}
            placeholder="https://… (paste a picture link)"
          />
          {f.imageUrl && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={f.imageUrl}
                alt="preview"
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Preview</span>
            </div>
          )}
        </div>
        <div className="field">
          <label>Category</label>
          <input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="e.g. Dress, Top, Pants" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Fabric</label>
            <input className="input" value={f.fabric} onChange={e => setF({ ...f, fabric: e.target.value })} placeholder="e.g. Cotton, Silk" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Print / Pattern</label>
            <input className="input" value={f.print} onChange={e => setF({ ...f, print: e.target.value })} placeholder="e.g. Floral, Plain" />
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
            <label>Brand</label>
            <input className="input" value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} placeholder="Optional" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>SKU</label>
            <input className="input" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} placeholder="Optional" />
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
          <label>Price per unit (IDR, optional)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={f.price}
            onChange={e => setF({ ...f, price: e.target.value })}
            placeholder="0"
          />
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

// ── Movement modal: log stock-in / stock-out with date ─────
function MovementModal({ item, onClose, onSaved, defaultType = 'in' }) {
  const todayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [type, setType] = useState(defaultType);
  const [qty, setQty] = useState('1');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    api(`/api/stock/${item.id}/movements`)
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoadingHistory(false); })
      .catch(() => setLoadingHistory(false));
  }, [item.id]);

  const save = async (e) => {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1) { setErr('Quantity must be at least 1'); return; }
    setBusy(true); setErr(null);
    try {
      const occurredAt = new Date(`${date}T12:00:00`).toISOString();
      await api(`/api/stock/${item.id}/movements`, {
        method: 'POST',
        body: { type, qty: n, occurredAt, note },
      });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title={`Log entry — ${item.name}`} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <div className="field">
          <label>Type</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className={`btn ${type === 'in' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setType('in')}>
              <TrendingUp size={18} /> Stock added
            </button>
            <button type="button" className={`btn ${type === 'out' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setType('out')}>
              <TrendingDown size={18} /> Sold
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>How many?</label>
            <input className="input" type="number" min="1" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. customer name, invoice #" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>
        </div>
      </form>

      <div style={{ marginTop: 24, borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
        <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} /> Recent history
        </h3>
        {loadingHistory && <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</div>}
        {!loadingHistory && history.length === 0 && <div style={{ color: 'var(--text-2)', fontSize: 14 }}>No movements yet.</div>}
        {!loadingHistory && history.slice(0, 10).map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 14 }}>
            {m.type === 'in' && <TrendingUp size={16} color="var(--good)" />}
            {m.type === 'out' && <TrendingDown size={16} color="var(--bad)" />}
            {m.type === 'adjust' && <Edit2 size={16} color="var(--text-3)" />}
            <span style={{ fontWeight: 600, minWidth: 60 }}>
              {m.type === 'in' ? '+' : m.type === 'out' ? '−' : '='}{Math.abs(m.qtyChange)}
            </span>
            <span style={{ color: 'var(--text-2)' }}>{new Date(m.occurredAt).toLocaleDateString()}</span>
            <span style={{ color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note}</span>
            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>→ {m.qtyAfter}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// SELL VIEW — barcode scan-to-sell
// ═══════════════════════════════════════════════════════════
// Four things a garment can do, all through the same scan box. Staff learn
// one screen; only the mode button changes. Stock Out is deliberately NOT a
// sale — a damaged or returned piece leaving the shop must never land in the
// sales figures.
const SCAN_MODES = [
  { id: 'sell',     label: 'Sell',      icon: ScanLine,   verb: 'Sell',       hint: 'Each scan sells one' },
  { id: 'in',       label: 'Stock In',  icon: TrendingUp, verb: 'Stock in',   hint: 'Each scan adds one to this shop' },
  { id: 'out',      label: 'Stock Out', icon: TrendingDown, verb: 'Take out',  hint: 'Leaves the shop without being sold' },
  { id: 'transfer', label: 'Transfer',  icon: Store,      verb: 'Move',       hint: 'Move stock to another shop' },
];

// Why a piece left the shop without being sold. Kept short because staff pick
// one on a phone, mid-task.
const OUT_REASONS = ['Reject', 'Damaged', 'Returned to factory', 'Lost', 'Sample', 'Other'];

function SellView({ shops, staff, onManageStaff }) {
  const [shopId, setShopId] = useState(shops[0]?.id || null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [inFlight, setInFlight] = useState(0);   // scans still awaiting the server
  // Everything sold since the last receipt. One customer usually buys several
  // pieces, so the receipt is per sale, not per scan.
  const [basket, setBasket] = useState([]);
  const [receipt, setReceipt] = useState(null);   // frozen copy while printing
  const [msg, setMsg] = useState(null);      // { type: 'ok'|'err', text }
  const [recent, setRecent] = useState([]);  // [{ name, sku, qty, ts }]
  const inputRef = React.useRef(null);

  // What this scan does. Sell is the everyday case and stays the default.
  const [scanMode, setScanMode] = useState('sell');
  const [outReason, setOutReason] = useState(OUT_REASONS[0]);
  const [toShopId, setToShopId] = useState(null);

  // Who is scanning. Remembered on this device across shifts.
  const [staffId, setStaffId] = useState(readStaffId);
  useEffect(() => { writeStaffId(staffId); }, [staffId]);
  // Drop a remembered person who is no longer on the list.
  useEffect(() => {
    if (staffId && staff.length && !staff.find(s => s.id === staffId)) setStaffId(null);
  }, [staff, staffId]);
  const staffName = (staff.find(s => s.id === staffId) || {}).name || '';

  // Two ways to identify an item: scan the barcode, or look it up and type it.
  // The scanner is not always to hand, and some sales never touch one.
  const [mode, setMode] = useState('scan');  // 'scan' | 'manual'
  const [lookup, setLookup] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [sellQty, setSellQty] = useState(1);

  useEffect(() => {
    if (!shopId && shops[0]) setShopId(shops[0].id);
  }, [shops, shopId]);

  const focusInput = () => { try { inputRef.current && inputRef.current.focus(); } catch {} };
  useEffect(() => { if (mode === 'scan') focusInput(); }, [shopId, mode]);

  // Clear a half-finished manual sale when the shop changes — the picked item
  // belongs to the old shop and would no longer be sellable.
  useEffect(() => { setPicked(null); setResults([]); setLookup(''); }, [shopId]);

  // Search this shop's stock as she types, a moment after she stops.
  useEffect(() => {
    const q = lookup.trim();
    if (mode !== 'manual' || !shopId || q.length < 2) { setResults([]); return undefined; }
    setSearching(true);
    const t = setTimeout(() => {
      api(`/api/shops/${shopId}/stock?search=${encodeURIComponent(q)}`)
        .then(d => { setResults((Array.isArray(d) ? d : []).slice(0, 25)); setSearching(false); })
        .catch(() => { setResults([]); setSearching(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [lookup, shopId, mode]);

  const record = (d, verb) => {
    setMsg({ type: 'ok', text: `${verb} ${d.qtyChanged} × ${d.item.name} — ${d.item.qty} now in stock` });
    setRecent(r => [{
      name: d.item.name, sku: d.item.sku, qty: d.item.qty,
      moved: d.qtyChanged, mode: scanMode, who: d.staffName || staffName, ts: Date.now(),
    }, ...r].slice(0, 30));
    // Only actual sales go on a customer's receipt.
    if (d.mode === 'sell') {
      setBasket(b => {
        const i = b.findIndex(x => x.sku === d.item.sku);
        if (i >= 0) {
          const next = [...b];
          next[i] = { ...next[i], qty: next[i].qty + d.qtyChanged };
          return next;
        }
        return [...b, {
          sku: d.item.sku,
          name: [d.item.category, d.item.fabric, d.item.color, d.item.size].filter(Boolean).join(' · ') || d.item.name,
          price: Number(d.item.price) || 0,
          qty: d.qtyChanged,
        }];
      });
    }
  };

  // Transfers move stock between two shops, so they go through the transfer
  // endpoint rather than the single-shop scan one.
  const doTransfer = async ({ sku, qty }) => {
    const d = await api('/api/transfers', {
      method: 'POST',
      body: { sku, fromShopId: shopId, toShopId, qty, staffId: staffId || undefined },
    });
    const toName = shops.find(s => s.id === toShopId)?.name || 'the other shop';
    setMsg({ type: 'ok', text: `Moved ${qty} × ${sku} to ${toName}` });
    setRecent(r => [{
      name: d?.item?.name || sku, sku, qty: d?.from?.qty ?? '', moved: qty,
      mode: 'transfer', who: staffName, ts: Date.now(),
    }, ...r].slice(0, 30));
  };

  const scanBody = (identifier, qty) => ({
    ...identifier,
    qty,
    mode: scanMode,
    reason: scanMode === 'out' ? outReason : '',
    staffId: staffId || undefined,
  });

  // A scanner is a keyboard that types impossibly fast. Whether it also sends
  // an Enter afterwards is a per-device setting we cannot rely on — plenty
  // ship with it off, and then the code just sits in the box and nothing is
  // ever logged. So rather than trusting the suffix, watch the typing itself:
  // a machine-fast burst followed by a pause is a scan, and it submits on its
  // own. If the scanner does send Enter, that path still fires first and this
  // timer is cancelled.
  const SCAN_MAX_GAP_MS = 35;   // scanners run 5-20ms per character
  const SCAN_IDLE_MS = 110;     // quiet spell that means the burst has ended
  const scanTiming = React.useRef({ last: 0, gaps: [], timer: null });

  const clearScanTimer = () => {
    const t = scanTiming.current;
    if (t.timer) clearTimeout(t.timer);
    t.timer = null; t.gaps = []; t.last = 0;
  };

  const onScanType = (value) => {
    setCode(value);
    const t = scanTiming.current;
    const now = Date.now();
    if (t.last) t.gaps.push(now - t.last);
    t.last = now;
    if (t.timer) clearTimeout(t.timer);
    if (!value.trim()) { t.gaps = []; t.last = 0; return; }
    t.timer = setTimeout(() => {
      const gaps = t.gaps;
      // Four or more characters, every one of them machine-fast. A person
      // typing by hand never clears that bar, and the manual path has its own
      // tab anyway, so a false positive here is close to impossible.
      const looksScanned = gaps.length >= 3 && gaps.every(g => g < SCAN_MAX_GAP_MS);
      clearScanTimer();
      if (looksScanned) submitCode(value);
    }, SCAN_IDLE_MS);
  };

  // Never leave a timer running against an unmounted screen.
  useEffect(() => clearScanTimer, []);

  // A hardware scanner types the code and hits Enter, then moves straight to
  // the next garment — it does not wait for the network. So the box MUST be
  // emptied the instant Enter arrives, not when the request comes back:
  // clearing it in a `finally` let the next barcode type onto the end of the
  // previous one and sent nonsense like "AAA111BBB222" to the server.
  // For the same reason the submit button is never disabled mid-flight; a
  // disabled default button stops Enter submitting at all, which would throw
  // the scan away silently.
  const submit = (e) => {
    e.preventDefault();
    clearScanTimer();
    submitCode(code);
  };

  const submitCode = async (raw) => {
    const c = String(raw || '').trim();
    if (!c || !shopId) return;
    if (scanMode === 'transfer' && !toShopId) {
      setMsg({ type: 'err', text: 'Choose which shop it is going to first' });
      return;
    }
    setCode('');
    setInFlight(n => n + 1);
    setMsg(null);
    focusInput();
    try {
      if (scanMode === 'transfer') {
        await doTransfer({ sku: c, qty: 1 });
      } else {
        const d = await api(`/api/shops/${shopId}/scan`, { method: 'POST', body: scanBody({ code: c }, 1) });
        record(d, d.label);
      }
    } catch (err) {
      // Name the code that failed — with several scans in flight, "could not
      // record that" alone leaves you no idea which garment to re-scan.
      setMsg({ type: 'err', text: `${c}: ${err.message || 'could not record'}` });
    } finally {
      setInFlight(n => Math.max(0, n - 1));
      focusInput();
    }
  };

  const submitPicked = async () => {
    if (!picked || !shopId) return;
    if (scanMode === 'transfer' && !toShopId) {
      setMsg({ type: 'err', text: 'Choose which shop it is going to first' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (scanMode === 'transfer') {
        await doTransfer({ sku: picked.sku, qty: sellQty });
      } else {
        const d = await api(`/api/shops/${shopId}/scan`, {
          method: 'POST',
          body: scanBody({ itemId: picked.id }, sellQty),
        });
        record(d, d.label);
      }
      setPicked(null); setLookup(''); setResults([]); setSellQty(1);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not record that' });
    } finally {
      setBusy(false);
    }
  };

  const shopName = shops.find(s => s.id === shopId)?.name || '';
  const currentMode = SCAN_MODES.find(m => m.id === scanMode) || SCAN_MODES[0];
  const basketCount = basket.reduce((n, b) => n + b.qty, 0);
  const basketTotal = basket.reduce((n, b) => n + b.price * b.qty, 0);

  // Printing goes through the browser, so it works with whatever printer the
  // shop has installed — thermal or otherwise — with no driver of our own.
  // Chrome started with --kiosk-printing skips the dialog entirely, which is
  // what makes this feel like a till rather than a web page.
  const printReceipt = () => {
    setReceipt({
      lines: basket,
      total: basketTotal,
      count: basketCount,
      shop: shopName,
      who: staffName,
      at: new Date(),
      no: `${Date.now()}`.slice(-8),
    });
  };

  // Print once the receipt has actually rendered, then clear the sale.
  useEffect(() => {
    if (!receipt) return undefined;
    const t = setTimeout(() => {
      window.print();
      setBasket([]);
      setReceipt(null);
      focusInput();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  if (shops.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <Store size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>No shops yet</h3>
          <p>Add a shop before you can sell from it.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* What this scan does. Sell first — it is the everyday one. */}
      <div className="segmented segmented-wide mode-switch" role="group" aria-label="What are you doing">
        {SCAN_MODES.map(m => (
          <button
            key={m.id}
            type="button"
            className={scanMode === m.id ? 'is-active' : ''}
            onClick={() => { setScanMode(m.id); setPicked(null); setMsg(null); }}
          >
            <m.icon size={16} /> {m.label}
          </button>
        ))}
      </div>

      <div className="scan-card">
        {/* Every scan is recorded against a name, which is what makes a
            missing garment traceable later. */}
        <div className="field">
          <label>Who is scanning</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="select"
              value={staffId || ''}
              onChange={e => setStaffId(e.target.value ? Number(e.target.value) : null)}
              style={{ flex: 1 }}
            >
              <option value="">Not recorded</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onManageStaff}>
              <Plus size={15} /> Names
            </button>
          </div>
          {!staffId && staff.length > 0 && (
            <div className="field-hint">Pick your name so sales are counted for you.</div>
          )}
          {staff.length === 0 && (
            <div className="field-hint">No names yet — tap Names to add the people who work here.</div>
          )}
        </div>

        <div className="field">
          <label>{scanMode === 'transfer' ? 'Moving from' : scanMode === 'in' ? 'Stocking into' : 'At shop'}</label>
          <select className="select" value={shopId || ''} onChange={e => setShopId(Number(e.target.value))}>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {scanMode === 'transfer' && (
          <div className="field">
            <label>Moving to</label>
            <select
              className="select"
              value={toShopId || ''}
              onChange={e => setToShopId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Choose a shop…</option>
              {shops.filter(s => s.id !== shopId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {scanMode === 'out' && (
          <div className="field">
            <label>Why is it leaving?</label>
            <select className="select" value={outReason} onChange={e => setOutReason(e.target.value)}>
              {OUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="field-hint">This does not count as a sale.</div>
          </div>
        )}

        <div className="segmented segmented-wide" role="group" aria-label="How to find the item" style={{ marginBottom: 20 }}>
          <button type="button" className={mode === 'scan' ? 'is-active' : ''} onClick={() => setMode('scan')}>
            <ScanLine size={16} /> Scan barcode
          </button>
          <button type="button" className={mode === 'manual' ? 'is-active' : ''} onClick={() => setMode('manual')}>
            <Search size={16} /> Type it in
          </button>
        </div>

        {mode === 'scan' && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Scan a barcode — {currentMode.hint.toLowerCase()}</label>
              <input
                ref={inputRef}
                className="input scan-input"
                placeholder="Waiting for scan…"
                value={code}
                onChange={e => onScanType(e.target.value)}
                autoFocus
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <button className="btn btn-primary btn-block btn-large" disabled={!code.trim()}>
              <ScanLine size={19} /> {currentMode.verb} one
              {inFlight > 0 && <span className="inflight-dot">{inFlight}</span>}
            </button>
          </form>
        )}

        {/* No scanner needed: find the item, say how many, sell. */}
        {mode === 'manual' && !picked && (
          <div className="field">
            <label>Find the item — name, code, fabric or colour</label>
            <SearchField value={lookup} onChange={setLookup} placeholder="e.g. maxi top natural" />
            {lookup.trim().length >= 2 && (
              <div className="pick-list">
                {searching && <div className="pick-empty">Searching…</div>}
                {!searching && results.length === 0 && <div className="pick-empty">Nothing found in this shop.</div>}
                {!searching && results.map(it => (
                  <button
                    type="button"
                    key={it.id}
                    className="pick-row"
                    // Stocking in is the one mode where an empty peg is fine —
                    // that is exactly what you are about to fill.
                    disabled={it.qty === 0 && scanMode !== 'in'}
                    onClick={() => { setPicked(it); setSellQty(1); }}
                  >
                    <span className="pick-main">
                      <span className="pick-name">
                        {[it.category, it.fabric, it.print, it.color, it.size].filter(Boolean).join(' · ') || it.name}
                      </span>
                      <span className="pick-sub">{it.sku}{Number(it.price) > 0 ? ` · ${idr(it.price)}` : ''}</span>
                    </span>
                    <span className={`pick-qty ${it.qty === 0 && scanMode !== 'in' ? 'is-out' : ''}`}>
                      {it.qty === 0 ? 'none here' : `${it.qty} here`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && picked && (
          <div>
            <div className="picked-card">
              <div className="picked-main">
                <div className="picked-name">
                  {[picked.category, picked.fabric, picked.print, picked.color, picked.size].filter(Boolean).join(' · ') || picked.name}
                </div>
                <div className="picked-sub">{picked.sku} · {picked.qty} in stock</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>
                <X size={15} /> Change
              </button>
            </div>

            <div className="field">
              <label>How many?</label>
              <div className="qty-group qty-group-large">
                <button
                  type="button"
                  className="qty-btn"
                  disabled={sellQty <= 1}
                  onClick={() => setSellQty(q => Math.max(1, q - 1))}
                  aria-label="one fewer"
                >
                  <Minus size={18} />
                </button>
                <div className="qty-value">{sellQty}</div>
                <button
                  type="button"
                  className="qty-btn"
                  // Stocking in has no ceiling; taking stock out cannot go
                  // past what is actually on the rail.
                  disabled={scanMode !== 'in' && sellQty >= picked.qty}
                  onClick={() => setSellQty(q => (scanMode === 'in' ? q + 1 : Math.min(picked.qty, q + 1)))}
                  aria-label="one more"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-large"
              disabled={busy || (scanMode !== 'in' && picked.qty === 0)}
              onClick={submitPicked}
            >
              <Check size={19} /> {currentMode.verb} {sellQty}
            </button>
          </div>
        )}

        {msg && (
          <div className={msg.type === 'ok' ? 'success-banner' : 'error-banner'} style={{ marginTop: 16, marginBottom: 0 }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* This customer's sale. Printing is a browser print of a receipt-shaped
          slip, which works with a thermal printer installed on the machine
          exactly as it works with an ordinary one. */}
      {scanMode === 'sell' && basket.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">This sale</h2>
            <span className="section-meta">{basketCount} piece{basketCount === 1 ? '' : 's'}</span>
          </div>
          <div className="panel">
            <div className="panel-body">
              {basket.map(b => (
                <div className="rank-row" key={b.sku}>
                  <div className="rank-main">
                    <div className="rank-name">{b.name}</div>
                    <div className="rank-sub">{b.sku}{b.price > 0 ? ` · ${idr(b.price)} each` : ''}</div>
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-num">{b.qty}</div>
                    <div className="rank-stat-label">qty</div>
                  </div>
                  <div className="rank-stat" style={{ minWidth: 116 }}>
                    <div className="rank-stat-num" style={{ fontSize: 14 }}>{idr(b.price * b.qty)}</div>
                  </div>
                </div>
              ))}
              <div className="basket-total">
                <span>Total</span>
                <strong>{idr(basketTotal)}</strong>
              </div>
            </div>
          </div>
          <div className="basket-actions">
            <button type="button" className="btn btn-primary btn-large" onClick={printReceipt}>
              <Printer size={19} /> Print receipt
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setBasket([])}>
              <X size={16} /> Start a new sale
            </button>
          </div>
        </>
      )}

      {receipt && <Receipt data={receipt} />}

      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">Just now</h2>
            <span className="section-meta">{shopName}</span>
          </div>
          <div className="panel">
            <div className="panel-body">
              {recent.map((r, i) => {
                const m = SCAN_MODES.find(x => x.id === r.mode) || SCAN_MODES[0];
                return (
                  <div className="rank-row" key={r.ts + '-' + i}>
                    <div className="rank-main">
                      <div className="rank-name">{r.name}</div>
                      <div className="rank-sub">
                        {[r.sku, m.label, r.who && `by ${r.who}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="rank-stat">
                      <div className="rank-stat-num">{r.moved || 1}</div>
                      <div className="rank-stat-label">{m.label.toLowerCase()}</div>
                    </div>
                    <div className="rank-stat">
                      <div className="rank-stat-num">{r.qty}</div>
                      <div className="rank-stat-label">left</div>
                    </div>
                    <div className="rank-stat">
                      <div className="rank-stat-label">{new Date(r.ts).toLocaleTimeString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── The printed slip ──────────────────────────────────────
// Sized for a 58mm thermal roll, which is the common till printer here, but
// it prints perfectly well on A4 too. Everything else on the page is hidden
// at print time by the @media print rules in App.css.
function Receipt({ data }) {
  return (
    <div className="receipt" aria-hidden="true">
      <div className="receipt-head">
        <div className="receipt-brand">MITRA SAMADI</div>
        <div className="receipt-shop">{data.shop}</div>
      </div>
      <div className="receipt-meta">
        <div>{data.at.toLocaleDateString()} {data.at.toLocaleTimeString()}</div>
        <div>No. {data.no}</div>
        {data.who && <div>Served by {data.who}</div>}
      </div>
      <div className="receipt-rule" />
      {data.lines.map(l => (
        <div className="receipt-line" key={l.sku}>
          <div className="receipt-line-name">{l.name}</div>
          <div className="receipt-line-nums">
            <span>{l.qty} × {Number(l.price).toLocaleString('en-US')}</span>
            <span>{(l.price * l.qty).toLocaleString('en-US')}</span>
          </div>
        </div>
      ))}
      <div className="receipt-rule" />
      <div className="receipt-total">
        <span>TOTAL (IDR)</span>
        <span>{Number(data.total).toLocaleString('en-US')}</span>
      </div>
      <div className="receipt-count">{data.count} piece{data.count === 1 ? '' : 's'}</div>
      <div className="receipt-foot">Thank you</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW VIEW — master aggregation across all shops
// ═══════════════════════════════════════════════════════════
function OverviewView({ shops = [] }) {
  const [data, setData] = useState({ shops: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [fabricFilter, setFabricFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [facets, setFacets] = useState({ styles: [], fabrics: [], colors: [], sizes: [] });
  // Default browse order: fabric → colour → style.
  const [sortBy, setSortBy] = useState('fabric-color');

  // Two layouts of the same data, switchable from the top right. "Stock only"
  // is the original table; "Stock + sold" adds a sold line under every row.
  // Both are kept so she can flip between them and compare.
  // Opens on the sold layout: seeing what sold is the thing she asked for.
  // "Stock only" is the old view, kept one click away so the two can be
  // compared — but it is not what the page should greet her with.
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem('ms-overview-layout') || 'sold'; } catch (e) { return 'sold'; }
  });
  const chooseLayout = (v) => {
    setLayout(v);
    try { localStorage.setItem('ms-overview-layout', v); } catch (e) { /* ignore */ }
  };

  // Which shops this overview covers. Empty = all of them.
  const [shopSel, setShopSel] = useState([]);
  const shopsParam = shopSel.length ? shopSel.join(',') : '';

  // Sold figures are read one calendar year at a time.
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [years, setYears] = useState([]);
  const [sold, setSold] = useState({ items: {}, total: 0 });
  // Last year's figures, shown underneath on request — she asked to reach the
  // previous year from the same row rather than switching the whole page.
  const [compare, setCompare] = useState(false);
  const [prevSold, setPrevSold] = useState({ items: {}, total: 0 });
  // The product whose full in/out history is open.
  const [historySku, setHistorySku] = useState(null);
  const showSold = layout === 'sold';

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (styleFilter) params.set('style', styleFilter);
    if (fabricFilter) params.set('fabric', fabricFilter);
    if (colorFilter) params.set('color', colorFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    if (shopsParam) params.set('shops', shopsParam);
    params.set('sort', sortBy);
    const qs = params.toString();
    api(`/api/business/stock-overview${qs ? `?${qs}` : ''}`)
      .then(d => { setData(d || { shops: [], items: [] }); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [search, styleFilter, fabricFilter, colorFilter, sizeFilter, sortBy, shopsParam]);

  useEffect(() => { load(); }, [load]);

  // Sold counts are only fetched for the layout that shows them.
  useEffect(() => {
    if (!showSold) return;
    const params = new URLSearchParams({ year: String(year) });
    if (shopsParam) params.set('shops', shopsParam);
    api(`/api/business/sold-overview?${params.toString()}`)
      .then(d => setSold(d || { items: {}, total: 0 }))
      .catch(() => setSold({ items: {}, total: 0 }));
  }, [showSold, year, shopsParam]);

  useEffect(() => {
    if (!showSold || !compare) return;
    const params = new URLSearchParams({ year: String(year - 1) });
    if (shopsParam) params.set('shops', shopsParam);
    api(`/api/business/sold-overview?${params.toString()}`)
      .then(d => setPrevSold(d || { items: {}, total: 0 }))
      .catch(() => setPrevSold({ items: {}, total: 0 }));
  }, [showSold, compare, year, shopsParam]);

  useEffect(() => {
    api('/api/business/sales-years')
      .then(d => setYears(Array.isArray(d?.years) ? d.years : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api('/api/business/facets')
      .then(d => setFacets({
        styles: Array.isArray(d?.styles) ? d.styles : [],
        fabrics: Array.isArray(d?.fabrics) ? d.fabrics : [],
        colors: Array.isArray(d?.colors) ? d.colors : [],
        sizes: Array.isArray(d?.sizes) ? d.sizes : [],
      }))
      .catch(() => {});
  }, []);

  // Server already returns rows in the requested order.
  const sortedItems = data.items;

  const summary = useMemo(() => {
    const perShop = {};
    let grand = 0, low = 0, out = 0;
    for (const s of data.shops) perShop[s] = 0;
    for (const it of data.items) {
      grand += it.total || 0;
      if ((it.total || 0) === 0) out += 1;
      else if (it.threshold > 0 && it.total <= it.threshold) low += 1;
      for (const s of data.shops) perShop[s] += it.byShop[s] || 0;
    }
    return { perShop, grand, low, out, skuCount: data.items.length };
  }, [data]);

  const activeFilterCount =
    (styleFilter ? 1 : 0) + (fabricFilter ? 1 : 0) + (colorFilter ? 1 : 0) + (sizeFilter ? 1 : 0);

  const inStockCount = summary.skuCount - summary.low - summary.out;

  // Fabric headings only make sense while the list is in fabric order.
  const fabricBlocks = isFabricGrouped(sortBy);
  const fabricCounts = useMemo(
    () => (fabricBlocks ? countByFabric(sortedItems) : {}),
    [fabricBlocks, sortedItems]
  );
  // Product · Fabric · Colour · Size + one per shop + Total.
  const colCount = 4 + data.shops.length + 1;

  const scopeText = shopSel.length === 0
    ? 'Counted across all shops combined.'
    : `Counted across ${data.shops.join(' + ')} only.`;

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      {/* Two ways to read the same page. Nothing is lost by switching — it is
          the same stock, with or without the sold line underneath. */}
      <div className="view-switch-bar">
        <div className="segmented" role="group" aria-label="Overview layout">
          <button
            type="button"
            className={layout === 'stock' ? 'is-active' : ''}
            onClick={() => chooseLayout('stock')}
          >
            Stock only
          </button>
          <button
            type="button"
            className={layout === 'sold' ? 'is-active' : ''}
            onClick={() => chooseLayout('sold')}
          >
            Stock + sold
          </button>
        </div>
      </div>

      {/* Which shops this page covers. */}
      <ShopScope shops={shops} value={shopSel} onChange={setShopSel} />

      {showSold && (
        <div className="scope-picker">
          <span className="scope-picker-label">Sold in</span>
          <select
            className="select select-inline"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            aria-label="Year for sold figures"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            className={`scope-chip ${compare ? 'is-active' : ''}`}
            onClick={() => setCompare(c => !c)}
            title={`Show ${year - 1} underneath for comparison`}
          >
            vs {year - 1}
          </button>
          <span className="scope-picker-note">
            {sold.total.toLocaleString()} pieces sold in {year}
            {compare && prevSold.total > 0 && ` · ${prevSold.total.toLocaleString()} in ${year - 1}`}
          </span>
        </div>
      )}

      {/* Same three numbers as the Stock tab, so the two views read alike. */}
      <p className="scope-note">{scopeText}</p>
      <div className="stat-grid">
        <StatCard value={inStockCount} label="In stock" tone="good" />
        <StatCard value={summary.low} label="Low stock" tone="warn" />
        <StatCard value={summary.out} label="Out of stock" tone="bad" />
      </div>

      <Disclosure
        title="Totals"
        tail={`${summary.skuCount.toLocaleString()} products · ${summary.grand.toLocaleString()} pieces`}
      >
        <div className="metric-row">
          <div>
            <div className="metric-label">Different products</div>
            <div className="metric-value">{summary.skuCount.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>each colour and size counts once</div>
          </div>
          <div>
            <div className="metric-label">Total pieces</div>
            <div className="metric-value">{summary.grand.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>across every shop and the office</div>
          </div>
          {data.shops.map(s => (
            <div key={s}>
              <div className="metric-label">{s}</div>
              <div className="metric-value">{(summary.perShop[s] || 0).toLocaleString()}</div>
              <div className="detail-k" style={{ marginTop: 4 }}>pieces at this location</div>
            </div>
          ))}
        </div>
      </Disclosure>

      {/* The table is the point of this view: every product, every shop, side by side. */}
      <div className="section-head">
        <h2 className="section-title">All inventory</h2>
        <span className="section-meta">{sortedItems.length.toLocaleString()} shown</span>
      </div>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <SearchField value={search} onChange={setSearch} placeholder="Search product, code, fabric, colour…" />
      </div>
      <div className="filter-panel" style={{ boxShadow: 'none', padding: 0, background: 'transparent', marginBottom: 16 }}>
          {facets.styles.length > 0 && (
            <div className="field">
              <label>Style</label>
              <select className="select" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
                <option value="">All styles ({facets.styles.length})</option>
                {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {facets.fabrics.length > 0 && (
            <div className="field">
              <label>Fabric</label>
              <select className="select" value={fabricFilter} onChange={e => setFabricFilter(e.target.value)}>
                <option value="">All fabrics ({facets.fabrics.length})</option>
                {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          {facets.colors.length > 0 && (
            <div className="field">
              <label>Colour</label>
              <select className="select" value={colorFilter} onChange={e => setColorFilter(e.target.value)}>
                <option value="">All colours ({facets.colors.length})</option>
                {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {facets.sizes.length > 0 && (
            <div className="field">
              <label>Size</label>
              <select className="select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                <option value="">All sizes ({facets.sizes.length})</option>
                {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Sort</label>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="fabric-color">Fabric → Colour → Style</option>
              <option value="color">Colour A–Z</option>
              <option value="style">Style A–Z</option>
              <option value="name">Product name A–Z</option>
              <option value="total-desc">Most stock first</option>
              <option value="total-asc">Least stock first</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="filter-panel-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter(''); }}
              >
                <X size={15} /> Clear all
              </button>
            </div>
          )}
        </div>

        {loading && <div className="loading">Loading…</div>}
        {!loading && sortedItems.length === 0 && (
          <div className="empty empty-sm">
            <Package size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
            <h3>Nothing matches</h3>
            <p>Try clearing the filters or the search box.</p>
          </div>
        )}
        {!loading && sortedItems.length > 0 && (
          <div className="table-scroll">
            <table className={`data-table ${showSold ? 'with-sold' : ''}`}>
              <thead>
                <tr>
                  <th className="sticky-col">Product</th>
                  <th>Fabric</th>
                  <th>Colour</th>
                  <th>Size</th>
                  {data.shops.map(s => <th key={s} className="num">{s}</th>)}
                  <th className="num total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, i) => {
                  const soldRow = sold.items[item.sku];
                  // Gaps track colour runs, which only exist in fabric order.
                  const colourEnd = fabricBlocks && endsColourBlock(sortedItems, i);
                  const gapCls = fabricBlocks ? (colourEnd ? 'colour-end' : '') : 'even-gap';
                  return (
                    <React.Fragment key={item.sku}>
                      {fabricBlocks && startsFabricBlock(sortedItems, i) && (
                        <tr className="fabric-row">
                          <td colSpan={colCount}>
                            <span className="fabric-row-name">{fabricOf(item)}</span>
                            <span className="fabric-row-count">
                              {productCount(fabricCounts[fabricOf(item)])}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`item-row is-clickable ${gapCls}`}
                        onClick={() => setHistorySku(item)}
                        title="See every date this went in and out"
                      >
                        <td className="sticky-col">
                          <div className="cell-name">{item.name}</div>
                          <div className="cell-sub">{item.sku}{item.style ? ` · ${item.style}` : ''}</div>
                        </td>
                        <td>{item.fabric}</td>
                        <td>{item.color}</td>
                        <td>{item.size}</td>
                        {data.shops.map(s => (
                          <td key={s} className={`num ${(item.byShop[s] || 0) === 0 ? 'zero' : ''}`}>
                            {item.byShop[s] || 0}
                          </td>
                        ))}
                        <td className="num total-col">{item.total}</td>
                      </tr>
                      {/* The sold line: same columns, half the weight, so the
                          big numbers stay stock and the small ones stay sales. */}
                      {showSold && (
                        <tr className={`sold-row ${compare ? '' : gapCls}`}>
                          <td className="sticky-col">
                            <span className="sold-tag">sold in {year}</span>
                          </td>
                          <td colSpan={3} />
                          {data.shops.map(s => (
                            <td key={s} className={`num ${!(soldRow && soldRow.byShop[s]) ? 'zero' : ''}`}>
                              {(soldRow && soldRow.byShop[s]) || 0}
                            </td>
                          ))}
                          <td className="num total-col">{(soldRow && soldRow.total) || 0}</td>
                        </tr>
                      )}
                      {showSold && compare && (
                        <tr className={`sold-row sold-row-prev ${gapCls}`}>
                          <td className="sticky-col">
                            <span className="sold-tag">sold in {year - 1}</span>
                          </td>
                          <td colSpan={3} />
                          {data.shops.map(s => {
                            const p = prevSold.items[item.sku];
                            return (
                              <td key={s} className={`num ${!(p && p.byShop[s]) ? 'zero' : ''}`}>
                                {(p && p.byShop[s]) || 0}
                              </td>
                            );
                          })}
                          <td className="num total-col">
                            {(prevSold.items[item.sku] && prevSold.items[item.sku].total) || 0}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {historySku && (
        <ItemHistoryModal
          item={historySku}
          shopsParam={shopsParam}
          onClose={() => setHistorySku(null)}
        />
      )}
    </div>
  );
}

// ── One product's whole year ──────────────────────────────
// "Click the item and it shows every date stock went in and every date it
// sold." Months first so a year reads at a glance, then the dated detail
// underneath with who handled each one.
const MOVEMENT_LOOK = {
  'in':           { label: 'Stocked in',  sign: '+', tone: 'good' },
  'transfer-in':  { label: 'Moved in',    sign: '+', tone: '' },
  'sale':         { label: 'Sold',        sign: '−', tone: 'bad' },
  'out':          { label: 'Sold',        sign: '−', tone: 'bad' },
  'removal':      { label: 'Taken out',   sign: '−', tone: 'warn' },
  'transfer-out': { label: 'Moved out',   sign: '−', tone: '' },
  'adjust':       { label: 'Corrected',   sign: '=', tone: '' },
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (ym) => {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
};

function ItemHistoryModal({ item, shopsParam, onClose }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState({ months: [], movements: [], years: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ sku: item.sku, year: String(year) });
    if (shopsParam) p.set('shops', shopsParam);
    api(`/api/business/sku-history?${p.toString()}`)
      .then(d => { setData(d || { months: [], movements: [], years: [] }); setLoading(false); })
      .catch(() => { setData({ months: [], movements: [], years: [] }); setLoading(false); });
  }, [item.sku, year, shopsParam]);

  const title = [item.style, item.fabric, item.color, item.size].filter(Boolean).join(' · ') || item.name;
  const yearOptions = data.years && data.years.length ? data.years : [year];

  return (
    <Modal title={title} onClose={onClose}>
      <div className="scope-picker" style={{ marginTop: -4 }}>
        <span className="scope-picker-label">Year</span>
        <select
          className="select select-inline"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          aria-label="Year"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="scope-picker-note">{item.sku}</span>
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && data.movements.length === 0 && (
        <div className="empty empty-sm">
          <History size={26} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>Nothing recorded in {year}</h3>
          <p>Stock going in and out will show here once it is scanned.</p>
        </div>
      )}

      {!loading && data.months.length > 0 && (
        <>
          <div className="detail-k" style={{ marginBottom: 8 }}>Month by month</div>
          <div className="month-grid">
            {data.months.map(m => (
              <div className="month-cell" key={m.month}>
                <div className="month-name">{monthLabel(m.month)}</div>
                <div className="month-nums">
                  {m.in > 0 && <span className="month-in">+{m.in} in</span>}
                  {m.sold > 0 && <span className="month-sold">−{m.sold} sold</span>}
                  {m.removed > 0 && <span className="month-other">−{m.removed} out</span>}
                  {m.transferred > 0 && <span className="month-other">{m.transferred} moved</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && data.movements.length > 0 && (
        <>
          <div className="detail-k" style={{ margin: '18px 0 8px' }}>
            Every movement · {data.movements.length}
          </div>
          <div className="ledger">
            {data.movements.map(m => {
              const look = MOVEMENT_LOOK[m.type] || { label: m.type, sign: '', tone: '' };
              return (
                <div className="ledger-row" key={m.id}>
                  <div className="ledger-date">
                    {new Date(m.occurredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="ledger-main">
                    <span className={`ledger-kind tone-${look.tone}`}>{look.label}</span>
                    <span className="ledger-where">{m.shopName}</span>
                    {m.staffName && <span className="ledger-who">by {m.staffName}</span>}
                    {m.reason && <span className="ledger-reason">{m.reason}</span>}
                  </div>
                  <div className={`ledger-qty tone-${look.tone}`}>
                    {look.sign}{Math.abs(m.qtyChange)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// SALES VIEW — what sold, sliced whichever way she wants
// ═══════════════════════════════════════════════════════════
// The same sales, ranked by product, fabric, colour, style or shop. She asked
// to see "which fabric sells the best, which colour sells the best, and in
// which store" — that is one query with a different GROUP BY, so it is one
// screen with a row of buttons rather than five separate reports.
const SALES_GROUPS = [
  { id: 'sku',    label: 'Product' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'color',  label: 'Colour' },
  { id: 'style',  label: 'Style' },
  { id: 'shop',   label: 'Shop' },
  { id: 'staff',  label: 'Person' },
];

function SalesView({ shops = [], onFindStock }) {
  const [groupBy, setGroupBy] = useState('sku');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [years, setYears] = useState([]);
  const [shopSel, setShopSel] = useState([]);          // empty = all shops
  const [best, setBest] = useState({ items: [] });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shopsParam = shopSel.length ? shopSel.join(',') : '';

  useEffect(() => {
    api('/api/business/sales-years')
      .then(d => setYears(Array.isArray(d?.years) ? d.years : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true); setError(null);
    const p = new URLSearchParams({ groupBy, year: String(year), limit: '25' });
    if (shopsParam) p.set('shops', shopsParam);
    api(`/api/business/best-sellers?${p.toString()}`)
      .then(d => { setBest(d || { items: [] }); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [groupBy, year, shopsParam]);

  useEffect(() => {
    const p = new URLSearchParams({ year: String(year), limit: '100' });
    if (shopsParam) p.set('shops', shopsParam);
    api(`/api/business/recent-sales?${p.toString()}`)
      .then(d => setRecent(Array.isArray(d) ? d : []))
      .catch(() => setRecent([]));
  }, [year, shopsParam]);

  const totalSold = best.items.reduce((n, it) => n + it.units, 0);
  const totalRevenue = best.items.reduce((n, it) => n + it.revenue, 0);
  const groupLabel = (SALES_GROUPS.find(g => g.id === groupBy) || {}).label || '';

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="scope-picker">
        <span className="scope-picker-label">Year</span>
        <select
          className="select select-inline"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          aria-label="Year"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <ShopScope shops={shops} value={shopSel} onChange={setShopSel} />

      <div className="section-head">
        <h2 className="section-title">Best sellers</h2>
        <span className="section-meta">{year}</span>
      </div>

      {/* One row of buttons, five reports. */}
      <div className="segmented segmented-wide" role="group" aria-label="Rank by">
        {SALES_GROUPS.map(g => (
          <button
            key={g.id}
            type="button"
            className={groupBy === g.id ? 'is-active' : ''}
            onClick={() => setGroupBy(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && best.items.length === 0 && (
        <div className="empty empty-sm">
          <TrendingUp size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>No sales recorded in {year}</h3>
          <p>Sales appear here as soon as items are sold on the Sell tab.</p>
        </div>
      )}

      {!loading && best.items.length > 0 && (
        <>
          <div className="stat-grid">
            <StatCard value={totalSold} label={`Pieces sold (top ${best.items.length})`} />
            <StatCard value={idr(totalRevenue)} label="Value sold" />
            <StatCard value={best.items.length} label={`${groupLabel}s ranked`} />
          </div>

          <div className="panel">
            <div className="panel-body">
              {best.items.map((it, i) => {
                const share = totalSold > 0 ? (it.units / totalSold) * 100 : 0;
                const clickable = groupBy === 'sku' && it.sku && onFindStock;
                return (
                  <div
                    key={it.key || i}
                    className={`rank-row ${clickable ? 'rank-row-click' : ''}`}
                    onClick={clickable ? () => onFindStock(it.sku) : undefined}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onFindStock(it.sku); } : undefined}
                    title={clickable ? 'See what is left in stock' : undefined}
                  >
                    <div className="rank-num">{i + 1}</div>
                    <div className="rank-main">
                      <div className="rank-name">{it.label}</div>
                      <div className="rank-sub">
                        {groupBy === 'sku'
                          ? [it.sku, it.fabric, it.color, it.size].filter(Boolean).join(' · ')
                          : `${share.toFixed(1)}% of the top ${best.items.length}`}
                      </div>
                      <div className="rank-bar">
                        <span style={{ width: `${Math.max(2, share)}%` }} />
                      </div>
                    </div>
                    <div className="rank-stat">
                      <div className="rank-stat-num">{it.units.toLocaleString()}</div>
                      <div className="rank-stat-label">sold</div>
                    </div>
                    <div className="rank-stat" style={{ minWidth: 68 }}>
                      <div className="rank-stat-num" style={{ fontSize: 14 }}>
                        {it.trend == null ? 'new' : `${it.trend > 0 ? '+' : ''}${Math.round(it.trend * 100)}%`}
                      </div>
                      <div className="rank-stat-label">vs {year - 1}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* "Where do I see what sold, and when?" — right here. */}
      <div className="section-head">
        <h2 className="section-title">Latest sales</h2>
        <span className="section-meta">{recent.length} shown</span>
      </div>
      {recent.length === 0 ? (
        <div className="empty empty-sm">
          <History size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>Nothing sold yet in {year}</h3>
          <p>Every sale is listed here with its date and shop.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body">
            {recent.map(r => (
              <div className="rank-row" key={r.id}>
                <div className="rank-main">
                  <div className="rank-name">{r.name}</div>
                  <div className="rank-sub">
                    {[r.sku, r.fabric, r.color, r.size].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="rank-stat" style={{ minWidth: 92 }}>
                  <div className="rank-stat-num" style={{ fontSize: 14 }}>{r.shopName}</div>
                  <div className="rank-stat-label">{new Date(r.occurredAt).toLocaleDateString()}</div>
                </div>
                <div className="rank-stat">
                  <div className="rank-stat-num">{r.units}</div>
                  <div className="rank-stat-label">sold</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REPORTS — the back-office ledger, one shop at a time
// ═══════════════════════════════════════════════════════════
// Kept apart from the scanning screens on purpose: this is the manager's
// view for tracing where a garment went, not something shop floor staff
// need in front of them all day.
const LEDGER_FILTERS = [
  { id: '',        label: 'Everything' },
  { id: 'in',      label: 'Came in' },
  { id: 'out',     label: 'Went out' },
];

function ReportsView({ shops = [] }) {
  const [shopId, setShopId] = useState(shops[0]?.id || null);
  const [direction, setDirection] = useState('');
  const [year, setYear] = useState('all');
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { if (!shopId && shops[0]) setShopId(shops[0].id); }, [shops, shopId]);

  useEffect(() => {
    api('/api/business/sales-years')
      .then(d => setYears(Array.isArray(d?.years) ? d.years : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true); setError(null);
    const p = new URLSearchParams({ limit: '500' });
    if (year !== 'all') p.set('year', String(year));
    if (direction) p.set('direction', direction);
    api(`/api/shops/${shopId}/ledger?${p.toString()}`)
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [shopId, year, direction]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.itemName, r.sku, r.fabric, r.color, r.size, r.staffName, r.reason]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    let inQty = 0, outQty = 0;
    for (const r of visible) {
      if (r.qtyChange > 0) inQty += r.qtyChange;
      else outQty += Math.abs(r.qtyChange);
    }
    return { inQty, outQty };
  }, [visible]);

  if (shops.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <Store size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>No shops yet</h3>
          <p>Add a shop to start keeping a stock record.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <CommissionPanel shops={shops} />

      <div className="section-head">
        <h2 className="section-title">Stock movements</h2>
      </div>

      {/* A tab per shop — office, then each store. */}
      <div className="segmented segmented-wide" role="group" aria-label="Which shop">
        {shops.map(s => (
          <button
            key={s.id}
            type="button"
            className={shopId === s.id ? 'is-active' : ''}
            onClick={() => setShopId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="scope-picker">
        <span className="scope-picker-label">Show</span>
        {LEDGER_FILTERS.map(f => (
          <button
            key={f.id || 'all'}
            type="button"
            className={`scope-chip ${direction === f.id ? 'is-active' : ''}`}
            onClick={() => setDirection(f.id)}
          >
            {f.label}
          </button>
        ))}
        <select
          className="select select-inline"
          value={year}
          onChange={e => setYear(e.target.value)}
          aria-label="Year"
        >
          <option value="all">All time</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="toolbar" style={{ marginTop: 4 }}>
        <SearchField value={search} onChange={setSearch} placeholder="Find a product, code or person…" />
      </div>

      <div className="stat-grid">
        <StatCard value={totals.inQty} label="Pieces in" tone="good" />
        <StatCard value={totals.outQty} label="Pieces out" tone="bad" />
        <StatCard value={visible.length} label="Movements" />
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty empty-sm">
          <History size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>Nothing recorded</h3>
          <p>Every scan at this shop will appear here with its date and who did it.</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="panel">
          <div className="panel-body">
            {visible.map(r => {
              const look = MOVEMENT_LOOK[r.type] || { label: r.type, sign: '', tone: '' };
              return (
                <div className="ledger-row" key={r.id}>
                  <div className="ledger-date">
                    {new Date(r.occurredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="ledger-main">
                    <div className="rank-name">{r.itemName}</div>
                    <div className="ledger-sub">
                      <span className={`ledger-kind tone-${look.tone}`}>{look.label}</span>
                      {[r.sku, r.color, r.size].filter(Boolean).join(' · ')}
                      {r.staffName && <span className="ledger-who">by {r.staffName}</span>}
                      {r.reason && <span className="ledger-reason">{r.reason}</span>}
                    </div>
                  </div>
                  <div className={`ledger-qty tone-${look.tone}`}>
                    {look.sign}{Math.abs(r.qtyChange)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Who sold what, and what they are owed ─────────────────
function CommissionPanel({ shops }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [years, setYears] = useState([]);
  const [month, setMonth] = useState('all');
  const [data, setData] = useState({ items: [], totals: { units: 0, revenue: 0, commission: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/business/sales-years')
      .then(d => setYears(Array.isArray(d?.years) ? d.years : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ year: String(year) });
    if (month !== 'all') p.set('month', String(month));
    api(`/api/business/staff-performance?${p.toString()}`)
      .then(d => { setData(d || { items: [], totals: {} }); setLoading(false); })
      .catch(() => { setData({ items: [], totals: { units: 0, revenue: 0, commission: 0 } }); setLoading(false); });
  }, [year, month]);

  const yearOptions = years.length ? years : [year];

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Staff &amp; commission</h2>
        <span className="section-meta">{shops.length} shop{shops.length === 1 ? '' : 's'}</span>
      </div>

      <div className="scope-picker">
        <span className="scope-picker-label">Period</span>
        <select className="select select-inline" value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Year">
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select select-inline" value={month} onChange={e => setMonth(e.target.value)} aria-label="Month">
          <option value="all">Whole year</option>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && data.items.length === 0 && (
        <div className="empty empty-sm">
          <TrendingUp size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>No sales recorded yet</h3>
          <p>Once staff pick their name before scanning, their sales and commission appear here.</p>
        </div>
      )}

      {!loading && data.items.length > 0 && (
        <>
          <div className="stat-grid">
            <StatCard value={data.totals.units} label="Pieces sold" />
            <StatCard value={idr(data.totals.revenue)} label="Sales value" />
            <StatCard value={idr(data.totals.commission)} label="Commission owed" tone="good" />
          </div>
          <div className="panel">
            <div className="panel-body">
              {data.items.map(p => (
                <div className="rank-row" key={p.name}>
                  <div className="rank-main">
                    <div className="rank-name">{p.name}</div>
                    <div className="rank-sub">
                      {p.rate > 0 ? `${p.rate}% commission` : 'No commission rate set'}
                    </div>
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-num">{p.units}</div>
                    <div className="rank-stat-label">pieces</div>
                  </div>
                  <div className="rank-stat" style={{ minWidth: 128 }}>
                    <div className="rank-stat-num" style={{ fontSize: 14 }}>{idr(p.revenue)}</div>
                    <div className="rank-stat-label">sold</div>
                  </div>
                  <div className="rank-stat" style={{ minWidth: 128 }}>
                    <div className="rank-stat-num" style={{ fontSize: 14, color: 'var(--good)' }}>{idr(p.commission)}</div>
                    <div className="rank-stat-label">commission</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Staff list management ─────────────────────────────────
function StaffModal({ staff, shops, onClose, onChanged }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      await api('/api/staff', {
        method: 'POST',
        body: {
          name: n,
          shopId: shopId ? Number(shopId) : null,
          commissionRate: rate === '' ? undefined : Number(rate),
        },
      });
      setName(''); setRate('');
      onChanged();
      toast('Added');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name} from the list?`)) return;
    try {
      await api(`/api/staff/${s.id}`, { method: 'DELETE' });
      onChanged();
      toast('Removed');
    } catch (e) { toast(e.message); }
  };

  return (
    <Modal title="Who works here" onClose={onClose}>
      <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 14 }}>
        Names, not accounts — nobody needs a password. Whoever is picked on the
        Sell screen gets credited for what they scan, so you can see each
        person's sales, work out their commission, and trace where a piece
        went. Re-adding an existing name updates their rate.
      </p>

      <div className="group-pick-list">
        {staff.length === 0 && (
          <div style={{ color: 'var(--text-2)', fontSize: 14, padding: '14px 8px', textAlign: 'center' }}>
            No names yet.
          </div>
        )}
        {staff.map(s => (
          <div key={s.id} className="group-pick-row">
            <div className="group-pick" style={{ cursor: 'default' }}>
              <span className="group-pick-name">{s.name}</span>
              <span className="detail-k" style={{ marginLeft: 'auto' }}>
                {[s.shopId != null ? (shops.find(x => x.id === s.shopId)?.name || '') : '',
                  s.commissionRate > 0 ? `${s.commissionRate}%` : 'no rate']
                  .filter(Boolean).join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="group-pick-delete"
              onClick={() => remove(s)}
              aria-label={`remove ${s.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="group-pick-add">
        <label>Add someone</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            style={{ flex: '1 1 140px' }}
          />
          <select className="select" value={shopId} onChange={e => setShopId(e.target.value)} style={{ flex: '0 1 130px' }}>
            <option value="">Any shop</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder="% comm."
            value={rate}
            onChange={e => setRate(e.target.value)}
            style={{ flex: '0 1 96px' }}
          />
          <button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={add}>
            <Plus size={17} /> Add
          </button>
        </div>
      </div>
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
      <div className="section-head">
        <h2 className="section-title">Your shops</h2>
        {isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
            <Plus size={16} /> Add shop
          </button>
        )}
      </div>

      {shops.loading && <div className="loading">Loading…</div>}
      {shops.error && <div className="error-banner">{shops.error}</div>}

      {!shops.loading && shops.data.length === 0 && (
        <div className="card">
          <div className="empty">
            <Store size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
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
          <Store size={20} color="var(--text-3)" />
          <div className="list-item-main">
            <div className="list-item-title">{shop.name}</div>
            {shop.address && <div className="list-item-sub">{shop.address}</div>}
          </div>
          {isOwner && (
            <RowMenu label={`Actions for ${shop.name}`}>
              <MenuItem icon={Edit2} onClick={() => setModal(shop)}>Edit</MenuItem>
              <div className="menu-sep" />
              <MenuItem icon={Trash2} danger onClick={() => remove(shop)}>Delete</MenuItem>
            </RowMenu>
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
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ onClose, onManageStaff }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/auth/export-data`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mitra-samadi-data-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Data exported');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <p style={{ color: 'var(--text-2)', marginTop: 0, marginBottom: 18, fontSize: 14 }}>
        This is a shared workspace. Everyone with the access code sees and edits the same stock.
      </p>
      <button className="btn btn-secondary btn-block" onClick={onManageStaff} style={{ marginBottom: 10 }}>
        Who works here
      </button>
      <button className="btn btn-ghost btn-block" onClick={exportData} disabled={busy}>
        Export a backup of all data
      </button>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
// The only sign-in: enter the shared code → logged into the single master
// account. No email, no signup, no separate users.
function AccessGate({ onAuthed }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const d = await api('/api/auth/access-login', { method: 'POST', body: { code } });
      setToken(d.token);
      onAuthed(d.user, d.business);
    } catch (e) {
      setErr(e.message === 'Invalid access code' ? 'That code is not right.' : (e.message || 'Could not sign in.'));
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <h1>Mitra Samadi</h1>
          <p>Enter the access code to continue.</p>
        </div>
        <form onSubmit={submit}>
          <input
            className="input"
            type="password"
            placeholder="Access code"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            style={{ marginBottom: 14 }}
          />
          {err && <div className="error-banner" style={{ marginBottom: 14 }}>{err}</div>}
          <button className="btn btn-primary btn-block btn-large" disabled={busy || !code}>
            {busy ? 'Entering…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    api('/api/auth/me')
      .then(d => { setUser(d.user); setBusiness(d.business); setChecking(false); })
      .catch(() => { setToken(null); setChecking(false); });
  }, []);

  useEffect(() => {
    const handler = () => { setUser(null); setBusiness(null); };
    window.addEventListener('app:unauth', handler);
    return () => window.removeEventListener('app:unauth', handler);
  }, []);

  if (checking) {
    return (
      <div className="auth-screen">
        <div className="loading">
          <RefreshCw size={28} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  // The only way in: enter the shared access code. No accounts, no email.
  if (!user) {
    return <AccessGate onAuthed={(u, b) => { setUser(u); setBusiness(b); }} />;
  }

  return <MainApp user={user} business={business} />;
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
