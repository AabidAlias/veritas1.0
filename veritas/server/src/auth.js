import jwt from 'jsonwebtoken';
export const sign = (u) => jwt.sign({ id: String(u._id), orgId: String(u.orgId), role: u.role, name: u.name, department: u.department }, process.env.JWT_SECRET, { expiresIn: '12h' });
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  try { req.user = jwt.verify(h.replace(/^Bearer /, ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Please sign in again.' }); }
}
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Your role cannot do this.' });

// Tiny in-memory limiter for the expensive AI endpoint.
const hits = new Map();
export const limit = (max, ms) => (req, res, next) => {
  const k = req.user.id, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < ms);
  if (arr.length >= max) return res.status(429).json({ error: 'Too many reviews in a short time. Wait a minute and try again.' });
  arr.push(now); hits.set(k, arr); next();
};
