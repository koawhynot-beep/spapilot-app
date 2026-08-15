import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import {
  Package, Store, Plus, Trash2, Edit2,
  RefreshCw, Check, X, AlertTriangle, Copy, Settings,
  ChevronRight, Minus, ScanLine, Search, SlidersHorizontal,
  MoreHorizontal, Sun, Moon,
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
          <SellView shops={shops.data} />
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
        {tab === 'shops' && (
          <ShopsView shops={shops} isOwner={isOwner} />
        )}
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
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
                {(fabricCounts[fabricOf(item)] || 0).toLocaleString()} products
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
function SellView({ shops }) {
  const [shopId, setShopId] = useState(shops[0]?.id || null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);      // { type: 'ok'|'err', text }
  const [recent, setRecent] = useState([]);  // [{ name, sku, qty, ts }]
  const inputRef = React.useRef(null);

  // Two ways to sell: scan the barcode, or look the item up and type it in.
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

  const recordSale = (d) => {
    setMsg({ type: 'ok', text: `Sold ${d.soldQty} × ${d.item.name} — ${d.item.qty} left` });
    setRecent(r => [{
      name: d.item.name, sku: d.item.sku, qty: d.item.qty, sold: d.soldQty, ts: Date.now(),
    }, ...r].slice(0, 30));
  };

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim();
    if (!c || !shopId) return;
    setBusy(true); setMsg(null);
    try {
      const d = await api(`/api/shops/${shopId}/sell`, { method: 'POST', body: { code: c } });
      recordSale(d);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not sell that item' });
    } finally {
      setCode('');
      setBusy(false);
      focusInput();
    }
  };

  const sellPicked = async () => {
    if (!picked || !shopId) return;
    setBusy(true); setMsg(null);
    try {
      const d = await api(`/api/shops/${shopId}/sell`, {
        method: 'POST',
        body: { itemId: picked.id, qty: sellQty, manual: true },
      });
      recordSale(d);
      setPicked(null); setLookup(''); setResults([]); setSellQty(1);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not sell that item' });
    } finally {
      setBusy(false);
    }
  };

  const shopName = shops.find(s => s.id === shopId)?.name || '';

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
      <div className="scan-card">
        <div className="field">
          <label>Selling from</label>
          <select className="select" value={shopId || ''} onChange={e => setShopId(Number(e.target.value))}>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="segmented segmented-wide" role="group" aria-label="How to sell" style={{ marginBottom: 20 }}>
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
              <label>Scan a barcode — each scan sells one</label>
              <input
                ref={inputRef}
                className="input scan-input"
                placeholder="Waiting for scan…"
                value={code}
                onChange={e => setCode(e.target.value)}
                autoFocus
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <button className="btn btn-primary btn-block btn-large" disabled={busy || !code.trim()}>
              <ScanLine size={19} /> Sell one
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
                    disabled={it.qty === 0}
                    onClick={() => { setPicked(it); setSellQty(1); }}
                  >
                    <span className="pick-main">
                      <span className="pick-name">
                        {[it.category, it.fabric, it.print, it.color, it.size].filter(Boolean).join(' · ') || it.name}
                      </span>
                      <span className="pick-sub">{it.sku}{Number(it.price) > 0 ? ` · ${idr(it.price)}` : ''}</span>
                    </span>
                    <span className={`pick-qty ${it.qty === 0 ? 'is-out' : ''}`}>
                      {it.qty === 0 ? 'none left' : `${it.qty} left`}
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
              <label>How many are you selling?</label>
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
                  disabled={sellQty >= picked.qty}
                  onClick={() => setSellQty(q => Math.min(picked.qty, q + 1))}
                  aria-label="one more"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-large"
              disabled={busy || picked.qty === 0}
              onClick={sellPicked}
            >
              <Check size={19} /> Sell {sellQty}
            </button>
          </div>
        )}

        {msg && (
          <div className={msg.type === 'ok' ? 'success-banner' : 'error-banner'} style={{ marginTop: 16, marginBottom: 0 }}>
            {msg.text}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">Sold just now</h2>
            <span className="section-meta">{shopName}</span>
          </div>
          <div className="panel">
            <div className="panel-body">
              {recent.map((r, i) => (
                <div className="rank-row" key={r.ts + '-' + i}>
                  <div className="rank-main">
                    <div className="rank-name">{r.name}</div>
                    {r.sku && <div className="rank-sub product-sku">{r.sku}</div>}
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-num">{r.sold || 1}</div>
                    <div className="rank-stat-label">sold</div>
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-num">{r.qty}</div>
                    <div className="rank-stat-label">left</div>
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-label">{new Date(r.ts).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem('ms-overview-layout') || 'stock'; } catch (e) { return 'stock'; }
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

  const toggleShop = (id) => {
    setShopSel(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]));
  };

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

      {/* Which shops this page covers: all of them, one, or any few. */}
      {shops.length > 1 && (
        <div className="scope-picker">
          <span className="scope-picker-label">Showing</span>
          <button
            type="button"
            className={`scope-chip ${shopSel.length === 0 ? 'is-active' : ''}`}
            onClick={() => setShopSel([])}
          >
            All shops
          </button>
          {shops.map(s => (
            <button
              key={s.id}
              type="button"
              className={`scope-chip ${shopSel.includes(s.id) ? 'is-active' : ''}`}
              onClick={() => toggleShop(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

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
          <span className="scope-picker-note">
            {sold.total.toLocaleString()} pieces sold in {year}
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
                  return (
                    <React.Fragment key={item.sku}>
                      {fabricBlocks && startsFabricBlock(sortedItems, i) && (
                        <tr className="fabric-row">
                          <td colSpan={colCount}>
                            <span className="fabric-row-name">{fabricOf(item)}</span>
                            <span className="fabric-row-count">
                              {(fabricCounts[fabricOf(item)] || 0).toLocaleString()} products
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className="item-row">
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
                        <tr className="sold-row">
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
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
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

  const toggleShop = (id) => {
    setShopSel(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]));
  };

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

      {shops.length > 1 && (
        <div className="scope-picker">
          <span className="scope-picker-label">Shops</span>
          <button
            type="button"
            className={`scope-chip ${shopSel.length === 0 ? 'is-active' : ''}`}
            onClick={() => setShopSel([])}
          >
            All shops
          </button>
          {shops.map(s => (
            <button
              key={s.id}
              type="button"
              className={`scope-chip ${shopSel.includes(s.id) ? 'is-active' : ''}`}
              onClick={() => toggleShop(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

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
function SettingsModal({ onClose }) {
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
