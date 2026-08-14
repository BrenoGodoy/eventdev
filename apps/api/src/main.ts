import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOrigins, validateEnvironment } from './config/environment';

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(message, undefined, 'Bootstrap');
  process.exitCode = 1;
});
