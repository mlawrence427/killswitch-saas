// backend/src/server.ts
import { createApp } from './app';
import { env } from './config/env';
import { bootstrapSecurityLayer } from './modules/security/security.service';

async function main() {
  // Ensure core security tables / rows exist before we start listening
  await bootstrapSecurityLayer();

  const app = createApp();
  const port = env.PORT || 4000;

  app.listen(port, () => {
    console.log(`🛡 KillSwitch SaaS backend listening at http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Fatal error during startup', err);
  process.exit(1);
});



