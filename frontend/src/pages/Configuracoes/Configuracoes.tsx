import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTema, type Tema } from '../../context/theme-context';
import { useToast } from '../../components/Toast/toast-context';
import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/Header';
import { ErrorBanner } from '../../components/ErrorBanner/ErrorBanner';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { PAPEL_LABEL } from '../../utils/papel';
import { limparCacheDeDados } from '../../services/invalidate';
import './configuracoes.css';

const TEMAS: Array<{ valor: Tema; rotulo: string; descricao: string }> = [
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo bege, como no papel' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Mais confortável à noite' },
  { valor: 'sistema', rotulo: 'Automático', descricao: 'Acompanha o aparelho' },
];

export function Configuracoes() {
  const { user, recarregarSessao, logout } = useAuth();
  const { tema, setTema } = useTema();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [senhaParaEmail, setSenhaParaEmail] = useState('');
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [isSalvandoPerfil, setIsSalvandoPerfil] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaError, setSenhaError] = useState<string | null>(null);
  const [isSalvandoSenha, setIsSalvandoSenha] = useState(false);

  const nomeMudou = nome !== (user?.name ?? '');
  const emailMudou = email !== (user?.email ?? '');
  const perfilMudou = nomeMudou || emailMudou;

  async function salvarPerfil(event: FormEvent) {
    event.preventDefault();
    setPerfilError(null);
    setIsSalvandoPerfil(true);
    try {
      await api.patch('/perfil', {
        name: nome,
        email,
        // Só vai quando o e-mail muda; o backend exige a senha nesse caso.
        senhaAtual: emailMudou ? senhaParaEmail : undefined,
      });
      setSenhaParaEmail('');
      // O nome aparece na barra lateral e na saudação do painel; sem recarregar a
      // sessão a tela continuaria mostrando o valor antigo.
      await recarregarSessao();
      toast.sucesso('Dados atualizados');
    } catch (err) {
      setPerfilError(getApiErrorMessage(err, 'Não foi possível salvar seus dados.'));
    } finally {
      setIsSalvandoPerfil(false);
    }
  }

  async function salvarSenha(event: FormEvent) {
    event.preventDefault();
    setSenhaError(null);
    setIsSalvandoSenha(true);
    try {
      await api.patch('/perfil/senha', { senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      toast.sucesso('Senha alterada. Outros aparelhos foram desconectados.');
    } catch (err) {
      setSenhaError(getApiErrorMessage(err, 'Não foi possível alterar a senha.'));
    } finally {
      setIsSalvandoSenha(false);
    }
  }

  function sair() {
    limparCacheDeDados(queryClient);
    logout();
  }

  return (
    <div className="configuracoes">
      <Header title="Configurações" subtitle="Seus dados, sua senha e a aparência do app." />

      <Card title="Seus dados" subtitle="Como você aparece no KitManager">
        <form onSubmit={salvarPerfil} className="field-group">
          <ErrorBanner message={perfilError} />

          <div className="field">
            <label htmlFor="perfilNome">Nome</label>
            <input
              id="perfilNome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="field">
            <label htmlFor="perfilEmail">E-mail</label>
            <input
              id="perfilEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <p className="field-static-hint">É com ele que você entra na sua conta.</p>
          </div>

          {/* A senha só é pedida quando o e-mail muda. O e-mail é o login e o único
              caminho de volta para a conta; como ainda não há confirmação por link,
              a senha é a prova de que é o dono fazendo a troca. */}
          {emailMudou && (
            <PasswordField
              id="senhaParaEmail"
              label="Confirme sua senha para trocar o e-mail"
              value={senhaParaEmail}
              onChange={setSenhaParaEmail}
              autoComplete="current-password"
            />
          )}

          <div className="configuracoes-acoes">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isSalvandoPerfil || !perfilMudou || (emailMudou && !senhaParaEmail)
              }
            >
              {isSalvandoPerfil ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Senha" subtitle="Troque quando quiser">
        <form onSubmit={salvarSenha} className="field-group">
          <ErrorBanner message={senhaError} />

          <PasswordField
            id="senhaAtual"
            label="Senha atual"
            value={senhaAtual}
            onChange={setSenhaAtual}
            autoComplete="current-password"
          />

          <PasswordField
            id="novaSenha"
            label="Nova senha"
            value={novaSenha}
            onChange={setNovaSenha}
            minLength={8}
            autoComplete="new-password"
          />
          <p className="field-static-hint">
            Pelo menos 8 caracteres, com letra e número. Ao trocar, as sessões abertas
            em outros aparelhos são encerradas.
          </p>

          <div className="configuracoes-acoes">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSalvandoSenha || !senhaAtual || novaSenha.length < 8}
            >
              {isSalvandoSenha ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Aparência" subtitle="Vale só neste aparelho">
        <div className="tema-opcoes" role="radiogroup" aria-label="Tema do aplicativo">
          {TEMAS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={tema === opcao.valor}
              className={`tema-opcao${tema === opcao.valor ? ' tema-opcao-ativa' : ''}`}
              onClick={() => setTema(opcao.valor)}
            >
              <span className={`tema-amostra tema-amostra-${opcao.valor}`} aria-hidden="true" />
              <span className="tema-opcao-rotulo">{opcao.rotulo}</span>
              <span className="tema-opcao-descricao">{opcao.descricao}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Conta" subtitle="Informações do seu acesso">
        <dl className="configuracoes-info">
          <div>
            <dt>Seu acesso</dt>
            <dd>{user ? PAPEL_LABEL[user.papel] : '—'}</dd>
          </div>
          {user?.donoNome && (
            <div>
              <dt>Você está na conta de</dt>
              <dd>{user.donoNome}</dd>
            </div>
          )}
          <div>
            <dt>Plano</dt>
            <dd>{user?.plano === 'PRO' ? 'Pro' : 'Gratuito'}</dd>
          </div>
        </dl>

        <div className="configuracoes-acoes configuracoes-acoes-sair">
          <button type="button" className="btn btn-ghost" onClick={sair}>
            Sair da conta
          </button>
        </div>
      </Card>
    </div>
  );
}
