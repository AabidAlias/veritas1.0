import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFinding } from '../src/lib/validator.js';
import { ruleChecks } from '../src/lib/rules.js';

const items = [
  { _id: 'a1', type: 'fact', title: 'Org count', text: 'The platform currently supports 500 registered organisations.' },
  { _id: 'a2', type: 'fact', title: 'Old price', text: 'The Pro plan costs $49 per month.', validUntil: '2026-01-01' },
  { _id: 'a3', type: 'preferred_term', title: 'Brand Governance Platform', text: '', variants: ['brand checker'] },
];
const text = 'We support over 1 million organisations. Try our brand checker. Pro costs $49 per month. We are India\u2019s No.1.';

test('verified citation is kept as evidence', () => {
  const { finding } = validateFinding({ claim: 'over 1 million organisations', verdict: 'contradicted', sourceId: 'a1', quote: 'supports 500 registered organisations' }, text, items);
  assert.equal(finding.verdict, 'contradicted'); assert.equal(finding.grounded, true);
});
test('fabricated quote is downgraded, never shown as evidence', () => {
  const { finding } = validateFinding({ claim: 'over 1 million organisations', verdict: 'contradicted', sourceId: 'a1', quote: 'supports 9 organisations' }, text, items);
  assert.equal(finding.verdict, 'needs_human_judgment'); assert.equal(finding.grounded, false); assert.equal(finding.quote, null);
});
test('claim not present in content is dropped', () => {
  assert.equal(validateFinding({ claim: 'we are the cheapest', verdict: 'not_found' }, text, items).drop, 'claim_not_in_content');
});
test('not_found stays not_found when nothing related exists', () => {
  const { finding } = validateFinding({ claim: 'India\u2019s No.1', verdict: 'not_found' }, text, items);
  assert.equal(finding.verdict, 'not_found'); assert.equal(finding.quote, null);
});
test('not_found is escalated when a related approved fact exists', () => {
  const { finding } = validateFinding({ claim: 'support over 1 million organisations', verdict: 'not_found' }, text, items);
  assert.equal(finding.verdict, 'needs_human_judgment'); assert.equal(finding.sourceId, 'a1');
});
test('expired source turns supported into outdated', () => {
  const { finding } = validateFinding({ claim: 'Pro costs $49 per month', verdict: 'supported', sourceId: 'a2', quote: 'Pro plan costs $49 per month' }, text, items, new Date('2026-11-13'));
  assert.equal(finding.verdict, 'outdated');
});
test('terminology rule finds variant with correct span', () => {
  const r = ruleChecks(text, items);
  assert.equal(r.length, 1); assert.equal(text.slice(r[0].start, r[0].end), 'brand checker'); assert.equal(r[0].replacement, 'Brand Governance Platform');
});
