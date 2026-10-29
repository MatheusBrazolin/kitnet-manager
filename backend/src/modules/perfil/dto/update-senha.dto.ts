import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
  // Mesma exigência do cadastro: sem isto dava para criar a conta com uma senha forte
  // e logo depois rebaixá-la para "aaaaaaaa" por esta rota.
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A nova senha deve conter ao menos uma letra e um número.',
  })
  novaSenha: string;
}
