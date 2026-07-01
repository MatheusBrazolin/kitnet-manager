export default function LoadingState({ label = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
      <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
      {label}
    </div>
  )
}
