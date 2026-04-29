export type SkillFormat = 'skill-md' | 'plain-md'

export interface AgentConfig {
  id: string
  label: string
  /** Directory under `cwd` where each skill lives in its own `<skill>/SKILL.md`. */
  baseDir: string
  format: SkillFormat
  postInstallHints: string[]
}

export const AGENTS: AgentConfig[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    baseDir: '.claude/skills',
    format: 'skill-md',
    postInstallHints: [
      'Make sure .claude/settings.json permissions.allow includes:',
      '  "Bash(curl-ticket:*)"'
    ]
  },
  {
    id: 'codex',
    label: 'Codex (OpenAI)',
    baseDir: '.agents/skills',
    format: 'skill-md',
    postInstallHints: ['Codex automatically detects skill files in .agents/skills/.']
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    baseDir: '.github/skills',
    format: 'skill-md',
    postInstallHints: ['Copilot automatically detects skill files in .github/skills/.']
  }
]

export function targetPathFor(agent: AgentConfig, skillId: string): string {
  return `${agent.baseDir}/${skillId}/SKILL.md`
}
