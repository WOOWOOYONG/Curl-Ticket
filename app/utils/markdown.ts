import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const ALLOWED_PROTOCOL = /^(https?:|mailto:|\/)/i
const HTTP_LINK = /^https?:\/\//i

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

md.validateLink = (url: string) => ALLOWED_PROTOCOL.test(url.trim())

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token && HTTP_LINK.test(token.attrGet('href') || '')) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderMarkdown(source: string | null | undefined): string {
  const raw = source?.trim()
  if (!raw) return ''
  return sanitizeHtml(md.render(raw), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  })
}
