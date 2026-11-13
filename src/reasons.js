// Why a piece left the shelf when it was not a sale. The fixed reasons are
// stored by name; "Other" carries what the person typed after a colon, so one
// text column holds both and the history can show either one.
export const OTHER_REASON_MAX = 70;   // the server keeps the first 80 characters

export function joinReason(reason, note) {
  const text = String(note || '').trim();
  return reason === 'Other' && text ? `Other: ${text}`.slice(0, 80) : reason;
}

// What to print for a stored reason: the translated name for a fixed reason,
// "Other: …" with the typed words for the free one, and the raw text for
// anything older or stranger rather than a raw translation key.
export function reasonLabel(t, reason) {
  const raw = String(reason || '').trim();
  if (!raw) return '';
  const typed = /^other:\s*(.+)$/i.exec(raw);
  if (typed) return `${t('sell.reason.Other')}: ${typed[1]}`;
  const key = 'sell.reason.' + raw.replace(/\s+/g, '');
  const label = t(key);
  return label && label !== key ? label : raw;
}
