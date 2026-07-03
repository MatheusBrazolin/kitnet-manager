import type { Express } from 'express';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;

// Runtime tradicional (local, Docker, VPS): sobe o servidor HTTP escutando numa porta.
async function bootstrap() {
  const app = await createApp();
  await app.listen(PORT);
}

if (!process.env.VERCEL) {
  void bootstrap();
}

// Runtime serverless (Vercel): exporta um handler Express reaproveitado entre
// invocações. O NestJS é inicializado uma única vez por instância (cold start)
// e reutilizado nas chamadas seguintes.
let cachedServer: Express | undefined;

async function getServer(): Promise<Express> {
  if (!cachedServer) {
    const app = await createApp();
    const instance = app.getHttpAdapter().getInstance() as Express;
    // Vercel encaminha as requisições atrás de um proxy.
    instance.set('trust proxy', 1);
    await app.init();
    cachedServer = instance;
  }
  return cachedServer;
}

export default async function handler(req: unknown, res: unknown) {
  const server = await getServer();
  (server as (req: unknown, res: unknown) => void)(req, res);
}
