import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';

/**
 * A foto do usuário logado, como data URL.
 *
 * Buscada pelo cliente HTTP e convertida, em vez de apontar um `<img src>` para a
 * rota: `<img>` não manda cabeçalho de autenticação, e tornar a rota pública deixaria
 * o rosto de qualquer usuário acessível a quem enumerasse ids.
 *
 * A chave inclui `fotoAtualizadaEm`, então trocar a foto invalida o cache sozinho —
 * sem isso, a foto antiga ficaria na tela até a aba ser recarregada.
 */
export function useFotoDePerfil() {
  const { user } = useAuth();
  const atualizadaEm = user?.fotoAtualizadaEm ?? null;

  const { data } = useQuery({
    queryKey: ['perfil', 'foto', atualizadaEm],
    // Sem foto não há o que buscar; a tela cai nas iniciais.
    enabled: Boolean(atualizadaEm),
    // A imagem não muda sozinha: o que a invalida é a chave acima mudar.
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const resposta = await api.get<Blob>('/perfil/foto', {
        responseType: 'blob',
      });
      return await paraDataUrl(resposta.data);
    },
  });

  return data ?? null;
}

function paraDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    leitor.readAsDataURL(blob);
  });
}
