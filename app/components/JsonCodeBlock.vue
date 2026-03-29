<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    content?: string
    readOnly?: boolean
    placeholder?: string
    rows?: number
    language?: string
    showHeader?: boolean
    headerLabel?: string
    showLineNumbers?: boolean
    bordered?: boolean
    lineNumberOffsetClass?: string
    lineNumberPaddingTopClass?: string
    lineNumberClass?: string
    surfaceClass?: string
    contentPaddingClass?: string
    fallbackClass?: string
    wrap?: 'off' | 'soft' | 'hard'
  }>(),
  {
    readOnly: false,
    placeholder: '',
    rows: 8,
    language: 'json',
    showHeader: true,
    headerLabel: 'JSON',
    showLineNumbers: true,
    bordered: true,
    lineNumberOffsetClass: 'pl-12',
    lineNumberPaddingTopClass: 'pt-3',
    lineNumberClass: 'bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-800',
    surfaceClass: 'bg-white dark:bg-gray-900',
    contentPaddingClass: 'p-3',
    fallbackClass: 'text-blue-400',
    wrap: 'off'
  }
)

const model = defineModel<string>({ default: '' })

const emit = defineEmits<{
  (event: 'input', value: string): void
  (event: 'focus' | 'blur'): void
}>()

const focused = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const displayValue = computed(() => {
  if (props.readOnly) return props.content ?? ''
  return model.value
})

const lines = computed(() => {
  if (!props.showLineNumbers || !displayValue.value) return []
  return displayValue.value.split('\n')
})

const hasLineNumbers = computed(() => props.showLineNumbers && lines.value.length > 0)

const lineOffsetClass = computed(() => (hasLineNumbers.value ? props.lineNumberOffsetClass : ''))

const { highlightedHtml, highlight, clear } = useShikiHighlighter()

async function maybeHighlight(value: string) {
  if (!value.trim()) {
    clear()
    return
  }

  if (props.language === 'json') {
    try {
      JSON.parse(value)
    } catch {
      clear()
      return
    }
  }

  await highlight(value, props.language)
}

watch(
  displayValue,
  (value) => {
    if (props.readOnly || !focused.value) {
      void maybeHighlight(value)
    }
  },
  { immediate: true }
)

function handleInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  model.value = value
  emit('input', value)
}

function handleFocus() {
  focused.value = true
  emit('focus')
}

async function handleBlur() {
  focused.value = false
  emit('blur')
  await nextTick()
  await maybeHighlight(displayValue.value)
}

function focusEditor() {
  if (props.readOnly || focused.value) return
  focused.value = true
  nextTick(() => textareaRef.value?.focus())
}
</script>

<template>
  <div
    :class="[
      bordered ? 'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800' : ''
    ]"
  >
    <div
      v-if="showHeader"
      class="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
    >
      <span class="text-xs font-medium text-gray-500 uppercase">
        {{ headerLabel }}
      </span>
      <span
        v-if="lines.length > 0"
        class="text-xs text-gray-400"
      >
        {{ $t('common.lines', { count: lines.length }) }}
      </span>
    </div>
    <div
      class="relative overflow-x-auto"
      :class="surfaceClass"
      @click="focusEditor"
    >
      <div
        v-if="hasLineNumbers"
        class="absolute top-0 bottom-0 left-0 z-20 flex w-10 flex-col pr-2 text-right font-mono text-xs text-gray-400 select-none"
        :class="[lineNumberPaddingTopClass, lineNumberClass]"
      >
        <span
          v-for="(_, index) in lines"
          :key="index"
          class="text-sm leading-relaxed"
        >
          {{ index + 1 }}
        </span>
      </div>

      <template v-if="readOnly">
        <!-- oxlint-disable vue/no-v-html -->
        <div
          v-if="highlightedHtml"
          class="shiki-container pointer-events-none overflow-x-auto"
          :class="lineOffsetClass"
          v-html="highlightedHtml"
        />
        <!-- oxlint-enable vue/no-v-html -->
        <pre
          v-else
          class="w-full overflow-x-auto bg-transparent font-mono text-sm leading-relaxed"
          :class="[lineOffsetClass, contentPaddingClass, fallbackClass]"
        ><code>{{ displayValue }}</code></pre>
      </template>
      <template v-else>
        <!-- oxlint-disable vue/no-v-html -->
        <div
          v-if="highlightedHtml && !focused"
          class="shiki-container pointer-events-none overflow-x-auto"
          :class="lineOffsetClass"
          v-html="highlightedHtml"
        />
        <!-- oxlint-enable vue/no-v-html -->
        <textarea
          v-show="focused || !highlightedHtml"
          ref="textareaRef"
          :value="displayValue"
          :placeholder="placeholder"
          :rows="rows"
          :wrap="wrap"
          class="relative z-10 w-full resize-none overflow-x-auto bg-transparent font-mono text-sm leading-relaxed focus:outline-none"
          :class="[
            contentPaddingClass,
            lineOffsetClass,
            highlightedHtml && !focused
              ? 'text-transparent caret-gray-900 dark:caret-white'
              : 'text-gray-900 dark:text-white'
          ]"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.shiki-container :deep(pre) {
  margin: 0;
  padding: 0.75rem;
  background: transparent !important;
  font-size: 0.875rem;
  line-height: 1.625;
}

.shiki-container :deep(code) {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  line-height: inherit;
}

.shiki-container :deep(.shiki) {
  background: transparent !important;
}

.shiki-container :deep(.shiki span) {
  line-height: inherit;
}
</style>
