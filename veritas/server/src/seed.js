import bcrypt from 'bcryptjs';
import { Org, User, Knowledge } from './models.js';

const PW = 'Demo@1234';
export async function seedDemo() {
  if (await Org.countDocuments()) return;
  const hash = await bcrypt.hash(PW, 10);
  const mk = async (name, users, kb) => {
    const org = await Org.create({ name });
    for (const [n, e, role, dep] of users) await User.create({ orgId: org._id, name: n, email: e, passwordHash: hash, role, department: dep });
    await Knowledge.insertMany(kb.map((k) => ({ ...k, orgId: org._id })));
  };
  await mk('Veritas Demo Co', [
    ['Asha Admin', 'admin@demo.com', 'admin', 'Brand'], ['Chris Creator', 'creator@demo.com', 'creator', 'Marketing'],
    ['Sam Social', 'social@demo.com', 'creator', 'Social Media'], ['Riya Reviewer', 'reviewer@demo.com', 'reviewer', 'Communications'],
  ], [
    { type: 'fact', title: 'Registered organisations', text: 'The platform currently supports 500 registered organisations.' },
    { type: 'fact', title: 'Languages', text: 'Reviews are currently available in English only.' },
    { type: 'fact', title: 'Pro plan price (expired)', text: 'The Pro plan costs $49 per month.', validUntil: new Date('2026-01-01') },
    { type: 'guideline', title: 'Comparative claims', text: 'Do not claim rankings or superlatives such as No.1 or best without an approved source.' },
    { type: 'preferred_term', title: 'Brand Governance Platform', text: 'Always call the product the Brand Governance Platform.', variants: ['brand checker', 'content police', 'brand management tool'] },
    { type: 'restricted_term', title: 'guaranteed results', text: 'Guarantees are not approved by Legal.' },
    { type: 'tone', title: 'Brand tone', text: 'Professional, clear and trustworthy. Avoid slang and exaggeration.' },
  ]);
  await mk('Rival Corp (isolation demo)', [['Rita Rival', 'admin@rival.com', 'admin', 'Brand']], [
    { type: 'fact', title: 'Customers', text: 'Rival Corp serves 12 customers.' },
  ]);
  console.log('Seeded demo data. Demo password for all demo users:', PW);
}
