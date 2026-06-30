import { useEffect, useState } from 'react'
import { getInquilinos } from '../api'
import { User, Phone, Mail, Calendar } from 'lucide-react'

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Inquilinos</h2>
        <p className="text-slate-500 text-sm mt-1">{inquilinos.length} cadastrados</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">Carregando...</div>
      ) : inquilinos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum inquilino cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inquilinos.map((i) => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{i.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {i.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {i.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400" />
                    {i.telefone}
                  </div>
                )}
                {i.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    {i.email}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400" />
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
