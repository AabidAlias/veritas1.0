import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorBox } from '../ui.jsx';

export default function Team() {
  const [users, setUsers] = useState([]); const [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'creator', department: '' });
  const load = () => api('/users').then(setUsers).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); setErr(''); try { await api('/users', { method: 'POST', body: f }); setF({ ...f, name: '', email: '', password: '' }); load(); } catch (x) { setErr(x.message); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Team</h1>
      <form onSubmit={add} className="card grid gap-3 p-4 md:grid-cols-3">
        <div><label className="label" htmlFor="a1">Name</label><input id="a1" className="input" value={f.name} onChange={set('name')} required /></div>
        <div><label className="label" htmlFor="a2">Email</label><input id="a2" type="email" className="input" value={f.email} onChange={set('email')} required /></div>
        <div><label className="label" htmlFor="a3">Temporary password (8+ characters)</label><input id="a3" type="password" className="input" value={f.password} onChange={set('password')} minLength={8} required /></div>
        <div><label className="label" htmlFor="a4">Role</label><select id="a4" className="input" value={f.role} onChange={set('role')}><option value="creator">Creator</option><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select></div>
        <div><label className="label" htmlFor="a5">Department (e.g. Marketing, Social Media)</label><input id="a5" className="input" value={f.department} onChange={set('department')} /></div>
        <div className="flex items-end"><button className="btn btn-primary w-full">Add team member</button></div>
        <div className="md:col-span-3"><ErrorBox msg={err} /></div>
      </form>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-rule text-mute"><tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead>
        <tbody>{users.map((u) => <tr key={u._id} className="border-b border-rule last:border-0"><td className="p-3 font-medium">{u.name}</td><td>{u.email}</td><td className="capitalize">{u.role}</td><td>{u.department}</td></tr>)}</tbody></table></div>
    </div>
  );
}
