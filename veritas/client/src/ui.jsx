export const VERDICT = {
  supported: ['Supported', 'text-ok border-ok/50 bg-ok/10'],
  contradicted: ['Contradicted', 'text-bad border-bad/50 bg-bad/10'],
  outdated: ['Outdated', 'text-warn border-warn/50 bg-warn/10'],
  not_found: ['Not found', 'text-mute border-mute/40 bg-mute/10'],
  needs_human_judgment: ['Needs human judgment', 'text-judge border-judge/50 bg-judge/10'],
  rule_violation: ['Rule violation', 'text-bad border-bad/50 bg-bad/10'],
};
export const MARK = { supported: 'bg-ok/20', contradicted: 'bg-bad/25', outdated: 'bg-warn/25', not_found: 'bg-mute/25', needs_human_judgment: 'bg-judge/25', rule_violation: 'bg-bad/25' };
export const STATUS = { in_review: ['Awaiting review', 'text-seal border-seal/40 bg-seal/10'], changes_requested: ['Changes requested', 'text-warn border-warn/50 bg-warn/10'], approved: ['Approved', 'text-ok border-ok/50 bg-ok/10'] };
export const TYPES = { social_post: 'Social post', marketing_copy: 'Marketing copy', website: 'Website content', advertisement: 'Advertisement', email: 'Email' };
export const KB = { fact: 'Approved facts', guideline: 'Guidelines', preferred_term: 'Preferred terminology', restricted_term: 'Restricted terminology', tone: 'Brand tone and messaging' };
export const CAT = { factual_claim: 'Factual claim', unsupported_claim: 'Unsupported claim', terminology: 'Terminology', tone: 'Tone', messaging: 'Messaging' };
export const ACTION = { submitted: 'submitted version', resubmitted: 'resubmitted a new version', comment: 'commented', approved: 'approved the content', changes_requested: 'requested changes', finding_accepted: 'accepted a finding', finding_dismissed: 'dismissed a finding' };

export const Pill = ({ cls, children }) => <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
export const VerdictPill = ({ v }) => <Pill cls={(VERDICT[v] || VERDICT.needs_human_judgment)[1]}>{(VERDICT[v] || VERDICT.needs_human_judgment)[0]}</Pill>;
export const StatusPill = ({ s }) => <Pill cls={STATUS[s][1]}>{STATUS[s][0]}</Pill>;
export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export const ErrorBox = ({ msg }) => msg ? <p role="alert" className="rounded border border-bad/40 bg-bad/5 px-3 py-2 text-sm text-bad">{msg}</p> : null;
