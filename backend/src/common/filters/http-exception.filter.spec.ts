import { BadRequestException } from '@nestjs/common';
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
});
