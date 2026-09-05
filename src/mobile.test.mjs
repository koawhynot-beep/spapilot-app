// Guards the two things that made the app misbehave on an iPad while looking
// perfect on a laptop. Neither throws, neither logs, and neither shows up in
// a desktop browser — so both need a test rather than a careful look.
//
//   1. iOS Safari zooms the page in whenever it focuses a field whose
//      font-size is under 16px. That zoom is what made the screen jump away
//      from what was being typed on the Sell screen.
//   2. Safari does not reliably deliver clicks from non-interactive elements
//      to React's delegated listener, so a <div onClick> did nothing on an
//      iPad. Rows people tap have to be real buttons.
//
// Run with: node src/mobile.test.mjs
import fs from 'fs';

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const css = read('./App.css');
const html = read('../public/index.html');

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : '  — ' + detail}`);
  if (!ok) failures++;
};

console.log('Touch devices · what iOS does differently\n');

// ── 16px on anything you can type into ──────────────────────────────────
console.log('  no field small enough to trigger the iOS zoom');

// Strip comments so a font-size mentioned in prose is not read as a rule.
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Every rule block, as selector + body.
const blocks = [...rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(m => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
  .filter(b => b.selector && !b.selector.startsWith('@'));

const TYPEABLE = /(^|[\s,>+~])(input|select|textarea)(\b|[.:[])|\.(input|select|textarea|scan-input)\b/;
const tooSmall = [];
for (const b of blocks) {
  if (!TYPEABLE.test(b.selector)) continue;
  const m = /font-size:\s*([\d.]+)px/.exec(b.body);
  if (m && parseFloat(m[1]) < 16) tooSmall.push(`${b.selector} → ${m[1]}px`);
}
check('every rule that sizes a typeable field is at least 16px', tooSmall.length === 0,
  `iOS will zoom on these:\n    ` + tooSmall.join('\n    '));

// And prove the check can see the rule it is meant to be watching.
const baseRule = blocks.find(b => /\.input,\s*\.select,\s*\.textarea/.test(b.selector));
check('the shared field rule was found', !!baseRule, 'the selector has been renamed');
if (baseRule) {
  const size = /font-size:\s*([\d.]+)px/.exec(baseRule.body);
  check('  and it sets a size this check can read', !!size, 'no font-size on it');
  if (size) check(`  it is ${size[1]}px`, parseFloat(size[1]) >= 16, `${size[1]}px zooms on iOS`);
}

// ── The viewport meta ───────────────────────────────────────────────────
console.log('\n  the viewport');
const viewport = /<meta name="viewport" content="([^"]+)"/.exec(html);
check('there is a viewport meta', !!viewport, 'none found');
if (viewport) {
  // maximum-scale looks like protection against the zoom above. It is not:
  // Safari has ignored it since iOS 10, and on Android it stops people
  // pinch-zooming at all.
  check('it does not try to block zooming', !/maximum-scale|user-scalable\s*=\s*no/.test(viewport[1]),
    `content="${viewport[1]}"`);
  check('it sets width=device-width', /width=device-width/.test(viewport[1]), viewport[1]);
}

// ── Rows people tap are real buttons ────────────────────────────────────
console.log('\n  tappable rows are buttons, not divs with a role');
const views = read('./views.js');
const stockcheck = read('./stockcheck.js');

for (const [name, src, row] of [
  ['the sales row', views, 'SaleRow'],
  ['the stock movement row', views, 'MoveRow'],
]) {
  const a = src.indexOf(`const ${row} = (`);
  const body = a < 0 ? '' : src.slice(a, src.indexOf('\n};', a));
  check(`  ${name} renders a button when it is clickable`,
    /const Row = onEdit \? 'button' : 'div';/.test(body),
    'it is not a real button, so an iPad tap will do nothing');
  check(`  ${name} does not fake it with role="button"`,
    !/role=\{?["']button/.test(body), 'still using a div with a role');
}

check('  the stock-check row is a real button',
  /<button/.test(stockcheck) && /className=\{`check-row/.test(stockcheck),
  'the check row is not a button');

// A button needs its own styling undone to look like a row again.
check('  button styling is reset so the row still looks like a row',
  /\.sale-row\.is-clickable\s*\{[^}]*appearance:\s*none/.test(rules),
  'the browser default button chrome is not reset');

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
