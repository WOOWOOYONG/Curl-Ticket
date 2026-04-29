<script setup lang="ts">
defineProps<{
  description: string | null | undefined
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="rounded-xl border border-slate-200/70 bg-white p-6 dark:border-slate-800/70 dark:bg-slate-900/50"
  >
    <h3
      class="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
    >
      {{ t('issues.description') }}
    </h3>
    <MarkdownRenderer
      v-if="description && description.trim()"
      :source="description"
    />
    <p
      v-else
      class="text-sm text-slate-400 italic dark:text-slate-500"
    >
      {{ t('common.noDescription') }}
    </p>
  </div>
</template>
