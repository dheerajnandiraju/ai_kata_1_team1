import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

async function main() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`[Server] Listening on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
