// ═══════════════════════════════════════════════════════════
// TODAY · HISTORY
// ═══════════════════════════════════════════════════════════
// Two screens onto the same movement log, split by the question being asked.
// Today is operational — what went through the till on this shift, in the
// order it happened, so the drawer can be balanced at close. History is the
// business view: two years, filtered, ranked, exported.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, History, TrendingUp, TrendingDown, Download,
  Package, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useT } from './i18n';
import { api, download, idr } from './api';

// ── Shared helpers ────────────────────────────────────────
const clock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const day = (iso) => new Date(iso).toLocaleDateString();

// A sale and a return are the same row shape with opposite signs, so one
// renderer covers both and the sign carries the meaning.
const SaleRow = ({ r, showDate }) => (
  <div className={`sale-row ${r.units < 0 ? 'is-return' : ''}`}>
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
      </div>
    </div>
    <div className="sale-who">{r.staffName}</div>
    <div className="sale-qty">
      {r.units > 0 ? r.units : `${r.units}`}
      <span className="sale-qty-label">{r.units < 0 ? 'returned' : 'sold'}</span>
    </div>
    <div className="sale-value">{idr(r.value)}</div>
  </div>
);

const Empty = ({ icon: Icon, title, hint }) => (
  <div className="empty empty-sm">
    <Icon size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
    <h3>{title}</h3>
    {hint && <p>{hint}</p>}
  </div>
);

