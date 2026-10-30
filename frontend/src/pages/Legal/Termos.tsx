import { Link } from 'react-router-dom';
import { PaginaLegal } from './PaginaLegal';
import { RESPONSAVEL } from './responsavel';

/**
 * Termos de uso.
 *
 * Dois pontos carregam o texto todo, e os dois existem por causa de como este app é
 * de fato usado: que ele NÃO movimenta dinheiro (o valor é anotado, não transferido),
 * e que quem cadastra o telefone de um morador responde por isso.
 */
export function Termos() {
  return (
    <PaginaLegal titulo="Termos de uso">
      <p className="legal-resumo">
        Em resumo: o KitManager é um caderno de anotações organizado para quem aluga
        kitnets. Ele não movimenta dinheiro e não fala com o seu banco. Você é dono do
        que cadastra e pode levar embora ou apagar quando quiser.
      </p>

      <h2>1. O que é este serviço</h2>
      <p>
        O KitManager, operado por {RESPONSAVEL.nome} ({RESPONSAVEL.documento}), é uma
        ferramenta para organizar o aluguel de imóveis: registrar unidades, moradores,
        valores combinados, o que a imobiliária reteve, o que foi pago e o que foi
        gasto.
      </p>
      <p>
        <strong>
          O app não processa pagamentos, não emite cobrança e não movimenta dinheiro.
        </strong>{' '}
        Quando você marca um aluguel como pago, está anotando um fato que aconteceu
        fora daqui. Os valores exibidos são o reflexo do que você digitou — conferir se
        batem com o extrato é com você.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>
          Você precisa de um e-mail válido e de uma senha. Guarde-a: não temos como
          lê-la, só redefini-la.
        </li>
        <li>
          O que acontece na sua conta é de sua responsabilidade. Se desconfiar que
          alguém entrou, troque a senha — isso derruba as sessões em outros aparelhos.
        </li>
        <li>
          Você pode convidar outras pessoas para a sua conta. Quem você convida enxerga
          os dados dela, no nível de acesso que você escolher.
        </li>
      </ul>

      <h2>3. Os dados que você cadastra sobre outras pessoas</h2>
      <p>
        Ao cadastrar o nome e o telefone de um morador, você está tratando dado pessoal
        de alguém que não é usuário deste serviço. Perante a LGPD, nessa relação{' '}
        <strong>você é o controlador</strong> desses dados e nós somos o operador.
      </p>
      <p>Na prática, isso quer dizer que cabe a você:</p>
      <ul>
        <li>Ter um motivo legítimo para registrar aquela informação;</li>
        <li>
          Cadastrar só o necessário — o app não pede, nem precisa, de documento ou de
          dado sensível de ninguém;
        </li>
        <li>
          Atender o morador que peça para corrigir ou apagar o que está registrado. As
          telas permitem editar e remover qualquer registro a qualquer momento.
        </li>
      </ul>
      <p>
        Como isso é tratado do nosso lado está na{' '}
        <Link to="/privacidade">Política de privacidade</Link>.
      </p>

      <h2>4. O que não fazer</h2>
      <ul>
        <li>Usar o serviço para algo ilegal, ou para registrar dados obtidos de forma ilícita;</li>
        <li>
          Tentar acessar a conta de outra pessoa, sobrecarregar a API ou contornar os
          limites de uso;
        </li>
        <li>Revender o acesso ou se passar por nós.</li>
      </ul>

      <h2>5. Disponibilidade</h2>
      <p>
        Fazemos o possível para o serviço estar sempre no ar, mas ele é oferecido{' '}
        <strong>no estado em que se encontra</strong>, sem garantia de funcionamento
        ininterrupto. Pode haver indisponibilidade por manutenção, falha de um
        fornecedor ou causa fora do nosso alcance.
      </p>
      <p>
        Por isso, e porque é um bom hábito de qualquer forma:{' '}
        <strong>baixe seus dados de tempos em tempos</strong>. O botão está em{' '}
        <Link to="/configuracoes">Configurações</Link>.
      </p>

      <h2>6. Preço</h2>
      <p>
        O plano gratuito é gratuito. Se um dia houver recurso pago, ele será anunciado
        antes, e nada que você já usa de graça passa a ser cobrado sem aviso prévio por
        e-mail.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        Você pode apagar sua conta a qualquer momento, em Configurações. É imediato e
        remove junto tudo o que pende dela. Não há como desfazer, então baixe seus
        dados antes se quiser guardá-los.
      </p>
      <p>
        Podemos encerrar uma conta que descumpra a seção 4, avisando por e-mail sempre
        que for possível fazê-lo.
      </p>

      <h2>8. Limite de responsabilidade</h2>
      <p>
        O serviço é uma ferramenta de organização. Decisões que você tome a partir dos
        números exibidos — cobrar, não cobrar, rescindir um contrato — são suas. Não
        respondemos por prejuízo decorrente de dado digitado errado, nem por lucro
        cessante.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>
        Se mudarmos algo relevante, atualizamos a data no topo e avisamos pelo e-mail da
        conta antes de a mudança valer. Continuar usando o serviço depois disso é
        concordar com a versão nova.
      </p>

      <h2>10. Lei aplicável</h2>
      <p>
        Vale a lei brasileira, e fica eleito o foro de {RESPONSAVEL.cidade} para o que
        não se resolver por acordo. Dúvidas:{' '}
        <a href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>.
      </p>

      <p className="legal-nota">
        Este texto foi escrito para ser claro e honesto sobre o que o app faz, mas não
        substitui revisão jurídica. Antes de abrir o serviço ao público, vale passá-lo
        por um advogado.
      </p>
    </PaginaLegal>
  );
}
