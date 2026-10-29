import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { captureException } from '../observability/sentry';

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
      // Só erro inesperado (5xx) vai pro Sentry — validação/negócio (4xx) é
      // ruído esperado do dia a dia, não uma falha da aplicação.
      captureException(exception);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}`);
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    body: ErrorResponseBody;
  } {
    // O ThrottlerException chega aqui com "ThrottlerException: Too Many Requests" no
    // corpo, e isso ia direto para a tela: quem erra a senha cinco vezes via um nome de
    // classe em inglês em vez de saber que era só esperar. Vem antes do ramo genérico de
    // HttpException porque é dele que a mensagem crua sairia.
    if (exception instanceof ThrottlerException) {
      const statusCode = HttpStatus.TOO_MANY_REQUESTS;
      return {
        statusCode,
        body: {
          statusCode,
          message:
            'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
          error: 'Too Many Requests',
        },
      };
    }

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

    // Erros conhecidos do Prisma são falha de uso, não bug: virar 500 aqui escondia a
    // causa do usuário ("Erro interno do servidor") e ainda enchia o Sentry de ruído.
    // Só os módulos que tratavam P2002 à mão escapavam disso — agora vale para todos.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapeado = this.mapPrismaError(exception);
      if (mapeado) {
        return mapeado;
      }
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

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    body: ErrorResponseBody;
  } | null {
    switch (exception.code) {
      // Violação de unique — ex.: cadastrar duas unidades com o mesmo número no mesmo
      // imóvel, ou dois registros simultâneos com o mesmo e-mail.
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          body: {
            statusCode: HttpStatus.CONFLICT,
            message: 'Já existe um registro com esses dados.',
            error: 'Conflict',
          },
        };
      // Registro exigido pela operação não existe (update/delete de id inexistente).
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          body: {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Registro não encontrado.',
            error: 'Not Found',
          },
        };
      // Violação de foreign key — ex.: apontar para um imóvel que não existe.
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          body: {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Referência inválida: o registro relacionado não existe.',
            error: 'Bad Request',
          },
        };
      default:
        return null;
    }
  }
}
