import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { StatusPill, TYPES, fmt, ErrorBox } from '../ui.jsx';

export default function Contents() {
  const { user } = useAuth();
  const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const [hint, setHint] = useState(true);
  useEffect(() => { api('/content').then(setItems).catch((e) => setErr(e.message)); }, []);
  const steps = {
    creator: 'Submit content from “Submit content”, read the evidence-linked findings, apply suggestions, then resubmit.',
    reviewer: 'Open any item, review the findings and evidence, then approve or request changes with a note.',
    admin: 'Add facts, terms and tone in “Brand knowledge”, invite team members, then watch “Insights” fill up.',
  }[user.role];
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">{user.role === 'creator' ? 'Your content' : 'Content in this workspace'}</h1>
        {user.role !== 'reviewer' && <Link to="/new" className="btn btn-primary">Submit content</Link>}
      </div>
      {hint && <div className="card flex items-start justify-between gap-3 border-seal/40 bg-seal/5 p-3 text-sm"><p><b>Your next step ({user.role}):</b> {steps}</p><button className="text-mute underline" onClick={() => setHint(false)}>Hide</button></div>}
      <ErrorBox msg={err} />
      {!items ? <p className="text-mute">Loading…</p> : items.length === 0 ? (
        <div className="card p-8 text-center text-mute">Nothing here yet. {user.role !== 'reviewer' ? 'Submit your first piece of content to see a review.' : 'Content appears here once a creator submits it.'}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule text-mute"><tr><th className="p-3">Title</th><th>Type</th><th>Status</th><th>Findings</th><th>Author</th><th>Updated</th></tr></thead>
            <tbody>{items.map((c) => (
              <tr key={c._id} className="border-b border-rule last:border-0 hover:bg-paper">
                <td className="p-3 font-medium"><Link className="text-seal underline" to={`/content/${c._id}`}>{c.title}</Link> <span className="text-xs text-mute">v{c.versionCount}</span></td>
                <td>{TYPES[c.type]}</td><td><StatusPill s={c.status} /></td>
                <td className="text-xs text-mute">{c.summary ? [c.summary.contradicted && `${c.summary.contradicted} contradicted`, c.summary.not_found && `${c.summary.not_found} not found`, c.summary.rule_violation && `${c.summary.rule_violation} rule`, c.summary.needs_human_judgment && `${c.summary.needs_human_judgment} to judge`].filter(Boolean).join(', ') || `${c.summary.total} items` : ''}</td>
                <td>{c.authorName}{c.department ? <span className="text-xs text-mute"> ({c.department})</span> : ''}</td><td className="text-xs text-mute">{fmt(c.updatedAt)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
