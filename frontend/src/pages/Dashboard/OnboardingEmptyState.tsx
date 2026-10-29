import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BuildingIcon, GridIcon, UsersIcon } from '../../components/icons';

interface OnboardingEmptyStateProps {
  /** Quantos imóveis já existem — define se o passo 1 está concluído. */
  totalImoveis: number;
  /** Quantas unidades já existem — define se o passo 2 está concluído. */
  totalUnidades: number;
}

export function OnboardingEmptyState({
  totalImoveis,
  totalUnidades,
}: OnboardingEmptyStateProps) {
  const passos = [
    {
      icon: BuildingIcon,
      title: 'Cadastre seu primeiro imóvel',
      description: 'Dê um apelido e um endereço ao imóvel onde ficam suas kitnets.',
      to: '/imoveis',
      cta: 'Cadastrar imóvel',
      concluido: totalImoveis > 0,
    },
    {
      icon: GridIcon,
      title: 'Adicione as unidades',
      description:
        'Abra o imóvel e use “+ Adicionar unidades” para informar o aluguel de cada uma.',
      to: '/imoveis',
      cta: 'Adicionar unidades',
      concluido: totalUnidades > 0,
    },
    {
      icon: UsersIcon,
      title: 'Cadastre os moradores',
      description:
        'Vincule cada morador à unidade em que ele vive. A partir daí os aluguéis aparecem sozinhos.',
      to: '/moradores',
      cta: 'Cadastrar morador',
      concluido: false,
    },
  ];

  const concluidos = passos.filter((passo) => passo.concluido).length;

  return (
    <div className="dashboard-onboarding animate-in">
      <span className="dashboard-onboarding-kicker">
        {concluidos === 0 ? 'Bem-vindo(a) 👋' : `${concluidos} de 3 passos concluídos`}
      </span>
      <h2 className="dashboard-onboarding-title">
        {concluidos === 0
          ? 'Vamos configurar sua conta em 3 passos'
          : 'Falta pouco para o painel ganhar vida'}
      </h2>
      <p className="dashboard-onboarding-subtitle">
        Assim que o primeiro morador estiver cadastrado, este painel passa a mostrar
        quanto você recebeu, quanto falta receber e o que ficou com a imobiliária.
      </p>

      <ol className="dashboard-onboarding-steps">
        {passos.map((passo, index) => {
          const Icon = passo.icon;
          return (
            <li
              key={passo.title}
              className={`dashboard-onboarding-step animate-in${
                passo.concluido ? ' dashboard-onboarding-step-ok' : ''
              }`}
              style={{ '--stagger': index + 1 } as CSSProperties}
            >
              <span className="dashboard-onboarding-step-number" aria-hidden="true">
                {passo.concluido ? '✓' : index + 1}
              </span>
              <Icon className="dashboard-onboarding-step-icon" />
              <div className="dashboard-onboarding-step-body">
                <h3>{passo.title}</h3>
                <p>{passo.description}</p>
              </div>
              {passo.concluido ? (
                <span className="dashboard-onboarding-step-feito">Feito</span>
              ) : (
                <Link to={passo.to} className="btn btn-primary dashboard-onboarding-step-cta">
                  {passo.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <p className="dashboard-onboarding-note">
        🎉 Os aluguéis do mês são gerados automaticamente para cada morador — nada de
        lançar parcela por parcela.
      </p>
    </div>
  );
}
