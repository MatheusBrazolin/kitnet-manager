import { useEffect, useState } from 'react'
import { getPagamentos, updatePagamento } from '../api'
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import FilterPills from '../components/ui/FilterPills'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import Badge from '../components/ui/Badge'

const statusConfig = {
  pago: { label: 'Pago', icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-700' },
  pendente: { label: 'Pendente', icon: Clock, cls: 'bg-yellow-100 text-yellow-700' },
  atrasado: { label: 'Atrasado', icon: AlertTriangle, cls: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', icon: XCircle, cls: 'bg-slate-100 text-slate-500' },
}

const filtroOptions = [
  ['', 'Todos'],
  ['pendente', 'Pendentes'],
  ['atrasado', 'Atrasados'],
  ['pago', 'Pagos'],
  ['cancelado', 'Cancelados'],
]

function formatValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatData(data) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

function MarcarPagoButton({ pagamento, onMarcarPago }) {
  if (pagamento.status !== 'pendente' && pagamento.status !== 'atrasado') return null
  return (
    <button
      onClick={() => onMarcarPago(pagamento.id)}
      className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
    >
      Marcar pago
    </button>
  )
}

function PagamentoCard({ pagamento, onMarcarPago }) {
  const cfg = statusConfig[pagamento.status]
  const Icon = cfg.icon
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-700">{pagamento.kitnet_nome}</p>
        <Badge icon={Icon} className={cfg.cls}>{cfg.label}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {formatData(pagamento.data_esperada)}
          {pagamento.dias_atraso > 0 && (
            <span className="text-xs text-red-500 ml-1.5">+{pagamento.dias_atraso}d</span>
          )}
        </span>
        <span className="font-semibold text-slate-700">{formatValor(pagamento.valor)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 capitalize">{pagamento.metodo_pagamento}</span>
        <MarcarPagoButton pagamento={pagamento} onMarcarPago={onMarcarPago} />
      </div>
    </div>
  )
}

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (status) => {
    setLoading(true)
    getPagamentos(status ? { status } : {}).then((r) => {
      setPagamentos(r.data.results ?? r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load(filtro) }, [filtro])

  const marcarPago = async (id) => {
    await updatePagamento(id, { status: 'pago', data_recebimento: new Date().toISOString().split('T')[0] })
    load(filtro)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pagamentos" subtitle={`${pagamentos.length} registros`} />

      <FilterPills options={filtroOptions} value={filtro} onChange={setFiltro} />

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : pagamentos.length === 0 ? (
          <EmptyState message="Nenhum pagamento encontrado" />
        ) : (
          <>
            <div className="sm:hidden divide-y divide-slate-100">
              {pagamentos.map((p) => (
                <PagamentoCard key={p.id} pagamento={p} onMarcarPago={marcarPago} />
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 font-medium text-slate-500">Kitnet</th>
                    <th className="px-5 py-3 font-medium text-slate-500">Vencimento</th>
                    <th className="px-5 py-3 font-medium text-slate-500">Valor</th>
                    <th className="px-5 py-3 font-medium text-slate-500">Método</th>
                    <th className="px-5 py-3 font-medium text-slate-500">Status</th>
                    <th className="px-5 py-3 font-medium text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagamentos.map((p) => {
                    const cfg = statusConfig[p.status]
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">{p.kitnet_nome}</td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                          {formatData(p.data_esperada)}
                          {p.dias_atraso > 0 && (
                            <span className="text-xs text-red-500 ml-1.5">+{p.dias_atraso}d</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                          {formatValor(p.valor)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 capitalize whitespace-nowrap">{p.metodo_pagamento}</td>
                        <td className="px-5 py-3.5">
                          <Badge icon={cfg.icon} className={cfg.cls}>{cfg.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <MarcarPagoButton pagamento={p} onMarcarPago={marcarPago} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
