// The Atriq sheet, which is laid out slightly differently from the Rose Gold
// one: its movement columns are headed "MUTASI AT" rather than "MUTASI UG",
// the STYLE header cell is blank even though the data rows still carry style
// in that column, and SALDO AWAL is empty on every row so the closing figure
// is just masuk minus keluar.
//
// None of that changes which column is read — saldo akhir, and nothing else —
// but a second sheet in a second shape is exactly how a parser starts reading
// the wrong column, so the rows below are taken verbatim from it.
//
// Run with: node src/sheetparse.atriq.test.mjs
import { parseStockSheet } from './sheetparse.js';

const T = '\t';
const row = (...cells) => cells.join(T);

const sheet = [
  // The Atriq header: "MUTASI AT", and the STYLE label is missing — the cell
  // is blank even though the data rows below still carry style there.
  'KODE\tPRODUCT NAME\t\tCOLOUR\tSIZE\tPRICE\tSALDO AWAL\t MUTASI AT\t\tSALDO AKHIR\t\t\t\t\t\t\t\t\t\t',
  '\t\t\t\t\t\t\t BRG MASUK\t BRG KELUAR\t\t\t\t\t\t\t\t\t\t\t',
  // Section break, with a date stranded in the far-right column.
  'A\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t09-07-2026',

  // Ordinary rows. Saldo awal is blank throughout this sheet, so
  // akhir = masuk - keluar.
  row('AG-1001','AGUSTINE DRESS LONG CHEETAH BLACK BEIGE O/S','AGUSTINE DRESS LONG','CHEETAH BLACK BEIGE','O/S','  950,000 ','','  1 ','  1 ','  -   ','','','','2','Saldo awal 1, mutasi dari UG ke RG 1pcs (13-05-2026), sisa 1','','','','1'),
  row('AG-1004','AGUSTINE DRESS LONG BULU KUDA LINEN O/S','AGUSTINE DRESS LONG','BULU KUDA LINEN','O/S','  950,000 ','','  7 ','  4 ','  3 ','','','','2','','','','','2'),
  row('AG-3013','AGUA SHIRT MATCHA S/M','AGUA SHIRT','MATCHA','S/M','  1,600,000 ','','  1 ','  -   ','  1 ','','','','','','','','','-'),
  row('SA-1002','SAROONG FULL COLOUR ','SAROONG','FULL COLOUR','','  500,000 ','','  53 ','  2 ','  51 ','','','','114','Saldo awal 119, mutasi dari UG ke RG 50 (06-04-2026), sisa 69','','','','51'),
  row('TB-1001','T BACK SHELL LONG BLACK O/S','T BACK SHELL LONG','BLACK','O/S','  895,000 ','','  24 ','  22 ','  2 ','','','','2','','','','','3'),
  row('GI-2009','GIPSY DRESS BULU KUDA LINEN O/S','GIPSY DRESS','BULU KUDA LINEN','O/S','  1,200,000 ','','  19 ','  19 ','  -   ','','','','3','','','','','-'),

  // No size and no price at all.
  row('BA-3001','BALI PARFUME ','BALI','PARFUME','','','','  -   ','  -   ','  -   ','','','','','','','','','-'),
  // No colour and no size.
  row('INT-101','INNER TEMPLE  ','INNER TEMPLE','','','  750,000 ','','  2 ','  -   ','  2 ','','','','','','','','',''),
  // A code with brackets, and a size that is a range.
  row('PR-108 (5&6)','BAISE ROSE GOLD OVAL STACK RING 5 & 6','BAISE','ROSE GOLD OVAL STACK RING','5 & 6','  2,500,000 ','','  -   ','  -   ','  -   ','','','','2','','','','','-'),
  row('N-39011','ESKA GLACIER DUO RING 8 & 9','ESKA','GLACIER DUO RING','8 & 9','  5,100,000 ','','  -   ','  -   ','  -   ','','','','2','','','','','-'),
  // A note sitting in the middle columns must not be read as a number.
  row('BM-1007','BOOBTUBE MUSTARD ALEXA O/S','BOOBTUBE','MUSTARD ALEXA','O/S','  380,000 ','','  -   ','  -   ','  -   ','DI BAWA MAMA RACHEL 1','Saldo awal ada 5, mutasi dari UG to RG (03-09-2025) 1pcs','','','','','','','-'),
  // Trailing columns absent entirely.
  row('FR-1101','FRILL TOP MONSTERA BLACK X/S','FRILL TOP','MONSTERA BLACK','X/S','  950,000 ','','  -   ','  -   ','  -   ','','','','','','','','',''),
  // The code that appears twice in this sheet, on two different garments.
  row('JJ-1007','JJ PANTS BLACK X/S','JJ PANTS','BLACK','X/S','  900,000 ','','  -   ','  -   ','  -   ','','','','2','','','','','-'),
  row('JJ-1007','JJ PANTS BLACK S/M','JJ PANTS','BLACK','S/M','  900,000 ','','  -   ','  -   ','  -   ','','','','','','','','','-'),
  '',
].join('\n');

