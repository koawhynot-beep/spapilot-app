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
import { FilterBar } from './ui';

const title = (g) => [g.style || g.name, g.fabric, g.color].filter(Boolean).join(' · ');

export function QuickCheckView({ shopsParam }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [allYears, setAllYears] = useState(false);
  const [sort, setSort] = useState('fabric');   // fabric | best | worst
  const [filters, setFilters] = useState({ style: '', fabric: '', color: '', size: '' });

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
    // The filters narrow the cards; a size filter narrows them to garments
    // that come in that size rather than hiding the other sizes on the card,
    // because half a card would not add up to the total printed on it.
    const picked = all.filter(g =>
      (!filters.style || g.style === filters.style)
      && (!filters.fabric || g.fabric === filters.fabric)
      && (!filters.color || g.color === filters.color)
      && (!filters.size || g.sizes.some(z => z.size === filters.size)));
    if (!q) return picked;
    return picked.filter(g =>
      title(g).toLowerCase().includes(q)
      || g.skus.some(k => k.toLowerCase().includes(q))
      || g.sizes.some(z => z.size.toLowerCase() === q));
  }, [data, search, filters]);

  // Grouped by fabric, the way she reads her stock — or, when she wants to
  // know what moves, one flat list ranked by pieces sold over the ten years.
  const blocks = useMemo(() => {
    if (sort === 'name') {
      return [[null, [...garments].sort((a, b) => title(a).localeCompare(title(b)))]];
    }
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

      {/* The same four filters as the stock list, in the same place, folded
          away until they are wanted. */}
      <FilterBar
        shopsParam={shopsParam}
        value={filters}
        onChange={setFilters}
        sort={sort}
        onSort={setSort}
        sortOptions={[
          { value: 'fabric', label: 'quick.sortFabric' },
          { value: 'name', label: 'quick.sortName' },
          { value: 'best', label: 'quick.sortBest' },
          { value: 'worst', label: 'quick.sortWorst' },
        ]}
      />

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

                {/* A line per shop, read across: what is on that shop's
                    rail, then what it has sold, then the two totals. The
                    shops run down the card and the questions run across it,
                    which is the way it is asked out loud — "Goldust, what
                    have we got, and what has gone?" */}
                {(g.perShop || []).map(line => {
                  const soldYears = (line.soldYears || [])
                    .filter(x => allYears || x.sold !== 0);
                  return (
                    <div className="qc-line" key={line.shop}>
                      <span className="qc-shop">{line.shop}</span>

                      <div className="qc-box">
                        <span className="qc-box-label">{t('quick.boxStock')}</span>
                        {line.sizes.length === 0
                          ? <span className="qc-none">{t('quick.noneHere')}</span>
                          : line.sizes.map(z => (
                              <span className={'qc-pair' + (z.qty === 0 ? ' is-zero' : '')} key={z.size || '-'}>
                                <b>{z.qty}</b> {z.size || t('sizes.oneSize')}
                              </span>
                            ))}
                        <span className="qc-tot"><b>{line.stock}</b> {t('quick.totStock')}</span>
                      </div>

                      {/* A year at a time, and inside the year the sizes
                          that went. "Seventeen sold" and "seventeen S/M in
                          2026" are different facts, and only the second
                          one says what to reorder. */}
                      <div className="qc-box qc-box-sold">
                        <span className="qc-box-label">{t('quick.sold')}</span>
                        {soldYears.length === 0
                          ? <span className="qc-none">{t('quick.neverSold')}</span>
                          : soldYears.map(x => (
                              <span className={'qc-year' + (x.sold === 0 ? ' is-zero' : '')} key={x.year}>
                                <span className="qc-year-k">{x.year}</span>
                                {x.sizes.length === 0
                                  ? <span className="qc-pair"><b>{x.sold}</b></span>
                                  : x.sizes.map(z => (
                                      <span className="qc-pair" key={z.size || '-'}>
                                        <b>{z.sold}</b> {z.size || t('sizes.oneSize')}
                                      </span>
                                    ))}
                              </span>
                            ))}
                        <span className="qc-tot"><b>{line.sold}</b> {t('quick.totSold')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
