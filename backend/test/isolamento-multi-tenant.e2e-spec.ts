import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp } from './../src/app';

/**
 * Garante que os dados de uma conta nunca ficam visíveis/editáveis por outra conta —
 * a regra de negócio mais sensível do projeto (SaaS multi-tenant). Usa o app real
 * (rotas + guards + services + Prisma) contra um banco de teste de verdade, em vez
 * de mocks: é o único jeito de pegar um `findMany` sem `where` ou uma rota sem guard.
 */
describe('Isolamento multi-tenant (e2e)', () => {
  let app: INestApplication<App>;

  const senha = 'senha123456';

  async function registrarUsuario(nome: string, email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: nome, email, password: senha })
      .expect(201);
    return (response.body as { token: string }).token;
  }

  async function criarImovel(token: string, nome: string) {
    const response = await request(app.getHttpServer())
      .post('/api/imoveis')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome })
      .expect(201);
    return (response.body as { id: number }).id;
  }

  async function criarKitnet(token: string, imovelId: number, numero: string) {
    const response = await request(app.getHttpServer())
      .post('/api/kitnets')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero, valor: 900, imovelId })
      .expect(201);
    return (response.body as { id: number }).id;
  }

  beforeEach(async () => {
    app = await createApp();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('impede que o usuário B leia uma kitnet do usuário A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imovelId = await criarImovel(tokenA, 'Prédio da A');
    const kitnetId = await criarKitnet(tokenA, imovelId, '101');

    await request(app.getHttpServer())
      .get(`/api/kitnets/${kitnetId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('impede que o usuário B edite ou apague uma kitnet do usuário A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imovelId = await criarImovel(tokenA, 'Prédio da A');
    const kitnetId = await criarKitnet(tokenA, imovelId, '102');

    await request(app.getHttpServer())
      .patch(`/api/kitnets/${kitnetId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ valor: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/kitnets/${kitnetId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('impede que o usuário B crie uma kitnet dentro de um imóvel do usuário A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imovelId = await criarImovel(tokenA, 'Prédio da A');

    await request(app.getHttpServer())
      .post('/api/kitnets')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ numero: '999', valor: 100, imovelId })
      .expect(403);
  });

  it('a listagem de kitnets do usuário B nunca inclui kitnets do usuário A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imovelIdA = await criarImovel(tokenA, 'Prédio da A');
    await criarKitnet(tokenA, imovelIdA, '201');

    const imovelIdB = await criarImovel(tokenB, 'Prédio da B');
    const kitnetIdB = await criarKitnet(tokenB, imovelIdB, '301');

    const response = await request(app.getHttpServer())
      .get('/api/kitnets')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const kitnets = response.body as Array<{ id: number }>;
    expect(kitnets).toHaveLength(1);
    expect(kitnets[0].id).toBe(kitnetIdB);
  });
});
