const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 }
]

export function useRelativeTime() {
  const { locale } = useI18n()
  const initialNow = useState<number>('relative-time-now', () => Date.now())
  const now = ref(initialNow.value)
  const intervalId = ref<number | null>(null)

  onMounted(() => {
    now.value = Date.now()
    intervalId.value = window.setInterval(() => {
      now.value = Date.now()
    }, 60 * 1000)
  })

  onBeforeUnmount(() => {
    if (intervalId.value !== null) {
      window.clearInterval(intervalId.value)
    }
  })

  const formatter = computed(
    () => new Intl.RelativeTimeFormat(locale.value || undefined, { numeric: 'auto' })
  )

  function formatRelative(input: string | number | Date | null | undefined) {
    if (!input) return ''

    const value = input instanceof Date ? input.getTime() : new Date(input).getTime()
    if (Number.isNaN(value)) return ''

    const diff = value - now.value
    const abs = Math.abs(diff)

    for (const { unit, ms } of RELATIVE_TIME_UNITS) {
      if (abs >= ms || unit === 'second') {
        return formatter.value.format(Math.round(diff / ms), unit)
      }
    }

    return ''
  }

  return { formatRelative }
}
