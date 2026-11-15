# Veritas: evidence before verdict

AI-assisted brand governance. Organisations store approved brand knowledge; creators submit text; Veritas reviews it against that knowledge, shows evidence for every finding, and a human reviewer makes the final decision.

**Flow:** Submitted content > rule checks + retrieval of approved facts > Gemini returns structured findings > **Grounding Validator (code)** verifies every cited quote exists in the stored source > findings with evidence > suggested correction > human approve / request changes > revision history.

## Run locally
Requires Node 18+ and MongoDB (local or Atlas).
```
npm run install:all
cp server/.env.example server/.env     # set JWT_SECRET, MONGODB_URI, GEMINI_API_KEY
npm run dev:server                     # http://localhost:4000 (seeds demo data on first start)
npm run dev:client                     # http://localhost:5173
npm test                               # unit tests for the validator and rules
```
Production (single service): `npm run install:all && npm run build && npm start` (Express serves the built client).

## Deploy (e.g. Render + MongoDB Atlas)
Build command `npm run install:all && npm run build`, start command `npm start`. Env vars: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, optional `GEMINI_MODEL`. Keys stay server-side only.

## Demo accounts (seeded, password `Demo@1234`)
| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Creator (Marketing) | creator@demo.com |
| Creator (Social Media) | social@demo.com |
| Reviewer | reviewer@demo.com |
| Other organisation (isolation check) | admin@rival.com |

The login page has one-click buttons for the first three. The Submit page has sample texts.

## Features completed
Organisation workspaces with isolated data (every record carries `orgId`, enforced from the signed token) · Admin / Creator / Reviewer roles with departments · Brand Knowledge Hub (facts with optional expiry, guidelines, preferred and restricted terminology, tone) · text submission · rule checks (terminology) · AI claim review · verdicts: Supported, Contradicted, Outdated, Not found, Needs human judgment, plus Rule violation · evidence-linked findings with verified quotes · correction suggestions (apply to draft) · human approve / request changes with notes · finding accept / dismiss · comments · version history with per-version findings · basic governance insights (terminology drift, repeated "Not found" claims, often-dismissed rules).

## Architecture and decisions
- **React + Vite + Tailwind** client; **Node + Express** single service; **MongoDB** (Mongoose). No queue or extra services: a review is one request (about 5 to 20 seconds).
- **Retrieval:** keyword overlap over approved facts; guidelines, terms and tone are always included. Embeddings are planned for Round 3.
- **Grounding Validator** (`server/src/lib/validator.js`): the AI's claim must exist in the content and its quote must exist in the cited stored source, otherwise the finding is downgraded to "Needs human judgment" and shown without evidence. A "Not found" with a closely related approved fact is escalated to a human instead of being asserted.
- **Never "false" by default:** "Not found" means no approved source covers the claim.
- **Reliability:** 30 s timeout, one retry, model fallback, JSON parsing guard, rules-only fallback if the AI is down, input limits, per-user review rate limit.
- **Prompt-injection stance:** content is passed as delimited untrusted data; output is JSON only and every field is validated; the model has no tools.

## APIs, models, libraries, data
Google Gemini API (`generateContent`; model from `GEMINI_MODEL`, default tries gemini-3.1-flash-lite, then gemini-2.5-flash, gemini-2.5-flash-lite). Libraries: express, mongoose, jsonwebtoken, bcryptjs, cors, dotenv, react, react-router-dom, vite, tailwindcss. Fonts: IBM Plex via Google Fonts. Data: only a fictional demo brand kit seeded in `server/src/seed.js`. Content text is sent to Google Gemini for review; users are told on the submit page.

## Changes from the Round 1 proposal
- Review pipeline is one structured LLM call (claim extraction and verification together) instead of two, for reliability inside the time limit.
- PDF/DOCX upload, embeddings, and static-image checks moved to Round 3 (text-first MVP).
- "Improvement 3: Usability" replaced with substantial work (below).

## Round 3 improvements (committed)
1. **Measured reliability:** labelled test set (fictional brand kit, 80 to 120 snippets), precision/recall per category, hybrid keyword + embedding retrieval, baselines and a validator ablation, with results reported as measured.
2. **Full Guideline Gap Insights:** drafted clarifications for the Admin (proposed wording, example findings), and accepting one creates a new versioned guideline.
3. **Document ingestion and accessibility:** PDF/DOCX upload with text extraction, plus accessibility checks (alt text, heading order, link text, readability).

## Honest limits
Keyword retrieval can miss paraphrased facts (escalated to a human, not asserted). No external accuracy figures are claimed yet. Demo password is for the seeded demo only.

## Testing
`npm test` covers the Grounding Validator (verified, fabricated and missing citations; not-found escalation; expiry) and terminology rules. Structured user feedback: add notes here after testers try the demo.

## My role (fill in)
`Role:` Solo full-stack developer: I planned, designed, built, tested and deployed Veritas on my own.
`Part I built:` The whole platform: React interface, Node/Express API, MongoDB data layer, Gemini AI review pipeline and the evidence validator.
