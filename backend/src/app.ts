import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

export async function createApp(
  expressInstance?: Parameters<typeof NestFactory.create>[1],
) {
  const app = expressInstance
    ? await NestFactory.create<NestExpressApplication>(
        AppModule,
        expressInstance,
        { bufferLogs: true },
      )
    : await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
      });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
