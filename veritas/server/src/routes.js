import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Org, User, Knowledge, Content, Version, Activity, KB_TYPES, CONTENT_TYPES } from './models.js';
import { sign, requireAuth, requireRole, limit } from './auth.js';
import { runReview, summarise } from './lib/review.js';

const r = Router();
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Something went wrong on the server.' }); });
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ROLES = ['admin', 'creator', 'reviewer'];

// ---------- auth ----------
r.post('/auth/register-org', wrap(async (req, res) => {
  const { orgName, name, email, password } = req.body || {};
  if (!str(orgName, 100) || !str(name, 100) || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8) return bad(res, 'Enter an organisation name, your name, a valid email and a password of 8+ characters.');
  if (await User.findOne({ email: email.toLowerCase() })) return bad(res, 'That email is already registered.', 409);
  const org = await Org.create({ name: str(orgName, 100) });
  const u = await User.create({ orgId: org._id, name: str(name, 100), email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  res.json({ token: sign(u), user: pub(u, org) });
}));
r.post('/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: String(req.body?.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(String(req.body?.password || ''), u.passwordHash))) return bad(res, 'Wrong email or password.', 401);
  res.json({ token: sign(u), user: pub(u, await Org.findById(u.orgId)) });
}));
const pub = (u, org) => ({ id: u._id, name: u.name, email: u.email, role: u.role, department: u.department, orgName: org?.name });
r.get('/me', requireAuth, wrap(async (req, res) => {
  const u = await User.findOne({ _id: req.user.id, orgId: req.user.orgId });
  if (!u) return bad(res, 'Account not found.', 401);
  res.json(pub(u, await Org.findById(u.orgId)));
}));
r.get('/health', (_q, res) => res.json({ ok: true, ai: !!process.env.GEMINI_API_KEY }));

// ---------- team (admin) ----------
r.get('/users', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  res.json(await User.find({ orgId: req.user.orgId }).select('-passwordHash').sort('createdAt'));
}));
r.post('/users', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const { name, email, password, role, department } = req.body || {};
  if (!str(name, 100) || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8 || !ROLES.includes(role)) return bad(res, 'Enter a name, valid email, role and a password of 8+ characters.');
  if (await User.findOne({ email: email.toLowerCase() })) return bad(res, 'That email is already registered.', 409);
  const u = await User.create({ orgId: req.user.orgId, name: str(name, 100), email, passwordHash: await bcrypt.hash(password, 10), role, department: str(department, 60) });
  res.json(pub(u));
}));

// ---------- brand knowledge ----------
r.get('/knowledge', requireAuth, wrap(async (req, res) => res.json(await Knowledge.find({ orgId: req.user.orgId }).sort('type title'))));
const kbBody = (b) => {
  const out = { type: b.type, title: str(b.title, 200), text: str(b.text, 2000),
    variants: Array.isArray(b.variants) ? b.variants.map((v) => str(v, 100)).filter(Boolean).slice(0, 20) : [],
    validUntil: b.validUntil ? new Date(b.validUntil) : undefined };
  if (!KB_TYPES.includes(out.type) || !out.title) return null;
  if (out.type !== 'restricted_term' && out.type !== 'preferred_term' && !out.text) return null;
  return out;
};
r.post('/knowledge', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const b = kbBody(req.body || {}); if (!b) return bad(res, 'Choose a type and fill in the title and text.');
  res.json(await Knowledge.create({ ...b, orgId: req.user.orgId, createdBy: req.user.id }));
}));
r.put('/knowledge/:id', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const b = kbBody(req.body || {}); if (!b) return bad(res, 'Choose a type and fill in the title and text.');
  const k = await Knowledge.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, b, { new: true });
  k ? res.json(k) : bad(res, 'Not found.', 404);
}));
r.delete('/knowledge/:id', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const k = await Knowledge.findOneAndDelete({ _id: req.params.id, orgId: req.user.orgId });
  k ? res.json({ ok: true }) : bad(res, 'Not found.', 404);
}));

// ---------- content + review ----------
const canSee = (req, c) => req.user.role !== 'creator' || String(c.authorId) === req.user.id;
const log = (req, contentId, action, note, versionNo) => Activity.create({ orgId: req.user.orgId, contentId, versionNo, userName: req.user.name, role: req.user.role, action, note: str(note, 1000) });

async function reviewInto(req, content, text, action) {
  const items = await Knowledge.find({ orgId: req.user.orgId }).lean();
  const { findings, meta } = await runReview(text, items);
  const number = content.versionCount + 1;
  await Version.create({ orgId: req.user.orgId, contentId: content._id, number, text, findings, meta, submittedBy: req.user.name });
  content.versionCount = number; content.summary = summarise(findings); content.status = 'in_review';
  await content.save();
  await log(req, content._id, action, '', number);
  return { findings, meta };
}

r.post('/content', requireAuth, requireRole('creator', 'admin'), limit(10, 60000), wrap(async (req, res) => {
  const title = str(req.body?.title, 200), text = str(req.body?.text, 6000);
  if (!title || !text) return bad(res, 'Add a title and the content to review.');
  const c = await Content.create({ orgId: req.user.orgId, title, type: CONTENT_TYPES.includes(req.body.type) ? req.body.type : 'marketing_copy', authorId: req.user.id, authorName: req.user.name, department: req.user.department });
  const out = await reviewInto(req, c, text, 'submitted');
  res.json({ id: c._id, ...out });
}));
r.post('/content/:id/resubmit', requireAuth, requireRole('creator', 'admin'), limit(10, 60000), wrap(async (req, res) => {
  const c = await Content.findOne({ _id: req.params.id, orgId: req.user.orgId });
  if (!c || !canSee(req, c)) return bad(res, 'Not found.', 404);
  if (c.status === 'approved') return bad(res, 'Approved content is locked. Submit it as new content to change it.', 409);
  const text = str(req.body?.text, 6000); if (!text) return bad(res, 'The content cannot be empty.');
  res.json(await reviewInto(req, c, text, 'resubmitted'));
}));
r.get('/content', requireAuth, wrap(async (req, res) => {
  const q = { orgId: req.user.orgId }; if (req.user.role === 'creator') q.authorId = req.user.id;
  res.json(await Content.find(q).sort('-updatedAt').limit(200));
}));
r.get('/content/:id', requireAuth, wrap(async (req, res) => {
  const c = await Content.findOne({ _id: req.params.id, orgId: req.user.orgId });
  if (!c || !canSee(req, c)) return bad(res, 'Not found.', 404);
  const [versions, activity] = await Promise.all([Version.find({ contentId: c._id, orgId: req.user.orgId }).sort('number'), Activity.find({ contentId: c._id, orgId: req.user.orgId }).sort('createdAt')]);
  res.json({ content: c, versions, activity });
}));
r.post('/content/:id/comments', requireAuth, wrap(async (req, res) => {
  const c = await Content.findOne({ _id: req.params.id, orgId: req.user.orgId });
  if (!c || !canSee(req, c)) return bad(res, 'Not found.', 404);
  const note = str(req.body?.note, 1000); if (!note) return bad(res, 'Write a comment first.');
  await log(req, c._id, 'comment', note, c.versionCount); res.json({ ok: true });
}));
r.post('/content/:id/versions/:n/findings/:fid', requireAuth, requireRole('reviewer', 'admin'), wrap(async (req, res) => {
  const decision = req.body?.decision; if (!['accepted', 'dismissed', 'open'].includes(decision)) return bad(res, 'Invalid decision.');
  const v = await Version.findOne({ contentId: req.params.id, orgId: req.user.orgId, number: Number(req.params.n) });
  const f = v?.findings.find((x) => x.id === req.params.fid); if (!f) return bad(res, 'Not found.', 404);
  f.decision = decision; v.markModified('findings'); await v.save();
  if (decision !== 'open') await log(req, v.contentId, decision === 'accepted' ? 'finding_accepted' : 'finding_dismissed', `${f.verdict}: ${f.claim}`, v.number);
  res.json({ ok: true });
}));
r.post('/content/:id/decision', requireAuth, requireRole('reviewer', 'admin'), wrap(async (req, res) => {
  const c = await Content.findOne({ _id: req.params.id, orgId: req.user.orgId }); if (!c) return bad(res, 'Not found.', 404);
  const action = req.body?.action, note = str(req.body?.note, 1000);
  if (!['approve', 'request_changes'].includes(action)) return bad(res, 'Invalid action.');
  if (c.status === 'approved') return bad(res, 'Already approved.', 409);
  const v = await Version.findOne({ contentId: c._id, number: c.versionCount });
  const openContra = v.findings.filter((f) => f.verdict === 'contradicted' && f.decision === 'open').length;
  if (action === 'request_changes' && !note) return bad(res, 'Tell the creator what to change.');
  if (action === 'approve' && openContra && !note) return bad(res, `${openContra} contradicted finding(s) are still open. Add a note explaining why you are approving anyway.`);
  c.status = action === 'approve' ? 'approved' : 'changes_requested'; await c.save();
  await log(req, c._id, action === 'approve' ? 'approved' : 'changes_requested', note, c.versionCount);
  res.json({ status: c.status });
}));

// ---------- insights (basic Guideline Gap signals) ----------
r.get('/insights', requireAuth, requireRole('admin', 'reviewer'), wrap(async (req, res) => {
  const vers = await Version.find({ orgId: req.user.orgId }).lean();
  const byVerdict = {}, byCategory = {}, notFound = {}, terms = {}, dismissed = {}, seen = {};
  const latest = new Map(); vers.forEach((v) => { const k = String(v.contentId); if (!latest.has(k) || latest.get(k).number < v.number) latest.set(k, v); });
  for (const v of vers) for (const f of v.findings) {
    byVerdict[f.verdict] = (byVerdict[f.verdict] || 0) + 1; byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    const key = String(f.claim).toLowerCase().trim();
    if (f.verdict === 'not_found') notFound[key] = (notFound[key] || 0) + 1;
    if (f.category === 'terminology') terms[key] = (terms[key] || 0) + 1;
    if (f.sourceId) { seen[f.sourceId] = (seen[f.sourceId] || 0) + 1; if (f.decision === 'dismissed') dismissed[f.sourceId] = { n: (dismissed[f.sourceId]?.n || 0) + 1, title: f.sourceTitle }; }
  }
  const gaps = [];
  Object.entries(terms).filter(([, n]) => n >= 2).forEach(([t, n]) => gaps.push({ type: 'terminology_drift', count: n, message: `"${t}" keeps appearing instead of the approved term. Consider making the official terminology more visible.` }));
  Object.entries(notFound).filter(([, n]) => n >= 2).forEach(([t, n]) => gaps.push({ type: 'orphan_claim', count: n, message: `The claim "${t}" is repeatedly submitted with no approved source. Consider approving a fact or adding a claims rule.` }));
  Object.values(dismissed).filter((d) => d.n >= 2).forEach((d) => gaps.push({ type: 'high_dismissal', count: d.n, message: `Findings from "${d.title}" are often dismissed by reviewers. The rule may be unclear or too strict.` }));
  res.json({ contents: latest.size, versions: vers.length, byVerdict, byCategory, gaps });
}));

export default r;
