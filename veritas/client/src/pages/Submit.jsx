import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { TYPES, ErrorBox } from '../ui.jsx';

const SAMPLES = [
  ['Unsupported and contradicted claims', 'Our platform is India\u2019s No.1 brand governance platform and supports over 1 million organisations.'],
  ['Terminology, outdated price, restricted phrase', 'Try our brand checker today. The Pro plan is just $49 per month and delivers guaranteed results!'],
  ['Clean content', 'Veritas is the Brand Governance Platform. It currently supports 500 registered organisations.'],
];

export default function Submit() {
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', type: 'marketing_copy', text: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/content', { method: 'POST', body: f }); nav(`/content/${r.id}`); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Submit content for review</h1>
      <div className="card p-3 text-sm">
        <p className="mb-2 font-medium">Not sure what to try? Fill the form with a sample:</p>
        <div className="flex flex-wrap gap-2">{SAMPLES.map(([t, x]) => <button type="button" key={t} className="btn" onClick={() => setF({ title: t, type: 'marketing_copy', text: x })}>{t}</button>)}</div>
      </div>
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} required /></div>
      <div><label className="label" htmlFor="ty">Content type</label>
        <select id="ty" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label className="label" htmlFor="x">Content (text)</label><textarea id="x" className="input min-h-[10rem]" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} maxLength={6000} required />
        <p className="mt-1 text-xs text-mute">{f.text.length}/6000. Your text is sent to Google Gemini together with the relevant approved knowledge from your workspace.</p></div>
      <ErrorBox msg={err} />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Reviewing against your approved knowledge… (up to 30 seconds)' : 'Submit for review'}</button>
    </form>
  );
}
