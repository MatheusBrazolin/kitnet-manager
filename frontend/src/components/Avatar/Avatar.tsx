import { corDoAvatar, iniciais } from '../../utils/avatar';
import './avatar.css';

interface AvatarProps {
  nome: string;
  /** Tom escolhido nas configurações; sem ele, a cor sai do próprio nome. */
  cor?: string | null;
  tamanho?: 'sm' | 'md' | 'lg';
}

/**
 * Iniciais num círculo colorido.
 *
 * Não é foto: foto exigiria armazenamento de objeto (bucket, upload, URL assinada,
 * limite de tamanho) e um recorte decente na tela — outra entrega. Iniciais com cor
 * escolhida resolvem o que a foto resolveria aqui, que é dar rosto à conta e
 * distinguir de relance quem está logado numa conta compartilhada.
 *
 * `aria-hidden` porque o nome sempre aparece escrito ao lado: anunciar "PT" antes de
 * "Perf Teste" só atrapalharia quem usa leitor de tela.
 */
export function Avatar({ nome, cor, tamanho = 'md' }: AvatarProps) {
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
