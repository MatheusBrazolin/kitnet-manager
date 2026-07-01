import { useEffect, useState } from 'react'
import { getKitnets } from '../api'
import { Home, User, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import FilterPills from '../components/ui/FilterPills'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import Badge from '../components/ui/Badge'

const statusConfig = {
  alugada: { label: 'Alugada', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  vaga: { label: 'Vaga', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  manutencao: { label: 'Manutenção', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const filtroOptions = [
  ['', 'Todas'],
  ['alugada', 'Alugadas'],
  ['vaga', 'Vagas'],
  ['manutencao', 'Manutenção'],
]

function KitnetCard({ kitnet }) {
  const cfg = statusConfig[kitnet.status]
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
            <Home size={18} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{kitnet.nome}</h3>
            {kitnet.endereco && <p className="text-xs text-slate-400 truncate">{kitnet.endereco}</p>}
          </div>
        </div>
        <Badge className={`border shrink-0 ${cfg.cls}`}>{cfg.label}</Badge>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <DollarSign size={14} className="text-slate-400 shrink-0" />
          <span>R$ {Number(kitnet.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span>Vence dia {kitnet.data_vencimento}</span>
          {kitnet.dias_para_vencer <= 3 && kitnet.status === 'alugada' && (
            <span className="text-xs text-orange-600 font-medium">({kitnet.dias_para_vencer}d)</span>
          )}
        </div>
        {kitnet.inquilino && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{kitnet.inquilino.nome}</span>
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
      <PageHeader title="Kitnets" subtitle={`${kitnets.length} unidades`} />

      <FilterPills options={filtroOptions} value={filtro} onChange={setFiltro} />

      {loading ? (
        <LoadingState />
      ) : kitnets.length === 0 ? (
        <EmptyState icon={Home} message="Nenhuma kitnet encontrada" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitnets.map((k) => <KitnetCard key={k.id} kitnet={k} />)}
        </div>
      )}
    </div>
  )
}
