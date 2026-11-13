import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Contents from './pages/Contents.jsx';
import Submit from './pages/Submit.jsx';
import Review from './pages/Review.jsx';
import Knowledge from './pages/Knowledge.jsx';
import Team from './pages/Team.jsx';
import Insights from './pages/Insights.jsx';

export const Auth = createContext(null);
export const useAuth = () => useContext(Auth);

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const login = (res) => { localStorage.setItem('token', res.token); setUser(res.user); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  if (!ready) return <p className="p-8 text-mute">Loading…</p>;
  if (!user) return <Auth.Provider value={{ login }}><Login /></Auth.Provider>;
  return (
    <Auth.Provider value={{ user, logout }}>
      <Shell>
        <Routes>
          <Route path="/" element={<Contents />} />
          <Route path="/new" element={user.role === 'reviewer' ? <Navigate to="/" /> : <Submit />} />
          <Route path="/content/:id" element={<Review />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/team" element={user.role === 'admin' ? <Team /> : <Navigate to="/" />} />
          <Route path="/insights" element={user.role === 'creator' ? <Navigate to="/" /> : <Insights />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Shell>
    </Auth.Provider>
  );
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const link = ({ isActive }) => `px-3 py-2 text-sm rounded ${isActive ? 'bg-seal text-white' : 'hover:bg-paper'}`;
  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
          <span className="mr-4 font-serif text-xl font-semibold text-seal">Veritas</span>
          <nav className="flex flex-wrap gap-1" aria-label="Main">
            <NavLink to="/" end className={link}>Content</NavLink>
            {user.role !== 'reviewer' && <NavLink to="/new" className={link}>Submit content</NavLink>}
            <NavLink to="/knowledge" className={link}>Brand knowledge</NavLink>
            {user.role !== 'creator' && <NavLink to="/insights" className={link}>Insights</NavLink>}
            {user.role === 'admin' && <NavLink to="/team" className={link}>Team</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-mute">{user.orgName} · {user.name} ({user.role}{user.department ? `, ${user.department}` : ''})</span>
            <button className="btn" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
