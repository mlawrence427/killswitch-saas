// backend/src/app.ts
import express, { json } from 'express';
import { env } from './config/env';

export function createApp() {
  const app = express();
  app.use(json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // TODO: later — mount security routes, webhook routes, etc.

  return app;
}
