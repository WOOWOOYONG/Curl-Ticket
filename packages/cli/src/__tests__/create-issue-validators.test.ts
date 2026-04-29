import { describe, it, expect } from 'vitest'
import {
  validateTitle,
  normalizeAcceptanceCriteria,
  parseDescriptionSections,
  extractRequirementIds
} from '../commands/create-issue/validators.js'

describe('validateTitle', () => {
  it('rejects empty titles', () => {
    expect(validateTitle('')).toMatch(/required/i)
    expect(validateTitle('   ')).toMatch(/required/i)
  })

  it('rejects titles longer than 200 chars', () => {
    expect(validateTitle('x'.repeat(201))).toMatch(/200/)
  })

  it('accepts titles in range', () => {
    expect(validateTitle('A reasonable title')).toBe('')
  })
})

describe('normalizeAcceptanceCriteria', () => {
  it('strips leading "- " and re-bullets each non-empty line', () => {
    expect(normalizeAcceptanceCriteria('- one\n  - two\nthree\n')).toBe('- one\n- two\n- three')
  })

  it('returns empty string for blank input', () => {
    expect(normalizeAcceptanceCriteria('   \n\n')).toBe('')
  })
})

describe('parseDescriptionSections', () => {
  it('splits Why / Acceptance Criteria / Notes by heading', () => {
    const md = `## Why\nbecause\n\n## Acceptance Criteria\n- a\n- b\n\n## Notes\nextra`
    const sections = parseDescriptionSections(md)
    expect(sections.why).toBe('because')
    expect(sections.acceptanceCriteria).toBe('- a\n- b')
    expect(sections.notes).toBe('extra')
  })

  it('treats unheaded prefix as the why bucket', () => {
    const md = `something here\n\n## Acceptance Criteria\n- a`
    const sections = parseDescriptionSections(md)
    expect(sections.why).toContain('something here')
    expect(sections.acceptanceCriteria).toBe('- a')
  })

  it('matches Chinese aliases (動機, 驗收, 備註)', () => {
    const md = `## 動機\n為什麼\n\n## 驗收\n- ok\n\n## 備註\nextra`
    const sections = parseDescriptionSections(md)
    expect(sections.why).toBe('為什麼')
    expect(sections.acceptanceCriteria).toBe('- ok')
    expect(sections.notes).toBe('extra')
  })
})

describe('extractRequirementIds', () => {
  it('finds tokens matching [A-Z]+-\\d+(\\.\\d+)*', () => {
    expect(extractRequirementIds('See AUTH-1, PERF-3.2 and AUTH-1 again.')).toEqual([
      'AUTH-1',
      'PERF-3.2'
    ])
  })

  it('returns empty for no matches', () => {
    expect(extractRequirementIds('plain text')).toEqual([])
  })
})
