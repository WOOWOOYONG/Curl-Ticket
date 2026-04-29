<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'

const props = defineProps<{
  source: string | null | undefined
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const ALLOWED_PROTOCOL = /^(https?:|mailto:|\/)/i

md.validateLink = (url: string) => ALLOWED_PROTOCOL.test(url.trim())

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token) {
    const href = token.attrGet('href') || ''
    if (/^https?:\/\//i.test(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const html = computed(() => {
  const raw = props.source?.trim()
  if (!raw) return ''
  return DOMPurify.sanitize(md.render(raw))
})
</script>

<template>
  <div
    v-if="html"
    class="prose prose-sm dark:prose-invert max-w-none"
    v-html="html"
  />
</template>
