import { NestFactory } from '@nestjs/core';
import { AppModule } from './App/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Comma-separated list of allowed frontend origins.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: corsOrigins });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}/graphql`);
}

bootstrap();