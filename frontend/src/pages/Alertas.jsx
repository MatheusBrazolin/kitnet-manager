import { useEffect, useState } from 'react'
import { getAlertas, marcarAlertaVisto } from '../api'
import { Bell, CheckCheck } from 'lucide-react'

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Alertas</h2>
          <p className="text-slate-500 text-sm mt-1">{alertas.length} {mostrarTodos ? 'total' : 'não vistos'}</p>
        </div>
        <button
          onClick={() => setMostrarTodos((v) => !v)}
          className="text-sm px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors text-slate-600"
        >
          {mostrarTodos ? 'Ver não vistos' : 'Ver todos'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">Carregando...</div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum alerta {mostrarTodos ? '' : 'pendente'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border-l-4 border border-slate-100 shadow-sm p-4 flex items-start justify-between ${tipoColor[a.tipo] ?? tipoColor.outro}`}
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                <p className="text-slate-500 text-xs mt-1">{a.mensagem}</p>
                <p className="text-slate-400 text-xs mt-2">
                  {a.kitnet_nome} · {new Date(a.data_alerta).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {!a.visualizado && (
                <button
                  onClick={() => marcar(a.id)}
                  className="ml-4 shrink-0 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
