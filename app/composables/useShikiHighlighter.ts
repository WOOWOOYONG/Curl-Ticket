import { createHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null

async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'dracula'],
      langs: ['json']
    }).then((h) => {
      highlighter = h
      return h
    })
  }
  return highlighterPromise
}

export function useShikiHighlighter() {
  const highlightedHtml = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function highlight(code: string, lang: string = 'json') {
    if (!code.trim()) {
      highlightedHtml.value = ''
      return
    }

    // Only run on client side
    if (import.meta.server) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const h = await getHighlighter()
      const html = h.codeToHtml(code, {
        lang,
        themes: {
          light: 'github-light',
          dark: 'dracula'
        }
      })
      highlightedHtml.value = html
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to highlight'
      highlightedHtml.value = ''
    } finally {
      isLoading.value = false
    }
  }

  return {
    highlightedHtml,
    isLoading,
    error,
    highlight
  }
}
