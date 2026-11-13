import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { ErrorBox } from '../ui.jsx';

const DEMO = [['Admin', 'admin@demo.com', 'Manages the brand knowledge and team'], ['Creator (Marketing)', 'creator@demo.com', 'Submits content for review'], ['Reviewer', 'reviewer@demo.com', 'Makes the final human decision']];

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ orgName: '', name: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async (path, body) => {
    setBusy(true); setErr('');
    try { login(await api(path, { method: 'POST', body })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <section>
        <h1 className="text-4xl font-semibold text-seal">Veritas</h1>
        <p className="mt-3 text-lg">Evidence before verdict. Every finding is tied to something your organisation has approved, and a person makes the final call.</p>
        <div className="card mt-6 p-4">
          <h2 className="text-lg font-semibold">Try the demo workspace</h2>
          <p className="mb-3 text-sm text-mute">Each button signs you in as a different role in “Veritas Demo Co”.</p>
          <ul className="space-y-2">
            {DEMO.map(([r, e, d]) => (
              <li key={e}><button className="btn w-full justify-between text-left" disabled={busy} onClick={() => go('/auth/login', { email: e, password: 'Demo@1234' })}>
                <span><b>{r}</b><span className="block text-xs font-normal text-mute">{d}</span></span><span className="text-xs text-mute">{e}</span></button></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">Suggested path: sign in as Creator, submit a sample, then sign in as Reviewer to decide.</p>
        </div>
      </section>
      <section className="card p-5">
        <div className="mb-4 flex gap-2" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} className={`btn ${mode === 'login' ? 'btn-primary' : ''}`} onClick={() => setMode('login')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'register'} className={`btn ${mode === 'register' ? 'btn-primary' : ''}`} onClick={() => setMode('register')}>Create organisation</button>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mode === 'login' ? go('/auth/login', { email: f.email, password: f.password }) : go('/auth/register-org', f); }}>
          {mode === 'register' && <>
            <div><label className="label" htmlFor="o">Organisation name</label><input id="o" className="input" value={f.orgName} onChange={set('orgName')} required /></div>
            <div><label className="label" htmlFor="n">Your name</label><input id="n" className="input" value={f.name} onChange={set('name')} required /></div>
          </>}
          <div><label className="label" htmlFor="e">Email</label><input id="e" type="email" className="input" value={f.email} onChange={set('email')} required /></div>
          <div><label className="label" htmlFor="p">Password</label><input id="p" type="password" className="input" value={f.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} /></div>
          <ErrorBox msg={err} />
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}</button>
          {mode === 'register' && <p className="text-xs text-mute">You become the Admin of a new, isolated workspace. You can add Creators and Reviewers afterwards.</p>}
        </form>
      </section>
    </div>
  );
}
