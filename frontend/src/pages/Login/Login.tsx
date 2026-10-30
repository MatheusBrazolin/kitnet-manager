import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import './auth.css';
import { Logo } from '../../components/Logo/Logo';
import { useContagem } from '../../hooks/useContagem';
import { formatCurrency } from '../../utils/currency';
import { esquecerPerfilLembrado, lerPerfilLembrado } from '../../utils/perfilLembrado';

/** "Maria Clara dos Santos" -> "Maria". Cabe no título sem quebrar linha. */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  /**
   * Quem entrou por último neste navegador.
   *
   * Lido uma vez, no primeiro render (`useState` com função): se fosse recalculado a
   * cada render, o formulário mudaria de forma no meio da digitação assim que o login
   * guardasse o perfil.
   */
  const [perfil, setPerfil] = useState(lerPerfilLembrado);
  // O e-mail lembrado já entra no estado, então `handleSubmit` é o mesmo nos dois
  // modos — não existe um segundo caminho de login para manter de pé.
  const [email, setEmail] = useState(perfil?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [params] = useSearchParams();
  // Quem acabou de redefinir a senha chega aqui vindo do link do e-mail. Sem esta
  // confirmação, a tela de login parece que o processo falhou e voltou do zero.
  const senhaRedefinida = params.get('senha-redefinida') === '1';
  // O valor da amostra sobe de 0 ao abrir a tela: diz "este app conta dinheiro pra
  // você" antes de qualquer texto explicar.
  const valorAmostra = useContagem(6380);

  if (user) {
    return <Navigate to="/" replace />;
  }

  /** Volta ao formulário completo e esquece quem estava lembrado. */
  function usarOutraConta() {
    esquecerPerfilLembrado();
    setPerfil(null);
    setEmail('');
    setPassword('');
    setError(null);
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
          <Logo /> KitManager
        </div>
        <div className="auth-showcase-copy">
          <h1>Saiba exatamente quanto caiu na sua conta.</h1>
          <p>
            A imobiliária desconta a taxa dela e repassa o resto. O KitManager guarda quanto era,
            quanto ficou retido e quanto sobrou — mês a mês, sem planilha.
          </p>

          {/* Amostra do produto, com números de exemplo. Mostra o formato da
              resposta que o app dá, que é mais convincente que descrevê-la. */}
          <div className="auth-preview" aria-hidden="true">
            <p className="auth-preview-label">Você recebeu em outubro</p>
            <p className="auth-preview-valor numero">{formatCurrency(valorAmostra)}</p>
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
            <Logo /> KitManager
          </div>

          <div>
            <h2>{perfil ? `Olá de novo, ${primeiroNome(perfil.nome)}` : 'Entrar'}</h2>
            <p className="auth-form-subtitle">
              {perfil ? 'Só falta a senha.' : 'Bom te ver de novo.'}
            </p>
          </div>

          {senhaRedefinida && !error && (
            <p className="auth-sucesso" role="status">
              Senha redefinida. Entre com a senha nova.
            </p>
          )}

          <ErrorBanner message={error} />

          {perfil ? (
            /* O e-mail vira identidade visível em vez de campo para redigitar. O
               `input` escondido continua existindo para o gerenciador de senhas do
               navegador casar a credencial com a conta certa — sem ele, o Chrome
               oferece a senha errada em quem tem mais de uma conta. */
            <div className="auth-perfil">
              <span className="auth-perfil-avatar" aria-hidden="true">
                {perfil.nome.charAt(0).toUpperCase()}
              </span>
              <div className="auth-perfil-dados">
                <strong>{perfil.nome}</strong>
                <span title={perfil.email}>{perfil.email}</span>
              </div>
              <input type="hidden" name="email" value={perfil.email} autoComplete="username" />
              <button type="button" className="auth-perfil-trocar" onClick={usarOutraConta}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="username"
              />
            </div>
          )}

          <PasswordField
            value={password}
            onChange={setPassword}
            minLength={6}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <p className="auth-esqueci">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </p>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="auth-switch">
            {perfil ? (
              <>
                Não é você?{' '}
                <button type="button" className="auth-link" onClick={usarOutraConta}>
                  Entrar com outra conta
                </button>
              </>
            ) : (
              <>
                Ainda não tem conta? <Link to="/register">Criar conta</Link>
              </>
            )}
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
