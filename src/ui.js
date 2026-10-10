// ═══════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════
// Lives apart from App.js so the screens in views.js can use it too. App.js
// imports views.js, so anything views.js needs from App.js would be a cycle.
import React, { useEffect, useState } from 'react';
import { X, Search, SlidersHorizontal } from 'lucide-react';
import { useT } from './i18n';
import { api } from './api';

export function Modal({ title, onClose, children }) {
  const t = useT();
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
          <button
            className="btn btn-ghost"
            style={{ minHeight: 'auto', padding: '8px 12px' }}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Search box with a leading icon and an inline clear button.
export function SearchField({ value, onChange, placeholder }) {
  const t = useT();
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
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange('')}
          aria-label={t('common.clearSearch')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ── The filter bar ────────────────────────────────────────
// Style, fabric, colour, size — the four things she picks a garment by. The
// stock list has had these since the beginning and they are the part of the
// app she likes most, so every screen that lists garments now shows the same
// control in the same place, folded away until it is wanted.
//
// It carries no state of its own beyond being open: the screen owns the
// chosen values, because only the screen knows whether they filter rows it
// already holds or go back to the server as a query.
export function FilterBar({ shopsParam = '', value, onChange, children }) {
  const t = useT();
  const [facets, setFacets] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    const p = new URLSearchParams();
    if (shopsParam) p.set('shops', shopsParam);
    api(`/api/business/facets?${p.toString()}`)
      .then(d => { if (live) setFacets(d); })
      // A filter bar that cannot list the fabrics simply does not appear.
      // It is a convenience; the screen under it still works.
      .catch(() => { if (live) setFacets(null); });
    return () => { live = false; };
  }, [shopsParam]);

  const FIELDS = [
    ['style', 'styles', 'stock.style', 'stock.allStyles'],
    ['fabric', 'fabrics', 'stock.fabric', 'stock.allFabrics'],
    ['color', 'colors', 'stock.colour', 'stock.allColours'],
    ['size', 'sizes', 'stock.size', 'stock.allSizes'],
  ];
  const active = FIELDS.filter(([k]) => value[k]).length;
  if (!facets) return null;

  return (
    <>
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-toggle ${open ? 'is-open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <SlidersHorizontal size={16} />
          {t('stock.filters')}
          {active > 0 && <span className="filter-count">{active}</span>}
        </button>
        {children}
      </div>

      {open && (
        <div className="filter-panel">
          {FIELDS.map(([key, list, label, all]) => (
            (facets[list] || []).length > 0 && (
              <div className="field" key={key}>
                <label>{t(label)}</label>
                <select
                  className="select"
                  value={value[key] || ''}
                  onChange={e => onChange({ ...value, [key]: e.target.value })}
                >
                  <option value="">{t(all).replace('{n}', String(facets[list].length))}</option>
                  {facets[list].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )
          ))}
          {active > 0 && (
            <div className="filter-panel-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onChange({ style: '', fabric: '', color: '', size: '' })}
              >
                <X size={15} /> {t('stock.clearFilters')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Where it sold ─────────────────────────────────────────
// Which shop a garment moves in. Three shops carry much the same rail, and
// a piece that walks out of one and sits in another is the thing worth
// seeing — a single total hides exactly that.
export function ByShop({ rows, className = '' }) {
  const sold = (rows || []).filter(r => r.sold);
  if (sold.length === 0) return null;
  return (
    <div className={`by-shop ${className}`}>
      {sold.map(r => (
        <span key={r.shop}><b>{r.sold}</b> {r.shop}</span>
      ))}
    </div>
  );
}

// ── What it sold, year by year ────────────────────────────
// Under the total, never instead of it. Twenty-four pieces means one thing
// if they went in a month and another if they trickled over two years, and
// a single number cannot tell those apart.
//
// Years with nothing in them are left out: a list of zeroes buries the one
// line that matters.
export function ByYear({ rows, className = '' }) {
  const t = useT();
  const sold = (rows || []).filter(r => r.units);
  if (sold.length === 0) return null;
  return (
    <div className={`by-year ${className}`}>
      {sold.map(r => (
        <span key={r.year}>{t('common.inYear').replace('{n}', String(r.units)).replace('{y}', String(r.year))}</span>
      ))}
    </div>
  );
}
