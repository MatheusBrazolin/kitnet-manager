import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /** Corpo que o filtro mandou pro response, já tipado. */
  function corpoEnviado(): Record<string, unknown> {
    const [primeiraChamada] = response.json.mock.calls as Array<
      [Record<string, unknown>]
    >;
    return primeiraChamada[0];
  }

  // O /health responde 503 com `database` e `causa`. Antes o filtro achatava
  // tudo em { statusCode, message, error } e o diagnóstico sumia justamente
  // durante uma pane, que é quando ele serve pra alguma coisa.
  it('preserva campos que o controller colocou de propósito no corpo', () => {
    filter.catch(
      new HttpException(
        { status: 'error', database: 'down', causa: 'P1001' },
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
      host as never,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    const corpo = corpoEnviado();
    expect(corpo.database).toBe('down');
    expect(corpo.causa).toBe('P1001');
    expect(corpo.statusCode).toBe(503);
  });

  it('não deixa o corpo da exceção sobrescrever o statusCode real', () => {
    filter.catch(
      new HttpException(
        { statusCode: 200, detalhe: 'x' },
        HttpStatus.BAD_GATEWAY,
      ),
      host as never,
    );

    const corpo = corpoEnviado();
    expect(corpo.statusCode).toBe(502);
    expect(corpo.detalhe).toBe('x');
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
