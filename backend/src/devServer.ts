import express from 'express';
import cors from 'cors';
import symplaRoutes from './routes/symplaRoutes';
import fs from 'fs';
import path from 'path';

// Carrega .env localmente em desenvolvimento
try {
  const possiblePaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    path.resolve(process.cwd(), '.env')
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
          const val = values.join('=').trim();
          if (val) process.env[key.trim()] = val;
        }
      });
      break;
    }
  }
} catch (e) {}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/sympla', symplaRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend local rodando em http://localhost:${PORT}`);
});
