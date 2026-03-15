export type SkillFormat = 'skill-md' | 'cursor-mdc' | 'plain-md'

export interface AgentConfig {
  id: string
  label: string
  targetPath: string
  format: SkillFormat
  postInstallHints: string[]
}

export const AGENTS: AgentConfig[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    targetPath: '.claude/skills/curl-ticket/SKILL.md',
    format: 'skill-md',
    postInstallHints: [
      'Make sure .claude/settings.json permissions.allow includes:',
      '  "Bash(curl-ticket:*)"'
    ]
  },
  {
    id: 'codex',
    label: 'Codex (OpenAI)',
    targetPath: '.agents/skills/curl-ticket/SKILL.md',
    format: 'skill-md',
    postInstallHints: [
      'Codex automatically detects skill files in .agents/skills/.'
    ]
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    targetPath: '.github/skills/curl-ticket/SKILL.md',
    format: 'skill-md',
    postInstallHints: [
      'Copilot automatically detects skill files in .github/skills/.'
    ]
  },
  {
    id: 'cursor',
    label: 'Cursor',
    targetPath: '.cursor/rules/curl-ticket.mdc',
    format: 'cursor-mdc',
    postInstallHints: [
      'Cursor automatically loads rule files from .cursor/rules/.'
    ]
  }
]
