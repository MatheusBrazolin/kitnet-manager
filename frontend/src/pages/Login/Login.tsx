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
          <h1>Saiba exatamente quanto caiu na sua conta.</h1>
          <p>
            A imobiliária desconta a taxa dela e repassa o resto. O KitManager guarda
            quanto era, quanto ficou retido e quanto sobrou — mês a mês, sem planilha.
          </p>

          {/* Amostra do produto, com números de exemplo. Mostra o formato da
              resposta que o app dá, que é mais convincente que descrevê-la. */}
          <div className="auth-preview" aria-hidden="true">
            <p className="auth-preview-label">Você recebeu em outubro</p>
            <p className="auth-preview-valor numero">R$ 6.380,00</p>
            <div className="auth-preview-track">
              <div className="auth-preview-fill" />
            </div>
            <p className="auth-preview-legenda numero">Ainda falta receber R$ 2.200,00</p>
          </div>
        </div>
        <p className="auth-showcase-foot">© {new Date().getFullYear()} KitManager</p>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-brand">
            <span>K</span> KitManager
          </div>

          <div>
            <h2>Entrar</h2>
            <p className="auth-form-subtitle">Bom te ver de novo.</p>
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

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
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
