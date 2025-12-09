// backend/src/server.ts
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const port = env.PORT;

app.listen(port, () => {
  console.log(`🚀 KillSwitch SaaS backend listening at http://localhost:${port}`);
});
