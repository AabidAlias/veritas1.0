import { containsText, locate } from './text.js';
import { bestMatch } from './retrieve.js';

export const CATEGORIES = ['factual_claim', 'unsupported_claim', 'terminology', 'tone', 'messaging'];
export const VERDICTS = ['supported', 'contradicted', 'outdated', 'not_found', 'needs_human_judgment', 'rule_violation'];
const SEVERITIES = ['high', 'medium', 'low', 'info'];

// Grounding Validator: the AI's citation must be verifiable against the stored source, in code.
export function validateFinding(raw, text, items, now = new Date()) {
  if (!raw || typeof raw.claim !== 'string') return { drop: 'malformed' };
  const loc = locate(text, raw.claim);
  if (!loc) return { drop: 'claim_not_in_content' };
  const f = {
    origin: 'ai',
    category: CATEGORIES.includes(raw.category) ? raw.category : 'factual_claim',
    verdict: VERDICTS.includes(raw.verdict) ? raw.verdict : 'needs_human_judgment',
    severity: SEVERITIES.includes(raw.severity) ? raw.severity : 'medium',
    claim: text.slice(loc.start, loc.end), start: loc.start, end: loc.end,
    reason: String(raw.reason || '').slice(0, 600),
    sourceId: null, sourceTitle: null, quote: null,
    replacement: typeof raw.replacement === 'string' ? raw.replacement.slice(0, 500) : '',
    grounded: false,
  };
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const src = raw.sourceId ? byId.get(String(raw.sourceId)) : null;

  if (f.verdict === 'supported' || f.verdict === 'contradicted' || f.verdict === 'outdated') {
    if (src && raw.quote && containsText(src.text, raw.quote)) {
      f.sourceId = String(src._id); f.sourceTitle = src.title; f.quote = String(raw.quote).slice(0, 500); f.grounded = true;
      if (f.verdict === 'supported' && src.validUntil && new Date(src.validUntil) < now) {
        f.verdict = 'outdated'; f.severity = 'medium';
        f.reason = `Matches an approved fact that expired on ${new Date(src.validUntil).toISOString().slice(0, 10)}. ${f.reason}`;
      }
    } else {
      // Could not verify the AI's citation: never show it as evidence.
      f.reason = `The AI cited a source that could not be verified, so this is an unverified observation. ${f.reason}`;
      f.verdict = 'needs_human_judgment'; f.severity = 'medium';
    }
  } else if (f.verdict === 'not_found') {
    const bm = bestMatch(f.claim, items);
    if (bm && bm.ratio >= 0.5) {
      f.verdict = 'needs_human_judgment';
      f.sourceId = String(bm.item._id); f.sourceTitle = bm.item.title; f.quote = bm.item.text.slice(0, 500); f.grounded = true;
      f.reason = `The AI found no support, but a possibly related approved source exists. A human should decide. ${f.reason}`;
    } else f.grounded = true; // "nothing found" cites nothing, so there is nothing to fake
  } else if (src) {
    f.sourceId = String(src._id); f.sourceTitle = src.title;
    f.quote = raw.quote && containsText(src.text, raw.quote) ? String(raw.quote).slice(0, 500) : null;
    f.grounded = !!f.quote;
  }
  return { finding: f };
}

export function validateAll(rawList, text, items) {
  const findings = []; let dropped = 0;
  for (const r of Array.isArray(rawList) ? rawList : []) {
    const v = validateFinding(r, text, items);
    if (v.finding) findings.push(v.finding); else dropped++;
  }
  return { findings, dropped };
}
