import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSenhaDto {
  @IsString()
  @MinLength(1)
  senhaAtual: string;

  @IsString()
  @MinLength(8)
  // bcrypt ignora tudo além de 72 bytes: sem esse teto a pessoa cadastraria uma senha
  // longa achando que o final conta, e o login aceitaria qualquer coisa com os mesmos
  // 72 primeiros caracteres. Mesmo limite usado no cadastro (register.dto.ts).
  @MaxLength(72)
  novaSenha: string;
}
