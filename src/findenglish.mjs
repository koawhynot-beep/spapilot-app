// Finds user-facing English that never reaches the dictionary.
//
// Shared by the i18n test and used on its own while translating. It is
// deliberately structural rather than a word list: it strips the parts of a
// line that cannot be visible text (JSX expressions, imports, comments) and
// then treats what is left as something a customer could read.
//
// The earlier version of this only matched text nodes starting with a
// capital, so `<Plus /> Add item` — a node starting with a space — slipped
// through, and so did every `label="In stock"` prop. Both are why the shop
// still saw English after the first pass.
import fs from 'fs';

// Attributes that end up on screen or in a screen reader.
const TEXT_ATTRS = /(?:placeholder|aria-label|title|label|hint|alt|confirmLabel|emptyLabel)/;

// Things that look like prose but are not.
const NOT_PROSE = [
  /^(var|rotate|translate|calc|url|rgba?)\(/,
  /^(btn|pill|tone|stat|is|has|sale|check|pick|scan|swap|modal|panel|field|chip|detail|month|rank|empty|search|loading|error|success|form|qty|product|shop|tab|nav|input|select|textarea|icon|row|col|grid|card|group|list|head|body|wrap|note|hint|num|money|good|warn|bad|muted|soft|dark|light|active|open|close|small|large|block|ghost|primary|secondary)[-_]/,
  /^https?:/,
  /^[a-z]+([A-Z][a-z]+)+$/,          // camelCase identifiers
  /^[a-z-]+$/,                       // single lowercase token / css class
  /^\d/,                             // starts with a digit
  /[=<>!&|]/,                        // leaked JS/JSX: attributes, operators
  /^(IDR|OK|CSV|PDF|TSV|A4|SKU|EN|ID)$/,
  /^(MITRA SAMADI|Mitra Samadi)$/,   // the shop's own name
];

// Two words, or one capitalised word of any length. Short pairs count:
// "In stock" and "Low stock" are exactly the labels that were missed first
// time round, and requiring three letters before the space let them past.
const isProse = (v) => {
  if (!/[A-Za-z]{3}/.test(v)) return false;
  if (!/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(v) && !/^[A-Z][a-z]{3,}$/.test(v)) return false;
  return !NOT_PROSE.some(re => re.test(v));
};

export function findEnglish(files, dir) {
  const found = [];
  for (const f of files) {
    const src = fs.readFileSync(new URL(f, dir), 'utf8');
    const lines = src.split('\n');
    // Prose lives in comments and in multi-line imports too, and neither ever
    // reaches the screen, so both are tracked across lines rather than judged
    // one line at a time.
    let inComment = false;
    let inImport = false;
    lines.forEach((raw, i) => {
      let ln = raw;
      const bareLine = ln.trim();

      if (inComment) { if (/\*\/|\*\/\}/.test(ln)) inComment = false; return; }
      if (/\{?\/\*/.test(ln) && !/\*\/\}?/.test(ln)) { inComment = true; return; }
      if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(ln)) return;

      if (inImport) { if (/\}\s*from\s/.test(ln)) inImport = false; return; }
      if (/^\s*import\s*\{/.test(ln) && !/\}/.test(ln)) { inImport = true; return; }
      if (/^\s*import\s/.test(ln)) return;

      if (/\bconsole\.\w+\(/.test(ln)) return;
      // A dependency array or a list of identifiers, e.g. [shops.data, isAdmin].
      if (/^\[?[A-Za-z_$][\w$.]*(\s*,\s*[A-Za-z_$][\w$.]*)*\]?,?;?$/.test(bareLine)) return;
      // An object property whose value is an identifier: `qty: d.qtyChanged,`.
      if (/^[A-Za-z_$][\w$]*:\s*[A-Za-z_$][\w$.]*\s*,?$/.test(bareLine)) return;

      const hit = (v) => {
        const t = v.trim();
        if (isProse(t)) found.push({ file: f.replace('./', ''), line: i + 1, text: t });
      };

      // User-facing attributes written as plain strings.
      for (const m of ln.matchAll(new RegExp(`\\b${TEXT_ATTRS.source}=(["'])([^"']{3,90})\\1`, 'g'))) hit(m[2]);

      // Template literals used as visible text or as such an attribute.
      for (const m of ln.matchAll(new RegExp(`\\b${TEXT_ATTRS.source}=\\{\`([^\`]{3,90})\``, 'g'))) hit(m[1].replace(/\$\{[^}]*\}/g, ''));
      for (const m of ln.matchAll(/[:?]\s*`([^`]{6,120})`/g)) hit(m[1].replace(/\$\{[^}]*\}/g, ' '));

      // Visible text nodes, including ones that start with a space.
      for (const m of ln.matchAll(/>([^<>{}]{3,90})</g)) hit(m[1]);
      // Text sitting between two JSX expressions, e.g.
      //   {sold.total} pieces sold in {year}
      // which has no angle brackets around it at all.
      for (const m of ln.matchAll(/\}([^<>{}]{3,90})\{/g)) hit(m[1]);

      // A line that is nothing but JSX text, e.g. a label on its own line.
      const bare = bareLine;
      if (bare && !/[<>{}();=]/.test(bare) && !/^[A-Za-z0-9_$.]+,?$/.test(bare)) hit(bare);

      // English inside a plain-string ternary that feeds the screen.
      for (const m of ln.matchAll(/\?\s*'([^']{4,90})'\s*:\s*'([^']{4,90})'/g)) { hit(m[1]); hit(m[2]); }
    });
  }
  return found;
}

export const SCREENS = ['./App.js', './views.js', './stockcheck.js', './ui.js'];

// Runnable on its own: node src/findenglish.mjs
if (process.argv[1] && /findenglish\.mjs$/.test(process.argv[1])) {
  const hits = findEnglish(SCREENS, import.meta.url);
  for (const h of hits) console.log(`${h.file}:${h.line}\t${h.text}`);
  console.log(`TOTAL ${hits.length}`);
}
