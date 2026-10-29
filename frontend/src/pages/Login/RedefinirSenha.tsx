import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../services/api';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { Logo } from '../../components/Logo/Logo';
import './auth.css';

type EstadoDoLink = 'conferindo' | 'valido' | 'invalido';

export function RedefinirSenha() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [estado, setEstado] = useState<EstadoDoLink>('conferindo');
  const [senha, setSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confere o link antes de mostrar o formulário: pedir a senha nova e só depois
  // avisar que o link venceu faz a pessoa digitar à toa.
  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      return;
    }
    let cancelado = false;
    api
      .get<{ valido: boolean }>('/auth/redefinir-senha/valido', { params: { token } })
      .then((resposta) => {
        if (!cancelado) {
          setEstado(resposta.data.valido ? 'valido' : 'invalido');
        }
      })
      .catch(() => {
        if (!cancelado) {
          setEstado('invalido');
        }
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha: senha });
      // Para o login, não para dentro do app: a senha mudou, e qualquer sessão antiga
      // deste navegador já foi derrubada pelo backend.
      navigate('/login?senha-redefinida=1', { replace: true });
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Não foi possível redefinir a senha. Peça um link novo.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page auth-page-simples">
      <section className="auth-panel">
        {estado === 'conferindo' && (
          <div className="auth-form">
            <div className="auth-form-brand">
              <Logo /> KitManager
            </div>
            <p className="auth-form-subtitle">Conferindo o link...</p>
          </div>
        )}

        {estado === 'invalido' && (
          <div className="auth-form animate-in">
            <div className="auth-form-brand">
              <Logo /> KitManager
            </div>
            <div>
              <h2>Este link não vale mais</h2>
              <p className="auth-form-subtitle">
                Links de redefinição valem por 1 hora e só funcionam uma vez. Peça outro
                para continuar.
              </p>
            </div>
            <Link to="/esqueci-senha" className="btn btn-primary btn-block">
              Pedir um link novo
            </Link>
            <p className="auth-switch">
              Lembrou a senha? <Link to="/login">Entrar</Link>
            </p>
          </div>
        )}

        {estado === 'valido' && (
          <form className="auth-form animate-in" onSubmit={handleSubmit}>
            <div className="auth-form-brand">
              <Logo /> KitManager
            </div>

            <div>
              <h2>Criar uma senha nova</h2>
              <p className="auth-form-subtitle">
                Ao salvar, as sessões abertas em outros aparelhos serão encerradas.
              </p>
            </div>

            <ErrorBanner message={error} />

            <PasswordField
              label="Nova senha"
              value={senha}
              onChange={setSenha}
              minLength={8}
              pattern="^(?=.*[A-Za-z])(?=.*\d).+$"
              title="Use pelo menos 8 caracteres, com letra e número"
              placeholder="Mínimo 8 caracteres, com letra e número"
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
