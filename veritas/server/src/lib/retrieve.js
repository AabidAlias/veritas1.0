import { tokens } from './text.js';

const weight = (t) => (/\d/.test(t) ? 2 : 1);

// Keyword retrieval over approved facts. Rules/terms/tone are always included (small, high-value).
export function retrieve(text, items, k = 8) {
  const tt = new Set(tokens(text));
  const facts = items
    .filter((i) => i.type === 'fact')
    .map((i) => ({ i, s: tokens(`${i.title} ${i.text}`).filter((t) => tt.has(t)).reduce((a, t) => a + weight(t), 0) }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.i);
  const always = items.filter((i) => i.type !== 'fact').slice(0, 30);
  return [...facts, ...always];
}

// How much of a claim is covered by any approved fact/guideline? Used to catch false "not found".
export function bestMatch(claim, items) {
  const ct = [...new Set(tokens(claim))];
  if (!ct.length) return null;
  let best = null;
  for (const it of items.filter((i) => i.type === 'fact' || i.type === 'guideline')) {
    const it_t = new Set(tokens(`${it.title} ${it.text}`));
    const ratio = ct.filter((t) => it_t.has(t)).length / ct.length;
    if (!best || ratio > best.ratio) best = { item: it, ratio };
  }
  return best;
}
