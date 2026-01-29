import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CopilotKitModule } from './copilotkit/copilotkit.module';
import { EnvironmentVariables } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Validate environment variables on application startup
 * Throws error if required variables are missing or invalid
 */
function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}

@Module({
  imports: [
    // Global configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],  // Load .env.local first, fallback to .env
      validate,
    }),
    // CopilotKit integration
    CopilotKitModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule { }
