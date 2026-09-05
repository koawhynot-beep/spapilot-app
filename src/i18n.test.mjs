// Guards the bug that prompted this: the screen shows English even though
// Indonesian is selected.
//
// It happens two ways, and neither one throws or logs anything — the text
// just silently stays English, so it survives testing on a laptop set to
// English and only shows up on the shop floor:
//
//   1. A string is written straight into the JSX and never goes through t().
//   2. t() is called with a key the Indonesian dictionary does not have, and
//      the English fallback quietly takes over.
//
// Run with: node src/i18n.test.mjs
import fs from 'fs';
import { findEnglish, SCREENS } from './findenglish.mjs';

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const i18n = read('./i18n.js');

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : '  — ' + detail}`);
  if (!ok) failures++;
};

// ── The dictionaries ─────────────────────────────────────
const block = (name) => {
  const a = i18n.indexOf(`const ${name} = {`);
  const b = i18n.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error(`could not find the ${name} dictionary`);
  return i18n.slice(a, b);
};
const entries = (blk) => {
  const out = new Map();
  for (const m of blk.matchAll(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'/gm)) out.set(m[1], m[2]);
  return out;
};
const EN = entries(block('EN'));
const ID = entries(block('ID'));

console.log(`Translation coverage · ${EN.size} English keys, ${ID.size} Indonesian\n`);

check('both dictionaries carry something', EN.size > 100 && ID.size > 100,
  `EN ${EN.size}, ID ${ID.size}`);

const missingId = [...EN.keys()].filter(k => !ID.has(k));
check('every English key has an Indonesian translation', missingId.length === 0,
  `${missingId.length} untranslated: ${missingId.slice(0, 12).join(', ')}`);

const orphanId = [...ID.keys()].filter(k => !EN.has(k));
check('no Indonesian key is left over from a removed English one', orphanId.length === 0,
  `${orphanId.length} orphaned: ${orphanId.slice(0, 12).join(', ')}`);

// An Indonesian value identical to the English one is usually a forgotten
// entry. Some genuinely do match (Total, IDR, proper nouns), so they are
// listed rather than failed — but a sudden pile of them means a paste.
const identical = [...EN.keys()].filter(k => ID.get(k) === EN.get(k));
console.log(`  ${identical.length} entries read the same in both languages (Total, IDR and the like)`);
check('the Indonesian dictionary is not just a copy of the English one',
  identical.length < EN.size * 0.25,
  `${identical.length} of ${EN.size} are identical — was ID pasted from EN?`);

// ── Keys the code actually asks for ──────────────────────
const SOURCES = SCREENS;
const used = new Set();
const dynamic = new Set();
for (const f of SOURCES) {
  const src = read(f);
  for (const m of src.matchAll(/\bt(?:Static)?\(\s*'([a-zA-Z][\w.]*)'/g)) {
    // t('range.' + r.id) — a literal ending in a dot is a prefix being
    // concatenated, not a key in its own right.
    if (m[1].endsWith('.')) dynamic.add(m[1]); else used.add(m[1]);
  }
  // t(`sell.mode.${x}`) — the same idea, written as a template literal.
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z][\w.]*)\$\{/g)) dynamic.add(m[1]);
}

console.log(`\n  ${used.size} literal keys and ${dynamic.size} key families used in the screens`);

const unknown = [...used].filter(k => !EN.has(k));
check('every key the code asks for exists in the dictionary', unknown.length === 0,
  `${unknown.length} missing, so these render as English or as raw keys: ${unknown.join(', ')}`);

for (const prefix of dynamic) {
  const family = [...EN.keys()].filter(k => k.startsWith(prefix));
  check(`  the ${prefix}* family is populated`, family.length > 0,
    'nothing in the dictionary starts with this prefix');
  const untranslated = family.filter(k => !ID.has(k));
  check(`  the ${prefix}* family is fully translated`, untranslated.length === 0,
    untranslated.join(', '));
}

// ── Placeholders have to survive translation ─────────────
// 'check.remaining' is used as t(...).replace('{n}', n). If the Indonesian
// wording drops the {n}, the number simply vanishes from the screen.
const tokensIn = (v) => (v.match(/\{[a-z]\}/g) || []).sort().join(',');
const brokenTokens = [...EN.keys()].filter(k => ID.has(k) && tokensIn(EN.get(k)) !== tokensIn(ID.get(k)));
check('placeholders like {n} survive into the Indonesian wording', brokenTokens.length === 0,
  brokenTokens.map(k => `${k}: EN "${tokensIn(EN.get(k))}" vs ID "${tokensIn(ID.get(k))}"`).join(' · '));

// ── No English left sitting in the JSX ───────────────────
// The detector lives in its own module because it is also useful to run on
// its own while translating: node src/findenglish.mjs
const stranded = findEnglish(SCREENS, import.meta.url);
check('no visible English string bypasses the dictionary', stranded.length === 0,
  `${stranded.length} found:\n    ` +
  stranded.slice(0, 25).map(h => `${h.file}:${h.line}  "${h.text}"`).join('\n    '));

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
