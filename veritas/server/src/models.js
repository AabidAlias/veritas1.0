import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const oid = Schema.Types.ObjectId;

export const Org = model('Org', new Schema({ name: { type: String, required: true } }, { timestamps: true }));

export const User = model('User', new Schema({
  orgId: { type: oid, ref: 'Org', required: true, index: true },
  name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'creator', 'reviewer'], required: true },
  department: { type: String, default: '' },
}, { timestamps: true }));

export const KB_TYPES = ['fact', 'guideline', 'preferred_term', 'restricted_term', 'tone'];
export const Knowledge = model('Knowledge', new Schema({
  orgId: { type: oid, required: true, index: true },
  type: { type: String, enum: KB_TYPES, required: true },
  title: { type: String, required: true, maxlength: 200 }, text: { type: String, default: '', maxlength: 2000 },
  variants: [String], validUntil: Date, createdBy: oid,
}, { timestamps: true }));

export const CONTENT_TYPES = ['social_post', 'marketing_copy', 'website', 'advertisement', 'email'];
export const Content = model('Content', new Schema({
  orgId: { type: oid, required: true, index: true },
  title: { type: String, required: true, maxlength: 200 }, type: { type: String, enum: CONTENT_TYPES, default: 'marketing_copy' },
  authorId: oid, authorName: String, department: String,
  status: { type: String, enum: ['in_review', 'changes_requested', 'approved'], default: 'in_review' },
  versionCount: { type: Number, default: 0 }, summary: Schema.Types.Mixed,
}, { timestamps: true }));

export const Version = model('Version', new Schema({
  orgId: { type: oid, required: true, index: true }, contentId: { type: oid, required: true, index: true },
  number: Number, text: String, findings: [Schema.Types.Mixed], meta: Schema.Types.Mixed,
  submittedBy: String,
}, { timestamps: true }));

export const Activity = model('Activity', new Schema({
  orgId: { type: oid, required: true, index: true }, contentId: { type: oid, required: true, index: true },
  versionNo: Number, userName: String, role: String,
  action: { type: String, enum: ['submitted', 'resubmitted', 'comment', 'approved', 'changes_requested', 'finding_accepted', 'finding_dismissed'] },
  note: String,
}, { timestamps: true }));
