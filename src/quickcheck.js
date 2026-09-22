// ═══════════════════════════════════════════════════════════
// QUICK CHECK
// ═══════════════════════════════════════════════════════════
// The stock list with the answers already showing. One card per garment,
// not per size: every size and its count along one row, and what the
// garment sold in each year alongside. Nothing to tap open.
//
// Years that sold nothing are the point as much as years that did — a
// garment that went quiet is the thing worth noticing — but ten columns of
// dashes make the busy years hard to find. So by default only the years
// with sales show, and one switch at the top brings every year back.
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye } from 'lucide-react';
import { useT } from './i18n';
import { api, idr } from './api';

const title = (g) => [g.style || g.name, g.fabric, g.color].filter(Boolean).join(' · ');

export function QuickCheckView({ shopsParam }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [allYears, setAllYears] = useState(false);
  const [sort, setSort] = useState('fabric');   // fabric | best | worst

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams();
    if (shopsParam) p.set('shops', shopsParam);
    api(`/api/quick-check?${p.toString()}`)
      .then(setData)
      .catch(e => setError(e.message || t('common.error')));
  }, [shopsParam, t]);

  const garments = useMemo(() => {
    const all = data?.garments || [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(g =>
      title(g).toLowerCase().includes(q)
      || g.skus.some(k => k.toLowerCase().includes(q))
      || g.sizes.some(z => z.size.toLowerCase() === q));
  }, [data, search]);

  // Grouped by fabric, the way she reads her stock — or, when she wants to
  // know what moves, one flat list ranked by pieces sold over the ten years.
  const blocks = useMemo(() => {
    if (sort !== 'fabric') {
      const ranked = [...garments].sort((a, b) =>
        (sort === 'best' ? b.total - a.total : a.total - b.total)
        || a.name.localeCompare(b.name));
      return [[null, ranked]];
    }
    const by = new Map();
    for (const g of garments) {
      const k = g.fabric || '';
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(g);
    }
    return [...by.entries()];
  }, [garments, sort]);

  const years = data?.years || [];

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="loading">{t('common.loading')}</div>;

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('tab.quickCheck')}</h2>
        <span className="section-meta">
          {t('quick.count').replace('{n}', String(garments.length))}
        </span>
      </div>

      <div className="quick-tools">
        <div className="field-with-icon" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            className="input"
            placeholder={t('stock.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input quick-sort"
          value={sort}
          onChange={e => setSort(e.target.value)}
          aria-label={t('quick.sortFabric')}
        >
          <option value="fabric">{t('quick.sortFabric')}</option>
          <option value="best">{t('quick.sortBest')}</option>
          <option value="worst">{t('quick.sortWorst')}</option>
        </select>
        <button
          type="button"
          className={'btn btn-sm ' + (allYears ? 'btn-primary' : 'btn-ghost')}
          onClick={() => setAllYears(v => !v)}
          aria-pressed={allYears}
        >
          <Eye size={15} />
          {allYears ? t('quick.hideQuietYears') : t('quick.showAllYears')
            .replace('{a}', String(years[0])).replace('{b}', String(years[years.length - 1]))}
        </button>
      </div>

      {garments.length === 0 && (
        <div className="empty"><h3>{t('quick.nothing')}</h3></div>
      )}

      {blocks.map(([fabric, list]) => (
        <React.Fragment key={fabric === null ? '*' : (fabric || '-')}>
          {fabric !== null && (
            <div className="fabric-head">
              <span className="fabric-head-name">{fabric ? fabric.toLowerCase() : t('stock.noFabric')}</span>
              <span className="fabric-head-count">
                {list.length === 1 ? t('stock.oneProduct') : t('stock.nProducts').replace('{n}', String(list.length))}
              </span>
            </div>
          )}
          {list.map((g, i) => {
            const shown = years
              .map((y, i) => ({ year: y, sold: g.byYear[i] }))
              .filter(x => allYears || x.sold !== 0);
            return (
              <div className="quick-card" key={g.key}>
                <div className="quick-head">
                  <div className="quick-name">
                    {fabric === null && <span className="quick-rank">{i + 1}</span>}
                    {title(g)}
                  </div>
                  <div className="quick-meta">
                    {g.skus.length <= 3
                      ? g.skus.map(k => <span className="product-sku" key={k}>{k}</span>)
                      : <span className="product-sku">{g.skus[0]} +{g.skus.length - 1}</span>}
                    {g.price > 0 && <span className="product-price">{idr(g.price)}</span>}
                  </div>
                </div>

                {/* Every size along one row, with its count. Zero is shown as
                    zero — a size that is out is worth seeing next to one that
                    is not. */}
                <div className="quick-row">
                  <span className="quick-label">{t('quick.stock')}</span>
                  <div className="quick-cells">
                    {g.sizes.map(z => (
                      <span className={'quick-cell' + (z.qty === 0 ? ' is-zero' : '')} key={z.size || '-'}>
                        <span className="quick-cell-k">{z.size || t('sizes.oneSize')}</span>
                        <span className="quick-cell-v">{z.qty}</span>
                      </span>
                    ))}
                  </div>
                  <span className="quick-sum">{g.stock}</span>
                </div>

                {/* What each size sold over the ten years, under the same
                    size headings as the stock row, so the two read as a pair. */}
                <div className="quick-row">
                  <span className="quick-label">{t('quick.sold')}</span>
                  <div className="quick-cells">
                    {g.sizes.map(z => (
                      <span className={'quick-cell' + (z.sold === 0 ? ' is-zero' : '')} key={z.size || '-'}>
                        <span className="quick-cell-k">{z.size || t('sizes.oneSize')}</span>
                        <span className="quick-cell-v">{z.sold === 0 ? '–' : z.sold}</span>
                      </span>
                    ))}
                  </div>
                  <span className="quick-sum">{g.total}</span>
                </div>

                <div className="quick-row quick-row-years">
                  <span className="quick-label">{t('quick.byYear')}</span>
                  <div className="quick-cells">
                    {shown.length === 0
                      ? <span className="quick-none">{t('quick.neverSold')}</span>
                      : shown.map(x => (
                          <span className={'quick-cell' + (x.sold === 0 ? ' is-zero' : '')} key={x.year}>
                            <span className="quick-cell-k">{x.year}</span>
                            <span className="quick-cell-v">{x.sold === 0 ? '–' : x.sold}</span>
                          </span>
                        ))}
                  </div>
                  <span className="quick-sum">{g.total}</span>
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
