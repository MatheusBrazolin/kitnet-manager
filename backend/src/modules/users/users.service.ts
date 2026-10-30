import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      // Só a marca de data da foto, nunca os bytes: esta consulta roda a cada
      // requisição autenticada, e arrastar ~20 KB de binário para descartá-los em
      // seguida sairia caro numa conexão serverless.
      include: { foto: { select: { atualizadaEm: true } } },
    });
  }

  create(data: { name: string; email: string; password: string }) {
    return this.prisma.user.create({ data });
  }
}
