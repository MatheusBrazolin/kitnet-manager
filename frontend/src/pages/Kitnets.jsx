import { useEffect, useState } from 'react'
import { getKitnets, updateKitnet } from '../api'
import { Home, User, Calendar, DollarSign, AlertCircle } from 'lucide-react'

const statusConfig = {
  alugada: { label: 'Alugada', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  vaga: { label: 'Vaga', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  manutencao: { label: 'Manutenção', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
}

function KitnetCard({ kitnet }) {
  const cfg = statusConfig[kitnet.status]
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Home size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{kitnet.nome}</h3>
            {kitnet.endereco && <p className="text-xs text-slate-400">{kitnet.endereco}</p>}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <DollarSign size={14} className="text-slate-400" />
          <span>R$ {Number(kitnet.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          <span>Vence dia {kitnet.data_vencimento}</span>
          {kitnet.dias_para_vencer <= 3 && kitnet.status === 'alugada' && (
            <span className="text-xs text-orange-600 font-medium">({kitnet.dias_para_vencer}d)</span>
          )}
        </div>
        {kitnet.inquilino && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={14} className="text-slate-400" />
            <span>{kitnet.inquilino.nome}</span>
          </div>
        )}
      </div>

      {kitnet.pagamento_atrasado && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={13} />
          Pagamento em atraso
        </div>
      )}
    </div>
  )
}

export default function Kitnets() {
  const [kitnets, setKitnets] = useState([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKitnets(filtro ? { status: filtro } : {}).then((r) => {
      setKitnets(r.data.results ?? r.data)
      setLoading(false)
    })
  }, [filtro])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kitnets</h2>
          <p className="text-slate-500 text-sm mt-1">{kitnets.length} unidades</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'Todas'], ['alugada', 'Alugadas'], ['vaga', 'Vagas'], ['manutencao', 'Manutenção']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFiltro(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filtro === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">Carregando...</div>
      ) : kitnets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Home size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma kitnet encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitnets.map((k) => <KitnetCard key={k.id} kitnet={k} />)}
        </div>
      )}
    </div>
  )
}
