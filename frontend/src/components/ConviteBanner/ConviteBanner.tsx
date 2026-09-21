import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBanner } from '../ErrorBanner/ErrorBanner';
import './convite-banner.css';

interface ConvitePendente {
  id: number;
  papel: 'GERENTE' | 'VISUALIZADOR';
  dono: { id: number; name: string; email: string };
}

const PAPEL_DESCRICAO: Record<ConvitePendente['papel'], string> = {
  GERENTE: 'gerenciar os imóveis, moradores e pagamentos',
  VISUALIZADOR: 'acompanhar os dados, somente leitura',
};

/**
 * Convite pendente para entrar na conta de outra pessoa.
 *
 * Antes não existia aceite: o dono adicionava um e-mail e, no login seguinte, a pessoa
 * era jogada na conta dele sem aviso nem escolha — e tudo que ela cadastrasse dali em
 * diante passava a ser gravado na conta do outro, sem nenhuma forma de sair. Agora o
 * convite fica pendente até a pessoa responder aqui.
 */
export function ConviteBanner() {
  const queryClient = useQueryClient();
  const { recarregarSessao } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { data: convite } = useQuery<ConvitePendente | null>({
    queryKey: ['convite-pendente'],
    queryFn: () => api.get<ConvitePendente | null>('/membros/convite').then((r) => r.data),
  });

  const responder = useMutation({
    mutationFn: (acao: 'aceitar' | 'recusar') => api.post(`/membros/convite/${acao}`, {}),
    onSuccess: async () => {
      setError(null);
      // Aceitar muda a conta que a sessão enxerga (ContaService.resolve), então o cache
      // inteiro passa a valer para outra conta — precisa ser descartado, não invalidado.
      queryClient.clear();
      await recarregarSessao();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível responder ao convite.')),
  });

  if (!convite) {
    return null;
  }

  return (
    <div className="convite-banner" role="region" aria-label="Convite pendente">
      <ErrorBanner message={error} />
      <p className="convite-banner-texto">
        <strong>{convite.dono.name}</strong> convidou você para {PAPEL_DESCRICAO[convite.papel]} na conta dele.
      </p>
      <div className="convite-banner-acoes">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => responder.mutate('aceitar')}
          disabled={responder.isPending}
        >
          {responder.isPending ? 'Aguarde...' : 'Aceitar'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => responder.mutate('recusar')}
          disabled={responder.isPending}
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
