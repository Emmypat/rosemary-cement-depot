import { format, parseISO } from 'date-fns'

export function formatCurrency(amount) {
  if (amount == null) return '₦0.00'
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, 'dd MMM yyyy, HH:mm')
  } catch {
    return dateStr
  }
}
