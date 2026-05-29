export type CategoryCode = 'HID' | 'CIV' | 'SER' | 'ELE'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

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