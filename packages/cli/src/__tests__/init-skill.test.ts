import { describe, it, expect } from 'vitest'
import { SKILLS, getSkillById } from '../commands/init-skill/skills.js'
import { AGENTS, targetPathFor } from '../commands/init-skill/agents.js'

describe('init-skill manifest', () => {
  it('exposes both bundled skills', () => {
    const ids = SKILLS.map((s) => s.id)
    expect(ids).toContain('curl-ticket')
    expect(ids).toContain('curl-ticket-create-task')
  })

  it('looks up entries by id', () => {
    expect(getSkillById('curl-ticket-create-task')?.label).toBe('curl-ticket-create-task')
    expect(getSkillById('does-not-exist')).toBeUndefined()
  })
})

describe('targetPathFor', () => {
  it('builds <baseDir>/<skill>/SKILL.md for directory-style agents', () => {
    const claude = AGENTS.find((a) => a.id === 'claude-code')!
    expect(targetPathFor(claude, 'curl-ticket-create-task')).toBe(
      '.claude/skills/curl-ticket-create-task/SKILL.md'
    )
  })

  it('does not include cursor as a target agent', () => {
    expect(AGENTS.find((a) => a.id === 'cursor')).toBeUndefined()
  })
})
