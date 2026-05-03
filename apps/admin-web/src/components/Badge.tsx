interface BadgeProps {
  status: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  OPEN:               { label: 'Aguardando',        className: 'bg-yellow-100 text-yellow-800' },
  DISPATCHED:         { label: 'Despachado',        className: 'bg-blue-100 text-blue-800' },
  ACCEPTED:           { label: 'Aceito',            className: 'bg-indigo-100 text-indigo-800' },
  EN_ROUTE:           { label: 'A caminho',         className: 'bg-purple-100 text-purple-800' },
  IN_PROGRESS:        { label: 'Em execução',       className: 'bg-orange-100 text-orange-800' },
  AWAITING_APPROVAL:  { label: 'Aguard. aprovação', className: 'bg-amber-100 text-amber-800' },
  COMPLETED:          { label: 'Concluído',         className: 'bg-green-100 text-green-800' },
  CANCELLED:          { label: 'Cancelado',         className: 'bg-red-100 text-red-800' },
  REJECTED:           { label: 'Recusado',          className: 'bg-red-100 text-red-800' },
  AVAILABLE:          { label: 'Disponível',        className: 'bg-green-100 text-green-800' },
  BUSY:               { label: 'Ocupado',           className: 'bg-orange-100 text-orange-800' },
  OFFLINE:            { label: 'Offline',           className: 'bg-gray-100 text-gray-600' },
  RESIDENCE:          { label: 'Residência',        className: 'bg-blue-50 text-blue-700' },
  COMPANY:            { label: 'Empresa',           className: 'bg-purple-50 text-purple-700' },
  CONDO:              { label: 'Condomínio',        className: 'bg-teal-50 text-teal-700' },
}

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  LOW:      { label: 'Baixa',    className: 'bg-gray-100 text-gray-600' },
  NORMAL:   { label: 'Normal',   className: 'bg-blue-50 text-blue-700' },
  HIGH:     { label: 'Urgente',  className: 'bg-amber-100 text-amber-800' },
  CRITICAL: { label: 'Crítico',  className: 'bg-red-100 text-red-700' },
}

export function StatusBadge({ status }: BadgeProps) {
  const config = STATUS_MAP[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

export function PriorityBadge({ status }: BadgeProps) {
  const config = PRIORITY_MAP[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}
