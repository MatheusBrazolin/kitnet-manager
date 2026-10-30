import { corDoAvatar, iniciais } from '../../utils/avatar';
import './avatar.css';

interface AvatarProps {
  nome: string;
  /** Tom escolhido nas configurações; sem ele, a cor sai do próprio nome. */
  cor?: string | null;
  /** Foto como data URL. Sem ela, mostra as iniciais. */
  foto?: string | null;
  tamanho?: 'sm' | 'md' | 'lg';
}

/**
 * Foto do usuário, ou as iniciais num círculo colorido quando não há foto.
 *
 * As iniciais não são um consolo: são o estado normal de quem nunca enviou foto, e
 * precisam parecer intencionais em vez de um espaço vazio. A cor sai do nome, então
 * a mesma pessoa tem sempre o mesmo círculo.
 *
 * `aria-hidden` porque o nome sempre aparece escrito ao lado: anunciar "PT" antes de
 * "Perf Teste" só atrapalharia quem usa leitor de tela.
 */
export function Avatar({ nome, cor, foto, tamanho = 'md' }: AvatarProps) {
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        aria-hidden="true"
        className={`avatar avatar-${tamanho} avatar-foto`}
      />
    );
  }

  const tom = corDoAvatar(nome, cor);

  return (
    <span
      className={`avatar avatar-${tamanho}`}
      style={{ background: tom.fundo }}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  );
}
