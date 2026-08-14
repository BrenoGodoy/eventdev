import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createApplication } from './application';

async function bootstrap() {
  const app = await createApplication();
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(message, undefined, 'Bootstrap');
  process.exitCode = 1;
});
