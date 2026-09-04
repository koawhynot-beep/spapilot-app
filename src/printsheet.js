// ═══════════════════════════════════════════════════════════
// PRINTABLE STOCK CHECKLIST
// ═══════════════════════════════════════════════════════════
// Builds a paper checklist for walking the rail: one line per item, a box to
// tick, and a blank to write down what was actually counted. The browser's
// own print dialogue turns it into paper or into a PDF ("Save as PDF" in the
// destination list), which is why there is no PDF library here — a generated
// PDF would have to reinvent page breaks, fonts and margins that the browser
// already does properly, and it could not be sent straight to the printer.
//
// Only items with stock reach this: the list it is given comes from
// /api/stock-check, which selects `qty > 0`.
//
// The sheet is written as a standalone document rather than as a hidden part
// of the app, because the app's own stylesheet is built for a dark screen and
// almost none of it survives contact with a printer.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Groups are printed with their heading; an ungrouped list comes through as a
// single group with no heading.
export function buildChecklistHtml({ title, subtitle, groups, columns = 2, labels }) {
  const L = {
    qty: 'Qty', counted: 'Counted', checkedBy: 'Checked by', date: 'Date',
    page: 'Page', items: 'items', pieces: 'pieces', ...(labels || {}),
  };

  let totalItems = 0;
  let totalPieces = 0;
  for (const g of groups) {
    for (const it of g.items) { totalItems++; totalPieces += Number(it.qty) || 0; }
  }

  const line = (it) => {
    // Everything that identifies the garment on the rail, minus the blanks.
    const detail = [it.sku, it.color, it.size].filter(Boolean).join(' · ');
    return `<li class="row">
      <span class="box"></span>
      <span class="qty">${esc(it.qty)}</span>
      <span class="text"><span class="nm">${esc(it.name)}</span>${
        detail ? `<span class="dt">${esc(detail)}</span>` : ''
      }</span>
      <span class="blank"></span>
    </li>`;
  };

  const body = groups.map(g => `
    ${g.key ? `<h2 class="grp">${esc(g.key)} <span class="grpn">${g.items.length}</span></h2>` : ''}
    <ul class="list">${g.items.map(line).join('')}</ul>
  `).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  /* Paper, not screen: black on white whatever the app's theme is doing. */
  @page { size: A4 portrait; margin: 12mm 10mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font: 10pt/1.3 -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #000; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { padding: 0 2mm; }

  header { border-bottom: 1.5pt solid #000; padding-bottom: 3mm; margin-bottom: 4mm; }
  h1 { font-size: 15pt; margin: 0 0 1mm; letter-spacing: -0.2pt; }
  .sub { font-size: 9pt; color: #444; }
  .sign { display: flex; gap: 10mm; margin-top: 3.5mm; font-size: 9pt; }
  .sign span { flex: 1; border-bottom: 0.75pt solid #666; padding-bottom: 3.5mm; }
  .sign b { font-weight: 600; }

  /* Balanced on screen so the preview looks like the sheet; auto on paper,
     which is what fills one page-column at a time instead of stretching the
     whole list to a single unpaginated height. */
  .cols { column-count: ${columns}; column-gap: 7mm; column-fill: balance; }
  @media print { .cols { column-fill: auto; } }

  /* A heading stranded at the foot of a column helps nobody. */
  .grp {
    font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5pt; margin: 3.5mm 0 1.2mm; padding-bottom: 0.8mm;
    border-bottom: 0.75pt solid #000;
    break-after: avoid; page-break-after: avoid; break-inside: avoid;
  }
  .grp:first-child { margin-top: 0; }
  .grpn { float: right; font-weight: 400; color: #555; }

  .list { list-style: none; margin: 0; padding: 0; }
  .row {
    display: flex; align-items: flex-start; gap: 1.8mm;
    padding: 1.1mm 0; border-bottom: 0.4pt solid #ddd;
    break-inside: avoid; page-break-inside: avoid;
  }
  /* The tick box. A real drawn square prints reliably; a form control does
     not — browsers render unchecked inputs inconsistently on paper. */
  .box {
    flex: 0 0 auto; width: 3.6mm; height: 3.6mm; margin-top: 0.4mm;
    border: 0.8pt solid #000; border-radius: 0.5mm;
  }
  .qty {
    flex: 0 0 auto; min-width: 5mm; text-align: right;
    font-weight: 700; font-size: 9.5pt; font-variant-numeric: tabular-nums;
  }
  .text { flex: 1 1 auto; min-width: 0; }
  .nm { display: block; font-size: 9pt; line-height: 1.25; }
  .dt { display: block; font-size: 7.5pt; color: #555; line-height: 1.2; }
  /* Where the person writes what they actually found. */
  .blank {
    flex: 0 0 auto; width: 9mm; height: 3.6mm; margin-top: 0.4mm;
    border-bottom: 0.6pt solid #999;
  }

  .head-key { font-size: 7.5pt; color: #555; margin: 0 0 2mm; }

  @media screen {
    body { background: #f1f1f1; padding: 8mm; }
    .sheet { background: #fff; max-width: 190mm; margin: 0 auto; padding: 10mm; box-shadow: 0 1px 6px rgba(0,0,0,.2); }
    .toolbar { max-width: 190mm; margin: 0 auto 6mm; display: flex; gap: 8px; }
    .toolbar button {
      font: inherit; padding: 8px 16px; border-radius: 6px; cursor: pointer;
      border: 1px solid #bbb; background: #fff;
    }
    .toolbar button.primary { background: #111; color: #fff; border-color: #111; }
  }
  @media print { .toolbar { display: none; } }
</style></head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <header>
      <h1>${esc(title)}</h1>
      <div class="sub">${esc(subtitle)} &middot; ${totalItems} ${esc(L.items)} &middot; ${totalPieces} ${esc(L.pieces)}</div>
      <div class="sign">
        <span><b>${esc(L.checkedBy)}</b></span>
        <span><b>${esc(L.date)}</b></span>
      </div>
    </header>
    <p class="head-key">&#9744; = ${esc(L.checked || 'seen')} &nbsp;&nbsp; <b>${esc(L.qty)}</b> = ${esc(L.expected || 'expected')} &nbsp;&nbsp; ____ = ${esc(L.counted)}</p>
    <div class="cols">${body}</div>
  </div>
  <script>
    // Straight to the print dialogue, but only once the fonts have settled —
    // printing mid-layout produces a sheet with the wrong page breaks.
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  <${'/'}script>
</body></html>`;
}

// Opens the sheet in its own tab. Returns false if the browser blocked it,
// so the caller can say so rather than appearing to have done nothing.
export function openChecklist(opts) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(buildChecklistHtml(opts));
  w.document.close();
  return true;
}
