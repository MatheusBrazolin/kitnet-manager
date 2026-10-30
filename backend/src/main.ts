import './common/observability/instrument';
import { createApp } from './app';
import { normalizarDatabaseUrlNoAmbiente } from './config/normalizar-database-url';

// Antes de qualquer módulo subir: o Prisma lê process.env.DATABASE_URL na
// construção do client, então a limpeza precisa acontecer antes disso.
if (normalizarDatabaseUrlNoAmbiente()) {
  // Sem o valor, que contém a senha — só o aviso de que havia lixo em volta.
  console.warn(
    '[config] DATABASE_URL tinha espaços, aspas ou <> em volta; corrigido ao subir.',
  );
}

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
