import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessHttp from 'serverless-http';
import { createApp } from './app';

type ServerlessHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

let handlerPromise: Promise<ServerlessHandler> | undefined;

async function bootstrap(): Promise<ServerlessHandler> {
  const expressInstance = express();
  const app = await createApp(new ExpressAdapter(expressInstance));
  await app.init();
  return serverlessHttp(expressInstance) as unknown as ServerlessHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handlerPromise) {
    handlerPromise = bootstrap();
  }
  const serverlessHandler = await handlerPromise;
  return serverlessHandler(req, res);
}
