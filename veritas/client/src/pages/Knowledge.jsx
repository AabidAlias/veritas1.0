import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { KB, ErrorBox } from '../ui.jsx';

const empty = { type: 'fact', title: '', text: '', variants: '', validUntil: '' };
export default function Knowledge() {
  const { user } = useAuth(); const admin = user.role === 'admin';
  const [items, setItems] = useState(null); const [f, setF] = useState(empty); const [editId, setEditId] = useState(null); const [err, setErr] = useState('');
  const load = () => api('/knowledge').then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault(); setErr('');
    const body = { ...f, variants: f.variants.split(',').map((s) => s.trim()).filter(Boolean), validUntil: f.validUntil || undefined };
    try { await api(editId ? `/knowledge/${editId}` : '/knowledge', { method: editId ? 'PUT' : 'POST', body }); setF(empty); setEditId(null); load(); } catch (x) { setErr(x.message); }
  };
  const edit = (k) => { setEditId(k._id); setF({ type: k.type, title: k.title, text: k.text, variants: (k.variants || []).join(', '), validUntil: k.validUntil ? k.validUntil.slice(0, 10) : '' }); window.scrollTo({ top: 0 }); };
  const del = async (k) => { if (confirm(`Delete “${k.title}”?`)) { await api(`/knowledge/${k._id}`, { method: 'DELETE' }); load(); } };
  const isTerm = f.type === 'preferred_term' || f.type === 'restricted_term';
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">Brand knowledge</h1><p className="text-sm text-mute">The approved source of truth. Reviews only trust what is stored here.</p></div>
      {admin && (
        <form onSubmit={save} className="card space-y-3 p-4">
          <h2 className="text-lg font-semibold">{editId ? 'Edit entry' : 'Add an entry'}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="k1">Type</label><select id="k1" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(KB).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label" htmlFor="k2">{f.type === 'restricted_term' ? 'Restricted phrase' : f.type === 'preferred_term' ? 'Preferred term' : 'Title'}</label><input id="k2" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          </div>
          <div><label className="label" htmlFor="k3">{f.type === 'fact' ? 'Approved statement' : 'Details'}</label><textarea id="k3" className="input" rows={2} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required={!isTerm} /></div>
          {f.type === 'preferred_term' && <div><label className="label" htmlFor="k4">Variants to flag (comma separated)</label><input id="k4" className="input" value={f.variants} onChange={(e) => setF({ ...f, variants: e.target.value })} /></div>}
          {f.type === 'fact' && <div><label className="label" htmlFor="k5">Valid until (optional). Expired facts are flagged as outdated.</label><input id="k5" type="date" className="input md:w-60" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></div>}
          <ErrorBox msg={err} />
          <div className="flex gap-2"><button className="btn btn-primary">{editId ? 'Save changes' : 'Add entry'}</button>{editId && <button type="button" className="btn" onClick={() => { setEditId(null); setF(empty); }}>Cancel</button>}</div>
        </form>
      )}
      {!admin && <ErrorBox msg={err} />}
      {!items ? <p className="text-mute">Loading…</p> : Object.keys(KB).map((t) => {
        const rows = items.filter((i) => i.type === t); if (!rows.length) return null;
        return (<section key={t}><h2 className="mb-2 text-lg font-semibold">{KB[t]}</h2>
          <ul className="space-y-2">{rows.map((k) => (
            <li key={k._id} className="card flex items-start justify-between gap-3 p-3 text-sm">
              <div><p className="font-medium">{k.title}</p>{k.text && <p className="text-mute">{k.text}</p>}
                {k.variants?.length > 0 && <p className="text-xs text-mute">Flags: {k.variants.join(', ')}</p>}
                {k.validUntil && <p className="text-xs text-mute">Valid until {k.validUntil.slice(0, 10)}{new Date(k.validUntil) < new Date() ? ' (expired)' : ''}</p>}</div>
              {admin && <div className="flex shrink-0 gap-2"><button className="btn" onClick={() => edit(k)}>Edit</button><button className="btn btn-danger" onClick={() => del(k)}>Delete</button></div>}
            </li>))}</ul></section>);
      })}
    </div>
  );
}
