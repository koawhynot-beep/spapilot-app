// ═══════════════════════════════════════════════════════════
// STOCK TRANSFERS
// ═══════════════════════════════════════════════════════════
// Two screens for one job. The admin writes down what is being sent, and
// nothing happens. Then whoever is standing at the rail ticks the list off
// with the goods in front of them, and the last tick moves the stock.
//
// Splitting it that way is the whole point: the person who decides what
// should move is rarely the person who can see whether it actually did.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, ClipboardList, Plus, X, Check, Search, AlertTriangle } from 'lucide-react';
import { useT } from './i18n';
import { api } from './api';
import { Modal } from './ui';

const describe = (it) =>
  [it.name, it.color, it.size].filter(Boolean).join(' · ');

// ── Building a transfer ───────────────────────────────────
// Admin only. Everything stays on this screen until Confirm: no half-made
// transfer is ever written down, so there is nothing to tidy up if the
// person building it changes their mind.
export function TransferBuildView({ shops = [], onMade }) {
  const t = useT();
  const [fromId, setFromId] = useState(() => String(shops[0]?.id || ''));
  const [toId, setToId] = useState('');
  const [note, setNote] = useState('');
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [basket, setBasket] = useState({});          // itemId -> qty
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!fromId) return;
    setLoading(true);
    setBasket({});
    api(`/api/shops/${fromId}/stock`)
      .then(rows => { setStock(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch(() => { setStock([]); setLoading(false); });
  }, [fromId]);

  // Only what is on the rail. A garment at zero cannot be sent anywhere, and
  // offering it would only produce a transfer that fails at the far end.
  const available = useMemo(() => stock.filter(i => i.qty > 0), [stock]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available.slice(0, 40);
    return available.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q) ||
      (i.color || '').toLowerCase().includes(q) ||
      (i.fabric || '').toLowerCase().includes(q) ||
      (i.size || '').toLowerCase().includes(q)
    ).slice(0, 40);
  }, [available, search]);

  const byId = useMemo(() => new Map(stock.map(i => [i.id, i])), [stock]);
  const lines = Object.entries(basket)
    .map(([id, qty]) => ({ item: byId.get(Number(id)), qty }))
    .filter(l => l.item);
  const pieces = lines.reduce((n, l) => n + l.qty, 0);

  const add = (item, by = 1) => setBasket(b => {
    const next = Math.min(item.qty, (b[item.id] || 0) + by);
    if (next <= 0) { const { [item.id]: _drop, ...rest } = b; return rest; }
    return { ...b, [item.id]: next };
  });
  const drop = (id) => setBasket(b => { const { [id]: _drop, ...rest } = b; return rest; });

  const confirm = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await api('/api/transfers', {
        method: 'POST',
        body: {
          fromShopId: Number(fromId),
          toShopId: Number(toId),
          note: note.trim(),
          lines: lines.map(l => ({ itemId: l.item.id, qty: l.qty })),
        },
      });
      setDone({ lines: res.lines, to: shops.find(s => String(s.id) === toId)?.name || '' });
      setBasket({});
      setNote('');
      if (onMade) onMade();
    } catch (e) {
      setError(e.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const ready = fromId && toId && fromId !== toId && lines.length > 0 && !saving;

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('transfer.buildTitle')}</h2>
      </div>

      <div className="scope-picker">
        <span className="scope-picker-label">{t('transfer.from')}</span>
        <select className="select select-inline" value={fromId} onChange={e => setFromId(e.target.value)}>
          {shops.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        <span className="scope-picker-label">{t('transfer.to')}</span>
        <select className="select select-inline" value={toId} onChange={e => setToId(e.target.value)}>
          <option value="">{t('transfer.pickDestination')}</option>
          {shops.filter(s => String(s.id) !== fromId)
                .map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
      </div>

      {done && (
        <div className="notice notice-good">
          <Check size={16} />
          <span>
            {(done.lines === 1 ? t('transfer.madeOne') : t('transfer.made').replace('{n}', String(done.lines)))
              .replace('{shop}', done.to)}
          </span>
        </div>
      )}

      <div className="transfer-cols">
        <div>
          <div className="detail-k" style={{ marginBottom: 6 }}>{t('transfer.addItems')}</div>
          <div className="field-with-icon">
            <Search size={16} />
            <input
              className="input"
              placeholder={t('transfer.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading && <div className="loading">{t('common.loading')}</div>}
          {!loading && available.length === 0 && (
            <div className="field-hint" style={{ marginTop: 10 }}>{t('transfer.sourceEmpty')}</div>
          )}

          <div className="panel" style={{ marginTop: 10 }}>
            <div className="panel-body">
              {matches.map(i => (
                <button type="button" className="pick-row" key={i.id} onClick={() => add(i)}>
                  <span className="pick-main">
                    <span className="pick-name">{describe(i)}</span>
                    <span className="pick-sub">{i.sku}{i.fabric ? ` · ${i.fabric}` : ''}</span>
                  </span>
                  <span className="pick-have">{t('transfer.have').replace('{n}', String(i.qty))}</span>
                  <span className="pick-add"><Plus size={16} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="detail-k" style={{ marginBottom: 6 }}>
            {t('transfer.list')}{lines.length > 0 ? ` · ${pieces}` : ''}
          </div>
          {lines.length === 0 ? (
            <div className="empty empty-sm">
              <Truck size={26} color="var(--text-3)" style={{ margin: '0 auto' }} />
              <h3>{t('transfer.listEmpty')}</h3>
              <p>{t('transfer.listEmptyHint')}</p>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-body">
                {lines.map(l => (
                  <div className="basket-row" key={l.item.id}>
                    <div className="basket-main">
                      <div className="basket-name">{describe(l.item)}</div>
                      <div className="basket-sub">{l.item.sku}</div>
                    </div>
                    <div className="qty-step">
                      <button type="button" onClick={() => add(l.item, -1)} aria-label={t('transfer.less')}>−</button>
                      <span>{l.qty}</span>
                      <button type="button" onClick={() => add(l.item, 1)}
                              disabled={l.qty >= l.item.qty} aria-label={t('transfer.more')}>+</button>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => drop(l.item.id)}
                            aria-label={t('common.remove')}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            className="input"
            style={{ marginTop: 10 }}
            placeholder={t('transfer.notePlaceholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={300}
          />

          {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}

          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }}
                  disabled={!ready} onClick={confirm}>
            {saving ? t('common.saving') : t('transfer.confirm')}
          </button>
          {/* Said plainly, because it is the thing most likely to be
              misunderstood: pressing Confirm does not move anything. */}
          <div className="field-hint" style={{ marginTop: 6 }}>{t('transfer.confirmHint')}</div>
        </div>
      </div>
    </>
  );
}

// ── Checking a transfer off ───────────────────────────────
// Open to everyone. One block per transfer waiting, and the stock moves on
// the tick that leaves nothing unticked.
export function TransferCheckView({ isAdmin, onChanged }) {
  const t = useT();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [moved, setMoved] = useState(null);
  const [short, setShort] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(() => {
    api('/api/transfers')
      .then(d => { setTransfers(d?.transfers || []); setLoading(false); })
      .catch(e => { setError(e.message || t('common.error')); setLoading(false); });
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (transfer, line) => {
    setBusy(line.id);
    setShort(null);
    setError('');
    try {
      const res = await api(`/api/transfers/${transfer.id}/lines/${line.id}`, {
        method: line.checked ? 'DELETE' : 'POST',
      });
      if (res.moved) {
        setMoved(res.transfer);
        if (onChanged) onChanged();
      }
      load();
      if (onChanged) onChanged();
    } catch (e) {
      // A refusal at the last box is the one message worth stopping for:
      // the list was right and the stock was not.
      if (e.short) setShort({ transfer: transfer.id, lines: e.short });
      else setError(e.message || t('common.error'));
      load();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (id) => {
    try {
      await api(`/api/transfers/${id}`, { method: 'DELETE' });
      setCancelling(null);
      load();
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || t('common.error'));
      setCancelling(null);
    }
  };

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('transfer.checkTitle')}</h2>
        {transfers.length > 0 && (
          <span className="section-meta">
            {transfers.length === 1
              ? t('transfer.onePending')
              : t('transfer.pending').replace('{n}', String(transfers.length))}
          </span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {moved && (
        <div className="notice notice-good">
          <Check size={16} />
          <span>
            {(moved.pieces === 1 ? t('transfer.movedOne') : t('transfer.moved'))
              .replace('{n}', String(moved.pieces))
              .replace('{from}', moved.from)
              .replace('{to}', moved.to)}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMoved(null)}>
            {t('common.ok')}
          </button>
        </div>
      )}

      {transfers.length === 0 && (
        <div className="empty">
          <ClipboardList size={30} color="var(--text-3)" style={{ margin: '0 auto' }} />
          <h3>{t('transfer.nothingWaiting')}</h3>
          <p>{t('transfer.nothingWaitingHint')}</p>
        </div>
      )}

      {/* One block per transfer. Two deliveries from two shops on one flat
          list would be checked off as though they were one. */}
      {transfers.map(tr => {
        const allChecked = tr.totals.checked === tr.totals.lines;
        return (
          <div className="transfer-block" key={tr.id}>
            <div className="transfer-head">
              <div>
                <div className="transfer-route">
                  {tr.from.name} <span className="transfer-arrow">→</span> {tr.to.name}
                </div>
                <div className="transfer-sub">
                  {(tr.totals.lines === 1 ? t('transfer.summaryOne') : t('transfer.summary'))
                    .replace('{lines}', String(tr.totals.lines))
                    .replace('{pieces}', tr.totals.pieces === 1
                      ? t('transfer.onePiece')
                      : t('drill.pieces').replace('{n}', String(tr.totals.pieces)))}
                  {tr.note ? ` · ${tr.note}` : ''}
                </div>
              </div>
              <div className="transfer-progress">
                <span className={allChecked ? 'is-all' : ''}>
                  {tr.totals.checked}/{tr.totals.lines}
                </span>
              </div>
            </div>

            {tr.totals.short > 0 && (
              <div className="notice notice-warn">
                <AlertTriangle size={16} />
                <span>{t('transfer.someShort').replace('{n}', String(tr.totals.short))}</span>
              </div>
            )}

            {short && short.transfer === tr.id && (
              <div className="notice notice-warn">
                <AlertTriangle size={16} />
                <span>
                  {t('transfer.blocked')}{' '}
                  {short.lines.map(l => `${l.sku} (${t('transfer.wantedHave')
                    .replace('{wanted}', String(l.wanted))
                    .replace('{have}', String(l.have))})`).join(', ')}
                </span>
              </div>
            )}

            <div className="panel">
              <div className="panel-body">
                {tr.lines.map(l => (
                  <button
                    type="button"
                    key={l.id}
                    className={'tick-row' + (l.checked ? ' is-on' : '') + (l.short ? ' is-short' : '')}
                    onClick={() => toggle(tr, l)}
                    disabled={busy === l.id}
                  >
                    <span className={'tick-box' + (l.checked ? ' is-on' : '')} aria-hidden="true">
                      {l.checked && <Check size={14} />}
                    </span>
                    <span className="tick-qty">{l.qty}</span>
                    <span className="tick-main">
                      <span className="tick-name">{describe(l)}</span>
                      <span className="tick-sub">
                        {l.sku}{l.fabric ? ` · ${l.fabric}` : ''}
                        {l.checked && l.checkedBy ? ` · ${l.checkedBy}` : ''}
                      </span>
                    </span>
                    {l.short && (
                      <span className="tick-short">
                        {t('transfer.onlyHave').replace('{n}', String(l.sourceQty))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="transfer-foot">
              <span className="field-hint">
                {allChecked ? t('transfer.allTicked') : t('transfer.tickToMove')}
              </span>
              {isAdmin && (
                <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setCancelling(tr.id)}>
                  {t('transfer.callOff')}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {cancelling != null && (
        <Modal title={t('transfer.callOffTitle')} onClose={() => setCancelling(null)}>
          <p className="modal-text">{t('transfer.callOffBody')}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCancelling(null)}>{t('common.cancel')}</button>
            <button className="btn btn-danger" onClick={() => cancel(cancelling)}>
              {t('transfer.callOff')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
