import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp } from './../src/app';
import { limparUsuariosCriados } from './usuarios-criados';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
    await app.init();
  });

  it('rejects unauthenticated access to protected routes', () => {
    return request(app.getHttpServer()).get('/api/kitnets').expect(401);
  });

  it('rejects login with malformed payload', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });

  // Hoje nenhum teste daqui cadastra nada, então isto não apaga nada — fica como rede
  // de proteção para o dia em que um teste novo precisar de uma conta de verdade.
  afterAll(limparUsuariosCriados);
});
