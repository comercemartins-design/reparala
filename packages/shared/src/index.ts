// ============================================================
// REPARA LÁ — Tipos compartilhados entre todos os apps
// ============================================================

// ── ENUMS ────────────────────────────────────────────────────

export type Role = 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
export type ClientType = 'RESIDENCE' | 'COMPANY' | 'CONDO'
export type TechStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
export type MediaPhase = 'REPORT' | 'COMPLETION'

export type OrderStatus =
  | 'OPEN'
  | 'DISPATCHED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'

// ── CATEGORIAS DO PROBLEMA ───────────────────────────────────

export const CATEGORIES = {
  HID: { label: 'Hidráulica', icon: '💧', color: '#3B82F6' },
  CIV: { label: 'Civil',      icon: '🏗️', color: '#F59E0B' },
  SER: { label: 'Serralheria',icon: '🔩', color: '#6B7280' },
  ELE: { label: 'Elétrica', icon: '⚡', color: '#EAB308' },
} as const

export type CategoryCode = keyof typeof CATEGORIES

export const SUBCATEGORIES: Record<CategoryCode, Record<string, string>> = {
  HID: {
    VAZ: 'Vazamento',
    ENT: 'Entupimento',
    TOR: 'Torneira/Registro',
    CIS: 'Caixa d\'água/Cisterna',
    VAL: 'Válvula/Descarga',
    OUT: 'Outro',
  },
  CIV: {
    TRI: 'Trinca/Rachadura',
    REV: 'Revestimento/Piso',
    PIN: 'Pintura',
    TEL: 'Telhado/Calha',
    DRE: 'Drenagem',
    OUT: 'Outro',
  },
  SER: {
    POR: 'Porta/Portão',
    GRA: 'Grade/Cerca',
    COR: 'Corrimão/Escada',
    FEC: 'Fechadura/Maçaneta',
    CHA: 'Chaveiro',
    OUT: 'Outro',
  },
  ELE: {
    QDA: 'Quadro/Disjuntor',
    TOM: 'Tomada/Interruptor',
    FIA: 'Fiação/Cabeamento',
    ILU: 'Iluminação',
    CUR: 'Curto-Circuito',
    OUT: 'Outro',
  },
}

// ── PRIORIDADES ──────────────────────────────────────────────

export const PRIORITIES: Record<Priority, { label: string; slaHours: number; color: string }> = {
  LOW:      { label: 'Agendado',  slaHours: 72, color: '#6B7280' },
  NORMAL:   { label: 'Normal',    slaHours: 24, color: '#3B82F6' },
  HIGH:     { label: 'Urgente',   slaHours: 4,  color: '#F59E0B' },
  CRITICAL: { label: 'Crítico',   slaHours: 1,  color: '#EF4444' },
}

// ── STATUS DOS CHAMADOS ──────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  OPEN:               'Aguardando técnico',
  DISPATCHED:         'Técnico notificado',
  ACCEPTED:           'Técnico a caminho',
  EN_ROUTE:           'A caminho',
  IN_PROGRESS:        'Em execução',
  AWAITING_APPROVAL:  'Aguardando sua aprovação',
  COMPLETED:          'Concluído',
  CANCELLED:          'Cancelado',
  REJECTED:           'Recusado',
}

// ── GERAÇÃO DO CÓDIGO DE PROBLEMA ───────────────────────────

export function generateProblemCode(
  category: CategoryCode,
  subcategory: string,
  priority: Priority
): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const hash = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `${category}.${subcategory}.${priority.slice(0, 3)}.${hash}`
}
// ex: "HID.VAZ.NRM.A3F2"

// ── TIPOS DE API ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
