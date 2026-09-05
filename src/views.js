// ═══════════════════════════════════════════════════════════
// TODAY · HISTORY
// ═══════════════════════════════════════════════════════════
// Two screens onto the same movement log, split by the question being asked.
// Today is operational — what went through the till on this shift, in the
// order it happened, so the drawer can be balanced at close. History is the
// business view: two years, filtered, ranked, exported.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, History, TrendingUp, Download, RefreshCw, Pencil, Check, Trash2, PackagePlus, PackageMinus } from 'lucide-react';
import { Modal, SearchField } from './ui';
import { useT } from './i18n';
import { api, download, idr } from './api';

// ── Shared helpers ────────────────────────────────────────
// How far back a sale's time may be moved. Mirrors EDIT_WINDOW_DAYS on the
// server, which is what actually enforces it; this only shapes the picker.
const EDIT_WINDOW_DAYS = 7;

// datetime-local speaks local wall-clock time in "YYYY-MM-DDTHH:mm".
// toISOString is UTC, so using it here shifts every sale by the timezone
// offset — seven hours, in Indonesia.
const localInputValue = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Whoever is picked on the Sell screen. A correction should carry a name.
const readStaffId = () => {
  try {
    const v = localStorage.getItem('mitrasamadi_staff');
    return v ? Number(v) : null;
  } catch { return null; }
};

const clock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const day = (iso) => new Date(iso).toLocaleDateString();

// One fetch, and — crucially — the error it failed with. Panes used to
// swallow errors and fall through to their empty state, so a request that
// died on the server was indistinguishable from a day with no sales. That is
// the worst possible failure for a screen someone balances a till against.
function useLoad(path, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    let cancelled = false;
    api(path)
      .then(d => { if (!cancelled) { setData(d); setError(null); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message || 'Could not load that'); setLoading(false); } })
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => reload(), [reload]);
  return { data, error, loading, reload };
}

// A sale and a return are the same row shape with opposite signs, so one
// renderer covers both and the sign carries the meaning.
// The whole row is the control when it can be corrected: an edit button on
// every line is a lot of furniture on a list this dense, and the row is a
// bigger target on a phone than a pencil icon would be.
const SaleRow = ({ r, showDate, showShop, onEdit }) => {
  const t = useT();
  // A real button, not a div with a role. Safari on iPad does not reliably
  // deliver clicks from non-interactive elements to React's delegated
  // listener at the root, so the tap did nothing on an iPad while working
  // everywhere else. A button also gets Enter, Space and focus for free.
  const Row = onEdit ? 'button' : 'div';
  return (
  <Row
    type={onEdit ? 'button' : undefined}
    className={`sale-row ${r.units < 0 ? 'is-return' : ''} ${onEdit ? 'is-clickable' : ''}`}
    onClick={onEdit ? () => onEdit(r) : undefined}
  >
    <div className="sale-when">
      {showDate && <span className="sale-date">{day(r.occurredAt)}</span>}
      <span className="sale-time">{clock(r.occurredAt)}</span>
    </div>
    <div className="sale-main">
      <div className="sale-title">{r.itemName}</div>
      <div className="sale-sub">
        {r.sku}
        {r.color ? ` · ${r.color}` : ''}
        {r.size ? ` · ${r.size}` : ''}
        {showShop && r.shopName ? ` · ${r.shopName}` : ''}
      </div>
    </div>
    <div className="sale-who">{r.staffName}</div>
    <div className="sale-qty">
      {r.units}
      <span className="sale-qty-label">{t(r.units < 0 ? 'sale.returned' : 'sale.sold')}</span>
    </div>
    <div className="sale-value">
      {idr(r.value)}
      {onEdit && <Pencil size={13} className="sale-edit-hint" aria-hidden="true" />}
    </div>
  </Row>
  );
};

const Empty = ({ icon: Icon, title, hint }) => (
  <div className="empty empty-sm">
    <Icon size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
    <h3>{title}</h3>
    {hint && <p>{hint}</p>}
  </div>
);

