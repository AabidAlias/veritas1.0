import { locate } from './text.js';

// Deterministic checks: no AI involved, so these are always source-exact.
export function ruleChecks(text, items) {
  const out = [];
  for (const it of items) {
    if (it.type === 'preferred_term') {
      for (const v of it.variants || []) {
        const m = locate(text, v, true);
        if (m) out.push({
          origin: 'rule', category: 'terminology', verdict: 'rule_violation', severity: 'medium',
          claim: text.slice(m.start, m.end), start: m.start, end: m.end,
          reason: `"${v}" is not the approved name. The approved term is "${it.title}".`,
          sourceId: String(it._id), sourceTitle: it.title, quote: it.text || `Preferred term: ${it.title}`,
          replacement: it.title, grounded: true,
        });
      }
    }
    if (it.type === 'restricted_term') {
      const m = locate(text, it.title, true);
      if (m) out.push({
        origin: 'rule', category: 'terminology', verdict: 'rule_violation', severity: 'high',
        claim: text.slice(m.start, m.end), start: m.start, end: m.end,
        reason: `"${it.title}" is a restricted phrase.`,
        sourceId: String(it._id), sourceTitle: it.title, quote: it.text || `Restricted phrase: ${it.title}`,
        replacement: '', grounded: true,
      });
    }
  }
  return out;
}

const TRIGGER = /\b(no\.?\s?1|#1|number one|best|leading|fastest|largest|only|guarantee[d]?|proven)\b|\d[\d,.]*\s?(%|million|billion)|\bover\s+\d/i;

// Used only when the AI service is unavailable: flags checkable-looking claims for a human.
export function fallbackClaimFlags(text) {
  const out = [];
  const re = /[^.!?\n]+[.!?]?/g; let m;
  while ((m = re.exec(text))) {
    const s = m[0].trim();
    if (s && TRIGGER.test(s)) {
      const start = m.index + m[0].indexOf(s);
      out.push({
        origin: 'rule', category: 'unsupported_claim', verdict: 'needs_human_judgment', severity: 'medium',
        claim: s, start, end: start + s.length,
        reason: 'Looks like a claim that needs evidence. Automated evidence check was unavailable, so a human must verify it.',
        sourceId: null, sourceTitle: null, quote: null, replacement: '', grounded: true,
      });
    }
  }
  return out;
}
