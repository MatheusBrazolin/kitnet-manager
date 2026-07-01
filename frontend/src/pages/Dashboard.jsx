import { useEffect, useState } from 'react'
import { getDashboard, getPagamentos } from '../api'
import { Home, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import LoadingState from '../components/ui/LoadingState'
import Badge from '../components/ui/Badge'

const statusColor = {
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-yellow-100 text-yellow-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-500',
}

const statusLabel = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboard(), getPagamentos({ ordering: '-data_esperada' })]).then(
      ([d, p]) => {
        setStats(d.data)
        setPagamentos(p.data.results?.slice(0, 8) ?? p.data.slice(0, 8))
        setLoading(false)
      }
    )
  }, [])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral das suas kitnets" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Home} label="Total de Kitnets" value={stats.total_kitnets} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={CheckCircle} label="Alugadas" value={stats.alugadas} color="bg-emerald-50 text-emerald-600" sub={`${stats.vagas} vagas`} />
        <StatCard icon={DollarSign} label="Receita Mensal" value={`R$ ${Number(stats.total_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Pagamentos Atrasados" value={stats.pagamentos_atrasados} color="bg-red-50 text-red-600" sub={`${stats.pagamentos_pendentes} pendentes`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Últimos Pagamentos</h3>
        </div>
        <div className="overflow-x-auto">
          {pagamentos.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">Nenhum pagamento encontrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-medium text-slate-500">Kitnet</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Vencimento</th>
                  <th className="px-5 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">{p.kitnet_nome}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(p.data_esperada + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={statusColor[p.status]}>{statusLabel[p.status]}</Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-700 text-right whitespace-nowrap">
                      R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
