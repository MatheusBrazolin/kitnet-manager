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

  async function criarImobiliaria(token: string, nome: string) {
    const response = await request(app.getHttpServer())
      .post('/api/imobiliarias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome,
        telefone: '11999990000',
        taxaPadraoTipo: 'PERCENTUAL',
        taxaPadraoValor: 10,
      })
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

  it('impede que o usuário B leia, edite ou apague uma imobiliária do usuário A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imobiliariaId = await criarImobiliaria(tokenA, 'Imobiliária da A');

    await request(app.getHttpServer())
      .get(`/api/imobiliarias/${imobiliariaId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/imobiliarias/${imobiliariaId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ nome: 'Invadida' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/imobiliarias/${imobiliariaId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('não lista para B nenhuma imobiliária cadastrada por A', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    await criarImobiliaria(tokenA, 'Imobiliária da A');

    const resposta = await request(app.getHttpServer())
      .get('/api/imobiliarias')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  // Sem esta checagem bastaria mandar um id qualquer no corpo para vincular a unidade à
  // administradora de outro proprietário — e passar a usar a taxa dele.
  it('impede vincular uma unidade a uma imobiliária de outra conta', async () => {
    const tokenA = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );
    const tokenB = await registrarUsuario(
      'Usuário B',
      `b-${Date.now()}@example.com`,
    );

    const imobiliariaDeA = await criarImobiliaria(tokenA, 'Imobiliária da A');
    const imovelDeB = await criarImovel(tokenB, 'Prédio do B');

    await request(app.getHttpServer())
      .post('/api/kitnets')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        numero: '201',
        valor: 1000,
        imovelId: imovelDeB,
        imobiliariaId: imobiliariaDeA,
      })
      .expect(403);

    const kitnetDeB = await criarKitnet(tokenB, imovelDeB, '202');
    await request(app.getHttpServer())
      .patch(`/api/kitnets/${kitnetDeB}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ imobiliariaId: imobiliariaDeA })
      .expect(403);
  });

  // O perfil é da PESSOA, não da conta de dados: PATCH /perfil só pode mexer em quem está
  // autenticado. Não existe `/perfil/:id` justamente para não haver como apontar para
  // outro usuário — este teste trava as duas pontas (a rota por id e o alvo do PATCH).
  it('impede que o usuário B altere o perfil do usuário A', async () => {
    const emailA = `a-${Date.now()}@example.com`;
    const emailB = `b-${Date.now()}@example.com`;
    const tokenA = await registrarUsuario('Usuária A', emailA);
    const tokenB = await registrarUsuario('Usuário B', emailB);

    const meA = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const idA = (meA.body as { id: number }).id;

    await request(app.getHttpServer())
      .patch(`/api/perfil/${idA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Invadida' })
      .expect(404);

    // Trocar o e-mail exige a senha atual: o e-mail é o login e o único caminho de
    // recuperação da conta, e não há confirmação por link.
    await request(app.getHttpServer())
      .patch('/api/perfil')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ email: emailA })
      .expect(400);

    // B não consegue tomar o e-mail de A para si nem com a própria senha correta.
    await request(app.getHttpServer())
      .patch('/api/perfil')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ email: emailA, senhaAtual: senha })
      .expect(409);

    // E o PATCH que B pode fazer altera apenas o próprio cadastro.
    await request(app.getHttpServer())
      .patch('/api/perfil')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Usuário B Editado' })
      .expect(200);

    const depois = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(depois.body).toMatchObject({
      id: idA,
      name: 'Usuária A',
      email: emailA,
    });
  });

  it('bloqueia excluir uma imobiliária que ainda tem unidades vinculadas', async () => {
    const token = await registrarUsuario(
      'Usuária A',
      `a-${Date.now()}@example.com`,
    );

    const imobiliariaId = await criarImobiliaria(token, 'Imobiliária da A');
    const imovelId = await criarImovel(token, 'Prédio da A');

    await request(app.getHttpServer())
      .post('/api/kitnets')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: '301', valor: 1000, imovelId, imobiliariaId })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/imobiliarias/${imobiliariaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  // Trocar a senha derruba as sessões abertas em outros aparelhos: o JWT é stateless e
  // vale 7 dias, então sem isso um token vazado continuava valendo mesmo depois de a
  // vítima trocar a senha — justamente a ação que ela toma para se proteger.
  it('invalida o token antigo depois que a senha é trocada', async () => {
    const email = `a-${Date.now()}@example.com`;
    const tokenAntigo = await registrarUsuario('Usuária A', email);

    // O token antigo funciona antes da troca.
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenAntigo}`)
      .expect(200);

    // `iat` tem resolução de segundos: sem esperar, o token antigo e o carimbo da troca
    // cairiam no mesmo segundo e o teste passaria por acidente.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(app.getHttpServer())
      .patch('/api/perfil/senha')
      .set('Authorization', `Bearer ${tokenAntigo}`)
      .send({ senhaAtual: senha, novaSenha: 'outraSenha123' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenAntigo}`)
      .expect(401);

    // E a senha nova entra normalmente.
    const relogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'outraSenha123' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${(relogin.body as { token: string }).token}`,
      )
      .expect(200);
  });
});
