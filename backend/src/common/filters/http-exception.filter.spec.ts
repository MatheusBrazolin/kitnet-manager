import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import { HttpExceptionFilter } from './http-exception.filter';
import * as sentry from '../observability/sentry';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let host: { switchToHttp: jest.Mock };
  let captureExceptionSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const request = { method: 'GET', url: '/api/qualquer' };
    host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    captureExceptionSpy = jest
      .spyOn(sentry, 'captureException')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    captureExceptionSpy.mockRestore();
  });

  // Quem erra a senha cinco vezes via "ThrottlerException: Too Many Requests" na tela:
  // nome de classe, em inglês, para uma situação que só pedia "espere um pouco".
  it('traduz o bloqueio por excesso de tentativas', () => {
    filter.catch(new ThrottlerException(), host as never);

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 429,
      message:
        'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
      error: 'Too Many Requests',
    });
  });

  it('formats a known HttpException as { statusCode, message, error } and does not report to Sentry', () => {
    filter.catch(new BadRequestException('dados inválidos'), host as never);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'dados inválidos',
      error: 'Bad Request',
    });
    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });

  it('turns an unexpected error into a generic 500 and reports it to Sentry', () => {
    const boom = new Error('falha inesperada do Prisma');

    filter.catch(boom, host as never);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Erro interno do servidor.',
      error: 'InternalServerError',
    });
    expect(captureExceptionSpy).toHaveBeenCalledWith(boom);
  });

  // Antes, qualquer erro do Prisma caía no 500 genérico: cadastrar duas unidades com o
  // mesmo número respondia "Erro interno do servidor" e ainda ia parar no Sentry como se
  // fosse um bug. Só o módulo de pagamentos tratava P2002 à mão.
  describe('erros conhecidos do Prisma', () => {
    function prismaError(code: string) {
      return new Prisma.PrismaClientKnownRequestError('falhou', {
        code,
        clientVersion: '6.19.3',
      });
    }

    it('mapeia P2002 (unique) para 409 sem reportar ao Sentry', () => {
      filter.catch(prismaError('P2002'), host as never);

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: 'Já existe um registro com esses dados.',
        error: 'Conflict',
      });
      expect(captureExceptionSpy).not.toHaveBeenCalled();
    });

    it('mapeia P2025 (registro ausente) para 404', () => {
      filter.catch(prismaError('P2025'), host as never);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(captureExceptionSpy).not.toHaveBeenCalled();
    });

    it('mapeia P2003 (foreign key) para 400', () => {
      filter.catch(prismaError('P2003'), host as never);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(captureExceptionSpy).not.toHaveBeenCalled();
    });

    it('mantém 500 + Sentry para um código do Prisma que não sabemos traduzir', () => {
      filter.catch(prismaError('P1001'), host as never);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(captureExceptionSpy).toHaveBeenCalled();
    });
  });
});
