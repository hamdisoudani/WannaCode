import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    bodyParser: true, // Enable body parser
  });

  // Increase body size limit for large payloads (file contents, long conversations)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for Tauri app (localhost during dev)
  app.enableCors({
    origin: true, // Allow all origins in dev; restrict in production
    credentials: true,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for extra properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  // Graceful shutdown handlers
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, closing server gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, closing server gracefully...');
    await app.close();
    process.exit(0);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - let the global exception filter handle it
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);

  logger.log(`\n🚀 CodeSurf Runtime Server running on port ${port}`);
  logger.log(`📡 CopilotKit endpoint: http://localhost:${port}/copilotkit\n`);
}

bootstrap();
