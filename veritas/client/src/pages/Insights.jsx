import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { VERDICT, CAT, ErrorBox } from '../ui.jsx';

const Bars = ({ data, labels }) => {
  const rows = Object.entries(data || {}); const max = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return <p className="text-sm text-mute">No data yet.</p>;
  return <ul className="space-y-1.5">{rows.map(([k, n]) => (
    <li key={k} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-2 text-sm"><span>{labels[k]?.[0] || labels[k] || k}</span><span className="h-3 rounded bg-seal/70" style={{ width: `${(n / max) * 100}%` }} /><span className="text-right text-mute">{n}</span></li>))}</ul>;
};

export default function Insights() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/insights').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <ErrorBox msg={err} />; if (!d) return <p className="text-mute">Loading…</p>;
  const LABEL = { terminology_drift: 'Terminology drift', orphan_claim: 'Claim with no approved source', high_dismissal: 'Rule often dismissed' };
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Governance insights</h1><p className="text-sm text-mute">{d.contents} content items, {d.versions} reviewed versions. Suggestions below go to the Admin; nothing changes automatically.</p></div>
      <section><h2 className="mb-2 text-lg font-semibold">Guideline gaps</h2>
        {d.gaps.length === 0 ? <p className="card p-4 text-sm text-mute">No repeated patterns yet. Gaps appear when the same mistake shows up two or more times.</p> :
          <ul className="space-y-2">{d.gaps.map((g, i) => <li key={i} className="card border-warn/40 p-3 text-sm"><p className="font-medium">{LABEL[g.type]} <span className="text-mute">(seen {g.count} times)</span></p><p>{g.message}</p></li>)}</ul>}
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-4"><h2 className="mb-2 text-lg font-semibold">Findings by verdict</h2><Bars data={d.byVerdict} labels={VERDICT} /></section>
        <section className="card p-4"><h2 className="mb-2 text-lg font-semibold">Findings by category</h2><Bars data={d.byCategory} labels={CAT} /></section>
      </div>
    </div>
  );
}
