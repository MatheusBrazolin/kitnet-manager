import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo/Logo';
import { ATUALIZADO_EM } from './responsavel';
import './legal.css';

interface PaginaLegalProps {
  titulo: string;
  children: ReactNode;
}

/**
 * Moldura das páginas de Termos e Privacidade.
 *
 * Fora do Layout de propósito: elas precisam abrir para quem ainda não tem conta —
 * é onde a pessoa decide se cria uma — então não podem depender de sessão. Daí a
 * marca e o link de volta próprios, em vez da barra lateral.
 *
 * A medida da coluna é limitada em ~68 caracteres: texto jurídico já é cansativo,
 * e linha que atravessa um monitor inteiro faz o olho perder onde estava.
 */
export function PaginaLegal({ titulo, children }: PaginaLegalProps) {
  return (
    <div className="legal">
      <header className="legal-topo">
        <Link to="/" className="legal-marca">
          <Logo /> KitManager
        </Link>
      </header>

      <main className="legal-conteudo">
        <h1>{titulo}</h1>
        <p className="legal-data">Atualizado em {ATUALIZADO_EM}</p>
        {children}
      </main>

      <footer className="legal-rodape">
        <Link to="/termos">Termos de uso</Link>
        <Link to="/privacidade">Política de privacidade</Link>
        <Link to="/">Voltar ao início</Link>
      </footer>
    </div>
  );
}
