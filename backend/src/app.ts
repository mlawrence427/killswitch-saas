// backend/src/app.ts
import express, { json } from 'express';
import { env } from './config/env';
import { securityRouter } from './modules/security/security.routes';

export function createApp() {
  const app = express();

  app.use(json());

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Security / Kill Switch API
  app.use('/api/security', securityRouter);

  // Simple 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  return app;
}

