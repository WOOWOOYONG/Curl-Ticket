<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() =>
  locales.value.map(l => ({
    label: typeof l === 'string' ? l : l.name || l.code,
    value: typeof l === 'string' ? l : l.code
  }))
)

function onLocaleChange(value: string) {
  setLocale(value)
}
</script>

<template>
  <USelect
    :model-value="locale"
    :items="availableLocales"
    size="sm"
    class="w-28"
    @update:model-value="onLocaleChange"
  />
</template>
