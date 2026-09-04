// ═══════════════════════════════════════════════════════════
// STOCK CHECK
// ═══════════════════════════════════════════════════════════
// A walk round the rail with a list. Only what the system believes is in
// stock appears — an item at zero has nothing to go and look at — and each
// line is ticked once someone has actually seen it.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ClipboardCheck, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { useT } from './i18n';
import { api } from './api';

const READ_STAFF = () => {
  try { return localStorage.getItem('mitrasamadi_staff') || ''; } catch { return ''; }
};

export function StockCheckView({ staff = [], shopsParam = '' }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hideChecked, setHideChecked] = useState(false);
  const [staffId, setStaffId] = useState(READ_STAFF);
  // Items mid-request, so a slow connection cannot be double-tapped into two
  // conflicting writes.
  const [busy, setBusy] = useState(() => new Set());
  const [confirmReset, setConfirmReset] = useState(false);

  const path = `/api/stock-check${shopsParam ? '?shops=' + shopsParam : ''}`;

  const load = useCallback(() => {
    setLoading(true);
    api(path)
      .then(d => { setData(d); setError(null); setLoading(false); })
      .catch(e => { setError(e.message || 'Could not load the list'); setLoading(false); });
  }, [path]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => data?.items || [], [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => {
      if (hideChecked && x.checked) return false;
      if (!q) return true;
      return [x.name, x.sku, x.color, x.size, x.fabric].filter(Boolean)
        .join(' ').toLowerCase().includes(q);
    });
  }, [items, search, hideChecked]);

  // Grouped by fabric, the way the rail is actually arranged — walking the
  // shop in the order the list is printed is the whole point.
  const groups = useMemo(() => {
    const out = [];
    let current = null;
    for (const it of visible) {
      const key = it.fabric || t('check.otherFabric');
      if (!current || current.key !== key) {
        current = { key, items: [] };
        out.push(current);
      }
      current.items.push(it);
    }
    return out;
  }, [visible, t]);

  const toggle = async (item) => {
    if (busy.has(item.id)) return;
    setBusy(b => new Set(b).add(item.id));
    // Optimistic: a tick that waits on the network feels broken when you are
    // holding a garment in one hand and a phone in the other.
    const wasChecked = item.checked;
    setData(d => ({
      ...d,
      items: d.items.map(x => x.id === item.id ? { ...x, checked: !wasChecked } : x),
    }));
    try {
      if (wasChecked) {
        await api(`/api/stock-check/${item.id}`, { method: 'DELETE' });
      } else {
        await api(`/api/stock-check/${item.id}`, {
          method: 'POST',
          body: { staffId: staffId ? Number(staffId) : undefined },
        });
      }
      // Reload rather than trust the optimistic state: ticking the last item
      // closes the round, and that changes the header.
      load();
    } catch (e) {
      setError(e.message || 'Could not save that');
      setData(d => ({
        ...d,
        items: d.items.map(x => x.id === item.id ? { ...x, checked: wasChecked } : x),
      }));
    } finally {
      setBusy(b => { const n = new Set(b); n.delete(item.id); return n; });
    }
  };

  const resetAll = async () => {
    setConfirmReset(false);
    try {
      await api('/api/stock-check/reset', { method: 'POST' });
      load();
    } catch (e) { setError(e.message || 'Could not reset'); }
  };

  const total = data?.total || 0;
  const checked = data?.checked || 0;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const done = total > 0 && checked === total;

  const clearsIn = useMemo(() => {
    if (!data?.clearsAt) return null;
    const days = Math.ceil((new Date(data.clearsAt) - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  }, [data]);

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('check.title')}</h2>
        {total > 0 && (
          <span className="section-meta">{checked} / {total}</span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {total > 0 && (
        <>
          <div className="check-progress">
            <div className="check-bar-track">
              <div className={`check-bar ${done ? 'is-done' : ''}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="check-progress-label">
              {done
                ? t('check.allDone')
                : t('check.remaining').replace('{n}', String(total - checked))}
            </div>
          </div>

          {done && clearsIn !== null && (
            <div className="notice" style={{ marginBottom: 14 }}>
              <Check size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              {clearsIn === 0
                ? t('check.clearsToday')
                : t('check.clearsIn').replace('{n}', String(clearsIn))}
            </div>
          )}
        </>
      )}

      <div className="scope-picker">
        <span className="scope-picker-label">{t('sell.whoIsScanning')}</span>
        <select className="select select-inline" value={staffId}
                onChange={e => { setStaffId(e.target.value); try { localStorage.setItem('mitrasamadi_staff', e.target.value); } catch {} }}>
          <option value="">{t('sell.pickName')}</option>
          {staff.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        <button
          className={`chip ${hideChecked ? 'is-active' : ''}`}
          onClick={() => setHideChecked(v => !v)}
        >{t('check.hideChecked')}</button>
      </div>

      <input
        className="input"
        placeholder={t('check.searchPlaceholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {loading && !data && <div className="loading">{t('common.loading')}</div>}

      {!loading && !error && total === 0 && (
        <div className="empty empty-sm">
          <ClipboardCheck size={28} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>{t('check.nothingInStock')}</h3>
          <p>{t('check.nothingInStockHint')}</p>
        </div>
      )}

      {!loading && total > 0 && visible.length === 0 && (
        <div className="empty empty-sm">
          <Check size={28} color="var(--good)" style={{ margin: '0 auto' }} />
          <h3>{hideChecked ? t('check.allDone') : t('check.noMatches')}</h3>
        </div>
      )}

      {groups.map(g => (
        <div key={g.key} className="check-group">
          <div className="check-group-head">
            <span>{g.key}</span>
            <span className="check-group-count">{g.items.length}</span>
          </div>
          <div className="panel">
            <div className="panel-body">
              {g.items.map(it => (
                <button
                  key={it.id}
                  type="button"
                  className={`check-row ${it.checked ? 'is-checked' : ''}`}
                  onClick={() => toggle(it)}
                  disabled={busy.has(it.id)}
                  aria-pressed={it.checked}
                >
                  <span className={`check-box ${it.checked ? 'is-checked' : ''}`} aria-hidden="true">
                    {it.checked && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="check-main">
                    <span className="check-name">
                      <strong>{it.qty}</strong> {t('check.inStockOf')} {it.name}
                    </span>
                    <span className="check-sub">
                      {it.sku}
                      {it.color ? ` · ${it.color}` : ''}
                      {it.size ? ` · ${it.size}` : ''}
                      {it.checked && it.checkedBy ? ` · ${t('check.by')} ${it.checkedBy}` : ''}
                    </span>
                  </span>
                  {it.movedSinceCheck && (
                    <span className="check-moved" title={t('check.movedHint')}>
                      <AlertTriangle size={14} />
                      {t('check.was').replace('{n}', String(it.qtyAtCheck))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {checked > 0 && (
        <div className="danger-zone">
          {confirmReset ? (
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={resetAll}>
                {t('check.resetConfirm')}
              </button>
            </div>
          ) : (
            <button className="btn btn-danger-ghost btn-block" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} /> {t('check.startOver')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