// ── Today ─────────────────────────────────────────────────
// Staff can open this. They need it to balance the drawer at close, and they
// watched every one of these prices go by as they rang them up — there is
// nothing here they have not already seen.
export function TodayView({ isAdmin }) {
  const t = useT();
  const [data, setData] = useState({ items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/sales/today')
      .then(d => { setData(d || { items: [], totals: {} }); setLoading(false); setErr(null); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    // The till is in use while this is open, so it refreshes itself rather
    // than showing a total that quietly went stale ten sales ago.
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const totals = data.totals || {};

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('today.title')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> {t('common.refresh')}
        </button>
      </div>

      {err && <div className="error-banner">{err}</div>}

      <div className="stat-grid">
        <StatTile value={totals.units ?? 0} label={t('today.piecesSold')} />
        <StatTile value={idr(totals.revenue)} label={t('today.revenue')} tone="good" />
        <StatTile value={totals.transactions ?? 0} label={t('today.transactions')} />
        {/* Margin is the owner's number, not the till's. */}
        {isAdmin && <StatTile value={idr(totals.margin)} label={t('today.margin')} />}
      </div>

      {loading && data.items.length === 0 && <div className="loading">{t('common.loading')}</div>}

      {!loading && data.items.length === 0 && (
        <Empty icon={Calendar} title={t('today.nothingYet')} hint={t('today.nothingYetHint')} />
      )}

      {data.items.length > 0 && (
        <div className="panel">
          <div className="panel-body">
            {data.items.map(r => <SaleRow key={r.id} r={r} />)}
          </div>
        </div>
      )}
    </>
  );
}

function StatTile({ value, label, tone }) {
  return (
    <div className={`stat-card ${tone ? 'tone-' + tone : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────
const PAGE = 100;

// Named ranges beat two date pickers for the questions actually asked:
// "how did last month go", "what have we done this year".
const RANGES = [
  { id: '30d', months: 0, days: 30 },
  { id: '90d', months: 0, days: 90 },
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

export function HistoryView({ shops, staff }) {
  const t = useT();
  const [range, setRange] = useState('30d');
  const [staffId, setStaffId] = useState('');
  const [search, setSearch] = useState('');
  const [pane, setPane] = useState('log');

  const query = useMemo(() => {
    const q = { ...rangeToQuery(range) };
    if (staffId) q.staffId = staffId;
    if (search.trim()) q.q = search.trim();
    return q;
  }, [range, staffId, search]);

  const qs = useMemo(() => new URLSearchParams(query).toString(), [query]);

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

      <div className="segmented segmented-wide" style={{ marginBottom: 18 }}>
        {['log', 'sellers', 'commission', 'stock'].map(p => (
          <button key={p} className={pane === p ? 'is-active' : ''} onClick={() => setPane(p)}>
            {t('history.pane.' + p)}
          </button>
        ))}
      </div>

      {pane === 'log' && <SalesLog qs={qs} />}
      {pane === 'sellers' && <SellersPane qs={qs} />}
      {pane === 'commission' && <CommissionPane qs={qs} />}
      {pane === 'stock' && <StockHealthPane qs={qs} />}
    </>
  );
}

// ── The log ───────────────────────────────────────────────
function SalesLog({ qs }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totals: {} });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setOffset(0); }, [qs]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    api(`/api/sales/history?${qs}&limit=${PAGE}&offset=${offset}`)
      .then(d => {
        if (cancelled) return;
        const items = Array.isArray(d?.items) ? d.items : [];
        setRows(prev => (offset === 0 ? items : [...prev, ...items]));
        setMeta({ total: d?.total || 0, totals: d?.totals || {} });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [qs, offset]);

  return (
    <>
      <div className="stat-grid">
        <StatTile value={meta.totals.units ?? 0} label={t('history.netPieces')} />
        <StatTile value={idr(meta.totals.revenue)} label={t('history.netRevenue')} tone="good" />
        <StatTile value={meta.total} label={t('history.transactions')} />
      </div>

      <ExportButton href={`/api/sales/history.csv?${qs}`} label={t('history.exportSales')} />

      {loading && rows.length === 0 && <div className="loading">{t('common.loading')}</div>}
      {!loading && rows.length === 0 && (
        <Empty icon={History} title={t('history.nothing')} />
      )}

      {rows.length > 0 && (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-body">
            {rows.map(r => <SaleRow key={r.id} r={r} showDate />)}
          </div>
        </div>
      )}

      {rows.length < meta.total && (
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 12 }}
          disabled={loading}
          onClick={() => setOffset(o => o + PAGE)}
        >
          {loading ? t('common.loading') : `${t('history.showMore')} (${rows.length} / ${meta.total})`}
        </button>
      )}
    </>
  );
}

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
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/analytics/summary?${qs}`)
      .then(x => { setD(x); setLoading(false); })
      .catch(() => setLoading(false));
  }, [qs]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (!d) return <Empty icon={TrendingUp} title={t('history.nothing')} />;

  const peak = Math.max(1, ...d.trend.map(m => m.revenue));

  return (
    <>
      <Rank title={t('history.bestByUnits')} rows={d.bestByUnits} metric="units" />
      <Rank title={t('history.bestByRevenue')} rows={d.bestByRevenue} metric="revenue" />
      <Rank title={t('history.worstSellers')} rows={d.worstByUnits} metric="units" />

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">{t('history.trend')}</h2>
      </div>
      {d.trend.length === 0 ? (
        <Empty icon={TrendingUp} title={t('history.nothing')} />
      ) : (
        <div className="panel">
          <div className="panel-body">
            {d.trend.map(m => (
              <div className="trend-row" key={m.month}>
                <div className="trend-month">{m.month}</div>
                <div className="trend-bar-track">
                  <div
                    className="trend-bar"
                    style={{ width: `${Math.max(2, (m.revenue / peak) * 100)}%` }}
                  />
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
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/commission?${qs}`)
      .then(x => { setD(x); setLoading(false); })
      .catch(() => setLoading(false));
  }, [qs]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (!d || d.items.length === 0) return <Empty icon={TrendingUp} title={t('history.nothing')} />;

  return (
    <>
      <div className="stat-grid">
        <StatTile value={idr(d.totals.gross)} label={t('commission.gross')} />
        <StatTile value={idr(d.totals.returned)} label={t('commission.returned')} tone={d.totals.returned > 0 ? 'bad' : undefined} />
        <StatTile value={idr(d.totals.net)} label={t('commission.net')} />
        <StatTile value={idr(d.totals.commission)} label={t('commission.owed')} tone="good" />
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
                {p.returned > 0 && (
                  <div className="comm-deduction">− {idr(p.returned)}</div>
                )}
              </div>
              <div className="comm-owed">{idr(p.commission)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Stock health ──────────────────────────────────────────
// Turnover, dead stock and low stock read together: what is flying off the
// rail, what has not moved in months, and what is about to run out.
function StockHealthPane({ qs }) {
  const t = useT();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/analytics/summary?${qs}`)
      .then(x => { setD(x); setLoading(false); })
      .catch(() => setLoading(false));
  }, [qs]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (!d) return <Empty icon={Package} title={t('history.nothing')} />;

  return (
    <>
      <div className="stat-grid">
        <StatTile value={d.lowStock.length} label={t('stockHealth.lowStock')} tone={d.lowStock.length ? 'warn' : undefined} />
        <StatTile value={d.deadStockCount} label={t('stockHealth.deadCount')} tone={d.deadStockCount ? 'bad' : undefined} />
        <StatTile value={idr(d.deadStockValue)} label={t('stockHealth.deadValue')} />
      </div>

      <ExportButton href="/api/stock.csv" label={t('stockHealth.exportStock')} />

      {d.lowStock.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 22 }}>
            <h2 className="section-title">{t('stockHealth.runningOut')}</h2>
            <span className="section-meta">{t('stockHealth.runningOutHint')}</span>
          </div>
          <div className="panel">
            <div className="panel-body">
              {d.lowStock.map(x => (
                <div className="rank-row" key={x.id}>
                  <AlertTriangle size={16} color="var(--warn)" />
                  <div className="rank-main">
                    <div className="rank-name">{x.name}</div>
                    <div className="rank-sub">{x.sku}{x.color ? ` · ${x.color}` : ''}{x.size ? ` · ${x.size}` : ''}</div>
                  </div>
                  <div className="rank-stat">
                    <div className="rank-stat-num" style={{ color: x.qty === 0 ? 'var(--bad)' : 'var(--warn)' }}>{x.qty}</div>
                    <div className="rank-stat-label">{t('stockHealth.leftOf')} {x.threshold}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">{t('stockHealth.fastMoving')}</h2>
        <span className="section-meta">{t('stockHealth.perMonth')}</span>
      </div>
      <div className="panel">
        <div className="panel-body">
          {d.fastMoving.filter(x => x.velocity > 0).map(x => (
            <div className="rank-row" key={x.id}>
              <TrendingUp size={16} color="var(--good)" />
              <div className="rank-main">
                <div className="rank-name">{x.name}</div>
                <div className="rank-sub">{x.sku}{x.color ? ` · ${x.color}` : ''}</div>
              </div>
              <div className="rank-stat">
                <div className="rank-stat-num">{x.velocity}</div>
                <div className="rank-stat-label">{t('stockHealth.perMonthShort')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">{t('stockHealth.notMoving')}</h2>
        <span className="section-meta">{d.deadAfterDays}+ {t('stockHealth.days')}</span>
      </div>
      {d.deadStock.length === 0 ? (
        <Empty icon={Package} title={t('stockHealth.allMoving')} />
      ) : (
        <div className="panel">
          <div className="panel-body">
            {d.deadStock.map(x => (
              <div className="rank-row" key={x.id}>
                <TrendingDown size={16} color="var(--text-3)" />
                <div className="rank-main">
                  <div className="rank-name">{x.name}</div>
                  <div className="rank-sub">{x.sku}{x.color ? ` · ${x.color}` : ''}{x.size ? ` · ${x.size}` : ''}</div>
                </div>
                <div className="rank-stat">
                  <div className="rank-stat-num">{x.qty}</div>
                  <div className="rank-stat-label">{t('common.pieces')}</div>
                </div>
                <div className="rank-stat" style={{ minWidth: 96 }}>
                  <div className="rank-stat-num" style={{ fontSize: 13 }}>
                    {x.daysSinceSold === null ? t('stockHealth.neverSold') : `${x.daysSinceSold}d`}
                  </div>
                  <div className="rank-stat-label">
                    {x.daysSinceSold === null ? '' : t('stockHealth.sinceSold')}
                  </div>
                </div>
                <div className="rank-stat" style={{ minWidth: 110 }}>
                  <div className="rank-stat-num" style={{ fontSize: 13 }}>{idr(x.qty * x.price)}</div>
                  <div className="rank-stat-label">{t('stockHealth.tiedUp')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
