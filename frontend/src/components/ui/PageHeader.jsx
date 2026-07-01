export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
