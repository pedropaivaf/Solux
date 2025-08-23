import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { soluxRoutes } from './dist-server/routes/solux.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const SERVE_FRONT = process.env.SERVE_FRONT === '1' || IS_PROD; // controle opcional por env

app.set('trust proxy', 1);
app.use(cors({ origin: ['http://localhost:5173'], credentials: false }));
app.use(express.json());

// API primeiro
app.use('/api', soluxRoutes);

// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now(), env: process.env.NODE_ENV || 'dev' }));

// === Só sirva o front quando for produção (ou se SERVE_FRONT=1) ===
if (SERVE_FRONT) {
  const frontendPath = path.resolve(__dirname, 'dist');
  app.use(express.static(frontendPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.originalUrl.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Em dev, deixe claro que aqui é só API
  app.get('/', (_req, res) => res.json({ ok: true, api: 'Solux API', tip: 'Front em http://localhost:5173' }));
}

// Erros
process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, error: err?.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`🚀 API em http://localhost:${PORT}  (front ${SERVE_FRONT ? 'servindo via /dist' : 'no Vite 5173'})`);
});
