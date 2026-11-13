import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { VerdictPill, StatusPill, MARK, CAT, TYPES, ACTION, fmt, ErrorBox } from '../ui.jsx';

function Highlighted({ text, findings }) {
  const spans = findings.filter((f) => f.end > f.start).sort((a, b) => a.start - b.start);
  const out = []; let pos = 0;
  spans.forEach((f) => {
    if (f.start < pos) return;
    if (f.start > pos) out.push(text.slice(pos, f.start));
    out.push(<a key={f.id} href={`#f-${f.id}`}><mark className={`rounded px-0.5 text-ink ${MARK[f.verdict]}`}>{text.slice(f.start, f.end)}</mark></a>);
    pos = f.end;
  });
  out.push(text.slice(pos));
  return <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">{out}</p>;
}

function Finding({ f, canEdit, canJudge, onApply, onDecide }) {
  return (
    <li id={`f-${f.id}`} className={`card space-y-2 p-3 text-sm ${f.decision === 'dismissed' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <VerdictPill v={f.verdict} /><span className="text-mute">{CAT[f.category]} · {f.severity} severity</span>
        {f.decision !== 'open' && <span className="ml-auto text-xs font-medium text-seal">{f.decision === 'accepted' ? 'Accepted by reviewer' : 'Dismissed by reviewer'}</span>}
      </div>
      <p className="font-serif"><mark className={`rounded px-0.5 text-ink ${MARK[f.verdict]}`}>{f.claim}</mark></p>
      <p><b>Why flagged:</b> {f.reason}</p>
      {f.quote ? (
        <blockquote className="border-l-4 border-seal bg-paper p-2">
          <p className="text-xs text-mute">Approved source: <b>{f.sourceTitle}</b></p>
          <p className="font-serif">“{f.quote}”</p>
          {f.grounded && <p className="mt-1 text-xs text-ok">Quote verified against the stored source{f.origin === 'rule' ? ' (rule check)' : ''}.</p>}
        </blockquote>
      ) : f.verdict === 'not_found' ? <p className="text-mute">No approved source covers this claim. That does not mean it is false.</p>
        : f.origin === 'ai' ? <p className="text-judge">No verifiable source. Treat this as an unverified AI observation.</p> : null}
      {f.verdict !== 'supported' && (f.replacement
        ? <div className="rounded bg-ok/5 p-2"><p className="text-xs text-mute">Suggested correction</p><p className="font-serif">{f.replacement}</p>{canEdit && <button className="btn mt-2" onClick={() => onApply(f)}>Apply to my draft</button>}</div>
        : f.origin === 'rule' ? <p className="text-mute"><b>Suggestion:</b> remove or rephrase this wording.</p> : null)}
      {canJudge && f.decision === 'open' && <div className="flex gap-2 pt-1"><button className="btn" onClick={() => onDecide(f, 'accepted')}>Accept finding</button><button className="btn" onClick={() => onDecide(f, 'dismissed')}>Dismiss</button></div>}
      {canJudge && f.decision !== 'open' && <button className="text-xs text-mute underline" onClick={() => onDecide(f, 'open')}>Undo</button>}
    </li>
  );
}

export default function Review() {
  const { id } = useParams(); const { user } = useAuth();
  const [data, setData] = useState(null); const [sel, setSel] = useState(null); const [draft, setDraft] = useState('');
  const [note, setNote] = useState(''); const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');

  const load = useCallback(async (reset) => {
    const d = await api(`/content/${id}`); setData(d);
    const last = d.versions[d.versions.length - 1];
    if (reset) { setSel(last.number); setDraft(last.text); }
  }, [id]);
  useEffect(() => { load(true).catch((e) => setErr(e.message)); }, [load]);

  if (err && !data) return <ErrorBox msg={err} />;
  if (!data) return <p className="text-mute">Loading…</p>;
  const { content, versions, activity } = data;
  const latest = versions[versions.length - 1];
  const view = versions.find((v) => v.number === sel) || latest;
  const isLatest = view.number === latest.number;
  const canEdit = (user.role === 'creator' || user.role === 'admin') && content.status !== 'approved' && isLatest;
  const canDecide = (user.role === 'reviewer' || user.role === 'admin') && content.status !== 'approved';

  const run = async (fn) => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const apply = (f) => {
    const i = draft.toLowerCase().indexOf(f.claim.toLowerCase());
    if (i < 0) return setMsg('That text is no longer in your draft.');
    setDraft(draft.slice(0, i) + f.replacement + draft.slice(i + f.claim.length)); setErr('');
    setMsg('Suggestion applied to your draft. Edit further if needed, then resubmit for review.');
  };
  const resubmit = () => run(async () => {
    await api(`/content/${id}/resubmit`, { method: 'POST', body: { text: draft } });
    await load(true); setMsg('New version reviewed. Compare it with earlier versions using the tabs.');
  });
  const decideFinding = (f, decision) => run(async () => { await api(`/content/${id}/versions/${view.number}/findings/${f.id}`, { method: 'POST', body: { decision } }); await load(false); });
  const decide = (action) => run(async () => { await api(`/content/${id}/decision`, { method: 'POST', body: { action, note } }); setNote(''); await load(false); setMsg(action === 'approve' ? 'Content approved.' : 'Changes requested. The creator can now revise.'); });
  const addComment = () => run(async () => { await api(`/content/${id}/comments`, { method: 'POST', body: { note: comment } }); setComment(''); await load(false); });

  const open = view.findings.filter((f) => f.decision === 'open').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{content.title}</h1><StatusPill s={content.status} />
        <span className="text-sm text-mute">{TYPES[content.type]} · {content.authorName}{content.department ? ` (${content.department})` : ''}</span>
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Versions">
        {versions.map((v) => <button key={v.number} role="tab" aria-selected={v.number === view.number} className={`btn ${v.number === view.number ? 'btn-primary' : ''}`} onClick={() => setSel(v.number)}>Version {v.number}{v.number === latest.number ? ' (latest)' : ''}</button>)}
      </div>
      {msg && <p role="status" className="rounded border border-ok/40 bg-ok/5 px-3 py-2 text-sm text-ok">{msg}</p>}
      <ErrorBox msg={err} />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">Version {view.number} as submitted</h2>
            <Highlighted text={view.text} findings={view.findings} />
            <p className="mt-3 text-xs text-mute">Submitted by {view.submittedBy} on {fmt(view.createdAt)}.{' '}
              {view.meta?.llm === 'ok' ? `AI review: ${view.meta.model}, ${view.meta.sources} approved sources considered${view.meta.dropped ? `, ${view.meta.dropped} unverifiable AI finding(s) discarded` : ''}.` : <b className="text-warn">The AI service was unavailable, so only rule checks ran. A human must verify the claims.</b>}</p>
          </section>
          {canEdit && (
            <section className="card space-y-2 p-4">
              <h2 className="text-lg font-semibold">Revise and resubmit</h2>
              <label className="sr-only" htmlFor="draft">Draft</label>
              <textarea id="draft" className="input min-h-[8rem]" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={6000} />
              <button className="btn btn-primary" disabled={busy || !draft.trim() || draft === latest.text} onClick={resubmit}>{busy ? 'Reviewing…' : 'Resubmit for review'}</button>
            </section>
          )}
          {canDecide && (
            <section className="card space-y-2 p-4">
              <h2 className="text-lg font-semibold">Your decision</h2>
              <p className="text-sm text-mute">{open} finding(s) on this version still open. AI findings are advice; the decision is yours and is saved with your note.</p>
              <label className="sr-only" htmlFor="note">Decision note</label>
              <textarea id="note" className="input" rows={2} placeholder="Note for the creator (required when requesting changes)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2"><button className="btn btn-primary" disabled={busy} onClick={() => decide('approve')}>Approve content</button><button className="btn" disabled={busy} onClick={() => decide('request_changes')}>Request changes</button></div>
            </section>
          )}
          <section className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">History and comments</h2>
            <ol className="space-y-2 text-sm">{activity.map((a) => (
              <li key={a._id} className="border-l-2 border-rule pl-3"><span className="font-medium">{a.userName}</span> <span className="text-mute">({a.role})</span> {ACTION[a.action]}{a.versionNo ? ` · v${a.versionNo}` : ''}
                <span className="block text-xs text-mute">{fmt(a.createdAt)}</span>{a.note && <span className="block">{a.note}</span>}</li>))}</ol>
            <div className="mt-3 flex gap-2"><input className="input" aria-label="Add a comment" placeholder="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="btn" disabled={busy || !comment.trim()} onClick={addComment}>Comment</button></div>
          </section>
        </div>
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Findings ({view.findings.length})</h2>
          {view.findings.length === 0 ? <p className="card p-4 text-sm text-ok">No issues found against your approved knowledge.</p> :
            <ul className="space-y-3">{view.findings.map((f) => <Finding key={f.id} f={f} canEdit={canEdit} canJudge={canDecide && isLatest} onApply={apply} onDecide={decideFinding} />)}</ul>}
        </section>
      </div>
    </div>
  );
}
