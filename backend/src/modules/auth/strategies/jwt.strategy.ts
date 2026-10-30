import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { ContaService } from '../../../common/conta/conta.service';

interface JwtPayload {
  sub: number;
  email: string;
  /** Emitido em, em segundos — preenchido pelo próprio jsonwebtoken. */
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly contaService: ContaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Token emitido antes da última troca de senha não vale mais.
    //
    // Sem isto, trocar a senha não derrubava nenhuma sessão: um token vazado seguia
    // com acesso total por até 7 dias, mesmo depois de a vítima perceber e trocar a
    // senha — exatamente a ação que ela toma para se proteger.
    //
    // `iat` vem em segundos e é truncado; comparar direto com os milissegundos do
    // banco rejeitaria o token recém-emitido pela própria troca de senha, então a
    // data gravada também é truncada para o segundo antes da comparação.
    if (user.passwordChangedAt && payload.iat !== undefined) {
      const trocadaEm = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < trocadaEm) {
        throw new UnauthorizedException(
          'Sua senha foi alterada. Entre de novo.',
        );
      }
    }

    const conta = await this.contaService.resolve(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plano: user.plano,
      contaId: conta.contaId,
      papel: conta.papel,
      donoNome: conta.donoNome,
      telefone: user.telefone,
      avatarCor: user.avatarCor,
      createdAt: user.createdAt,
      fotoAtualizadaEm: user.foto?.atualizadaEm ?? null,
    };
  }
}
