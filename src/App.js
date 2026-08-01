import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import {
  Package, Store, Plus, Trash2, Edit2,
  RefreshCw, Check, X, AlertTriangle, Copy, Settings,
  ChevronRight, Minus, ScanLine,
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
// MAIN APP (post-auth)
// ═══════════════════════════════════════════════════════════
function MainApp({ user, business }) {
  const [tab, setTab] = useState('stock');
  const [showSettings, setShowSettings] = useState(false);

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
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'transfer', label: 'Transfer', icon: TrendingDown },
    { id: 'shops', label: 'Shops', icon: Store },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Mitra Samadi</h1>
          <div className="topbar-sub">{business?.name || 'Your business'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', minHeight: 'auto', padding: '10px 14px' }} onClick={() => setShowSettings(true)} aria-label="settings">
            <Settings size={20} />
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
          />
        )}
        {tab === 'overview' && (
          <OverviewView />
        )}
        {tab === 'transfer' && (
          <TransferView shops={shops.data} />
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
function StockView({ shops, selectedShopId, onSelectShop, user, onReloadShops }) {
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

  const dragEnabled = perms.canEditStock && sortBy === 'custom' && statusFilter === 'all' && !isAll;

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

  const currentGroup = groups.find(g => String(g.id) === String(selectedGroup));

  return (
    <div>
      <ShopPicker shops={shops} selectedShopId={selectedShopId} onSelect={onSelectShop} />

      <div className="search-bar">
        <input
          className="input"
          placeholder="Search name, fabric, print, color, size, brand…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {perms.canAddItems && !isAll && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={20} /> Add item
          </button>
        )}
      </div>

      {(facets.styles.length > 0 || facets.fabrics.length > 0 || facets.colors.length > 0 || facets.sizes.length > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {facets.styles.length > 0 && (
            <select
              className="sort-select"
              value={styleFilter}
              onChange={e => setStyleFilter(e.target.value)}
              aria-label="filter by style"
            >
              <option value="">All styles ({facets.styles.length})</option>
              {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {facets.fabrics.length > 0 && (
            <select
              className="sort-select"
              value={fabricFilter}
              onChange={e => setFabricFilter(e.target.value)}
              aria-label="filter by fabric"
            >
              <option value="">All fabrics ({facets.fabrics.length})</option>
              {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
          {facets.colors.length > 0 && (
            <select
              className="sort-select"
              value={colorFilter}
              onChange={e => setColorFilter(e.target.value)}
              aria-label="filter by colour"
            >
              <option value="">All colours ({facets.colors.length})</option>
              {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {facets.sizes.length > 0 && (
            <select
              className="sort-select"
              value={sizeFilter}
              onChange={e => setSizeFilter(e.target.value)}
              aria-label="filter by size"
            >
              <option value="">All sizes ({facets.sizes.length})</option>
              {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(styleFilter || fabricFilter || colorFilter || sizeFilter) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter(''); }}
            >
              <X size={16} /> Clear filters
            </button>
          )}
        </div>
      )}

      {!isAll && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-ghost group-selector-btn"
          onClick={() => setGroupSelectorOpen(true)}
        >
          <FolderOpen size={18} />
          <span>Groups:&nbsp;</span>
          <strong>{currentGroup ? currentGroup.name : 'All'}</strong>
          <ChevronRight size={16} style={{ transform: 'rotate(90deg)', marginLeft: 4, opacity: 0.6 }} />
        </button>
        {(summary.lowCount + summary.outCount) > 0 && (
          <button
            type="button"
            className="btn btn-ghost reorder-btn"
            onClick={() => setReorderOpen(true)}
            title="See items that need restocking"
          >
            <AlertTriangle size={18} />
            Reorder list
            <span className="reorder-badge">{summary.lowCount + summary.outCount}</span>
          </button>
        )}
      </div>
      )}

      <div className="stock-summary">
        <div className="stat">
          <div className="stat-num">{summary.totalItems}</div>
          <div className="stat-label">items</div>
        </div>
        <div className="stat">
          <div className="stat-num">{summary.totalUnits.toLocaleString()}</div>
          <div className="stat-label">units</div>
        </div>
        <div className="stat stat-good">
          <div className="stat-num">{summary.inStockCount}</div>
          <div className="stat-label">in stock</div>
        </div>
        {summary.lowCount > 0 && (
          <div className="stat stat-warning">
            <div className="stat-num">{summary.lowCount}</div>
            <div className="stat-label">low stock</div>
          </div>
        )}
        {summary.outCount > 0 && (
          <div className="stat stat-danger">
            <div className="stat-num">{summary.outCount}</div>
            <div className="stat-label">out of stock</div>
          </div>
        )}
      </div>

      <div className="stock-controls">
        <div className="filter-segment" role="tablist" aria-label="stock filter">
          <button
            type="button"
            className={`seg-btn ${statusFilter === 'all' ? 'seg-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`seg-btn ${statusFilter === 'in' ? 'seg-active seg-good' : ''}`}
            onClick={() => setStatusFilter('in')}
          >
            In stock {summary.inStockCount > 0 && <span className="seg-count">{summary.inStockCount}</span>}
          </button>
          <button
            type="button"
            className={`seg-btn ${statusFilter === 'low' ? 'seg-active seg-warning' : ''}`}
            onClick={() => setStatusFilter('low')}
          >
            Low {summary.lowCount > 0 && <span className="seg-count">{summary.lowCount}</span>}
          </button>
          <button
            type="button"
            className={`seg-btn ${statusFilter === 'out' ? 'seg-active seg-danger' : ''}`}
            onClick={() => setStatusFilter('out')}
          >
            Out {summary.outCount > 0 && <span className="seg-count">{summary.outCount}</span>}
          </button>
        </div>
        <select
          className="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label="sort"
        >
          <option value="fabric-color">Sort: Fabric → Colour → Style</option>
          <option value="color">Sort: Colour A-Z</option>
          <option value="style">Sort: Style A-Z</option>
          <option value="name">Sort: Product name A-Z</option>
          <option value="qty-asc">Sort: Quantity (low first)</option>
          <option value="qty-desc">Sort: Quantity (high first)</option>
          {!isAll && <option value="custom">Sort: Custom (drag)</option>}
        </select>
      </div>

      {search && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 14px', background: '#e8eef5', borderRadius: 10, fontSize: 14 }}>
          <span>Filtered: <strong>{search}</strong></span>
          <button onClick={() => setSearch('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#1e3a5f', fontWeight: 600, cursor: 'pointer' }}>
            <X size={16} style={{ verticalAlign: 'middle' }} /> Clear
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && displayedItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <Package size={48} color="#666" style={{ margin: '0 auto' }} />
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

      {displayedItems.map(item => {
        const low = item.qty > 0 && item.qty <= item.threshold;
        const out = item.qty === 0;
        const itemGroup = groups.find(g => g.id === item.groupId);
        const isDragging = dragId === item.id;
        const isOver = overId === item.id && dragId !== null && dragId !== item.id;
        return (
          <div
            key={item.id}
            className={`stock-row ${out ? 'out' : low ? 'low' : ''} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''} ${dragEnabled ? 'draggable' : ''}`}
            draggable={dragEnabled}
            onDragStart={dragEnabled ? onDragStartRow(item.id) : undefined}
            onDragEnd={dragEnabled ? onDragEndRow : undefined}
            onDragOver={dragEnabled ? onDragOverRow(item.id) : undefined}
            onDragLeave={dragEnabled ? onDragLeaveRow(item.id) : undefined}
            onDrop={dragEnabled ? onDropRow(item.id) : undefined}
            title={dragEnabled ? 'Drag to reorder' : undefined}
          >
            <div className="list-item-main row-main">
              {item.imageUrl && (
                <button
                  type="button"
                  className="row-thumb-btn"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.imageUrl); }}
                  aria-label="View photo"
                  draggable={false}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="row-thumb"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    draggable={false}
                  />
                </button>
              )}
              <div className="row-text">
              {/* One bold line: STYLE · FABRIC · COLOUR · SIZE (no duplicate name line). */}
              <div className="list-item-title">
                {[item.category, item.fabric, item.print, item.color, item.size, item.brand]
                  .filter(Boolean).join(' · ') || item.name}
              </div>
              {item.sku && (
                <div className="list-item-sub" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  SKU: {item.sku}
                </div>
              )}
              {Number(item.price) > 0 && (
                <div className="list-item-sub" style={{ fontSize: 13, marginTop: 4, fontWeight: 600, color: 'var(--primary)' }}>
                  {idr(item.price)} per unit
                  {item.qty > 0 && <span style={{ color: '#666', fontWeight: 400 }}> · total {idr(item.qty * Number(item.price))}</span>}
                </div>
              )}
              <div className="list-item-sub" style={{ fontSize: 12, marginTop: 4 }}>
                {item.createdAt && <>Stocked: {new Date(item.createdAt).toLocaleDateString()}</>}
                {item.lastSoldAt && <> · Last sold: {new Date(item.lastSoldAt).toLocaleDateString()}</>}
              </div>
              {itemGroup && (
                <div style={{ marginTop: 6 }}>
                  <span className="group-tag"><FolderOpen size={12} /> {itemGroup.name}</span>
                </div>
              )}
              {out && <span className="badge badge-danger" style={{ marginTop: 6, display: 'inline-block' }}>OUT OF STOCK</span>}
              {low && !out && <span className="badge badge-warning" style={{ marginTop: 6, display: 'inline-block' }}>LOW STOCK</span>}
              </div>
            </div>
            {isAll ? (
              <div className={`stock-qty-large ${out ? 'out' : low ? 'low' : ''}`} style={{ gridColumn: '2 / -1', justifySelf: 'end' }}>{item.qty}</div>
            ) : (
              <>
                <button className="qty-btn" disabled={!perms.canEditStock || item.qty === 0} onClick={() => updateQty(item, -1)} aria-label="decrease">
                  <Minus size={18} />
                </button>
                <div className={`stock-qty-large ${out ? 'out' : low ? 'low' : ''}`}>{item.qty}</div>
                <button className="qty-btn" disabled={!perms.canEditStock} onClick={() => updateQty(item, 1)} aria-label="increase">
                  <Plus size={18} />
                </button>
              </>
            )}
            {isAll && (
              <div className="list-item-sub" style={{ gridColumn: '1 / -1', marginTop: 8, fontSize: 13, color: '#555', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {Object.entries(item.byShop || {}).map(([shopName, q]) => (
                  <span key={shopName}><strong>{shopName}:</strong> {q}</span>
                ))}
              </div>
            )}
            {!isAll && (
            <div className="list-item-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {perms.canEditStock && (
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => setLogModal(item)}>
                  <Calendar size={16} /> Log entry
                </button>
              )}
              {perms.canEditStock && (
                <button className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 14px', fontSize: 14 }} onClick={() => setGroupModalItem(item)}>
                  <FolderOpen size={16} /> {itemGroup ? 'Move group' : 'Add to group'}
                </button>
              )}
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
            )}
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
        <div className="empty" style={{ padding: 24 }}>
          <Check size={48} color="#2d8659" style={{ margin: '0 auto' }} />
          <h3>Nothing to reorder</h3>
          <p>All stock is above the low-stock alert level.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 'auto', padding: '10px 16px', fontSize: 14 }} onClick={copyList}>
              <Copy size={16} /> Copy list
            </button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {bySupplier.map(([supplier, group]) => (
              <div key={supplier} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)', marginBottom: 8, padding: '6px 10px', background: 'var(--primary-light)', borderRadius: 8 }}>
                  {supplier} <span style={{ color: '#666', fontWeight: 400 }}>· {group.length} item{group.length === 1 ? '' : 's'}</span>
                </div>
                {group.map(it => {
                  const need = Math.max(it.threshold * 2 - it.qty, it.threshold);
                  const out = it.qty === 0;
                  return (
                    <div key={it.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', marginBottom: 6,
                      border: `1px solid ${out ? 'rgba(196,69,58,0.3)' : 'rgba(214,138,28,0.3)'}`,
                      borderRadius: 10, background: 'white',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{it.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {[it.category, it.fabric, it.print, it.size, it.color].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Have</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: out ? '#c4453a' : '#d68a1c' }}>{it.qty}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 60 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Order</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>~{need}</div>
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
          <div style={{ color: '#666', fontSize: 14, padding: '14px 8px', textAlign: 'center' }}>
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
          <div style={{ color: '#666', padding: 8, fontSize: 14 }}>No groups yet. Create one below.</div>
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
      <div style={{ borderTop: '1px solid #e0e4eb', paddingTop: 14 }}>
        <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 6 }}>Or create a new group</label>
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
      <select
        className="select"
        value={selectedShopId == null ? '' : String(selectedShopId)}
        onChange={e => onSelect(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      >
        <option value="all">All Stock (every shop)</option>
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
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: 13, color: '#666' }}>Preview</span>
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

      <div style={{ marginTop: 24, borderTop: '1px solid #e0e4eb', paddingTop: 16 }}>
        <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} /> Recent history
        </h3>
        {loadingHistory && <div style={{ color: '#666', fontSize: 14 }}>Loading…</div>}
        {!loadingHistory && history.length === 0 && <div style={{ color: '#666', fontSize: 14 }}>No movements yet.</div>}
        {!loadingHistory && history.slice(0, 10).map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f2f5', fontSize: 14 }}>
            {m.type === 'in' && <TrendingUp size={16} color="#2d8659" />}
            {m.type === 'out' && <TrendingDown size={16} color="#c4453a" />}
            {m.type === 'adjust' && <Edit2 size={16} color="#666" />}
            <span style={{ fontWeight: 600, minWidth: 60 }}>
              {m.type === 'in' ? '+' : m.type === 'out' ? '−' : '='}{Math.abs(m.qtyChange)}
            </span>
            <span style={{ color: '#666' }}>{new Date(m.occurredAt).toLocaleDateString()}</span>
            <span style={{ color: '#999', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note}</span>
            <span style={{ color: '#666', fontSize: 12 }}>→ {m.qtyAfter}</span>
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

  useEffect(() => {
    if (!shopId && shops[0]) setShopId(shops[0].id);
  }, [shops, shopId]);

  const focusInput = () => { try { inputRef.current && inputRef.current.focus(); } catch {} };
  useEffect(() => { focusInput(); }, [shopId]);

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim();
    if (!c || !shopId) return;
    setBusy(true); setMsg(null);
    try {
      const d = await api(`/api/shops/${shopId}/sell`, { method: 'POST', body: { code: c } });
      setMsg({ type: 'ok', text: `Sold: ${d.item.name} — ${d.item.qty} left` });
      setRecent(r => [{ name: d.item.name, sku: d.item.sku, qty: d.item.qty, ts: Date.now() }, ...r].slice(0, 30));
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not sell that item' });
    } finally {
      setCode('');
      setBusy(false);
      focusInput();
    }
  };

  const shopName = shops.find(s => s.id === shopId)?.name || '';

  if (shops.length === 0) {
    return <div className="card"><div className="empty"><Store size={48} color="#666" style={{ margin: '0 auto' }} /><h3>No shops yet</h3></div></div>;
  }

  return (
    <div>
      <div className="field">
        <label>Selling from shop</label>
        <select className="select" value={shopId || ''} onChange={e => setShopId(Number(e.target.value))}>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label>Scan barcode (or type the item code) — each scan sells 1</label>
          <input
            ref={inputRef}
            className="input"
            style={{ fontSize: 22, fontFamily: 'monospace', letterSpacing: 1 }}
            placeholder="Waiting for scan…"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            inputMode="text"
          />
        </div>
        <button className="btn btn-primary btn-block btn-large" disabled={busy || !code.trim()}>
          <ScanLine size={20} /> Sell one
        </button>
      </form>

      {msg && (
        <div
          className={msg.type === 'ok' ? '' : 'error-banner'}
          style={msg.type === 'ok'
            ? { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(45,134,89,0.10)', border: '1px solid rgba(45,134,89,0.35)', color: '#1f6e44', fontWeight: 600 }
            : { marginTop: 16 }}
        >
          {msg.text}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 style={{ margin: '24px 0 12px' }}>Sold just now ({shopName})</h2>
          {recent.map((r, i) => (
            <div key={r.ts + '-' + i} className="stock-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="list-item-title">{r.name}</div>
                {r.sku && <div className="list-item-sub" style={{ fontFamily: 'monospace', fontSize: 13 }}>SKU: {r.sku}</div>}
              </div>
              <div style={{ textAlign: 'right', color: '#666', fontSize: 14 }}>
                {r.qty} left<br />
                <span style={{ fontSize: 12 }}>{new Date(r.ts).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW VIEW — master aggregation across all shops
// ═══════════════════════════════════════════════════════════
function OverviewView() {
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

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (styleFilter) params.set('style', styleFilter);
    if (fabricFilter) params.set('fabric', fabricFilter);
    if (colorFilter) params.set('color', colorFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    params.set('sort', sortBy);
    const qs = params.toString();
    api(`/api/business/stock-overview${qs ? `?${qs}` : ''}`)
      .then(d => { setData(d || { shops: [], items: [] }); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [search, styleFilter, fabricFilter, colorFilter, sizeFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

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
    let grand = 0;
    for (const s of data.shops) perShop[s] = 0;
    for (const it of data.items) {
      grand += it.total || 0;
      for (const s of data.shops) perShop[s] += it.byShop[s] || 0;
    }
    return { perShop, grand, skuCount: data.items.length };
  }, [data]);

  return (
    <div>
      <div className="search-bar">
        <input
          className="input"
          placeholder="Search product, code, fabric, colour…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {facets.styles.length > 0 && (
          <select className="sort-select" value={styleFilter} onChange={e => setStyleFilter(e.target.value)} aria-label="filter by style">
            <option value="">All styles ({facets.styles.length})</option>
            {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {facets.fabrics.length > 0 && (
          <select className="sort-select" value={fabricFilter} onChange={e => setFabricFilter(e.target.value)} aria-label="filter by fabric">
            <option value="">All fabrics ({facets.fabrics.length})</option>
            {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {facets.colors.length > 0 && (
          <select className="sort-select" value={colorFilter} onChange={e => setColorFilter(e.target.value)} aria-label="filter by colour">
            <option value="">All colours ({facets.colors.length})</option>
            {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {facets.sizes.length > 0 && (
          <select className="sort-select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} aria-label="filter by size">
            <option value="">All sizes ({facets.sizes.length})</option>
            {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="sort">
          <option value="fabric-color">Sort: Fabric → Colour → Style</option>
          <option value="color">Sort: Colour A-Z</option>
          <option value="style">Sort: Style A-Z</option>
          <option value="name">Sort: Product name A-Z</option>
          <option value="total-desc">Sort: Most stock first</option>
          <option value="total-asc">Sort: Least stock first</option>
        </select>
        {(styleFilter || fabricFilter || colorFilter || sizeFilter) && (
          <button type="button" className="btn btn-ghost" onClick={() => { setStyleFilter(''); setFabricFilter(''); setColorFilter(''); setSizeFilter(''); }}>
            <X size={16} /> Clear filters
          </button>
        )}
      </div>

      <div className="stock-summary">
        <div className="stat">
          <div className="stat-num">{summary.skuCount}</div>
          <div className="stat-label">products</div>
        </div>
        <div className="stat">
          <div className="stat-num">{summary.grand.toLocaleString()}</div>
          <div className="stat-label">total units</div>
        </div>
        {data.shops.map(s => (
          <div className="stat" key={s}>
            <div className="stat-num">{(summary.perShop[s] || 0).toLocaleString()}</div>
            <div className="stat-label">{s}</div>
          </div>
        ))}
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && sortedItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <Package size={48} color="#666" style={{ margin: '0 auto' }} />
            <h3>Nothing matches</h3>
            <p>Try clearing filters or the search box.</p>
          </div>
        </div>
      )}

      {!loading && !error && sortedItems.length > 0 && (
        <div className="card overview-card">
          <div className="overview-scroll">
            <table className="overview-table">
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
                {sortedItems.map(item => (
                  <tr key={item.sku}>
                    <td className="sticky-col">
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{item.sku}{item.style ? ` · ${item.style}` : ''}</div>
                    </td>
                    <td>{item.fabric}</td>
                    <td>{item.color}</td>
                    <td>{item.size}</td>
                    {data.shops.map(s => (
                      <td key={s} className="num" style={{ color: (item.byShop[s] || 0) === 0 ? '#bbb' : undefined }}>
                        {item.byShop[s] || 0}
                      </td>
                    ))}
                    <td className="num total-col"><strong>{item.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRANSFER VIEW — record moving stock between shops
// ═══════════════════════════════════════════════════════════
function TransferView({ shops }) {
  const toast = useToast();
  // Default source = the shop most likely to be the warehouse (name contains "office" or "kantor"),
  // else the first shop. Destination = the second shop that isn't source.
  const officeShop = useMemo(
    () => shops.find(s => /office|kantor|warehouse/i.test(s.name)) || shops[0],
    [shops]
  );
  const [fromShopId, setFromShopId] = useState(officeShop ? String(officeShop.id) : '');
  const [toShopId, setToShopId] = useState('');
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { name, fromQty, ... } from a lookup
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (!fromShopId && officeShop) setFromShopId(String(officeShop.id));
  }, [officeShop, fromShopId]);

  // When SKU and fromShop are both set, look up the item so the user sees name + current qty before submitting.
  useEffect(() => {
    if (!fromShopId || !sku.trim()) { setPreview(null); return; }
    const params = new URLSearchParams({ search: sku.trim() });
    let cancelled = false;
    api(`/api/shops/${fromShopId}/stock?${params}`)
      .then(rows => {
        if (cancelled) return;
        const exact = (rows || []).find(r => (r.sku || '').toLowerCase() === sku.trim().toLowerCase());
        setPreview(exact || null);
      })
      .catch(() => setPreview(null));
    return () => { cancelled = true; };
  }, [fromShopId, sku]);

  const submit = async (e) => {
    e.preventDefault();
    setLastResult(null);
    if (!fromShopId || !toShopId) { toast('Choose both a source and destination shop'); return; }
    if (fromShopId === toShopId)  { toast('Source and destination must differ'); return; }
    if (!sku.trim())              { toast('Enter the item code (KODE)'); return; }
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) { toast('Quantity must be a positive whole number'); return; }
    setBusy(true);
    try {
      const result = await api('/api/transfers', {
        method: 'POST',
        body: {
          sku: sku.trim(),
          fromShopId: Number(fromShopId),
          toShopId: Number(toShopId),
          qty: n,
          note: note.trim(),
        },
      });
      toast(`Sent ${n} × ${sku.trim()} to ${result.to.shopName}`);
      setLastResult(result);
      setSku(''); setQty(''); setNote('');
      setPreview(null);
    } catch (err) {
      toast(err.message);
    } finally { setBusy(false); }
  };

  if (shops.length < 2) {
    return (
      <div className="card">
        <div className="empty">
          <Store size={48} color="#666" style={{ margin: '0 auto' }} />
          <h3>Need at least two shops</h3>
          <p>Add a second shop before recording transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Record a transfer</h3>
        <p style={{ color: '#666', marginTop: 0 }}>Moves stock from one shop to another and updates both totals.</p>

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>From</div>
              <select className="input" value={fromShopId} onChange={e => setFromShopId(e.target.value)} required>
                <option value="">Choose shop…</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>To</div>
              <select className="input" value={toShopId} onChange={e => setToShopId(e.target.value)} required>
                <option value="">Choose shop…</option>
                {shops.filter(s => String(s.id) !== fromShopId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Item code (KODE)</div>
            <input
              className="input"
              placeholder="e.g. AG-1004"
              value={sku}
              onChange={e => setSku(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              required
            />
          </label>

          {preview && (
            <div style={{ padding: 12, background: '#f4f6f9', borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>{preview.name}</div>
              <div style={{ fontSize: 14, color: '#555' }}>
                {preview.fabric && <>{preview.fabric} · </>}
                {preview.color && <>{preview.color} · </>}
                {preview.size && <>{preview.size} · </>}
                In stock: <strong>{preview.qty}</strong>
              </div>
            </div>
          )}
          {!preview && sku.trim() && fromShopId && (
            <div style={{ padding: 12, background: '#fff4e6', color: '#8a5a0e', borderRadius: 10, marginBottom: 14, fontSize: 14 }}>
              No item with code “{sku.trim()}” found in the source shop.
            </div>
          )}

          <label style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Quantity</div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'block', marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Note (optional)</div>
            <input
              className="input"
              placeholder="e.g. Pengambilan 25-07-2026"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Recording…' : 'Record transfer'}
          </button>
        </form>
      </div>

      {lastResult && (
        <div className="card" style={{ marginTop: 14, background: 'rgba(45,134,89,0.06)', border: '1px solid rgba(45,134,89,0.3)' }}>
          <div style={{ fontWeight: 600, color: '#1f6e44', marginBottom: 4 }}>
            <Check size={18} style={{ verticalAlign: 'middle' }} /> Transfer recorded
          </div>
          <div style={{ fontSize: 14, color: '#333' }}>
            {lastResult.from.shopName} now has <strong>{lastResult.from.newQty}</strong> of {lastResult.from.sku}.
            {' '}{lastResult.to.shopName} now has <strong>{lastResult.to.newQty}</strong>.
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
      <p style={{ color: '#666', marginTop: 0, marginBottom: 18, fontSize: 14 }}>
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
