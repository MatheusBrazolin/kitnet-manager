import './common/observability/instrument';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;

// Local, Docker/VPS e Vercel (services, entrypoint zero-config) sobem todos
// da mesma forma: um servidor HTTP escutando numa porta. Na Vercel, o
// runtime dos services intercepta o listen() e roteia as requisições para
// a função por trás dos panos.
async function bootstrap() {
  const app = await createApp();
  if (process.env.VERCEL) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  await app.listen(PORT);
}

void bootstrap();
