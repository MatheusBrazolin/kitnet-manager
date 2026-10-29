import { Transform } from 'class-transformer';

/**
 * Normaliza o e-mail antes de validar: sem espaços nas pontas e tudo em minúsculas.
 *
 * Sem isso, "A@x.com" e "a@x.com" convivem como contas distintas — a pessoa cadastra de
 * um jeito, digita de outro no login e não entra; e convidar alguém para a equipe falha
 * porque o e-mail não casa com o do cadastro.
 *
 * Fica aqui, e não inline em cada DTO, porque a transformação precisa ser idêntica em
 * todos os pontos de entrada (cadastro, login, perfil, convite) — basta um deles
 * divergir para o problema voltar.
 */
export const NormalizarEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
