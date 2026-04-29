import { describe, it, expect } from 'vitest'
import { renderTemplateString } from '../templates/index.js'

const SOURCE = `## Why
{{why}}

## Acceptance Criteria
{{acceptance_criteria}}

## Notes
{{notes}}

## References
{{references}}
`

describe('renderTemplateString', () => {
  it('substitutes all placeholders when every field is provided', () => {
    const out = renderTemplateString(SOURCE, {
      why: 'API is slow',
      acceptance_criteria: ['p99 < 200ms', 'Errors < 0.1%'],
      notes: 'Owner: backend',
      references: ['AUTH-1', 'PERF-3.2']
    })
    expect(out).toContain('## Why\nAPI is slow')
    expect(out).toContain('## Acceptance Criteria\n- p99 < 200ms\n- Errors < 0.1%')
    expect(out).toContain('## Notes\nOwner: backend')
    expect(out).toContain('## References\n- AUTH-1\n- PERF-3.2')
  })

  it('replaces empty why with _(not provided)_ marker', () => {
    const out = renderTemplateString(SOURCE, {
      why: '',
      acceptance_criteria: ['x']
    })
    expect(out).toContain('## Why\n_(not provided)_')
  })

  it('drops Acceptance Criteria section entirely when empty', () => {
    const out = renderTemplateString(SOURCE, {
      why: 'because',
      acceptance_criteria: ''
    })
    expect(out).not.toContain('## Acceptance Criteria')
    expect(out).not.toContain('{{acceptance_criteria}}')
  })

  it('drops Notes section when empty', () => {
    const out = renderTemplateString(SOURCE, { why: 'x', acceptance_criteria: ['a'], notes: '' })
    expect(out).not.toContain('## Notes')
  })

  it('drops References section when empty', () => {
    const out = renderTemplateString(SOURCE, {
      why: 'x',
      acceptance_criteria: ['a'],
      references: []
    })
    expect(out).not.toContain('## References')
  })

  it('renders references as bullet list and dedupes preserving order', () => {
    const out = renderTemplateString(SOURCE, {
      why: 'x',
      acceptance_criteria: ['a'],
      references: ['AUTH-1', 'PERF-3', 'AUTH-1']
    })
    const refsBlock = out.split('## References')[1]
    expect(refsBlock).toContain('- AUTH-1')
    expect(refsBlock).toContain('- PERF-3')
    expect(refsBlock!.match(/AUTH-1/g)).toHaveLength(1)
  })

  it('strips leading "- " from acceptance criteria lines and re-bullets', () => {
    const out = renderTemplateString(SOURCE, {
      why: 'x',
      acceptance_criteria: '- one\n  - two\nthree'
    })
    expect(out).toContain('- one\n- two\n- three')
  })

  it('drops all optional sections at once', () => {
    const out = renderTemplateString(SOURCE, { why: 'just because' })
    expect(out).toContain('## Why\njust because')
    expect(out).not.toContain('## Acceptance Criteria')
    expect(out).not.toContain('## Notes')
    expect(out).not.toContain('## References')
    expect(out).not.toContain('{{')
  })
})
