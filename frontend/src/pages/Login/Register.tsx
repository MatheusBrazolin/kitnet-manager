import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import './auth.css';
import { Logo } from '../../components/Logo/Logo';

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-mark">
          <Logo /> KitManager
        </div>
        <div className="auth-showcase-copy">
          <h1>Organize seus imóveis sem limites.</h1>
          <p>Cadastre quantos imóveis e unidades precisar, sem restrição de plano.</p>
        </div>
        <p className="auth-showcase-foot">© {new Date().getFullYear()} KitManager</p>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2>Criar conta</h2>
            <p className="auth-form-subtitle">Comece a organizar suas kitnets agora.</p>
          </div>

          <ErrorBanner message={error} />

          <div className="field">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>

          <PasswordField
            value={password}
            onChange={setPassword}
            minLength={8}
            pattern="(?=.*[A-Za-z])(?=.*\d).+"
            title="Mínimo 8 caracteres, com ao menos uma letra e um número"
            placeholder="Mínimo 8 caracteres, com letra e número"
            autoComplete="new-password"
          />

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p className="auth-switch">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
          {/* Onde a pessoa decide criar a conta é onde ela precisa poder ler a que
              está concordando — e não depois, escondido nas configurações. */}
          <p className="auth-legal">
            <Link to="/termos">Termos de uso</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/privacidade">Privacidade</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
