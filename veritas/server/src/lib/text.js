// Text helpers shared by rules, retrieval and the grounding validator.
const STOP = new Set('the and for are was were with that this from have has had our your you their they them its not but can will all any one out into over per via use used using also more than then very new'.split(' '));

// Length-preserving normalisation (so indexes match the original text).
export const flat = (s) => (s || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').toLowerCase();
// Collapsing normalisation for substring checks.
export const norm = (s) => flat(s).replace(/\s+/g, ' ').trim();
export const containsText = (hay, needle) => !!needle && norm(hay).includes(norm(needle));

export const tokens = (s) =>
  norm(s).replace(/[^a-z0-9\s]/g, ' ').split(' ').filter((t) => t && (t.length > 2 || /\d/.test(t)) && !STOP.has(t)).map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Find `needle` in `text`; returns {start,end} in the ORIGINAL text or null.
export function locate(text, needle, wholeWord = false) {
  const words = flat(needle).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const body = words.map(esc).join('\\s+');
  const re = new RegExp(wholeWord ? `(?<![\\w])${body}(?![\\w])` : body, 'i');
  const m = re.exec(flat(text));
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}
