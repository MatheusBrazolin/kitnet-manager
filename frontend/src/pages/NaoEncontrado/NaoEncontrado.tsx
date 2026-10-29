import { Link } from 'react-router-dom';
import { Card } from '../../components/Card/Card';

/**
 * Qualquer URL fora das rotas conhecidas caía numa tela branca — sem explicação e sem
 * saída, o que parece o app ter quebrado.
 */
export function NaoEncontrado() {
  return (
    <Card>
      <div className="estado-vazio">
        <h3>Esta página não existe</h3>
        <p>
          O endereço pode ter sido digitado errado, ou o que estava aqui foi removido.
        </p>
        <Link to="/" className="btn btn-primary">
          Voltar para o painel
        </Link>
      </div>
    </Card>
  );
}
