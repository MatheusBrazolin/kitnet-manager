export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center py-16 text-slate-400">
      {Icon && <Icon size={48} className="mx-auto mb-3 opacity-30" />}
      <p>{message}</p>
    </div>
  )
}
