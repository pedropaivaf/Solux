import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { soluxRoutes } from './dist-server/routes/solux.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota da API
app.use('/api', soluxRoutes);

// Servir o Frontend (build de produção)
const frontendPath = path.resolve(__dirname, 'dist');
app.use(express.static(frontendPath));

// Rota Catch-all para servir o index.html em qualquer outra requisição
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});