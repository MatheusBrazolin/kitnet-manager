import { useEffect, useState } from 'react'
import { getPagamentos, updatePagamento } from '../api'
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'

const statusConfig = {
  pago: { label: 'Pago', icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-700' },
  pendente: { label: 'Pendente', icon: Clock, cls: 'bg-yellow-100 text-yellow-700' },
  atrasado: { label: 'Atrasado', icon: AlertTriangle, cls: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', icon: XCircle, cls: 'bg-slate-100 text-slate-500' },
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pagamentos</h2>
        <p className="text-slate-500 text-sm mt-1">{pagamentos.length} registros</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'Todos'], ['pendente', 'Pendentes'], ['atrasado', 'Atrasados'], ['pago', 'Pagos'], ['cancelado', 'Cancelados']].map(([val, label]) => (
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

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400">Carregando...</div>
        ) : pagamentos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Nenhum pagamento encontrado</div>
        ) : (
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
                const Icon = cfg.icon
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-700">{p.kitnet_nome}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(p.data_esperada + 'T00:00:00').toLocaleDateString('pt-BR')}
                      {p.dias_atraso > 0 && (
                        <span className="text-xs text-red-500 ml-1.5">+{p.dias_atraso}d</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">
                      R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 capitalize">{p.metodo_pagamento}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(p.status === 'pendente' || p.status === 'atrasado') && (
                        <button
                          onClick={() => marcarPago(p.id)}
                          className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                        >
                          Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
