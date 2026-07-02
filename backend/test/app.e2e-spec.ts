import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  it('rejects unauthenticated access to protected routes', () => {
    return request(app.getHttpServer()).get('/kitnets').expect(401);
  });

  it('rejects login with malformed payload', () => {
    return request(app.getHttpServer()).post('/auth/login').send({ email: 'not-an-email' }).expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
