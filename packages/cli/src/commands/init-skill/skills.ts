export interface SkillManifestEntry {
  /** Directory name under `<packageRoot>/skills/` and target subdirectory name. */
  id: string
  /** Display label shown in selection prompts. */
  label: string
  /** One-line summary surfaced in selection prompts and docs. */
  description: string
}

export const SKILLS: SkillManifestEntry[] = [
  {
    id: 'curl-ticket',
    label: 'curl-ticket-issue-analyzer',
    description: 'Query and analyze existing issues, locate problematic code, suggest fixes'
  },
  {
    id: 'curl-ticket-create-task',
    label: 'curl-ticket-create-task',
    description: 'Guided interactive task creation (project / title / why / AC / assignee)'
  }
]

export function getSkillById(id: string): SkillManifestEntry | undefined {
  return SKILLS.find((s) => s.id === id)
}
