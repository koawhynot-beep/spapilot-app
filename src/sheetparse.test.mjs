// Tests the sheet parser on rows taken verbatim from the shop's own
// spreadsheet, including the awkward ones: blank saldo awal, dashes for zero,
// prices with thousands separators, trailing note columns, header rows and
// the single-letter section breaks.
//
// Run with: node src/sheetparse.test.mjs
import { parseStockSheet, cellToNumber } from './sheetparse.js';

const T = '\t';
const row = (...cells) => cells.join(T);

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : '  — ' + detail}`);
  if (!ok) failures++;
};
const eq = (label, got, want) =>
  check(label, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);

console.log('Sheet parser · rows taken verbatim from the stock spreadsheet\n');

console.log('  cells');
eq('    blank is zero', cellToNumber(''), 0);
eq('    a dash is zero', cellToNumber('  -   '), 0);
eq('    thousands separators are stripped', cellToNumber('  1,600,000 '), 1600000);
eq('    a plain count reads', cellToNumber('  11 '), 11);
eq('    nonsense is rejected, not guessed', cellToNumber('n/a'), null);

// Verbatim rows.
const sheet = [
  'KODE\tPRODUCT NAME\tSTYLE\tCOLOUR\tSIZE\tPRICE\tSALDO AWAL\t MUTASI UG\t\tSALDO AKHIR\t\t\t\t',
  '\t\t\t\t\t\t\t BRG MASUK\t BRG KELUAR\t\t\t\t\t',
  'A\t\t\t\t\t\t\t\t\t\t\t\t\t09-07-2026',
  row('AG-1001','AGUSTINE DRESS LONG CHEETAH BLACK BEIGE O/S','AGUSTINE DRESS LONG','CHEETAH BLACK BEIGE','O/S','  950,000 ','','  1 ','  1 ','  -   ','Saldo awal ada 2, mutasi dari RG to UG (24-02-2026) 1pcs','','','-'),
  row('AG-1004','AGUSTINE DRESS LONG BULU KUDA LINEN O/S','AGUSTINE DRESS LONG','BULU KUDA LINEN','O/S','  950,000 ','  2 ','  7 ','  9 ','  -   ','','','',''),
  row('AG-1048','AGUSTINE DRESS LONG LEOPARD BLACK BEIGE O/S','AGUSTINE DRESS LONG','LEOPARD BLACK BEIGE','O/S','  950,000 ','','  11 ','  10 ','  1 ','Retur to office 1 pcs (20-05-2026)','','','-'),
  row('CH-1001','CHICAGO JUMPSUIT BLACK O/S','CHICAGO JUMPSUIT','BLACK','O/S','  895,000 ','  2 ','  11 ','  11 ','  2 ','','','','-'),
  row('IN-3011','INDIGO DRESS STONE O/S','INDIGO DRESS','STONE','O/S','  1,500,000 ','  1 ','  9 ','  8 ','  2 ','','','','2'),
  row('AG-2024','AGUA SHIRT OFF WHITE S/M','AGUA SHIRT','OFF WHITE','S/M','  1,600,000 ','','  3 ','  3 ','  -   ','','','','1'),
  // Saldo akhir blank rather than a dash — still zero.
  row('FR-3031','FREY SINGLET BULU KUDA LINEN X/S','FREY SINGLET','BULU KUDA LINEN','X/S','  600,000 ','','  -   ','  -   ','','','','','-'),
  // A code with spaces and brackets, and a blank size.
  row('PR-108 (5&6)','BAISE ROSE GOLD OVAL STACK RING 5 & 6','BAISE','ROSE GOLD OVAL STACK RING','5 & 6','  2,500,000 ','','  -   ','  -   ','  -   ','','','','-'),
  row('BM-1004','BOOBTUBE MINI NATURAL O/S','BOOBTUBE MINI','NATURAL','O/S','  350,000 ','  2 ','  33 ','  35 ','  -   ','','','','-'),
  '',
].join('\n');

const out = parseStockSheet(sheet);

console.log('\n  parsing');
eq('    header and section rows skipped', out.stats.skippedHeader, 3);
eq('    every product row parsed', out.stats.parsed, 9);
eq('    no problems on a clean sheet', out.problems.length, 0);
eq('    no duplicate codes', out.duplicates.length, 0);
eq('    every row balances', out.unbalanced.length, 0);

console.log('\n  saldo akhir is the quantity');
const by = Object.fromEntries(out.rows.map(r => [r.sku, r]));
eq('    AG-1001  akhir 0 (dash)', by['AG-1001'].qty, 0);
eq('    AG-1004  2 + 7 - 9 = 0', by['AG-1004'].qty, 0);
eq('    AG-1048  0 + 11 - 10 = 1', by['AG-1048'].qty, 1);
eq('    CH-1001  2 + 11 - 11 = 2', by['CH-1001'].qty, 2);
eq('    IN-3011  1 + 9 - 8 = 2', by['IN-3011'].qty, 2);
eq('    FR-3031  blank akhir is zero', by['FR-3031'].qty, 0);

// The far-right column, dated 09-07-2026, disagrees with saldo akhir on this
// row. Only saldo akhir is read, and this pins that down.
eq('    AG-2024  reads 0 from saldo akhir, not 1 from the later count', by['AG-2024'].qty, 0);

console.log('\n  the other fields');
eq('    code', by['CH-1001'].sku, 'CH-1001');
eq('    name', by['CH-1001'].name, 'CHICAGO JUMPSUIT BLACK O/S');
eq('    style', by['CH-1001'].style, 'CHICAGO JUMPSUIT');
eq('    colour', by['CH-1001'].color, 'BLACK');
eq('    size', by['CH-1001'].size, 'O/S');
eq('    price', by['CH-1001'].price, 895000);
eq('    a code containing spaces and brackets survives', by['PR-108 (5&6)'].sku, 'PR-108 (5&6)');
eq('    size can be a range', by['PR-108 (5&6)'].size, '5 & 6');

console.log('\n  totals');
eq('    items with stock', out.stats.withStock, 3);
eq('    pieces in stock', out.stats.pieces, 1 + 2 + 2);
eq('    value at retail', out.stats.value, 1 * 950000 + 2 * 895000 + 2 * 1500000);

console.log('\n  things that should be reported, not silently imported');
const messy = [
  row('DUP-1','FIRST','STYLE','RED','S','  100,000 ','','  1 ','  -   ','  1 ','','','',''),
  row('DUP-1','SECOND WITH SAME CODE','STYLE','BLUE','M','  100,000 ','','  2 ','  -   ','  2 ','','','',''),
  row('','NO CODE AT ALL','STYLE','RED','S','  100,000 ','','  1 ','  -   ','  1 ','','','',''),
  row('BAD-Q','UNREADABLE QUANTITY','STYLE','RED','S','  100,000 ','','  1 ','  -   ','  n/a ','','','',''),
  row('UNBAL','DOES NOT RECONCILE','STYLE','RED','S','  100,000 ','  5 ','  1 ','  -   ','  2 ','','','',''),
  'JUST ONE COLUMN',
].join('\n');
const m = parseStockSheet(messy);

eq('    a repeated code is flagged', m.duplicates.length, 1);
eq('    a row with no code is refused', m.problems.filter(p => p.reason === 'noCode').length, 1);
eq('    an unreadable quantity is refused', m.problems.filter(p => p.reason === 'badQty').length, 1);
eq('    a short line is refused', m.problems.filter(p => p.reason === 'tooFewColumns').length, 1);
eq('    a row that does not reconcile is flagged but kept', m.unbalanced.length, 1);
eq('    the unbalanced row still carries saldo akhir', m.rows.find(r => r.sku === 'UNBAL').qty, 2);
eq('    refused rows are not in the output', m.rows.length, 3);

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