// Reuses the app's own stat-card typography rather than a private class, so
// these read the same as every other figure in the app. Money is set a size
// down: "IDR 4,200,000" at the full 30px crowds the card edge to edge.
function StatTile({ value, label, tone, money }) {
  return (
    <div className={`stat-card ${tone ? 'tone-' + tone : ''}`}>
      <div className={`stat-num ${money ? 'is-money' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="stat-label">
        {tone && <span className="stat-dot" aria-hidden="true" />}
        {label}
      </div>
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────
// Staff can open this. They need it to balance the drawer at close, and they
// watched every one of these prices go by as they rang them up — there is
// nothing here they have not already seen.
export function TodayView({ isAdmin, shopsParam = '' }) {
  const t = useT();
  const [editing, setEditing] = useState(null);
  const { data, error, loading, reload } = useLoad(
    `/api/sales/today${shopsParam ? '?shops=' + shopsParam : ''}`,
    [shopsParam]
  );

  useEffect(() => {
    // The till is in use while this is open, so it refreshes itself rather
    // than showing a total that quietly went stale ten sales ago.
    const id = setInterval(reload, 60000);
    return () => clearInterval(id);
  }, [reload]);

  const items = data?.items || [];
  const totals = data?.totals || {};

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('today.title')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>
          <RefreshCw size={15} /> {t('common.refresh')}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stat-grid">
        <StatTile value={totals.units ?? 0} label={t('today.piecesSold')} />
        <StatTile value={idr(totals.revenue)} label={t('today.revenue')} tone="good" money />
        <StatTile value={totals.transactions ?? 0} label={t('today.transactions')} />
        {/* Margin is the owner's number, not the till's. */}
        {isAdmin && <StatTile value={idr(totals.margin)} label={t('today.margin')} money />}
      </div>

      {loading && items.length === 0 && <div className="loading">{t('common.loading')}</div>}

      {!loading && !error && items.length === 0 && (
        <Empty icon={Calendar} title={t('today.nothingYet')} hint={t('today.nothingYetHint')} />
      )}

      {items.length > 0 && (
        <div className="panel">
          <div className="panel-body">
            {/* Correcting today's sales belongs here as much as in History:
                this is the screen the counter already has open, and a
                mistyped sale is noticed within the minute. */}
            {items.map(r => <SaleRow key={r.id} r={r} onEdit={setEditing} />)}
          </div>
        </div>
      )}

      {editing && (
        <SaleEditModal
          sale={editing}
          canDelete={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={reload}
          onDeleted={reload}
        />
      )}
    </>
  );
}

// ── History ───────────────────────────────────────────────
const PAGE = 100;

// Named ranges beat two date pickers for the questions actually asked:
// "how did last month go", "what have we done this year".
const RANGES = [
  { id: '30d', days: 30 },
  { id: '90d', days: 90 },
  { id: 'ytd', ytd: true },
  { id: '12m', months: 12 },
  { id: 'all', all: true },
];

function rangeToQuery(id) {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const r = RANGES.find(x => x.id === id) || RANGES[0];
  if (r.all) return {};
  if (r.ytd) return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) };
  const from = new Date(now);
  if (r.days) from.setDate(from.getDate() - r.days);
  if (r.months) from.setMonth(from.getMonth() - r.months);
  return { from: iso(from) };
}

export function HistoryView({ staff, shops = [], shopsParam = '', isAdmin = true }) {
  const t = useT();
  const [range, setRange] = useState('30d');
  const [staffId, setStaffId] = useState('');
  const [search, setSearch] = useState('');
  const [pane, setPane] = useState('log');

  const panes = useMemo(
    () => (isAdmin ? ['log', 'stock', 'sellers', 'commission'] : ['log', 'stock']),
    [isAdmin]
  );
  // A staff member who had 'commission' selected before losing it would be
  // left staring at nothing.
  useEffect(() => { if (!panes.includes(pane)) setPane('log'); }, [panes, pane]);

  const qs = useMemo(() => {
    const q = { ...rangeToQuery(range) };
    if (staffId) q.staffId = staffId;
    if (search.trim()) q.q = search.trim();
    if (shopsParam) q.shops = shopsParam;
    return new URLSearchParams(q).toString();
  }, [range, staffId, search, shopsParam]);

  // Only worth naming the shop on each row when more than one is in view.
  const showShop = shops.length > 1 && !shopsParam;

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('history.title')}</h2>
        <span className="section-meta">{t('history.window')}</span>
      </div>

      <div className="scope-picker">
        <span className="scope-picker-label">{t('common.period')}</span>
        <select className="select select-inline" value={range} onChange={e => setRange(e.target.value)}>
          {RANGES.map(r => <option key={r.id} value={r.id}>{t('range.' + r.id)}</option>)}
        </select>
        <select className="select select-inline" value={staffId} onChange={e => setStaffId(e.target.value)}>
          <option value="">{t('history.anyStaff')}</option>
          {staff.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
      </div>

      <input
        className="input"
        placeholder={t('history.searchPlaceholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* What sold, and separately where the stock went. Staff get both —
          they are the ones who scanned it — but not the rankings, the
          commission figures or the exports. */}
      <div className="segmented segmented-wide" style={{ marginBottom: 18 }}>
        {panes.map(p => (
          <button key={p} className={pane === p ? 'is-active' : ''} onClick={() => setPane(p)}>
            {t('history.pane.' + p)}
          </button>
        ))}
      </div>

      {pane === 'log' && <SalesLog qs={qs} showShop={showShop} isAdmin={isAdmin} />}
      {pane === 'stock' && <StockMovesPane qs={qs} showShop={showShop} isAdmin={isAdmin} />}
      {pane === 'sellers' && <SellersPane qs={qs} />}
      {pane === 'commission' && <CommissionPane qs={qs} />}
    </>
  );
}

// ── The log ───────────────────────────────────────────────
function SalesLog({ qs, showShop, isAdmin }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(null);

  useEffect(() => { setOffset(0); setRows([]); }, [qs]);

  const { data, error, loading } = useLoad(
    `/api/sales/history?${qs}&limit=${PAGE}&offset=${offset}`,
    [qs, offset]
  );

  useEffect(() => {
    if (!data) return;
    const items = Array.isArray(data.items) ? data.items : [];
    setRows(prev => (offset === 0 ? items : [...prev, ...items]));
  }, [data, offset]);

  const total = data?.total || 0;
  const totals = data?.totals || {};

  return (
    <>
      <div className="stat-grid">
        <StatTile value={totals.units ?? 0} label={t('history.netPieces')} />
        <StatTile value={idr(totals.revenue)} label={t('history.netRevenue')} tone="good" money />
        <StatTile value={total} label={t('history.transactions')} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isAdmin && <ExportButton href={`/api/sales/history.csv?${qs}`} label={t('history.exportSales')} />}

      {loading && rows.length === 0 && <div className="loading">{t('common.loading')}</div>}
      {!loading && !error && rows.length === 0 && (
        <Empty icon={History} title={t('history.nothing')} />
      )}

      {rows.length > 0 && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-body">
            {rows.map(r => (
              <SaleRow key={r.id} r={r} showDate showShop={showShop} onEdit={setEditing} />
            ))}
          </div>
        </div>
      )}

      {editing && (
        <SaleEditModal
          sale={editing}
          canDelete={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setRows(prev => prev.map(r => (r.id === updated.id ? updated : r)))}
          onDeleted={(id) => setRows(prev => prev.filter(r => r.id !== id))}
        />
      )}

      {rows.length > 0 && rows.length < total && (
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 12 }}
          disabled={loading}
          onClick={() => setOffset(o => o + PAGE)}
        >
          {loading ? t('common.loading') : `${t('history.showMore')} (${rows.length} / ${total})`}
        </button>
      )}
    </>
  );
}

// ── Correcting a recorded sale ────────────────────────────
// A customer who swaps a garment for another style has not returned anything
// and has not bought a second thing — the sale was simply recorded against
// the wrong garment. Style, colour and size live on the stock item, not on
// the sale, so changing them means pointing the sale at a different item;
// the server moves the stock to match.
function SaleEditModal({ sale, onClose, onSaved, onDeleted, canDelete }) {
  const t = useT();
  const [lookup, setLookup] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [units, setUnits] = useState(Math.abs(sale.units));
  // Blank means "whatever it costs on the shelf", which is what every sale
  // recorded before this screen existed still means.
  const [price, setPrice] = useState(sale.unitPrice === null ? '' : String(sale.unitPrice));
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time, which is exactly
  // what toISOString does not give you.
  const [when, setWhen] = useState(() => localInputValue(sale.occurredAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const q = lookup.trim();
    if (q.length < 2) { setResults([]); return undefined; }
    setSearching(true);
    const timer = setTimeout(() => {
      api(`/api/shops/${sale.shopId}/stock?search=${encodeURIComponent(q)}`)
        .then(d => { setResults((Array.isArray(d) ? d : []).slice(0, 20)); setSearching(false); })
        .catch(() => { setResults([]); setSearching(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [lookup, sale.shopId]);

  const describe = (x) =>
    [x.category || x.fabric, x.color, x.size].filter(Boolean).join(' · ') || x.name;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const body = { qty: Number(units) };
      if (picked) body.itemId = picked.id;
      const trimmed = String(price).trim();
      body.unitPrice = trimmed === '' ? null : Number(trimmed);
      if (when) body.occurredAt = new Date(when).toISOString();
      const staffId = readStaffId();
      if (staffId) body.staffId = staffId;
      const updated = await api(`/api/sales/${sale.id}`, { method: 'PATCH', body });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e.message || t('edit.failed'));
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      await api(`/api/movements/${sale.id}`, { method: 'DELETE' });
      onDeleted(sale.id);
      onClose();
    } catch (e) {
      setError(e.message || t('edit.failed'));
      setBusy(false);
    }
  };

  const isReturn = sale.units < 0;
  const shelf = picked ? Number(picked.price) || 0 : sale.price;

  return (
    <Modal title={isReturn ? t('edit.titleReturn') : t('edit.titleSale')} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: 4 }}>
        <div className="detail-k">{t('edit.recorded')}</div>
        <div className="detail-v">
          {new Date(sale.occurredAt).toLocaleString()}
          {sale.staffName ? ` · ${sale.staffName}` : ''}
          {sale.shopName ? ` · ${sale.shopName}` : ''}
        </div>
      </div>

      <div className="field">
        <label>{t('edit.currently')}</label>
        <div className="swap-current">
          <span className="swap-name">{describe(sale)}</span>
          <span className="swap-sub">{sale.sku}{sale.itemName ? ` · ${sale.itemName}` : ''}</span>
        </div>
      </div>

      <div className="field">
        <label>{t('edit.swapFor')}</label>
        {picked ? (
          <div className="swap-picked">
            <span className="swap-name"><Check size={14} /> {describe(picked)}</span>
            <span className="swap-sub">{picked.sku} · {idr(picked.price)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPicked(null); setLookup(''); }}>
              {t('edit.undoSwap')}
            </button>
          </div>
        ) : (
          <>
            <SearchField value={lookup} onChange={setLookup} placeholder={t('edit.swapPlaceholder')} />
            {lookup.trim().length >= 2 && (
              <div className="pick-list">
                {searching && <div className="pick-empty">{t('common.loading')}</div>}
                {!searching && results.length === 0 && (
                  <div className="pick-empty">{t('edit.noMatches')}</div>
                )}
                {!searching && results.filter(x => x.id !== sale.itemId).map(it => (
                  <button
                    type="button"
                    key={it.id}
                    className="pick-row"
                    onClick={() => setPicked(it)}
                  >
                    <span className="pick-main">
                      <span className="pick-name">{describe(it)}</span>
                      <span className="pick-sub">
                        {it.sku}{Number(it.price) > 0 ? ` · ${idr(it.price)}` : ''}
                      </span>
                    </span>
                    <span className="pick-qty">{it.qty}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="form-row">
        <div className="field">
          <label>{t('edit.howMany')}</label>
          <input
            className="input"
            type="number"
            min="1"
            value={units}
            onChange={e => setUnits(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('edit.price')}</label>
          <input
            className="input"
            type="number"
            min="0"
            value={price}
            placeholder={String(shelf)}
            onChange={e => setPrice(e.target.value)}
          />
          <div className="field-hint">
            {String(price).trim() === ''
              ? t('edit.priceShelf').replace('{p}', idr(shelf))
              : t('edit.priceCustom')}
          </div>
        </div>
      </div>

      <div className="field">
        <label>{t('edit.when')}</label>
        <input
          className="input"
          type="datetime-local"
          value={when}
          max={localInputValue(Date.now())}
          min={localInputValue(Date.now() - EDIT_WINDOW_DAYS * 86400000)}
          onChange={e => setWhen(e.target.value)}
        />
        <div className="field-hint">{t('edit.whenHint').replace('{n}', String(EDIT_WINDOW_DAYS))}</div>
      </div>

      {/* Deleting sits apart from the save row and asks twice: it puts the
          stock back and takes the row out of the takings, and there is no
          undo on the screen — only the audit log. */}
      {canDelete && (
        <div className="danger-zone">
          {confirmDelete ? (
            <>
              <span className="danger-ask">{t('edit.deleteAsk')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
                {busy ? t('common.saving') : t('edit.deleteYes')}
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm danger-link" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <Trash2 size={14} /> {t('edit.delete')}
            </button>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={busy || !Number(units) || Number(units) < 1}
        >
          {busy ? t('common.saving') : t('edit.save')}
        </button>
      </div>
    </Modal>
  );
}

// ── Stock in and out ──────────────────────────────────────
// The other half of the movement log. Sales say what was taken; this says
// where the stock went — deliveries arriving, and pieces written off with the
// reason they left. Kept apart from the sales log rather than mixed into it,
// because the two get read for completely different reasons and a delivery of
// 40 pieces sitting in the middle of a day's takings just gets in the way.
function StockMovesPane({ qs, showShop, isAdmin }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => { setOffset(0); setRows([]); }, [qs, dir]);

  const { data, error, loading } = useLoad(
    `/api/movements?${qs}&dir=${dir}&limit=${PAGE}&offset=${offset}`,
    [qs, dir, offset]
  );

  useEffect(() => {
    if (!data) return;
    const items = Array.isArray(data.items) ? data.items : [];
    setRows(prev => (offset === 0 ? items : [...prev, ...items]));
  }, [data, offset]);

  const total = data?.total || 0;
  const totals = data?.totals || {};

  return (
    <>
      <div className="stat-grid">
        <StatTile value={totals.in ?? 0} label={t('moves.piecesIn')} tone="good" />
        <StatTile value={totals.out ?? 0} label={t('moves.piecesOut')} tone="bad" />
        <StatTile value={total} label={t('moves.entries')} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="segmented" style={{ marginBottom: 14 }}>
        {[['', 'moves.all'], ['in', 'moves.onlyIn'], ['out', 'moves.onlyOut']].map(([id, key]) => (
          <button key={id || 'all'} className={dir === id ? 'is-active' : ''} onClick={() => setDir(id)}>
            {t(key)}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 && <div className="loading">{t('common.loading')}</div>}
      {!loading && !error && rows.length === 0 && (
        <Empty icon={PackagePlus} title={t('moves.nothing')} hint={t('moves.nothingHint')} />
      )}

      {rows.length > 0 && (
        <div className="panel">
          <div className="panel-body">
            {rows.map(r => (
              <MoveRow key={r.id} r={r} showShop={showShop} onEdit={isAdmin ? setEditing : undefined} />
            ))}
          </div>
        </div>
      )}

      {editing && (
        <MoveDeleteModal
          move={editing}
          onClose={() => setEditing(null)}
          onDeleted={(id) => setRows(prev => prev.filter(x => x.id !== id))}
        />
      )}

      {rows.length > 0 && rows.length < total && (
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 12 }}
          disabled={loading}
          onClick={() => setOffset(o => o + PAGE)}
        >
          {loading ? t('common.loading') : `${t('history.showMore')} (${rows.length} / ${total})`}
        </button>
      )}
    </>
  );
}

const MoveRow = ({ r, showShop, onEdit }) => {
  const t = useT();
  const inbound = r.units > 0;
  const Row = onEdit ? 'button' : 'div';
  return (
    <Row
      type={onEdit ? 'button' : undefined}
      className={`sale-row ${inbound ? '' : 'is-return'} ${onEdit ? 'is-clickable' : ''}`}
      onClick={onEdit ? () => onEdit(r) : undefined}
    >
      <div className="sale-when">
        <span className="sale-date">{day(r.occurredAt)}</span>
        <span className="sale-time">{clock(r.occurredAt)}</span>
      </div>
      <div className="sale-main">
        <div className="sale-title">{r.itemName}</div>
        <div className="sale-sub">
          {r.sku}
          {r.color ? ` · ${r.color}` : ''}
          {r.size ? ` · ${r.size}` : ''}
          {showShop && r.shopName ? ` · ${r.shopName}` : ''}
          {r.reason ? ` · ${t('sell.reason.' + r.reason.replace(/\s+/g, '')) || r.reason}` : ''}
        </div>
      </div>
      <div className="sale-who">{r.staffName}</div>
      <div className="sale-qty">
        {inbound ? `+${r.units}` : r.units}
        <span className="sale-qty-label">{t(inbound ? 'moves.in' : 'moves.out')}</span>
      </div>
      <div className="sale-value">
        {inbound
          ? <PackagePlus size={15} className="move-dir is-in" aria-hidden="true" />
          : <PackageMinus size={15} className="move-dir is-out" aria-hidden="true" />}
        {onEdit && <Pencil size={13} className="sale-edit-hint" aria-hidden="true" />}
      </div>
    </Row>
  );
};

// Stock movements are not corrected in place the way a sale is — a delivery
// entered wrongly is re-entered, not edited — so this only offers the one
// thing that is genuinely needed: taking a mistaken entry back out.
function MoveDeleteModal({ move, onClose, onDeleted }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inbound = move.units > 0;

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      await api(`/api/movements/${move.id}`, { method: 'DELETE' });
      onDeleted(move.id);
      onClose();
    } catch (e) {
      setError(e.message || t('edit.failed'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(inbound ? 'moves.titleIn' : 'moves.titleOut')} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: 4 }}>
        <div className="detail-k">{t('edit.recorded')}</div>
        <div className="detail-v">
          {new Date(move.occurredAt).toLocaleString()}
          {move.staffName ? ` · ${move.staffName}` : ''}
          {move.shopName ? ` · ${move.shopName}` : ''}
        </div>
      </div>

      <div className="field">
        <label>{t('edit.currently')}</label>
        <div className="swap-current">
          <span className="swap-name">
            {inbound ? `+${move.units}` : move.units} × {move.itemName}
          </span>
          <span className="swap-sub">
            {move.sku}
            {move.reason ? ` · ${move.reason}` : ''}
            {move.note ? ` · ${move.note}` : ''}
          </span>
        </div>
      </div>

      <p className="field-hint" style={{ marginBottom: 16 }}>
        {t(inbound ? 'moves.deleteExplainIn' : 'moves.deleteExplainOut')
          .replace('{n}', String(Math.abs(move.units)))}
      </p>

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>
          <Trash2 size={15} /> {busy ? t('common.saving') : t('edit.deleteYes')}
        </button>
      </div>
    </Modal>
  );
}

// A CSV download has to carry the auth header, so it cannot be a plain link.
// Fetched as a blob and handed to the browser under the server's filename.
function ExportButton({ href, label }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await download(href); }
    catch (e) { setErr(e.message || 'Could not export'); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={go} disabled={busy} style={{ marginTop: 12 }}>
        <Download size={15} /> {busy ? '…' : label}
      </button>
      {err && <div className="error-banner" style={{ marginTop: 8 }}>{err}</div>}
    </>
  );
}

// ── Best and worst ────────────────────────────────────────
function SellersPane({ qs }) {
  const t = useT();
  const { data: d, error, loading } = useLoad(`/api/analytics/summary?${qs}`, [qs]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!d) return <Empty icon={TrendingUp} title={t('history.nothing')} />;

  const trend = d.trend || [];
  const peak = Math.max(1, ...trend.map(m => m.revenue));

  return (
    <>
      <Rank title={t('history.bestByUnits')} rows={d.bestByUnits} metric="units" />
      <Rank title={t('history.bestByRevenue')} rows={d.bestByRevenue} metric="revenue" />
      <Rank title={t('history.worstSellers')} rows={d.worstByUnits} metric="units" />

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">{t('history.trend')}</h2>
      </div>
      {trend.length === 0 ? (
        <Empty icon={TrendingUp} title={t('history.nothing')} />
      ) : (
        <div className="panel">
          <div className="panel-body">
            {trend.map(m => (
              <div className="trend-row" key={m.month}>
                <div className="trend-month">{m.month}</div>
                <div className="trend-bar-track">
                  <div className="trend-bar" style={{ width: `${Math.max(2, (m.revenue / peak) * 100)}%` }} />
                </div>
                <div className="trend-units">{m.units}</div>
                <div className="trend-value">{idr(m.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Rank({ title, rows, metric }) {
  const t = useT();
  if (!rows || rows.length === 0) return null;
  return (
    <>
      <div className="section-head" style={{ marginTop: 22 }}>
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="panel">
        <div className="panel-body">
          {rows.map((r, i) => (
            <div className="rank-row" key={r.sku + i}>
              <div className="rank-index">{i + 1}</div>
              <div className="rank-main">
                <div className="rank-name">{r.name}</div>
                <div className="rank-sub">{r.sku}{r.color ? ` · ${r.color}` : ''}</div>
              </div>
              <div className="rank-stat">
                <div className="rank-stat-num">
                  {metric === 'revenue' ? idr(r.revenue) : r.units}
                </div>
                <div className="rank-stat-label">
                  {metric === 'revenue' ? t('common.value') : t('common.pieces')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Commission ────────────────────────────────────────────
function CommissionPane({ qs }) {
  const t = useT();
  const { data: d, error, loading } = useLoad(`/api/commission?${qs}`, [qs]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!d || !d.items || d.items.length === 0) {
    return <Empty icon={TrendingUp} title={t('history.nothing')} />;
  }

  return (
    <>
      <div className="stat-grid">
        <StatTile value={idr(d.totals.gross)} label={t('commission.gross')} money />
        <StatTile value={idr(d.totals.returned)} label={t('commission.returned')}
                  tone={d.totals.returned > 0 ? 'bad' : undefined} money />
        <StatTile value={idr(d.totals.net)} label={t('commission.net')} money />
        <StatTile value={idr(d.totals.commission)} label={t('commission.owed')} tone="good" money />
      </div>

      <div className="notice" style={{ marginBottom: 14 }}>{t('commission.rule')}</div>

      <ExportButton href={`/api/commission.csv?${qs}`} label={t('commission.export')} />

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-body">
          {d.items.map(p => (
            <div className="comm-row" key={p.name}>
              <div className="comm-main">
                <div className="rank-name">{p.name}</div>
                <div className="rank-sub">
                  {p.rate > 0 ? `${p.rate}%` : t('commission.noRate')}
                  {' · '}{p.soldUnits} {t('commission.sold')}
                  {p.returnedUnits > 0 && (
                    <span className="comm-returned"> · {p.returnedUnits} {t('commission.returnedShort')}</span>
                  )}
                </div>
              </div>
              <div className="comm-figures">
                <div className="comm-net">{idr(p.net)}</div>
                {p.returned > 0 && <div className="comm-deduction">− {idr(p.returned)}</div>}
              </div>
              <div className="comm-owed">{idr(p.commission)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
