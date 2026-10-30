import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
import { Avatar } from '../../components/Avatar/Avatar';
import { TelefoneInput } from '../../components/TelefoneInput';
import { AVATAR_CORES, corDoAvatar } from '../../utils/avatar';
import { ImagemInvalida, prepararFoto } from '../../utils/imagem';
import { useFotoDePerfil } from '../../hooks/useFotoDePerfil';
import { useConfirm } from '../../components/ConfirmDialog/confirm-context';
import { formatDate, hojeIsoLocal } from '../../utils/dates';
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
  const confirm = useConfirm();

  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [avatarCor, setAvatarCor] = useState(user?.avatarCor ?? '');
  const [senhaParaEmail, setSenhaParaEmail] = useState('');
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [isSalvandoPerfil, setIsSalvandoPerfil] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaError, setSenhaError] = useState<string | null>(null);
  const [isSalvandoSenha, setIsSalvandoSenha] = useState(false);

  const [dadosError, setDadosError] = useState<string | null>(null);
  const [isBaixando, setIsBaixando] = useState(false);
  // O formulário de apagar fica escondido atrás de um botão: é a ação mais destrutiva
  // do app, e um campo de senha sempre à vista convida ao acidente.
  const [querApagar, setQuerApagar] = useState(false);
  const [senhaParaApagar, setSenhaParaApagar] = useState('');
  const [isApagando, setIsApagando] = useState(false);

  const nomeMudou = nome !== (user?.name ?? '');
  const emailMudou = email !== (user?.email ?? '');
  const telefoneMudou = telefone !== (user?.telefone ?? '');
  // A cor NÃO entra aqui: ela se aplica no clique, junto do avatar, e não espera
  // um botão "Salvar" que fica noutro cartão, longe de onde se escolheu.
  const perfilMudou = nomeMudou || emailMudou || telefoneMudou;
  const corAtual = corDoAvatar(nome || user?.name || '', avatarCor);

  const foto = useFotoDePerfil();
  const seletorDeFoto = useRef<HTMLInputElement>(null);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [isEnviandoFoto, setIsEnviandoFoto] = useState(false);

  async function salvarPerfil(event: FormEvent) {
    event.preventDefault();
    setPerfilError(null);
    setIsSalvandoPerfil(true);
    try {
      await api.patch('/perfil', {
        name: nome,
        email,
        telefone,
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

  /**
   * Redimensiona no navegador e envia.
   *
   * O corte para 256x256 acontece aqui e não no servidor: evita subir 4 MB de foto
   * de celular por conexão móvel e dispensa uma biblioteca de imagem no backend.
   * O servidor ainda confere tamanho e assinatura do arquivo — o cliente prepara,
   * mas quem decide o que é aceitável é a API.
   */
  async function enviarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    // Permite reescolher o MESMO arquivo depois de um erro: sem limpar, o input não
    // dispara change de novo para um valor idêntico.
    event.target.value = '';
    if (!arquivo) {
      return;
    }

    setFotoError(null);
    setIsEnviandoFoto(true);
    try {
      const preparada = await prepararFoto(arquivo);
      const corpo = new FormData();
      corpo.append('foto', preparada, 'foto.webp');
      await api.post('/perfil/foto', corpo);
      // A chave do cache da foto vem de `fotoAtualizadaEm` na sessão, então é a
      // sessão que precisa ser recarregada para a imagem nova aparecer.
      await recarregarSessao();
      toast.sucesso('Foto atualizada');
    } catch (err) {
      setFotoError(
        err instanceof ImagemInvalida
          ? err.message
          : getApiErrorMessage(err, 'Não foi possível enviar a foto.'),
      );
    } finally {
      setIsEnviandoFoto(false);
    }
  }

  /**
   * Aplica a cor no clique, como o tema — e não ao salvar o formulário.
   *
   * É preferência trivial e reversível, e o seletor fica ao lado do avatar: exigir
   * um "Salvar" que vive em outro cartão deixaria a escolha aparentemente sem efeito.
   * A sessão é recarregada porque é dela que a barra lateral lê a cor.
   */
  async function escolherCor(nomeDaCor: string) {
    const anterior = avatarCor;
    setAvatarCor(nomeDaCor);
    try {
      await api.patch('/perfil', { avatarCor: nomeDaCor });
      await recarregarSessao();
    } catch (err) {
      // Desfaz a prévia: deixar a cor nova na tela sugeriria que foi salva.
      setAvatarCor(anterior);
      setFotoError(getApiErrorMessage(err, 'Não foi possível trocar a cor.'));
    }
  }

  async function removerFoto() {
    setFotoError(null);
    setIsEnviandoFoto(true);
    try {
      await api.delete('/perfil/foto');
      await recarregarSessao();
      toast.sucesso('Foto removida');
    } catch (err) {
      setFotoError(getApiErrorMessage(err, 'Não foi possível remover a foto.'));
    } finally {
      setIsEnviandoFoto(false);
    }
  }

  function sair() {
    limparCacheDeDados(queryClient);
    logout();
  }

  /**
   * Baixa a conta inteira num arquivo — o direito de portabilidade da LGPD e, na
   * prática, a única cópia de segurança que o usuário consegue tirar sozinho.
   *
   * O arquivo é montado no navegador a partir da resposta da API, em vez de abrir a
   * URL numa aba nova: a rota exige o cabeçalho de autenticação, que uma navegação
   * comum não carrega — abrir a URL direto devolveria 401.
   */
  async function baixarDados() {
    setDadosError(null);
    setIsBaixando(true);
    try {
      const { data } = await api.get('/perfil/exportar');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `kitmanager-${hojeIsoLocal()}.json`;
      link.click();
      // Sem revogar, o blob fica na memória da aba até ela ser fechada.
      URL.revokeObjectURL(url);
      toast.sucesso('Seus dados foram baixados');
    } catch (err) {
      setDadosError(getApiErrorMessage(err, 'Não foi possível baixar seus dados.'));
    } finally {
      setIsBaixando(false);
    }
  }

  async function apagarConta(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({
      title: 'Apagar sua conta',
      message:
        'Isso apaga em definitivo seus imóveis, unidades, moradores, pagamentos e gastos. Não tem como desfazer. Se ainda não baixou seus dados, cancele e baixe antes.',
      confirmLabel: 'Apagar tudo',
      danger: true,
    });
    if (!ok) {
      return;
    }

    setDadosError(null);
    setIsApagando(true);
    try {
      // `data` num DELETE: a senha vai no corpo, não na URL, para não acabar no
      // histórico do navegador nem no log de acesso do servidor.
      await api.delete('/perfil', { data: { senhaAtual: senhaParaApagar } });
      // Não há mais conta para onde voltar: limpa tudo e cai no login.
      sair();
    } catch (err) {
      setDadosError(getApiErrorMessage(err, 'Não foi possível apagar a conta.'));
      setIsApagando(false);
    }
  }

  return (
    <div className="configuracoes">
      <Header title="Configurações" subtitle="Seus dados, sua senha e a aparência do app." />

      {/* Quem você é, antes dos formulários que mudam isso. O avatar é a prévia ao
          vivo do seletor de cor mais abaixo: mudar o tom aqui se vê na hora. */}
      <section className="config-identidade">
        <div className="config-foto">
          <Avatar
            nome={nome || user?.name || ''}
            cor={avatarCor}
            foto={foto}
            tamanho="lg"
          />
          {/* O input de arquivo é escondido e acionado pelo botão: o controle nativo
              tem texto em inglês, largura imprevisível e não combina com nada. */}
          <input
            ref={seletorDeFoto}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="config-foto-input"
            onChange={enviarFoto}
            aria-label="Escolher foto de perfil"
          />
          {/* A cor só aparece quando não há foto: com uma foto no lugar, escolher
              o fundo das iniciais seria decidir algo que ninguém vê. */}
          {!foto && (
            <div
              className="avatar-cores"
              role="radiogroup"
              aria-label="Cor do fundo das suas iniciais"
            >
              {AVATAR_CORES.map((opcao) => (
                <button
                  key={opcao.nome}
                  type="button"
                  role="radio"
                  aria-checked={corAtual.nome === opcao.nome}
                  aria-label={opcao.rotulo}
                  title={opcao.rotulo}
                  className={`avatar-cor${corAtual.nome === opcao.nome ? ' avatar-cor-ativa' : ''}`}
                  style={{ background: opcao.fundo }}
                  onClick={() => void escolherCor(opcao.nome)}
                />
              ))}
            </div>
          )}

          <div className="config-foto-acoes">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => seletorDeFoto.current?.click()}
              disabled={isEnviandoFoto}
            >
              {isEnviandoFoto ? 'Enviando...' : foto ? 'Trocar foto' : 'Pôr foto'}
            </button>
            {foto && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-perigo"
                onClick={removerFoto}
                disabled={isEnviandoFoto}
              >
                Remover
              </button>
            )}
          </div>
        </div>

        <div className="config-identidade-dados">
          <h2>{nome || user?.name}</h2>
          <p className="config-identidade-email">{user?.email}</p>
          {fotoError && (
            <p className="field-erro" role="alert">
              {fotoError}
            </p>
          )}
          <div className="config-selos">
            <span className="config-selo">
              {user ? PAPEL_LABEL[user.papel] : '—'}
            </span>
            <span className="config-selo">
              Plano {user?.plano === 'PRO' ? 'Pro' : 'gratuito'}
            </span>
            {user?.createdAt && (
              <span className="config-selo config-selo-discreto">
                Por aqui desde {formatDate(user.createdAt)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="config-grade">
        <div className="config-coluna">
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

          <div className="field">
            <label htmlFor="perfilTelefone">Telefone</label>
            <TelefoneInput
              id="perfilTelefone"
              value={telefone}
              onChange={setTelefone}
            />
            <p className="field-static-hint">
              Opcional. O sistema não usa para nada — serve para quem divide a conta
              com você saber a quem recorrer.
            </p>
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

        </div>

        <div className="config-coluna">
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

      <Card
        title="Privacidade e seus dados"
        subtitle="Leve embora ou apague, quando quiser"
      >
        <ErrorBanner message={dadosError} />

        <div className="dados-bloco">
          <div className="dados-texto">
            <strong>Baixar meus dados</strong>
            <p>
              Um arquivo com a conta inteira: imóveis, unidades, moradores, pagamentos
              e gastos. Serve de cópia de segurança e é seu por direito.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={baixarDados}
            disabled={isBaixando}
          >
            {isBaixando ? 'Preparando...' : 'Baixar'}
          </button>
        </div>

        <div className="dados-bloco dados-bloco-perigo">
          <div className="dados-texto">
            <strong>Apagar minha conta</strong>
            <p>
              Apaga em definitivo tudo o que está aqui dentro. Não tem como desfazer —
              baixe seus dados antes, se quiser guardá-los.
            </p>
          </div>

          {querApagar ? (
            <form onSubmit={apagarConta} className="dados-apagar-form">
              <PasswordField
                id="senhaParaApagar"
                label="Confirme sua senha"
                value={senhaParaApagar}
                onChange={setSenhaParaApagar}
                autoComplete="current-password"
              />
              <div className="configuracoes-acoes">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuerApagar(false);
                    setSenhaParaApagar('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isApagando || !senhaParaApagar}
                >
                  {isApagando ? 'Apagando...' : 'Apagar minha conta'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-perigo"
              onClick={() => setQuerApagar(true)}
            >
              Apagar conta
            </button>
          )}
        </div>

        <p className="dados-legal">
          <Link to="/termos">Termos de uso</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/privacidade">Política de privacidade</Link>
        </p>
      </Card>
        </div>
      </div>
    </div>
  );
}
