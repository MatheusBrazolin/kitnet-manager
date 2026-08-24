import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Filtro global: padroniza toda resposta de erro no formato
// { statusCode, message, error }, independente de vir de um HttpException
// (validação, guards, etc.) ou de um erro não tratado (bug, exceção do Prisma).
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.resolve(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}`);
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    body: ErrorResponseBody;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode,
          body: { statusCode, message: response, error: exception.name },
        };
      }

      const responseObject = response as Record<string, unknown>;
      const message =
        (responseObject.message as string | string[] | undefined) ??
        exception.message;
      const error =
        (responseObject.error as string | undefined) ?? exception.name;

      return { statusCode, body: { statusCode, message, error } };
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      statusCode,
      body: {
        statusCode,
        message: 'Erro interno do servidor.',
        error: 'InternalServerError',
      },
    };
  }
}
