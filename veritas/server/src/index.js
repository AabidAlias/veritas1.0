import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import routes from './routes.js';
import { seedDemo } from './seed.js';

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is required'); process.exit(1); }
const app = express();
app.use(cors()); app.use(express.json({ limit: '200kb' }));
app.use('/api', routes);

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html'))); }

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veritas');
if (process.env.SEED_DEMO !== 'false') await seedDemo();
app.listen(process.env.PORT || 4000, () => console.log('Veritas running on', process.env.PORT || 4000));
