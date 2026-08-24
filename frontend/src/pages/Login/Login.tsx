import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import './auth.css';

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-mark">
          <span>K</span> KitManager
        </div>
        <div className="auth-showcase-copy">
          <h1>Gerencie suas kitnets sem planilha.</h1>
          <p>Cadastro de imóveis, moradores e pagamentos em um só painel, feito para donos de kitnets.</p>
        </div>
        <p className="auth-showcase-foot">© {new Date().getFullYear()} KitManager</p>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2>Entrar</h2>
            <p className="auth-form-subtitle">Acesse sua conta para continuar.</p>
          </div>

          <ErrorBanner message={error} />

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
            minLength={6}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="auth-switch">
            Ainda não tem conta? <Link to="/register">Criar conta</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
