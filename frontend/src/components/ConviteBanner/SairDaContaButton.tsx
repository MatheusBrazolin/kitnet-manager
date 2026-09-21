import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../ConfirmDialog/ConfirmProvider';

/**
 * Saída por iniciativa do próprio membro.
 *
 * Antes só o dono podia desfazer a filiação, então quem fosse adicionado à conta de
 * outra pessoa ficava preso lá — sem conseguir voltar para a própria conta nem parar de
 * gravar dados na conta alheia.
 */
export function SairDaContaButton() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { recarregarSessao } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSaindo, setIsSaindo] = useState(false);

  async function sair() {
    const ok = await confirm({
      title: 'Sair desta conta',
      message: 'Você deixa de ver os dados desta conta e volta para a sua. Pode ser convidado de novo depois.',
      confirmLabel: 'Sair da conta',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setIsSaindo(true);
    try {
      await api.delete('/membros/me');
      // A conta que a sessão enxerga muda — o cache inteiro passa a ser de outra conta.
      queryClient.clear();
      await recarregarSessao();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível sair da conta.'));
    } finally {
      setIsSaindo(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost layout-membro-sair" onClick={sair} disabled={isSaindo}>
        {isSaindo ? 'Saindo...' : 'Sair desta conta'}
      </button>
      {error && <span className="form-error">{error}</span>}
    </>
  );
}
