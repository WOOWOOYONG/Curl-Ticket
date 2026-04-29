import type { SkillFormat } from './agents.js'

interface ParsedSkill {
  frontmatter: Record<string, string>
  body: string
}

function parseFrontmatter(source: string): ParsedSkill {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: source }
  }

  const rawYaml = match[1]
  const body = match[2]
  const frontmatter: Record<string, string> = {}

  let currentKey = ''
  let currentValue = ''

  for (const line of rawYaml.split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim()
      }
      currentKey = kvMatch[1]
      const value = kvMatch[2]
      currentValue = value === '>' ? '' : value
    } else if (currentKey && line.startsWith('  ')) {
      currentValue += (currentValue ? ' ' : '') + line.trim()
    }
  }
  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim()
  }

  return { frontmatter, body }
}

function toPlainMd(source: string): string {
  const { body } = parseFrontmatter(source)
  return body.startsWith('\n') ? body.slice(1) : body
}

export function transformContent(source: string, format: SkillFormat): string {
  switch (format) {
    case 'skill-md':
      return source
    case 'plain-md':
      return toPlainMd(source)
  }
}
