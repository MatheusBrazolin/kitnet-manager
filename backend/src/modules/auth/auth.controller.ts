import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EsqueciSenhaDto } from './dto/esqueci-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { RecuperacaoService } from './recuperacao.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
// Mais apertado que o resto: cada pedido aceito dispara um e-mail, então um limite
// frouxo aqui vira uma forma barata de encher a caixa de entrada de alguém.
const RECUPERACAO_THROTTLE = { default: { limit: 3, ttl: 15 * 60_000 } };

/**
 * De onde sai o link do e-mail.
 *
 * Precisa ser o endereço do site, não o da API — e as duas coisas vivem na mesma origem
 * aqui. `APP_URL` manda quando existe; na Vercel, `VERCEL_URL` traz o domínio do deploy
 * (sem protocolo), o que faz os previews gerarem link para si mesmos em vez de para
 * produção. Localmente, o Vite.
 */
function obterBaseUrlDoApp(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:5173';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recuperacao: RecuperacaoService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Pede o link de redefinição.
   *
   * Responde 204 sempre, exista a conta ou não: um 404 aqui transformaria a rota num
   * verificador de cadastro, revelando quem tem conta no sistema.
   */
  @Throttle(RECUPERACAO_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('esqueci-senha')
  async esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    await this.recuperacao.solicitar(dto.email, obterBaseUrlDoApp());
  }

  /** Diz se o link ainda vale, para a tela não pedir a senha à toa. */
  @Throttle(AUTH_THROTTLE)
  @Get('redefinir-senha/valido')
  async tokenValido(@Query('token') token?: string) {
    return { valido: token ? await this.recuperacao.conferir(token) : false };
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('redefinir-senha')
  async redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    await this.recuperacao.redefinir(dto.token, dto.novaSenha);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
