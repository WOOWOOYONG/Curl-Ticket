<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  source: string | null | undefined
}>()

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div
    v-if="html"
    class="prose prose-sm dark:prose-invert max-w-none"
    v-html="html"
  />
</template>
