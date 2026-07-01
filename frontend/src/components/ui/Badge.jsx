export default function Badge({ icon: Icon, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${className}`}
    >
      {Icon && <Icon size={12} />}
      {children}
    </span>
  )
}
