import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString()
  @MinLength(1)
  token: string;

  // Mesma política do cadastro (ver RegisterDto): não adianta exigir senha forte ao
  // criar a conta e aceitar qualquer coisa na redefinição, que é justamente o caminho
  // que alguém usaria para enfraquecer a senha.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve conter ao menos uma letra e um número',
  })
  novaSenha: string;
}
