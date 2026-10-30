import { Link } from 'react-router-dom';
import { PaginaLegal } from './PaginaLegal';
import { RESPONSAVEL, SUBPROCESSADORES } from './responsavel';

/**
 * Política de privacidade.
 *
 * O ponto delicado deste app: o usuário cadastra nome e telefone dos MORADORES, que
 * não são usuários e nunca concordaram com nada aqui. Em relação a esses dados, quem
 * decide o que coletar é o proprietário — ele é o controlador, e o KitManager é o
 * operador (LGPD, art. 5º, VI e VII). O texto diz isso com todas as letras, porque
 * é o que define de quem é cada obrigação se alguém reclamar.
 */
export function Privacidade() {
  return (
    <PaginaLegal titulo="Política de privacidade">
      <p className="legal-resumo">
        Em resumo: guardamos só o necessário para o app funcionar, não vendemos nem
        cedemos nada a ninguém, não usamos rastreadores de publicidade, e você pode
        baixar ou apagar tudo quando quiser, direto nas configurações.
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O KitManager é operado por {RESPONSAVEL.nome}, inscrito sob{' '}
        {RESPONSAVEL.documento}. Para qualquer assunto de privacidade — inclusive para
        exercer os direitos da seção 7 — escreva para{' '}
        <a href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>.
      </p>

      <h2>2. Que dados coletamos</h2>
      <h3>Seus dados, como usuário</h3>
      <ul>
        <li>
          <strong>Nome e e-mail</strong>, informados no cadastro. O e-mail é o seu
          login e o único caminho de volta se você perder a senha.
        </li>
        <li>
          <strong>Senha</strong>, guardada apenas como hash bcrypt. Não temos como ler
          sua senha, nem para te ajudar: se você a perder, o caminho é redefinir.
        </li>
        <li>
          <strong>Data de criação da conta</strong> e o plano em que ela está.
        </li>
      </ul>

      <h3>Os dados que você cadastra sobre terceiros</h3>
      <p>
        Para organizar os aluguéis, você cadastra <strong>moradores</strong> (nome e
        telefone) e <strong>imobiliárias</strong> (nome, telefone e pessoa de contato),
        além de imóveis, unidades, valores, pagamentos e gastos.
      </p>
      <p>
        <strong>Sobre esses dados, quem decide o que coletar é você.</strong> Na
        linguagem da LGPD, você é o <em>controlador</em> e o KitManager é o{' '}
        <em>operador</em>: nós apenas guardamos e processamos a seu mando. Isso
        significa que é você quem responde por ter uma base legítima para registrar o
        telefone de um morador, e é a você que ele deve recorrer para corrigir ou
        apagar o que está lá. Nós te damos as ferramentas para atender esse pedido —
        editar e remover qualquer registro, a qualquer momento.
      </p>

      <h3>O que NÃO coletamos</h3>
      <ul>
        <li>Nada de pagamento: o app não movimenta dinheiro e não pede cartão.</li>
        <li>Nenhum documento de identidade, nem seu, nem dos moradores.</li>
        <li>Sua localização.</li>
        <li>Rastreadores de publicidade ou cookies de terceiros.</li>
      </ul>

      <h2>3. Para que usamos</h2>
      <p>
        Exclusivamente para fazer o app funcionar: autenticar você, mostrar seus
        registros, calcular os totais das telas e enviar e-mails de recuperação de
        senha e de convite de equipe. Não usamos seus dados para treinar modelos, para
        anunciar nada nem para criar perfis de comportamento.
      </p>
      <p>
        A base legal é a execução do contrato entre nós (LGPD, art. 7º, V) para os seus
        dados de usuário. Para os dados de moradores e imobiliárias, a base é definida
        por você, como controlador.
      </p>

      <h2>4. O que fica guardado no seu navegador</h2>
      <p>Nada disso é cookie de rastreamento, e nada disso sai do seu aparelho:</p>
      <ul>
        <li>
          <strong>Seu token de sessão</strong>, para você não precisar entrar de novo a
          cada página. Vale 7 dias e some quando você sai.
        </li>
        <li>
          <strong>Seu nome e e-mail</strong>, para a tela de login pedir só a senha
          quando você voltar. Some ao clicar em &ldquo;Trocar&rdquo;. A senha nunca é
          guardada.
        </li>
        <li>
          <strong>Sua preferência de tema</strong> (claro, escuro ou automático).
        </li>
      </ul>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Com ninguém, no sentido comercial: não vendemos, não alugamos e não cedemos
        seus dados. O app depende destes serviços para existir, e eles processam dados
        em nosso nome:
      </p>
      <ul>
        {SUBPROCESSADORES.map((s) => (
          <li key={s.nome}>
            <strong>{s.nome}</strong> — {s.papel} Servidores em {s.onde}.
          </li>
        ))}
      </ul>
      <p>
        Como esses serviços ficam fora do Brasil, há transferência internacional de
        dados (LGPD, art. 33). Além deles, só entregamos dados se uma ordem judicial
        nos obrigar.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir. Ao apagar a conta, tudo o que pende dela — imóveis,
        unidades, moradores, pagamentos, gastos, convites — é removido do banco junto,
        na mesma operação. Backups do provedor podem reter cópias por mais alguns dias
        até serem sobrescritos no ciclo normal.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        A LGPD (art. 18) te dá direito a saber o que guardamos, corrigir, levar embora
        e eliminar. Os dois mais usados estão na tela, sem precisar pedir a ninguém:
      </p>
      <ul>
        <li>
          <strong>Baixar seus dados</strong> — um arquivo com a conta inteira, em{' '}
          <Link to="/configuracoes">Configurações</Link>.
        </li>
        <li>
          <strong>Apagar sua conta</strong> — também em Configurações. É imediato e não
          tem volta.
        </li>
        <li>
          <strong>Corrigir</strong> — qualquer registro é editável nas telas do app.
        </li>
      </ul>
      <p>
        Para qualquer outro pedido, escreva para{' '}
        <a href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>. Respondemos em
        até 15 dias.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Todo o tráfego é por HTTPS. Senhas são guardadas como hash bcrypt, nunca em
        texto. Cada conta só enxerga os próprios dados, e trocar a senha derruba as
        sessões abertas em outros aparelhos. Nenhum sistema é inviolável — se houver um
        incidente que possa te afetar, avisaremos você e a ANPD, como manda o art. 48.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Se mudarmos algo relevante, atualizamos a data no topo e avisamos pelo e-mail da
        conta antes de a mudança valer.
      </p>

      <p className="legal-nota">
        Este texto foi escrito para ser claro e honesto sobre o que o app faz, mas não
        substitui revisão jurídica. Antes de abrir o serviço ao público, vale passá-lo
        por um advogado.
      </p>
    </PaginaLegal>
  );
}
