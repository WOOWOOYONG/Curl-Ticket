import { ValidationError } from '../../utils.js'
import { bulletize } from '../../templates/index.js'

export const TITLE_MAX_LENGTH = 200

export function validateTitle(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'Title is required.'
  if (trimmed.length > TITLE_MAX_LENGTH) {
    return `Title cannot exceed ${TITLE_MAX_LENGTH} characters.`
  }
  return ''
}

export function assertValidTitle(value: string): string {
  const error = validateTitle(value)
  if (error) throw new ValidationError(error)
  return value.trim()
}

export function normalizeAcceptanceCriteria(value: string): string {
  return bulletize(value)
}

interface DescriptionSections {
  why: string
  acceptanceCriteria: string
  notes: string
}

/**
 * Split a Markdown description into Why / Acceptance Criteria / Notes sections.
 * Unmatched headings fall through to the section currently being collected;
 * whatever appears before any `## ` heading is treated as the "why" body.
 */
export function parseDescriptionSections(markdown: string): DescriptionSections {
  const sections: DescriptionSections = { why: '', acceptanceCriteria: '', notes: '' }
  const lines = markdown.split('\n')
  let current: keyof DescriptionSections = 'why'
  const buffers: Record<keyof DescriptionSections, string[]> = {
    why: [],
    acceptanceCriteria: [],
    notes: []
  }

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      const name = heading[1].toLowerCase()
      if (name === 'why' || name === 'background' || name === '動機' || name === '為什麼') {
        current = 'why'
        continue
      }
      if (
        name === 'acceptance criteria' ||
        name === 'ac' ||
        name === 'done' ||
        name === '驗收' ||
        name === 'requirements'
      ) {
        current = 'acceptanceCriteria'
        continue
      }
      if (name === 'notes' || name === 'note' || name === '備註') {
        current = 'notes'
        continue
      }
      // Unknown heading — keep it in the current bucket as raw content
      buffers[current].push(line)
      continue
    }
    buffers[current].push(line)
  }

  sections.why = buffers.why.join('\n').trim()
  sections.acceptanceCriteria = buffers.acceptanceCriteria.join('\n').trim()
  sections.notes = buffers.notes.join('\n').trim()
  return sections
}

export function extractRequirementIds(text: string): string[] {
  const re = /\b[A-Z]+-\d+(?:\.\d+)*\b/g
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of text.matchAll(re)) {
    const id = match[0]
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}
