// backend/src/app.ts
import express, { json } from 'express';

import { securityRouter } from './modules/security/security.routes';
import { enforcementRouter } from './modules/enforcement/enforcement.routes';

export function createApp() {
  const app = express();

  app.use(json());

  // Basic health check
  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Security / Kill Switch controls
  app.use('/api/security', securityRouter);

  // Enforcement engine (THIS IS THE PRODUCT)
  app.use('/api/enforcement', enforcementRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  return app;
}



