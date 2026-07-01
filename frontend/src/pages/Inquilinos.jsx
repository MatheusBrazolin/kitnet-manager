import { useEffect, useState } from 'react'
import { getInquilinos } from '../api'
import { User, Phone, Mail, Calendar } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'

export default function Inquilinos() {
  const [inquilinos, setInquilinos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInquilinos().then((r) => {
      setInquilinos(r.data.results ?? r.data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Inquilinos" subtitle={`${inquilinos.length} cadastrados`} />

      {loading ? (
        <LoadingState />
      ) : inquilinos.length === 0 ? (
        <EmptyState icon={User} message="Nenhum inquilino cadastrado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inquilinos.map((i) => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <User size={18} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{i.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {i.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {i.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{i.telefone}</span>
                  </div>
                )}
                {i.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{i.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  Desde {new Date(i.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
