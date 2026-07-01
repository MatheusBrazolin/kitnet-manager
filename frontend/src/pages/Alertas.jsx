import { useEffect, useState } from 'react'
import { getAlertas, marcarAlertaVisto } from '../api'
import { Bell, CheckCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'

const tipoColor = {
  pagamento_vencido: 'border-l-red-500 bg-red-50',
  pagamento_vencimento: 'border-l-orange-400 bg-orange-50',
  kitnet_vaga: 'border-l-blue-400 bg-blue-50',
  inquilino_saida: 'border-l-purple-400 bg-purple-50',
  outro: 'border-l-slate-400 bg-slate-50',
}

export default function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const load = () => {
    getAlertas(mostrarTodos ? {} : { visualizado: false }).then((r) => {
      setAlertas(r.data.results ?? r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [mostrarTodos])

  const marcar = async (id) => {
    await marcarAlertaVisto(id)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        subtitle={`${alertas.length} ${mostrarTodos ? 'total' : 'não vistos'}`}
        action={
          <button
            onClick={() => setMostrarTodos((v) => !v)}
            className="text-sm px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors text-slate-600"
          >
            {mostrarTodos ? 'Ver não vistos' : 'Ver todos'}
          </button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : alertas.length === 0 ? (
        <EmptyState icon={Bell} message={`Nenhum alerta ${mostrarTodos ? '' : 'pendente'}`} />
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border-l-4 border border-slate-100 shadow-sm p-4 flex items-start justify-between gap-3 ${tipoColor[a.tipo] ?? tipoColor.outro}`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                <p className="text-slate-500 text-xs mt-1">{a.mensagem}</p>
                <p className="text-slate-400 text-xs mt-2">
                  {a.kitnet_nome} · {new Date(a.data_alerta).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {!a.visualizado && (
                <button
                  onClick={() => marcar(a.id)}
                  className="shrink-0 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Marcar como visto"
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
