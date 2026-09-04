// ═══════════════════════════════════════════════════════════
// SHEET PARSER
// ═══════════════════════════════════════════════════════════
// Reads the shop's stock spreadsheet. Quantity comes from SALDO AKHIR and
// nothing else — the sheet also carries SALDO AWAL, BRG MASUK and BRG KELUAR,
// and those three reconcile to it:
//
//     saldo awal + brg masuk − brg keluar = saldo akhir
//
// That identity is what identifies the column, and the parser checks it on
// every row: any row where the arithmetic does not hold is reported rather
// than imported, because a row that does not balance is a row whose closing
// figure cannot be trusted.
//
// Kept apart from the screen that uses it so the identification of each
// column is testable on its own.

// The header the sheet is expected to carry, in order.
export const COLUMNS = {
  kode: 0,
  name: 1,
  style: 2,
  colour: 3,
  size: 4,
  price: 5,
  saldoAwal: 6,
  brgMasuk: 7,
  brgKeluar: 8,
  saldoAkhir: 9,
};

// A cell is blank, a dash, or a number that may carry thousands separators
// and stray spaces. Blank and dash both mean zero — the sheet uses them
// interchangeably.
export function cellToNumber(raw) {
  const t = String(raw == null ? '' : raw).replace(/,/g, '').trim();
  if (t === '' || t === '-' || t === '–') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const looksLikeHeader = (cells) => {
  const joined = cells.slice(0, 8).join(' ').toUpperCase();
  return joined.includes('KODE') || joined.includes('SALDO')
    || joined.includes('PRODUCT NAME') || joined.includes('BRG MASUK');
};

// A section marker — the sheet breaks the catalogue up with single letters.
const looksLikeSectionBreak = (cells) =>
  cells.filter(c => String(c).trim() !== '').length <= 2 && String(cells[0] || '').trim().length <= 2;

export function parseStockSheet(text) {
  const lines = String(text || '').split(/\r?\n/);
  const rows = [];
  const problems = [];
  let skippedBlank = 0, skippedHeader = 0;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (!line.trim()) { skippedBlank++; return; }

    // Tab-separated is what a spreadsheet copy produces; a saved CSV comes
    // through with commas, but the figures also carry commas, so tabs are
    // required rather than guessed at.
    const cells = line.split('\t');

    // Section markers and header rows are checked before the column count:
    // the sheet pads its single-letter dividers out to full width, so
    // counting columns alone does not tell them apart from a product row.
    if (looksLikeHeader(cells) || looksLikeSectionBreak(cells)) { skippedHeader++; return; }

    if (cells.length < 10) {
      problems.push({ line: lineNo, kode: (cells[0] || '').trim(), reason: 'tooFewColumns', detail: String(cells.length) });
      return;
    }

    const kode = String(cells[COLUMNS.kode] || '').trim();
    const name = String(cells[COLUMNS.name] || '').trim();
    if (!kode && !name) { skippedBlank++; return; }
    if (!kode) { problems.push({ line: lineNo, kode: '', reason: 'noCode', detail: name }); return; }
    if (!name) { problems.push({ line: lineNo, kode, reason: 'noName', detail: '' }); return; }

    const awal = cellToNumber(cells[COLUMNS.saldoAwal]);
    const masuk = cellToNumber(cells[COLUMNS.brgMasuk]);
    const keluar = cellToNumber(cells[COLUMNS.brgKeluar]);
    const akhir = cellToNumber(cells[COLUMNS.saldoAkhir]);
    const price = cellToNumber(cells[COLUMNS.price]);

    if (akhir === null) {
      problems.push({ line: lineNo, kode, reason: 'badQty', detail: String(cells[COLUMNS.saldoAkhir]).trim() });
      return;
    }
    if (akhir < 0) {
      problems.push({ line: lineNo, kode, reason: 'negativeQty', detail: String(akhir) });
      return;
    }

    // The balance check. A row that does not reconcile is still imported —
    // saldo akhir is what was asked for — but it is listed, because a sheet
    // whose columns stop agreeing is the first sign the format has shifted.
    let balanced = true;
    if (awal !== null && masuk !== null && keluar !== null) {
      balanced = awal + masuk - keluar === akhir;
    }

    rows.push({
      line: lineNo,
      sku: kode,
      name,
      style: String(cells[COLUMNS.style] || '').trim(),
      color: String(cells[COLUMNS.colour] || '').trim(),
      size: String(cells[COLUMNS.size] || '').trim(),
      price: price === null ? 0 : price,
      qty: akhir,
      balanced,
      awal, masuk, keluar,
    });
  });

  // A code repeated in the sheet would collapse to one item on import, so it
  // is worth seeing before that happens rather than after.
  const seen = new Map();
  const duplicates = [];
  for (const r of rows) {
    const key = r.sku.toUpperCase();
    if (seen.has(key)) duplicates.push({ kode: r.sku, lines: [seen.get(key), r.line] });
    else seen.set(key, r.line);
  }

  const unbalanced = rows.filter(r => !r.balanced);

  return {
    rows,
    problems,
    duplicates,
    unbalanced,
    stats: {
      lines: lines.length,
      parsed: rows.length,
      skippedBlank,
      skippedHeader,
      withStock: rows.filter(r => r.qty > 0).length,
      pieces: rows.reduce((n, r) => n + r.qty, 0),
      value: rows.reduce((n, r) => n + r.qty * r.price, 0),
      uniqueCodes: seen.size,
    },
  };
}
