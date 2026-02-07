/**
 * Format date as "Oct 24, 2023 • 14:20"
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month} ${day}, ${year} • ${hours}:${minutes}`
}

/**
 * Format date as "YYYY/MM/DD HH:mm"
 */
export function formatDateTime(date: Date | string): string {
  return useDateFormat(date, 'YYYY/MM/DD HH:mm').value
}
