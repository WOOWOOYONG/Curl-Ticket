import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// In the published package the bundled file lives at <packageRoot>/dist/index.js,
// so templates resolve as `<__dirname>/../templates`. When running from source
// (vitest, ts-node), `__dirname` is `<packageRoot>/src/templates`, so we need
// `<__dirname>/../../templates`. Probe both.
const TEMPLATE_DIR_CANDIDATES = [
  join(__dirname, '..', 'templates'),
  join(__dirname, '..', '..', 'templates')
]

const WHY_EMPTY_PLACEHOLDER = '_(not provided)_'

export interface RenderVars {
  why?: string
  acceptance_criteria?: string | string[]
  notes?: string
  references?: string | string[]
}

export async function listTemplates(): Promise<string[]> {
  for (const dir of TEMPLATE_DIR_CANDIDATES) {
    try {
      const entries = await readdir(dir)
      const md = entries.filter((f) => f.endsWith('.md'))
      if (md.length > 0) return md.map((f) => f.slice(0, -3))
    } catch {
      // try next candidate
    }
  }
  return []
}

const templateCache = new Map<string, string>()

export async function loadTemplate(name: string): Promise<string> {
  const cached = templateCache.get(name)
  if (cached !== undefined) return cached
  for (const dir of TEMPLATE_DIR_CANDIDATES) {
    try {
      const content = await readFile(join(dir, `${name}.md`), 'utf-8')
      templateCache.set(name, content)
      return content
    } catch {
      // try next candidate
    }
  }
  const available = await listTemplates()
  throw new TemplateNotFoundError(name, available)
}

export class TemplateNotFoundError extends Error {
  constructor(
    public name: string,
    public available: string[]
  ) {
    super(
      available.length > 0
        ? `Unknown template "${name}". Available: ${available.join(', ')}.`
        : `Unknown template "${name}". No templates are currently registered.`
    )
    this.name = 'TemplateNotFoundError'
  }
}

export function bulletize(value: string | string[]): string {
  const lines = Array.isArray(value)
    ? value
    : value
        .split('\n')
        .map((l) => l.replace(/^\s*-\s*/, ''))
        .map((l) => l.trim())
  const items = lines.map((l) => l.trim()).filter((l) => l.length > 0)
  return items.map((l) => `- ${l}`).join('\n')
}

function isEmpty(value: string | string[] | undefined): boolean {
  if (value == null) return true
  if (Array.isArray(value)) return value.filter((v) => v.trim().length > 0).length === 0
  return value.trim().length === 0
}

function dropSection(template: string, heading: string): string {
  const lines = template.split('\n')
  const startIdx = lines.findIndex((l) => l.trim() === `## ${heading}`)
  if (startIdx === -1) return template
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      endIdx = i
      break
    }
  }
  let removeFrom = startIdx
  while (removeFrom > 0 && lines[removeFrom - 1].trim() === '') {
    removeFrom -= 1
  }
  return [...lines.slice(0, removeFrom), ...lines.slice(endIdx)].join('\n')
}

export function renderTemplateString(source: string, vars: RenderVars): string {
  let out = source

  // Drop empty optional sections first so we don't leave dangling placeholders.
  if (isEmpty(vars.acceptance_criteria)) {
    out = dropSection(out, 'Acceptance Criteria')
  } else {
    out = out.replace('{{acceptance_criteria}}', bulletize(vars.acceptance_criteria!))
  }

  if (isEmpty(vars.notes)) {
    out = dropSection(out, 'Notes')
  } else {
    out = out.replace('{{notes}}', vars.notes!.trim())
  }

  if (isEmpty(vars.references)) {
    out = dropSection(out, 'References')
  } else {
    const refs = Array.isArray(vars.references)
      ? vars.references
      : vars
          .references!.split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
    const seen = new Set<string>()
    const unique = refs.filter((r) => {
      if (seen.has(r)) return false
      seen.add(r)
      return true
    })
    out = out.replace('{{references}}', unique.map((r) => `- ${r}`).join('\n'))
  }

  // why: empty becomes a placeholder marker (section is preserved).
  const why = isEmpty(vars.why) ? WHY_EMPTY_PLACEHOLDER : vars.why!.trim()
  out = out.replace('{{why}}', why)

  return out.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
}

export async function renderTemplate(name: string, vars: RenderVars): Promise<string> {
  const source = await loadTemplate(name)
  return renderTemplateString(source, vars)
}
