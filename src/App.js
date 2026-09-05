import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import {
  Package, Store, Plus, Trash2, Edit2,
  RefreshCw, Check, X, AlertTriangle, Copy, Settings,
  ChevronRight, Minus, ScanLine, Search, SlidersHorizontal,
  MoreHorizontal, Sun, Moon, Printer, Undo2, ClipboardCheck,
  Calendar, FolderOpen, FolderPlus, History, TrendingUp, TrendingDown,
} from 'lucide-react';
import { LanguageProvider, LANGUAGES, useLang, useT } from './i18n';
import { api, getToken, setToken, download, idr } from './api';
import { TodayView, HistoryView } from './views';
import { Modal, SearchField } from './ui';
import { tStatic } from './i18n';
import { StockCheckView } from './stockcheck';
import { parseStockSheet } from './sheetparse';
import './App.css';

// ── Config ────────────────────────────────────────────────

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

const productCount = (t, n) =>
  (n === 1 ? t('stock.oneProduct') : t('stock.nProducts').replace('{n}', (n || 0).toLocaleString()));

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
            <h2>{tStatic('common.somethingWrong')}</h2>
            <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>{tStatic('common.tryReloading')}</p>
            <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
              {tStatic('common.refresh')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── API client ────────────────────────────────────────────

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

// ── Shared UI primitives ──────────────────────────────────

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
  const t = useT();
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
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
      title={dark ? t('theme.toLight') : t('theme.toDark')}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{dark ? t('theme.light') : t('theme.dark')}</span>
    </button>
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
function MainApp({ user, business, shop, onSwitchAccess }) {
  const t = useT();
  // Staff work the till; admin runs the business. Staff open on Sell because
  // that is the whole job; admin opens on Stock, which is where the owner
  // starts her day.
  const isAdmin = user.accessRole !== 'staff';
  const [tab, setTab] = useState(isAdmin ? 'stock' : 'sell');
  const [showSettings, setShowSettings] = useState(false);
  // Set when Overview's "Restock" jumps to the Stock tab pre-filtered to one SKU.
  const [stockJump, setStockJump] = useState(null);

  const shops = useCollection('/api/shops', true);
  const staff = useCollection('/api/staff', true);
  const [showStaff, setShowStaff] = useState(false);

  // A staff code is pinned to one shop and only ever sees that one. The
  // manager sees them all and picks; 'all' means every shop together, which
  // is the view the owner wants when she is reading the business rather than
  // working a till.
  const shopList = useMemo(
    () => (isAdmin ? shops.data : shops.data.filter(x => x.id === shop?.id)),
    [shops.data, isAdmin, shop]
  );
  const [shopSel, setShopSel] = useState('all');

  // Whichever shop the tills act on. 'all' is not a place you can sell from,
  // so Sell and Stock fall back to the first real shop.
  const activeShopId = useMemo(() => {
    if (!isAdmin) return shop?.id || shopList[0]?.id || null;
    if (shopSel !== 'all') return Number(shopSel);
    return shopList[0]?.id || null;
  }, [isAdmin, shop, shopList, shopSel]);

  // Sent to every report so the figures follow the picker. Empty means all.
  const shopsParam = shopSel === 'all' ? '' : String(shopSel);

  // A shop that disappears out from under the picker must not strand it.
  useEffect(() => {
    if (shopSel !== 'all' && !shopList.find(x => String(x.id) === String(shopSel))) {
      setShopSel('all');
    }
  }, [shopList, shopSel]);

  // Order follows the day: ring it up, keep the rail right, check the till,
  // then read the business. Staff get everything except the Overview: they
  // need History because that is where a sale gets corrected, and a mistake
  // is spotted by whoever made it.
  const allTabs = [
    { id: 'sell',     label: t('tab.sell'),     icon: ScanLine,   staff: true },
    { id: 'stock',    label: t('tab.stock'),    icon: Package,    staff: true },
    { id: 'check',    label: t('tab.check'),    icon: ClipboardCheck, staff: true },
    { id: 'today',    label: t('tab.today'),    icon: Calendar,   staff: true },
    { id: 'overview', label: t('tab.overview'), icon: SlidersHorizontal },
    { id: 'history',  label: t('tab.history'),  icon: History,  staff: true },
  ];
  const tabs = isAdmin ? allTabs : allTabs.filter(x => x.staff);

  // If a session is downgraded to the staff code while sitting on an admin
  // tab, fall back rather than rendering a view whose data it cannot load.
  useEffect(() => {
    if (!tabs.find(x => x.id === tab)) setTab(tabs[0].id);
  }, [tabs, tab]);

  const scopeLabel = isAdmin
    ? (shopSel === 'all'
        ? t('shop.allShops')
        : (shopList.find(x => String(x.id) === String(shopSel))?.name || ''))
    : (shop?.name || '');

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Mitra Samadi</h1>
          <div className="topbar-sub">
            {isAdmin ? (business?.name || 'Mitra Samadi') : scopeLabel}
            {!isAdmin && <span className="topbar-scope">{t('scope.staff')}</span>}
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button className="topbar-btn" onClick={() => setShowSettings(true)} aria-label={t('settings.title')}>
            <Settings size={19} />
          </button>
        </div>
      </div>

      <div className="container">
        <nav className="nav">
          {tabs.map(x => (
            <button key={x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>
              <x.icon size={18} />
              <span>{x.label}</span>
              {x.badge > 0 && <span className="nav-badge">{x.badge}</span>}
            </button>
          ))}
        </nav>

        {/* One picker, above everything, so the shop in view is never in
            doubt. Hidden for staff, who have nothing to choose. */}
        {isAdmin && shopList.length > 1 && (
          <ShopSwitcher
            shops={shopList}
            value={shopSel}
            onChange={setShopSel}
            // Sell and Stock act on one shop, so 'all' is not offered there.
            allowAll={tab !== 'sell' && tab !== 'stock'}
            activeShopId={activeShopId}
            onPickActive={(id) => setShopSel(String(id))}
          />
        )}

        {tab === 'sell' && (
          <SellView
            shops={shopList.filter(x => x.id === activeShopId)}
            staff={staff.data}
            isAdmin={isAdmin}
            onManageStaff={() => setShowStaff(true)}
          />
        )}
        {tab === 'stock' && (
          <StockView
            shops={shopList}
            selectedShopId={activeShopId}
            onSelectShop={(id) => setShopSel(String(id))}
            user={user}
            isAdmin={isAdmin}
            onReloadShops={shops.reload}
            jump={stockJump}
            onJumpHandled={() => setStockJump(null)}
          />
        )}
        {tab === 'check' && (
          <StockCheckView staff={staff.data} shopsParam={shopsParam} />
        )}
        {tab === 'today' && (
          <TodayView isAdmin={isAdmin} shopsParam={shopsParam} />
        )}
        {tab === 'overview' && isAdmin && (
          <OverviewView shops={shopList} shopsParam={shopsParam} />
        )}
        {tab === 'history' && (
          <HistoryView staff={staff.data} shops={shopList} shopsParam={shopsParam} isAdmin={isAdmin} />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          isAdmin={isAdmin}
          shopName={scopeLabel}
          onClose={() => setShowSettings(false)}
          onManageStaff={() => { setShowSettings(false); setShowStaff(true); }}
          onSwitchAccess={onSwitchAccess}
          shops={shopList}
          onReset={() => { shops.reload(); staff.reload(); setStockJump(null); }}
        />
      )}

      {showStaff && isAdmin && (
        <StaffModal
          staff={staff.data}
          shops={shopList}
          onClose={() => setShowStaff(false)}
          onChanged={staff.reload}
        />
      )}
    </div>
  );
}

// ── Shop switcher ─────────────────────────────────────────
// Two shops now, so every screen needs to say which one it is showing. This
// sits above the content rather than inside each view, because the answer to
// "whose numbers am I looking at" should never be somewhere you have to go
// and find.
function ShopSwitcher({ shops, value, onChange, allowAll, activeShopId, onPickActive }) {
  const t = useT();
  // Sell and Stock act on one shop. Rather than leave the picker showing
  // "All shops" while the till quietly uses the first one, it shows the shop
  // actually in use.
  const shown = allowAll ? value : String(activeShopId);
  const pick = (v) => (allowAll ? onChange(v) : onPickActive(Number(v)));

  return (
    <div className="shop-switcher" role="group" aria-label={t('shop.pick')}>
      {allowAll && (
        <button
          className={shown === 'all' ? 'is-active' : ''}
          onClick={() => pick('all')}
        >{t('shop.allShops')}</button>
      )}
      {shops.map(sh => (
        <button
          key={sh.id}
          className={String(shown) === String(sh.id) ? 'is-active' : ''}
          onClick={() => pick(sh.id)}
        >{sh.name}</button>
      ))}
    </div>
  );
}

// ── Trial banner ──────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// STOCK VIEW
// ═══════════════════════════════════════════════════════════
function StockView({ shops, selectedShopId, onSelectShop, user, onReloadShops, jump, onJumpHandled }) {
  const t = useT();
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
      toast(groupId ? t('stock.movedToGroup') : t('stock.removedFromGroup'));
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
          <h3>{t('stock.noShops')}</h3>
          <p>{t('stock.goToShopsTab')}</p>
        </div>
      </div>
    );
  }

  if (!selectedShopId) return <div className="loading">{t('stock.loadingShops')}</div>;

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
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('stock.searchPlaceholder')}
        />
        <select
          className="select select-inline toolbar-sort"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label={t('common.sort')}
        >
          <option value="fabric-color">{t('stock.sortFabricColor')}</option>
          <option value="qty-asc">{t('stock.sortFewest')}</option>
          <option value="qty-desc">{t('stock.sortMost')}</option>
          <option value="color">{t('stock.sortColor')}</option>
          <option value="style">{t('stock.sortStyle')}</option>
          <option value="name">{t('stock.sortName')}</option>
          {!isAll && <option value="custom">{t('stock.sortCustom')}</option>}
        </select>
        {perms.canAddItems && !isAll && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={18} /> {t('stock.addItem')}
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
          {t('stock.filters')}
          {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
        {(summary.lowCount + summary.outCount) > 0 && !isAll && (
          <button type="button" className="filter-toggle" onClick={() => setReorderOpen(true)}>
            <AlertTriangle size={16} />
            {t('stock.reorderList')}
            <span className="filter-count">{summary.lowCount + summary.outCount}</span>
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="filter-panel">
          {facets.styles.length > 0 && (
            <div className="field">
              <label>{t('stock.style')}</label>
              <select className="select" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
                <option value="">All styles ({facets.styles.length})</option>
                {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {facets.fabrics.length > 0 && (
            <div className="field">
              <label>{t('stock.fabric')}</label>
              <select className="select" value={fabricFilter} onChange={e => setFabricFilter(e.target.value)}>
                <option value="">All fabrics ({facets.fabrics.length})</option>
                {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          {facets.colors.length > 0 && (
            <div className="field">
              <label>{t('stock.colour')}</label>
              <select className="select" value={colorFilter} onChange={e => setColorFilter(e.target.value)}>
                <option value="">All colours ({facets.colors.length})</option>
                {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {facets.sizes.length > 0 && (
            <div className="field">
              <label>{t('stock.size')}</label>
              <select className="select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                <option value="">All sizes ({facets.sizes.length})</option>
                {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {!isAll && (
            <div className="field">
              <label>{t('stock.group')}</label>
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
          ? t('stock.countedAllShops')
          : t('stock.countedAtOnly').replace('{s}', shops.find(s => s.id === selectedShopId)?.name || t('stock.thisShop'))}
      </p>
      <div className="stat-grid">
        <StatCard
          value={summary.inStockCount}
          label={t('stock.inStock')}
          tone="good"
          active={statusFilter === 'in'}
          onClick={() => setStatusFilter(statusFilter === 'in' ? 'all' : 'in')}
        />
        <StatCard
          value={summary.lowCount}
          label={t('stock.lowStock')}
          tone="warn"
          active={statusFilter === 'low'}
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
        />
        <StatCard
          value={summary.outCount}
          label={t('stock.outOfStock')}
          tone="bad"
          active={statusFilter === 'out'}
          onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
        />
      </div>

      <Disclosure
        title={t('stock.totals')}
        tail={t('stock.productsPieces').replace('{p}', summary.totalItems.toLocaleString()).replace('{u}', summary.totalUnits.toLocaleString())}
      >
        <div className="metric-row">
          <div>
            <div className="metric-label">{t('stock.differentProducts')}</div>
            <div className="metric-value">{summary.totalItems.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>{t('stock.eachColourOnce')}</div>
          </div>
          <div>
            <div className="metric-label">{t('stock.totalPieces')}</div>
            <div className="metric-value">{summary.totalUnits.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>{t('stock.actualGarments')}</div>
          </div>
          <div>
            <div className="metric-label">{t('stock.needReordering')}</div>
            <div className="metric-value">{(summary.lowCount + summary.outCount).toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>{t('stock.lowPlusOut')}</div>
          </div>
        </div>
      </Disclosure>

      {statusFilter !== 'all' && (
        <div className="filter-bar">
          <button type="button" className="filter-toggle is-open" onClick={() => setStatusFilter('all')}>
            {t('stock.onlyShowing').replace('{s}', statusFilter === 'in' ? t('stock.inStock') : statusFilter === 'low' ? t('stock.lowStock') : t('stock.outOfStock'))}
            <X size={15} />
          </button>
        </div>
      )}

      {loading && <div className="loading">{t('common.loading')}</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && displayedItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <Package size={32} color="var(--text-3)" style={{ margin: '0 auto' }} />
            <h3>{search ? t('stock.noItemsMatch') : statusFilter !== 'all' ? t(statusFilter === 'low' ? 'stock.noLowItems' : 'stock.noOutItems') : t('stock.noStockYet')}</h3>
            <p>{search ? t('stock.tryDifferentSearch') : statusFilter !== 'all' ? t('stock.switchBackAll') : t('stock.addFirstItem')}</p>
            {perms.canAddItems && !search && statusFilter === 'all' && (
              <button className="btn btn-primary" onClick={() => setModal('new')}>
                <Plus size={18} /> {t('stock.addFirstItemBtn')}
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
                {productCount(t, fabricCounts[fabricOf(item)])}
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
                  aria-label={t('stock.viewPhoto')}
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
                  {out && <span className="pill pill-bad">{t('stock.outOfStock')}</span>}
                  {low && <span className="pill pill-warn">{t('stock.lowStock')}</span>}
                </div>
              </div>

              {isAll ? (
                <div className="qty-value">{item.qty}</div>
              ) : (
                <div className="qty-group">
                  <button className="qty-btn" disabled={!perms.canEditStock || item.qty === 0} onClick={() => updateQty(item, -1)} aria-label={t('stock.decrease')}>
                    <Minus size={16} />
                  </button>
                  <div className="qty-value">{item.qty}</div>
                  <button className="qty-btn" disabled={!perms.canEditStock} onClick={() => updateQty(item, 1)} aria-label={t('stock.increase')}>
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {!isAll && (perms.canEditStock || perms.canDeleteItems) && (
                <RowMenu label={t('stock.actionsFor').replace('{name}', item.name)}>
                  {perms.canEditStock && <MenuItem icon={Calendar} onClick={() => setLogModal(item)}>{t('stock.logEntry')}</MenuItem>}
                  {perms.canEditStock && (
                    <MenuItem icon={FolderOpen} onClick={() => setGroupModalItem(item)}>
                      {itemGroup ? t('stock.moveGroup') : t('stock.addToGroup')}
                    </MenuItem>
                  )}
                  {perms.canEditStock && <MenuItem icon={Edit2} onClick={() => setModal(item)}>{t('common.edit')}</MenuItem>}
                  {perms.canDeleteItems && <div className="menu-sep" />}
                  {perms.canDeleteItems && <MenuItem icon={Trash2} danger onClick={() => removeItem(item)}>{t('common.delete')}</MenuItem>}
                </RowMenu>
              )}
            </div>

            <button
              type="button"
              className="details-btn"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              aria-expanded={expanded}
            >
              {expanded ? t('common.hideDetails') : t('common.details')}
              <ChevronRight
                size={13}
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}
              />
            </button>

            {expanded && (
              <div className="details-body">
                {item.name && title !== item.name && (
                  <div><div className="detail-k">{t('item.product')}</div><div className="detail-v">{item.name}</div></div>
                )}
                {Number(item.price) > 0 && (
                  <div>
                    <div className="detail-k">{t('item.stockValue')}</div>
                    <div className="detail-v">{idr(item.qty * Number(item.price))}</div>
                  </div>
                )}
                <div><div className="detail-k">{t('item.lowStockAlert')}</div><div className="detail-v">{item.threshold}</div></div>
                {item.supplier && (
                  <div><div className="detail-k">{t('item.supplier')}</div><div className="detail-v">{item.supplier}</div></div>
                )}
                {item.createdAt && (
                  <div>
                    <div className="detail-k">{t('item.stocked')}</div>
                    <div className="detail-v">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                )}
                {item.lastSoldAt && (
                  <div>
                    <div className="detail-k">{t('item.lastSold')}</div>
                    <div className="detail-v">{new Date(item.lastSoldAt).toLocaleDateString()}</div>
                  </div>
                )}
                {itemGroup && (
                  <div>
                    <div className="detail-k">{t('stock.group')}</div>
                    <div className="detail-v"><span className="group-tag"><FolderOpen size={11} /> {itemGroup.name}</span></div>
                  </div>
                )}
                {isAll && Object.keys(item.byShop || {}).length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="detail-k">{t('item.byShop')}</div>
                    <div className="detail-v" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {Object.entries(item.byShop).map(([shopName, q]) => (
                        <span key={shopName}>{shopName}: <strong>{q}</strong></span>
                      ))}
                    </div>
                  </div>
                )}
                {item.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="detail-k">{t('item.notes')}</div>
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
          onSaved={() => { setModal(null); loadStock(); toast(modal === 'new' ? t('stock.itemAdded') : t('stock.itemUpdated')); }}
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
  const t = useT();
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
        aria-label={t('common.close')}
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
  const t = useT();
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
    <Modal title={t('stock.reorderListTitle').replace('{n}', String(needsReorder.length))} onClose={onClose}>
      {needsReorder.length === 0 ? (
        <div className="empty empty-sm">
          <Check size={28} color="var(--good)" style={{ margin: '0 auto' }} />
          <h3>{t('stock.nothingToReorder')}</h3>
          <p>{t('stock.allAboveAlert')}</p>
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
  const t = useT();
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
    <Modal title={t('groups.title')} onClose={onClose}>
      <div className="group-pick-list">
        <button
          type="button"
          className={`group-pick ${selectedGroup === 'all' ? 'group-pick-active' : ''}`}
          onClick={() => onPick('all')}
        >
          <FolderOpen size={18} />
          <span className="group-pick-name">{t('groups.allItems')}</span>
          {selectedGroup === 'all' && <Check size={20} className="group-pick-check" />}
        </button>

        {groups.length === 0 && (
          <div style={{ color: 'var(--text-2)', fontSize: 14, padding: '14px 8px', textAlign: 'center' }}>
            {t('groups.none')}
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
                  title={t('stock.deleteNamed').replace('{name}', g.name)}
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
          <label>{t('groups.new')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder={t('groups.egName')}
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
  const t = useT();
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
    <Modal title={t('stock.moveNamed').replace('{name}', item.name)} onClose={onClose}>
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
          <div style={{ color: 'var(--text-2)', padding: 8, fontSize: 14 }}>{t('groups.none')}</div>
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
        <label style={{ display: 'block', fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>{t('groups.orCreate')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder={t('groups.name')}
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


// ── Stock modal ───────────────────────────────────────────
function StockModal({ item, shopId, onClose, onSaved }) {
  const t = useT();
  const [f, setF] = useState(item ? {
    ...item,
    qty: String(item.qty ?? ''),
    threshold: String(item.threshold ?? ''),
    price: item.price ? String(item.price) : '',
    cost: item.cost ? String(item.cost) : '',
    imageUrl: item.imageUrl || '',
  } : {
    name: '', category: '', fabric: '', print: '', size: '', color: '', sku: '', brand: '',
    qty: '0', threshold: '5', supplier: '', notes: '',
    price: '', cost: '', imageUrl: '',
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
        cost: f.cost === '' ? 0 : Number(f.cost),
        imageUrl: (f.imageUrl || '').trim(),
      };
      if (item) await api(`/api/stock/${item.id}`, { method: 'PUT', body: payload });
      else      await api(`/api/shops/${shopId}/stock`, { method: 'POST', body: payload });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title={item ? t('form.editItem') : t('form.newItem')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <div className="field">
          <label>{t('common.name')}</label>
          <input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder={t('form.egName')} />
        </div>
        <div className="field">
          <label>{t('form.photoUrl')}</label>
          <input
            className="input"
            type="url"
            value={f.imageUrl}
            onChange={e => setF({ ...f, imageUrl: e.target.value })}
            placeholder={t('form.photoHint')}
          />
          {f.imageUrl && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={f.imageUrl}
                alt="preview"
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('form.preview')}</span>
            </div>
          )}
        </div>
        <div className="field">
          <label>{t('form.category')}</label>
          <input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder={t('form.egCategory')} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('stock.fabric')}</label>
            <input className="input" value={f.fabric} onChange={e => setF({ ...f, fabric: e.target.value })} placeholder={t('form.egFabric')} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.print')}</label>
            <input className="input" value={f.print} onChange={e => setF({ ...f, print: e.target.value })} placeholder={t('form.egPrint')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('stock.size')}</label>
            <input className="input" value={f.size} onChange={e => setF({ ...f, size: e.target.value })} placeholder={t('form.egSize')} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.color')}</label>
            <input className="input" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} placeholder={t('common.optional')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.brand')}</label>
            <input className="input" value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} placeholder={t('common.optional')} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.sku')}</label>
            <input className="input" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} placeholder={t('common.optional')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.quantity')}</label>
            <input className="input" type="number" min="0" inputMode="numeric" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('item.lowStockAlert')}</label>
            <input className="input" type="number" min="0" inputMode="numeric" value={f.threshold} onChange={e => setF({ ...f, threshold: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.sellsFor')}</label>
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
          <div className="field" style={{ flex: 1 }}>
            <label>{t('form.cost')}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={f.cost}
              onChange={e => setF({ ...f, cost: e.target.value })}
              placeholder="0"
            />
            <div className="field-hint">{t('form.costHint')}</div>
          </div>
        </div>
        <div className="field">
          <label>{t('item.supplier')}</label>
          <input className="input" value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} placeholder={t('common.optional')} />
        </div>
        <div className="field">
          <label>{t('item.notes')}</label>
          <textarea className="textarea" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder={t('common.optional')} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Movement modal: log stock-in / stock-out with date ─────
function MovementModal({ item, onClose, onSaved, defaultType = 'in' }) {
  const t = useT();
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
    <Modal title={t('stock.logEntryFor').replace('{name}', item.name)} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{err}</div>}
        <div className="field">
          <label>{t('common.type')}</label>
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
            <label>{t('form.howMany')}</label>
            <input className="input" type="number" min="1" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('common.date')}</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label>{t('form.noteOptional')}</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={t('form.egNote')} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('common.saving') : t('form.saveEntry')}</button>
        </div>
      </form>

      <div style={{ marginTop: 24, borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
        <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} /> Recent history
        </h3>
        {loadingHistory && <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{t('common.loading')}</div>}
        {!loadingHistory && history.length === 0 && <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{t('form.noMovements')}</div>}
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
  { id: 'sell',   icon: ScanLine },
  { id: 'return', icon: Undo2 },
  { id: 'in',     icon: TrendingUp },
  { id: 'out',    icon: TrendingDown },
];

// The modes that put stock back on the rail. An empty peg is not a problem
// for either of them: stocking in is filling it, and a return is a customer
// bringing back the last one that was sold — which is precisely the case
// where the shop is already at zero. Anything not in here takes stock away
// and does have to check there is some.
const ADDS_STOCK = new Set(['in', 'return']);

// Why a piece left the shop without being sold. Kept short because staff pick
// one on a phone, mid-task.
const OUT_REASONS = ['Reject', 'Damaged', 'ReturnedToFactory', 'Lost', 'Sample', 'Other'];

function SellView({ shops, staff, isAdmin = true, onManageStaff, onChanged }) {
  const t = useT();
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
    setMsg({ type: 'ok', text: t('sell.nowInStock')
      .replace('{verb}', verb).replace('{n}', String(d.qtyChanged))
      .replace('{name}', d.item.name).replace('{qty}', String(d.item.qty)) });
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
    setCode('');
    setInFlight(n => n + 1);
    setMsg(null);
    focusInput();
    try {
      const d = await api(`/api/shops/${shopId}/scan`, { method: 'POST', body: scanBody({ code: c }, 1) });
      record(d, d.label);
      onChanged?.();
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
    setBusy(true); setMsg(null);
    try {
      const d = await api(`/api/shops/${shopId}/scan`, {
        method: 'POST',
        body: scanBody({ itemId: picked.id }, sellQty),
      });
      record(d, d.label);
      onChanged?.();
      setPicked(null); setLookup(''); setResults([]); setSellQty(1);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not record that' });
    } finally {
      setBusy(false);
    }
  };

  const shopName = shops.find(s => s.id === shopId)?.name || '';
  const adding = ADDS_STOCK.has(scanMode);
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
          <h3>{t('stock.noShops')}</h3>
          <p>{t('sell.addShopFirst')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* What this scan does. Sell first — it is the everyday one. */}
      <div className="segmented segmented-wide mode-switch" role="group" aria-label={t('sell.whatAreYouDoing')}>
        {SCAN_MODES.map(m => (
          <button
            key={m.id}
            type="button"
            className={scanMode === m.id ? 'is-active' : ''}
            onClick={() => { setScanMode(m.id); setPicked(null); setMsg(null); }}
          >
            <m.icon size={16} /> {t(`sell.mode.${m.id}`)}
          </button>
        ))}
      </div>

      <div className="scan-card">
        {/* Every scan is recorded against a name, which is what makes a
            missing garment traceable later. */}
        <div className="field">
          <label>{t('sell.whoIsScanning')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="select"
              value={staffId || ''}
              onChange={e => setStaffId(e.target.value ? Number(e.target.value) : null)}
              style={{ flex: 1 }}
            >
              <option value="">{t('sell.notRecorded')}</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onManageStaff}>
              <Plus size={15} /> {t('sell.names')}
            </button>
          </div>
          {!staffId && staff.length > 0 && (
            <div className="field-hint">{t('sell.pickNameHint')}</div>
          )}
          {staff.length === 0 && (
            <div className="field-hint">{t('sell.noNamesYet')}</div>
          )}
        </div>

        <div className="field">
          <label>{scanMode === 'in' ? t('sell.stockingInto') : t('sell.atShop')}</label>
          {shops.length > 1 ? (
            <select className="select" value={shopId || ''} onChange={e => setShopId(Number(e.target.value))}>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <div className="locked-value">{shops[0]?.name || ''}</div>
          )}
        </div>

        {scanMode === 'out' && (
          <div className="field">
            <label>{t('sell.whyLeaving')}</label>
            <select className="select" value={outReason} onChange={e => setOutReason(e.target.value)}>
              {OUT_REASONS.map(r => <option key={r} value={r}>{t(`sell.reason.${r}`)}</option>)}
            </select>
            <div className="field-hint">{t('sell.notASale')}</div>
          </div>
        )}

        <div className="segmented segmented-wide" role="group" aria-label={t('sell.howToFind')} style={{ marginBottom: 20 }}>
          <button type="button" className={mode === 'scan' ? 'is-active' : ''} onClick={() => setMode('scan')}>
            <ScanLine size={16} /> {t('sell.scanBarcode')}
          </button>
          <button type="button" className={mode === 'manual' ? 'is-active' : ''} onClick={() => setMode('manual')}>
            <Search size={16} /> {t('sell.typeItIn')}
          </button>
        </div>

        {mode === 'scan' && (
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('sell.scanBarcode')} — {t(`sell.hint.${scanMode}`).toLowerCase()}</label>
              <input
                ref={inputRef}
                className="input scan-input"
                placeholder={t('sell.waitingForScan')}
                value={code}
                onChange={e => onScanType(e.target.value)}
                autoFocus
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <button className="btn btn-primary btn-block btn-large" disabled={!code.trim()}>
              <ScanLine size={19} /> {t(`sell.verb.${scanMode}`)} {t('sell.one')}
              {inFlight > 0 && <span className="inflight-dot">{inFlight}</span>}
            </button>
          </form>
        )}

        {/* No scanner needed: find the item, say how many, sell. */}
        {mode === 'manual' && !picked && (
          <div className="field">
            <label>{t('sell.findTheItem')}</label>
            <SearchField value={lookup} onChange={setLookup} placeholder={t('sell.egLookup')} />
            {lookup.trim().length >= 2 && (
              <div className="pick-list">
                {searching && <div className="pick-empty">{t('sell.searching')}</div>}
                {!searching && results.length === 0 && <div className="pick-empty">{t('sell.nothingFound')}</div>}
                {!searching && results.map(it => (
                  <button
                    type="button"
                    key={it.id}
                    className="pick-row"
                    disabled={it.qty === 0 && !adding}
                    onClick={() => { setPicked(it); setSellQty(1); }}
                  >
                    <span className="pick-main">
                      <span className="pick-name">
                        {[it.category, it.fabric, it.print, it.color, it.size].filter(Boolean).join(' · ') || it.name}
                      </span>
                      <span className="pick-sub">{it.sku}{Number(it.price) > 0 ? ` · ${idr(it.price)}` : ''}</span>
                    </span>
                    <span className={`pick-qty ${it.qty === 0 && !adding ? 'is-out' : ''}`}>
                      {it.qty === 0 ? t('sell.noneHere') : t('sell.nHere').replace('{n}', String(it.qty))}
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
              <label>{t('form.howMany')}</label>
              <div className="qty-group qty-group-large">
                <button
                  type="button"
                  className="qty-btn"
                  disabled={sellQty <= 1}
                  onClick={() => setSellQty(q => Math.max(1, q - 1))}
                  aria-label={t('sell.oneFewer')}
                >
                  <Minus size={18} />
                </button>
                <div className="qty-value">{sellQty}</div>
                <button
                  type="button"
                  className="qty-btn"
                  // Stocking in has no ceiling; taking stock out cannot go
                  // past what is actually on the rail.
                  disabled={!adding && sellQty >= picked.qty}
                  onClick={() => setSellQty(q => (adding ? q + 1 : Math.min(picked.qty, q + 1)))}
                  aria-label={t('sell.oneMore')}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-large"
              disabled={busy || (!adding && picked.qty === 0)}
              onClick={submitPicked}
            >
              <Check size={19} /> {t(`sell.verb.${scanMode}`)} {sellQty}
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
            <h2 className="section-title">{t('sell.thisSale')}</h2>
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
                <span>{t('common.total')}</span>
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
            <h2 className="section-title">{t('common.justNow')}</h2>
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
                        {[r.sku, t(`sell.mode.${m.id}`), r.who && `${t('check.by')} ${r.who}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="rank-stat">
                      <div className="rank-stat-num">{r.moved || 1}</div>
                      <div className="rank-stat-label">{t(`sell.mode.${m.id}`).toLowerCase()}</div>
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
  const t = useT();
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
        <span>{t('sell.receiptTotal')}</span>
        <span>{Number(data.total).toLocaleString('en-US')}</span>
      </div>
      <div className="receipt-count">{data.count} piece{data.count === 1 ? '' : 's'}</div>
      <div className="receipt-foot">{t('sell.receiptThanks')}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW VIEW — master aggregation across all shops
// ═══════════════════════════════════════════════════════════
function OverviewView({ shops = [], shopsParam = '' }) {
  const t = useT();
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

  // With two shops the count has to say whether it is one rail or both,
  // otherwise "42 in stock" is an unanswerable number.
  const scopeText = shopsParam
    ? t('overview.countedAtOnly').replace('{s}', (data.shops || []).join(' + '))
    : (shops.length > 1
        ? t('overview.countedEvery')
        : 'Every piece on the rail, counted once.');

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      {/* Two ways to read the same page. Nothing is lost by switching — it is
          the same stock, with or without the sold line underneath. */}
      <div className="view-switch-bar">
        <div className="segmented" role="group" aria-label={t('overview.layout')}>
          <button
            type="button"
            className={layout === 'stock' ? 'is-active' : ''}
            onClick={() => chooseLayout('stock')}
          >
            {t('overview.stockOnly')}
          </button>
          <button
            type="button"
            className={layout === 'sold' ? 'is-active' : ''}
            onClick={() => chooseLayout('sold')}
          >
            {t('overview.stockPlusSold')}
          </button>
        </div>
      </div>


      {showSold && (
        <div className="scope-picker">
          <span className="scope-picker-label">{t('overview.soldIn')}</span>
          <select
            className="select select-inline"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            aria-label={t('overview.yearAria')}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            className={`scope-chip ${compare ? 'is-active' : ''}`}
            onClick={() => setCompare(c => !c)}
            title={t('overview.showPrevYear').replace('{y}', String(year - 1))}
          >
            vs {year - 1}
          </button>
          <span className="scope-picker-note">
            {t('overview.piecesSoldIn')
              .replace('{n}', sold.total.toLocaleString()).replace('{y}', String(year))}
            {compare && prevSold.total > 0 && ' · ' + t('overview.prevYearSold')
              .replace('{n}', prevSold.total.toLocaleString()).replace('{y}', String(year - 1))}
          </span>
        </div>
      )}

      {/* Same three numbers as the Stock tab, so the two views read alike. */}
      <p className="scope-note">{scopeText}</p>
      <div className="stat-grid">
        <StatCard value={inStockCount} label={t('stock.inStock')} tone="good" />
        <StatCard value={summary.low} label={t('stock.lowStock')} tone="warn" />
        <StatCard value={summary.out} label={t('stock.outOfStock')} tone="bad" />
      </div>

      <Disclosure
        title={t('stock.totals')}
        tail={t('stock.productsPieces').replace('{p}', summary.skuCount.toLocaleString()).replace('{u}', summary.grand.toLocaleString())}
      >
        <div className="metric-row">
          <div>
            <div className="metric-label">{t('stock.differentProducts')}</div>
            <div className="metric-value">{summary.skuCount.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>{t('stock.eachColourOnce')}</div>
          </div>
          <div>
            <div className="metric-label">{t('stock.totalPieces')}</div>
            <div className="metric-value">{summary.grand.toLocaleString()}</div>
            <div className="detail-k" style={{ marginTop: 4 }}>{t('overview.acrossEvery')}</div>
          </div>
          {data.shops.map(s => (
            <div key={s}>
              <div className="metric-label">{s}</div>
              <div className="metric-value">{(summary.perShop[s] || 0).toLocaleString()}</div>
              <div className="detail-k" style={{ marginTop: 4 }}>{t('overview.piecesHere')}</div>
            </div>
          ))}
        </div>
      </Disclosure>

      {/* The table is the point of this view: every product, every shop, side by side. */}
      <div className="section-head">
        <h2 className="section-title">{t('overview.allInventory')}</h2>
        <span className="section-meta">{sortedItems.length.toLocaleString()} shown</span>
      </div>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <SearchField value={search} onChange={setSearch} placeholder={t('overview.searchPlaceholder')} />
      </div>
      <div className="filter-panel" style={{ boxShadow: 'none', padding: 0, background: 'transparent', marginBottom: 16 }}>
          {facets.styles.length > 0 && (
            <div className="field">
              <label>{t('stock.style')}</label>
              <select className="select" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
                <option value="">All styles ({facets.styles.length})</option>
                {facets.styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {facets.fabrics.length > 0 && (
            <div className="field">
              <label>{t('stock.fabric')}</label>
              <select className="select" value={fabricFilter} onChange={e => setFabricFilter(e.target.value)}>
                <option value="">All fabrics ({facets.fabrics.length})</option>
                {facets.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          {facets.colors.length > 0 && (
            <div className="field">
              <label>{t('stock.colour')}</label>
              <select className="select" value={colorFilter} onChange={e => setColorFilter(e.target.value)}>
                <option value="">All colours ({facets.colors.length})</option>
                {facets.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {facets.sizes.length > 0 && (
            <div className="field">
              <label>{t('stock.size')}</label>
              <select className="select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                <option value="">All sizes ({facets.sizes.length})</option>
                {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>{t('common.sort')}</label>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="fabric-color">{t('stock.sortFabricColor')}</option>
              <option value="color">{t('stock.sortColor')}</option>
              <option value="style">{t('stock.sortStyle')}</option>
              <option value="name">{t('stock.sortName')}</option>
              <option value="total-desc">{t('overview.sortMost')}</option>
              <option value="total-asc">{t('overview.sortLeast')}</option>
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

        {loading && <div className="loading">{t('common.loading')}</div>}
        {!loading && sortedItems.length === 0 && (
          <div className="empty empty-sm">
            <Package size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
            <h3>{t('overview.nothingMatches')}</h3>
            <p>{t('overview.tryClearing')}</p>
          </div>
        )}
        {!loading && sortedItems.length > 0 && (
          <div className="table-scroll">
            <table className={`data-table ${showSold ? 'with-sold' : ''}`}>
              <thead>
                <tr>
                  <th className="sticky-col">{t('item.product')}</th>
                  <th>{t('stock.fabric')}</th>
                  <th>{t('stock.colour')}</th>
                  <th>{t('stock.size')}</th>
                  {data.shops.map(s => <th key={s} className="num">{s}</th>)}
                  <th className="num total-col">{t('common.total')}</th>
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
                              {productCount(t, fabricCounts[fabricOf(item)])}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`item-row is-clickable ${gapCls}`}
                        onClick={() => setHistorySku(item)}
                        title={t('item.seeEveryDate')}
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
  const t = useT();
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
        <span className="scope-picker-label">{t('common.year')}</span>
        <select
          className="select select-inline"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          aria-label={t('item.yearAria')}
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="scope-picker-note">{item.sku}</span>
      </div>

      {loading && <div className="loading">{t('common.loading')}</div>}

      {!loading && data.movements.length === 0 && (
        <div className="empty empty-sm">
          <History size={26} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>Nothing recorded in {year}</h3>
          <p>{t('item.willShowOnceScanned')}</p>
        </div>
      )}

      {!loading && data.months.length > 0 && (
        <>
          <div className="detail-k" style={{ marginBottom: 8 }}>{t('item.monthByMonth')}</div>
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
// STAFF
// ═══════════════════════════════════════════════════════════
function StaffModal({ staff, shops, onClose, onChanged }) {
  const t = useT();
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
    <Modal title={t('staff.whoWorksHere')} onClose={onClose}>
      <p style={{ color: 'var(--text-2)', marginTop: 0, fontSize: 14 }}>
        {t('staff.explain')}
      </p>

      <div className="group-pick-list">
        {staff.length === 0 && (
          <div style={{ color: 'var(--text-2)', fontSize: 14, padding: '14px 8px', textAlign: 'center' }}>
            {t('staff.noNames')}
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
        <label>{t('staff.addSomeone')}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder={t('common.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            style={{ flex: '1 1 140px' }}
          />
          <select className="select" value={shopId} onChange={e => setShopId(e.target.value)} style={{ flex: '0 1 130px' }}>
            <option value="">{t('staff.anyShop')}</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder={t('staff.commShort')}
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
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ onClose, onManageStaff, isAdmin, shopName, onSwitchAccess, onReset, shops = [] }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [switching, setSwitching] = useState(false);
  const [codeErr, setCodeErr] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showShops, setShowShops] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Typing a different code here swaps this device between the admin and
  // staff views. The code itself is never shown back, never stored, and
  // never rendered anywhere on the page.
  const switchAccess = async (e) => {
    e.preventDefault();
    setSwitching(true); setCodeErr(null);
    try {
      const d = await api('/api/auth/access-login', { method: 'POST', body: { code } });
      setToken(d.token);
      setCode('');
      toast(t('settings.switched'));
      onSwitchAccess(d.user, d.business, d.shop || null);
      onClose();
    } catch (err) {
      setCodeErr(err.message === 'Invalid access code' ? t('gate.wrong') : (err.message || t('gate.failed')));
      setSwitching(false);
    }
  };

  const signOut = () => {
    setToken(null);
    window.dispatchEvent(new Event('app:unauth'));
  };

  const grab = (path, label) => async () => {
    setBusy(true);
    try {
      const name = await download(path);
      toast(`${label} — ${name}`);
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  if (showAudit) {
    return <AuditModal onClose={() => setShowAudit(false)} />;
  }
  if (showReset) {
    return <ResetStockModal onClose={() => setShowReset(false)} onDone={onReset} />;
  }
  if (showShops) {
    return <ShopsModal onClose={() => setShowShops(false)} onChanged={onReset} />;
  }
  if (showImport) {
    return <ImportStockModal shops={shops} onClose={() => setShowImport(false)} onDone={onReset} />;
  }

  return (
    <Modal title={t('settings.title')} onClose={onClose}>
      <p style={{ color: 'var(--text-2)', marginTop: 0, marginBottom: 18, fontSize: 14 }}>
        {shopName ? shopName + ' — ' : ''}
        {isAdmin ? t('settings.adminNote') : t('settings.staffNote')}
      </p>

      <div className="field">
        <label>{t('settings.language')}</label>
      </div>
      <div className="segmented" style={{ marginBottom: 18, marginTop: -10 }}>
        {LANGUAGES.map(l => (
          <button
            key={l.id}
            className={lang === l.id ? 'is-active' : ''}
            onClick={() => setLang(l.id)}
          >{l.label}</button>
        ))}
      </div>

      <div className="field">
        <label>{t('settings.accessCode')}</label>
      </div>
      <form onSubmit={switchAccess} className="code-switch" style={{ marginTop: -10, marginBottom: 18 }}>
        <input
          className="input"
          type="password"
          placeholder={t('settings.enterCode')}
          value={code}
          onChange={e => setCode(e.target.value)}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button className="btn btn-secondary" disabled={switching || !code}>
          {t('settings.switch')}
        </button>
      </form>
      {codeErr && <div className="error-banner" style={{ marginBottom: 14 }}>{codeErr}</div>}

      {isAdmin && (
        <>
          <button className="btn btn-secondary btn-block" onClick={onManageStaff} style={{ marginBottom: 10 }}>
            {t('sell.manageStaff')}
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowShops(true)} style={{ marginBottom: 10 }}>
            {t('shops.title')}
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowImport(true)} style={{ marginBottom: 10 }}>
            {t('import.title')}
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => setShowAudit(true)} style={{ marginBottom: 10 }}>
            {t('settings.auditLog')}
          </button>
          <button className="btn btn-ghost btn-block" disabled={busy}
                  onClick={grab('/api/stock.csv', t('settings.exportStock'))} style={{ marginBottom: 10 }}>
            {t('settings.exportStock')}
          </button>
          <button className="btn btn-ghost btn-block" disabled={busy}
                  onClick={grab('/api/auth/export-data', t('settings.exportBackup'))} style={{ marginBottom: 10 }}>
            {t('settings.exportBackup')}
          </button>
        </>
      )}

      <button className="btn btn-ghost btn-block" onClick={signOut}>
        {t('settings.signOut')}
      </button>

      {/* Kept below the sign-out and visually apart: nothing destructive
          should sit next to something anyone taps every day. */}
      {isAdmin && (
        <div className="danger-zone">
          <button className="btn btn-danger-ghost btn-block" onClick={() => setShowReset(true)}>
            {t('reset.title')}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ── Shops and their keys ──────────────────────────────────
// Says plainly which environment variable opens which shop, and flags any
// code that opens nothing. A code configured for a shop key no shop uses is
// silently ignored — that is how a code meant for one shop ended up opening
// another, and it took a round trip to work out. Now it is on screen.
//
// Secrets are never shown here; only whether one is set.
function ShopsModal({ onClose, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);   // { id, name, code } or 'new'
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/api/admin/shop-keys').then(d => { setData(d); setErr(null); }).catch(e => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const body = { name: editing.name.trim(), code: (editing.code || '').trim().toUpperCase() || null };
      if (editing.id) await api(`/api/admin/shops/${editing.id}`, { method: 'PUT', body });
      else await api('/api/admin/shops', { method: 'POST', body });
      setEditing(null);
      load();
      onChanged();
      toast(t('shops.saved'));
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (editing) {
    return (
      <Modal title={editing.id ? t('shops.edit') : t('shops.add')} onClose={() => setEditing(null)}>
        <div className="field">
          <label>{t('shops.name')}</label>
          <input className="input" value={editing.name} autoFocus
                 onChange={e => setEditing({ ...editing, name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('shops.key')}</label>
          <input className="input" maxLength={2} value={editing.code || ''}
                 onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                 placeholder="RG" style={{ textTransform: 'uppercase', maxWidth: 110 }} />
          <div className="field-hint">
            {t('shops.keyHint').replace('{var}',
              'SHOP_CODE_' + ((editing.code || 'XX').toUpperCase()))}
          </div>
        </div>
        {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !editing.name.trim()}>
            {t('common.save')}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('shops.title')} onClose={onClose}>
      {err && <div className="error-banner">{err}</div>}
      {!data && !err && <div className="loading">{t('common.loading')}</div>}

      {data && (
        <>
          {data.orphanedCodes.length > 0 && (
            <div className="danger-note">
              {t('shops.orphaned')}
              <div className="shop-orphans">{data.orphanedCodes.join(', ')}</div>
            </div>
          )}

          {data.shops.map(sh => (
            <div className="shop-row" key={sh.id}>
              <div className="shop-main">
                <div className="shop-name">{sh.name}</div>
                <div className="shop-var">
                  {sh.key
                    ? sh.envVar
                    : <span className="shop-nokey">{t('shops.noKey')}</span>}
                </div>
              </div>
              <span className={`pill ${sh.codeConfigured ? 'pill-good' : 'pill-muted'}`}>
                {sh.codeConfigured ? t('shops.codeSet') : t('shops.codeMissing')}
              </span>
              <button className="btn btn-ghost btn-sm"
                      onClick={() => setEditing({ id: sh.id, name: sh.name, code: sh.key || '' })}>
                {t('shops.editShort')}
              </button>
            </div>
          ))}

          <div className="field-hint" style={{ marginTop: 14 }}>{t('shops.explain')}</div>

          <button className="btn btn-secondary btn-block" style={{ marginTop: 14 }}
                  onClick={() => setEditing({ name: '', code: '' })}>
            {t('shops.add')}
          </button>
        </>
      )}
    </Modal>
  );
}

// ── Import stock from the spreadsheet ─────────────────────
// Paste the sheet or pick the file, read what it found, then commit. The
// preview is not decoration: an import of this size is the kind of thing that
// should never happen on one click, and the numbers shown are the numbers
// that will land.
//
// Quantity is read from SALDO AKHIR only. Everything the parser could not
// make sense of is listed rather than quietly dropped.
function ImportStockModal({ shops, onClose, onDone }) {
  const t = useT();
  const toast = useToast();
  const [shopId, setShopId] = useState(() => {
    const rg = shops.find(s => s.code === 'RG');
    return String((rg || shops[0] || {}).id || '');
  });
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); setParsed(null); };
    reader.onerror = () => setErr('Could not read that file');
    reader.readAsText(file);
  };

  const preview = () => {
    setErr(null);
    try {
      const out = parseStockSheet(text);
      if (out.rows.length === 0) {
        setErr(t('import.nothingFound'));
        setParsed(null);
        return;
      }
      setParsed(out);
    } catch (e) { setErr(e.message || 'Could not read that'); }
  };

  const commit = async () => {
    if (!parsed || !shopId) return;
    setBusy(true); setErr(null);
    try {
      const d = await api('/api/admin/import-stock', {
        method: 'POST',
        body: {
          shopId: Number(shopId),
          rows: parsed.rows.map(r => ({
            sku: r.sku, name: r.name, style: r.style,
            color: r.color, size: r.size, price: r.price, qty: r.qty,
          })),
        },
      });
      setResult(d);
      onDone();
      toast(t('import.done'));
    } catch (e) { setErr(e.message || 'Could not import'); }
    finally { setBusy(false); }
  };

  if (result) {
    return (
      <Modal title={t('import.doneTitle')} onClose={onClose}>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 0 }}>
          {t('import.doneBody').replace('{shop}', result.shop)}
        </p>
        <div className="details-body" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div><div className="detail-k">{t('import.newItems')}</div><div className="detail-v">{result.created.toLocaleString()}</div></div>
          <div><div className="detail-k">{t('import.updatedItems')}</div><div className="detail-v">{result.updated.toLocaleString()}</div></div>
          <div><div className="detail-k">{t('import.withStock')}</div><div className="detail-v">{result.inStock.toLocaleString()}</div></div>
          <div><div className="detail-k">{t('import.pieces')}</div><div className="detail-v">{result.pieces.toLocaleString()}</div></div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onClose}>
          {t('common.close')}
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={t('import.title')} onClose={onClose}>
      <div className="notice" style={{ marginBottom: 14 }}>{t('import.explain')}</div>

      <div className="field">
        <label>{t('import.intoShop')}</label>
        <select className="select" value={shopId} onChange={e => setShopId(e.target.value)}>
          {shops.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label>{t('import.theSheet')}</label>
        <input
          type="file"
          accept=".tsv,.txt,.csv,text/plain,text/tab-separated-values"
          className="input"
          onChange={e => readFile(e.target.files && e.target.files[0])}
        />
        <div className="field-hint">{t('import.fileHint')}</div>
      </div>

      <div className="field">
        <label>{t('import.orPaste')}</label>
        <textarea
          className="input import-paste"
          rows={5}
          value={text}
          onChange={e => { setText(e.target.value); setParsed(null); }}
          placeholder={'KODE\tPRODUCT NAME\tSTYLE\t…'}
        />
      </div>

      {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}

      {!parsed && (
        <button className="btn btn-secondary btn-block" onClick={preview} disabled={!text.trim()}>
          {t('import.check')}
        </button>
      )}

      {parsed && (
        <>
          <div className="field" style={{ marginTop: 6 }}><label>{t('import.found')}</label></div>
          <div className="details-body" style={{ marginTop: -6, borderTop: 'none', paddingTop: 0 }}>
            <div><div className="detail-k">{t('import.products')}</div><div className="detail-v">{parsed.stats.parsed.toLocaleString()}</div></div>
            <div><div className="detail-k">{t('import.withStock')}</div><div className="detail-v">{parsed.stats.withStock.toLocaleString()}</div></div>
            <div><div className="detail-k">{t('import.pieces')}</div><div className="detail-v">{parsed.stats.pieces.toLocaleString()}</div></div>
            <div><div className="detail-k">{t('import.value')}</div><div className="detail-v">{idr(parsed.stats.value)}</div></div>
          </div>

          {parsed.problems.length > 0 && (
            <div className="danger-note" style={{ marginTop: 14 }}>
              {t('import.refused').replace('{n}', String(parsed.problems.length))}
              <div className="import-problems">
                {parsed.problems.slice(0, 8).map((p, i) => (
                  <div key={i}>
                    {t('import.line')} {p.line}
                    {p.kode ? ` · ${p.kode}` : ''} — {t('import.reason.' + p.reason)}
                  </div>
                ))}
                {parsed.problems.length > 8 && <div>… {parsed.problems.length - 8} {t('import.more')}</div>}
              </div>
            </div>
          )}

          {parsed.duplicates.length > 0 && (
            <div className="danger-note" style={{ marginTop: 14 }}>
              {t('import.duplicates').replace('{n}', String(parsed.duplicates.length))}
              <div className="import-problems">
                {parsed.duplicates.slice(0, 6).map((d, i) => (
                  <div key={i}>{d.kode} — {t('import.line')} {d.lines.join(', ')}</div>
                ))}
              </div>
            </div>
          )}

          {parsed.unbalanced.length > 0 && (
            <div className="notice" style={{ marginTop: 14 }}>
              {t('import.unbalanced').replace('{n}', String(parsed.unbalanced.length))}
              <div className="import-problems">
                {parsed.unbalanced.slice(0, 6).map((r, i) => (
                  <div key={i}>
                    {r.sku} — {r.awal} + {r.masuk} − {r.keluar} ≠ {r.qty}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setParsed(null)} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={commit} disabled={busy}>
              {busy ? '…' : t('import.commit').replace('{n}', parsed.stats.parsed.toLocaleString())}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Reset stock data ──────────────────────────────────────
// Deleting the whole catalogue is not undoable, so this asks for three
// separate acts: download a backup, read what is about to go, then type the
// phrase. The button stays disabled until the backup has actually been taken
// — a confirmation dialog nobody can recover from is not a safeguard.
const RESET_PHRASE = 'DELETE ALL STOCK';

function ResetStockModal({ onClose, onDone }) {
  const t = useT();
  const toast = useToast();
  const [counts, setCounts] = useState(null);
  const [phrase, setPhrase] = useState('');
  const [backedUp, setBackedUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api('/api/admin/data-counts')
      .then(setCounts)
      .catch(e => setErr(e.message));
  }, []);

  const takeBackup = async () => {
    setBusy(true); setErr(null);
    try {
      const name = await download('/api/auth/export-data');
      setBackedUp(true);
      toast(`Backup saved — ${name}`);
    } catch (e) { setErr(e.message || 'Could not download the backup'); }
    finally { setBusy(false); }
  };

  const wipe = async () => {
    setBusy(true); setErr(null);
    try {
      const d = await api('/api/admin/reset-stock', { method: 'POST', body: { confirm: phrase } });
      setDone(d.removed);
      onDone();
    } catch (e) { setErr(e.message || 'Could not reset'); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <Modal title={t('reset.doneTitle')} onClose={onClose}>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 0 }}>
          {t('reset.doneBody')}
        </p>
        <div className="details-body" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div><div className="detail-k">{t('reset.products')}</div><div className="detail-v">{done.items}</div></div>
          <div><div className="detail-k">{t('reset.movements')}</div><div className="detail-v">{done.movements}</div></div>
          <div><div className="detail-k">{t('reset.groups')}</div><div className="detail-v">{done.groups}</div></div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onClose}>
          {t('common.close')}
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={t('reset.title')} onClose={onClose}>
      <div className="danger-note">{t('reset.warning')}</div>

      {!counts && !err && <div className="loading">{t('common.loading')}</div>}

      {counts && (
        <>
          <div className="field"><label>{t('reset.willDelete')}</label></div>
          <div className="details-body" style={{ marginTop: -6, borderTop: 'none', paddingTop: 0 }}>
            <div><div className="detail-k">{t('reset.products')}</div><div className="detail-v">{counts.items.toLocaleString()}</div></div>
            <div><div className="detail-k">{t('reset.movements')}</div><div className="detail-v">{counts.movements.toLocaleString()}</div></div>
            <div><div className="detail-k">{t('reset.groups')}</div><div className="detail-v">{counts.groups.toLocaleString()}</div></div>
          </div>

          <div className="field" style={{ marginTop: 16 }}><label>{t('reset.willKeep')}</label></div>
          <div className="details-body" style={{ marginTop: -6, borderTop: 'none', paddingTop: 0 }}>
            <div><div className="detail-k">{t('reset.shops')}</div><div className="detail-v">{counts.shops}</div></div>
            <div><div className="detail-k">{t('reset.staff')}</div><div className="detail-v">{counts.staff}</div></div>
          </div>
        </>
      )}

      <button
        className="btn btn-secondary btn-block"
        style={{ marginTop: 18 }}
        onClick={takeBackup}
        disabled={busy || backedUp}
      >
        {backedUp ? `✓ ${t('reset.backupTaken')}` : t('reset.takeBackup')}
      </button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>{t('reset.typeToConfirm').replace('{phrase}', RESET_PHRASE)}</label>
        <input
          className="input"
          value={phrase}
          onChange={e => setPhrase(e.target.value)}
          placeholder={RESET_PHRASE}
          autoComplete="off"
          disabled={!backedUp}
        />
        {!backedUp && <div className="field-hint">{t('reset.backupFirst')}</div>}
      </div>

      {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-danger"
          onClick={wipe}
          disabled={busy || !backedUp || phrase !== RESET_PHRASE}
        >
          {busy ? '…' : t('reset.confirm')}
        </button>
      </div>
    </Modal>
  );
}

// ── Audit log ─────────────────────────────────────────────
// Every edit and deletion, newest first. Deliberately admin-only and
// deliberately not editable: a log anyone can tidy up is not a log.
function AuditModal({ onClose }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/audit?limit=50&offset=${offset}`)
      .then(d => {
        const items = Array.isArray(d?.items) ? d.items : [];
        setRows(prev => (offset === 0 ? items : [...prev, ...items]));
        setTotal(d?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [offset]);

  return (
    <Modal title={t('settings.auditLog')} onClose={onClose}>
      {loading && rows.length === 0 && <div className="loading">{t('common.loading')}</div>}
      {!loading && rows.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{t('settings.auditEmpty')}</p>
      )}
      {rows.map(r => (
        <div className="audit-row" key={r.id}>
          <span className={`pill pill-${r.action === 'delete' ? 'bad' : r.action === 'create' ? 'good' : 'muted'}`}>
            {r.action}
          </span>
          <div className="audit-main">
            <div className="audit-summary">{r.summary}</div>
            <div className="audit-meta">
              {new Date(r.createdAt).toLocaleString()}
              {' · '}{r.actorRole}
              {r.staffName ? ` · ${r.staffName}` : ''}
            </div>
          </div>
        </div>
      ))}
      {rows.length < total && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }}
                disabled={loading} onClick={() => setOffset(o => o + 50)}>
          {loading ? t('common.loading') : `${t('history.showMore')} (${rows.length} / ${total})`}
        </button>
      )}
    </Modal>
  );
}


// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
// The only sign-in: enter the shared code → logged into the single master
// account. No email, no signup, no separate users.
function AccessGate({ onAuthed }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const d = await api('/api/auth/access-login', { method: 'POST', body: { code } });
      setToken(d.token);
      onAuthed(d.user, d.business, d.shop || null);
    } catch (e) {
      setErr(e.message === 'Invalid access code' ? t('gate.wrong') : (e.message || t('gate.failed')));
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <h1>Mitra Samadi</h1>
          <p>{t('gate.prompt')}</p>
        </div>
        <form onSubmit={submit}>
          <input
            className="input"
            type="password"
            placeholder={t('gate.placeholder')}
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            style={{ marginBottom: 14 }}
          />
          {err && <div className="error-banner" style={{ marginBottom: 14 }}>{err}</div>}
          <button className="btn btn-primary btn-block btn-large" disabled={busy || !code}>
            {busy ? t('gate.entering') : t('gate.enter')}
          </button>
        </form>
        {/* Language is picked before signing in, because whoever is standing
            at the till may not read the English prompt above. */}
        <div className="segmented segmented-sm" style={{ marginTop: 18 }}>
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              type="button"
              className={lang === l.id ? 'is-active' : ''}
              onClick={() => setLang(l.id)}
            >{l.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [shop, setShop] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    api('/api/auth/me')
      .then(d => { setUser(d.user); setBusiness(d.business); setShop(d.shop || null); setChecking(false); })
      .catch(() => { setToken(null); setChecking(false); });
  }, []);

  useEffect(() => {
    const handler = () => { setUser(null); setBusiness(null); setShop(null); };
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

  // The only way in: enter an access code. Which code decides what you reach.
  if (!user) {
    return <AccessGate onAuthed={(u, b, sh) => { setUser(u); setBusiness(b); setShop(sh); }} />;
  }

  return (
    <MainApp
      // Remounts when the access level changes, so no view keeps data the
      // new code is not allowed to see.
      key={user.accessRole}
      user={user}
      business={business}
      shop={shop}
      onSwitchAccess={(u, b, sh) => { setUser(u); setBusiness(b); setShop(sh); }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
