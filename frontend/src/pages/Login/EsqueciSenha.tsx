import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../services/api';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { Logo } from '../../components/Logo/Logo';
import './auth.css';

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/esqueci-senha', { email });
      setEnviado(true);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Não foi possível enviar o link agora. Tente de novo.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page auth-page-simples">
      <section className="auth-panel">
        {enviado ? (
          // Confirma o envio sem dizer se aquele e-mail tem conta: a tela anterior
          // viraria um verificador de cadastro se respondesse "não encontrado".
          <div className="auth-form animate-in">
            <div className="auth-form-brand">
              <Logo /> KitManager
            </div>
            <div>
              <h2>Verifique seu e-mail</h2>
              <p className="auth-form-subtitle">
                Se existe uma conta com <strong>{email}</strong>, o link para criar uma
                senha nova já está a caminho.
              </p>
            </div>
            <p className="auth-dica">
              O link vale por 1 hora e só funciona uma vez. Não chegou? Veja no spam ou
              peça outro em alguns minutos.
            </p>
            <Link to="/login" className="btn btn-primary btn-block">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form className="auth-form animate-in" onSubmit={handleSubmit}>
            <div className="auth-form-brand">
              <Logo /> KitManager
            </div>

            <div>
              <h2>Esqueci minha senha</h2>
              <p className="auth-form-subtitle">
                Informe seu e-mail e mandamos um link para você criar outra.
              </p>
            </div>

            <ErrorBanner message={error} />

            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar link'}
            </button>

            <p className="auth-switch">
              Lembrou a senha? <Link to="/login">Entrar</Link>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