const out = parseStockSheet(sheet);

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '\u2713' : '\u2717'} ${label}${ok ? '' : '  \u2014 ' + detail}`);
  if (!ok) failures++;
};
const eq = (label, got, want) =>
  check(label, JSON.stringify(got) === JSON.stringify(want),
    `got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);

console.log('Atriq sheet \u00b7 rows taken verbatim, saldo akhir only\n');

console.log('  the Atriq header');
eq('    all three header rows are skipped', out.stats.skippedHeader, 3);
eq('    "MUTASI AT" does not confuse it', out.problems.filter(p => /MUTASI/.test(p.detail || '')).length, 0);
eq('    every product row parsed', out.stats.parsed, 14);

console.log('\n  saldo akhir is the quantity');
const by = Object.fromEntries(out.rows.map(r => [r.sku + '|' + r.size, r]));
eq('    AG-1001  0 + 1 - 1 = 0', by['AG-1001|O/S'].qty, 0);
eq('    AG-1004  0 + 7 - 4 = 3', by['AG-1004|O/S'].qty, 3);
eq('    AG-3013  0 + 1 - 0 = 1', by['AG-3013|S/M'].qty, 1);
eq('    SA-1002  0 + 53 - 2 = 51', by['SA-1002|'].qty, 51);
eq('    TB-1001  0 + 24 - 22 = 2', by['TB-1001|O/S'].qty, 2);
eq('    GI-2009  0 + 19 - 19 = 0', by['GI-2009|O/S'].qty, 0);
eq('    INT-101  0 + 2 - 0 = 2', by['INT-101|'].qty, 2);

// The far-right column disagrees with saldo akhir on several rows. Only saldo
// akhir is read, and these pin that down.
console.log('\n  the far-right column is ignored');
eq('    AG-1001 reads 0, not the 1 in the last column', by['AG-1001|O/S'].qty, 0);
eq('    AG-1004 reads 3, not the 2 in the last column', by['AG-1004|O/S'].qty, 3);
eq('    TB-1001 reads 2, not the 3 in the last column', by['TB-1001|O/S'].qty, 2);
eq('    SA-1002 reads 51, not the 114 in the middle', by['SA-1002|'].qty, 51);

console.log('\n  style, colour and price still land');
eq('    style comes from the column with the blank header', by['AG-1004|O/S'].style, 'AGUSTINE DRESS LONG');
eq('    colour', by['AG-1004|O/S'].color, 'BULU KUDA LINEN');
eq('    price', by['AG-1004|O/S'].price, 950000);
eq('    a missing price reads as zero, not as a refusal', by['BA-3001|'].price, 0);
eq('    a blank colour is allowed', by['INT-101|'].color, '');
eq('    a code with brackets survives', by['PR-108 (5&6)|5 & 6'].sku, 'PR-108 (5&6)');
eq('    a size that is a range survives', by['N-39011|8 & 9'].size, '8 & 9');

console.log('\n  what needs looking at');
eq('    nothing was refused', out.problems.length, 0);
eq('    every row reconciles', out.unbalanced.length, 0);
eq('    the repeated code is flagged', out.duplicates.length, 1);
eq('    and it names JJ-1007', out.duplicates[0].kode, 'JJ-1007');

console.log('\n  totals for these rows');
eq('    items with stock', out.stats.withStock, 5);
eq('    pieces', out.stats.pieces, 3 + 1 + 51 + 2 + 2);

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
