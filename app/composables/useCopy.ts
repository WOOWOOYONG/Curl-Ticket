interface CopyOptions {
  /** Toast 標題，預設 'Copied' */
  title?: string
  /** Toast 描述 */
  description?: string
}

export function useCopy() {
  const { copy, isSupported } = useClipboard()
  const toast = useToast()

  async function copyToClipboard(text: string, options: CopyOptions = {}) {
    if (!isSupported.value) {
      toast.add({
        title: 'Error',
        description: 'Clipboard not supported in this browser',
        color: 'error'
      })
      return false
    }

    try {
      await copy(text)
      toast.add({
        title: options.title ?? 'Copied',
        description: options.description ?? 'Copied to clipboard',
        color: 'success'
      })
      return true
    } catch {
      toast.add({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        color: 'error'
      })
      return false
    }
  }

  return {
    copyToClipboard,
    isSupported
  }
}
