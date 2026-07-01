export default function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            value === val
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
