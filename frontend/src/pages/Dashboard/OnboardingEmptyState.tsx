import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BuildingIcon, GridIcon, UsersIcon } from '../../components/icons';

const STEPS = [
  {
    icon: BuildingIcon,
    title: 'Cadastre seu primeiro imóvel',
    description: 'Dê um apelido e um endereço ao imóvel onde ficam suas kitnets.',
    to: '/imoveis',
    cta: 'Cadastrar imóvel',
  },
  {
    icon: GridIcon,
    title: 'Adicione as unidades',
    description: 'Defina o valor do aluguel e a taxa da imobiliária de cada kitnet.',
    to: '/imoveis',
    cta: 'Ver imóveis',
  },
  {
    icon: UsersIcon,
    title: 'Cadastre os moradores',
    description: 'Vincule cada morador à unidade em que ele vive para começar a controlar os pagamentos.',
    to: '/moradores',
    cta: 'Cadastrar morador',
  },
];

export function OnboardingEmptyState() {
  return (
    <div className="dashboard-onboarding animate-in">
      <span className="dashboard-onboarding-kicker">Bem-vindo(a) 👋</span>
      <h2 className="dashboard-onboarding-title">Vamos configurar sua conta em 3 passos</h2>
      <p className="dashboard-onboarding-subtitle">
        Assim que seu primeiro imóvel for cadastrado, este painel passa a mostrar ocupação, receita e alertas de
        pagamento em atraso automaticamente.
      </p>

      <ol className="dashboard-onboarding-steps">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="dashboard-onboarding-step animate-in"
              style={{ '--stagger': index + 1 } as CSSProperties}
            >
              <span className="dashboard-onboarding-step-number">{index + 1}</span>
              <Icon className="dashboard-onboarding-step-icon" />
              <div className="dashboard-onboarding-step-body">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <Link to={step.to} className="btn btn-ghost dashboard-onboarding-step-cta">
                {step.cta}
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="dashboard-onboarding-note">
        🎉 Os pagamentos do mês são gerados automaticamente para cada morador — nada de lançar parcela por parcela.
      </p>
    </div>
  );
}
