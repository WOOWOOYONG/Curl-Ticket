import { join } from 'node:path'
import { AGENTS, targetPathFor, type AgentConfig } from './agents.js'
import { SKILLS } from './skills.js'
import { askCheckbox, askConfirm, askText } from './prompts.js'
import { transformContent } from './transform.js'
import { fileExists, readSkillSource, writeSkillFile } from './file-ops.js'

interface ResolvedTarget {
  skillId: string
  agent: AgentConfig | null
  path: string
  hints: string[]
}

export async function initSkillCommand(): Promise<void> {
  // 1. Pick skills (default: all).
  const skillChoices = SKILLS.map((s, i) => ({
    name: `${s.label.padEnd(34)} — ${s.description}`,
    value: i,
    checked: true
  }))
  const selectedSkillIdx = await askCheckbox('Select skill(s) to install:', skillChoices)
  const selectedSkills = selectedSkillIdx.map((i) => SKILLS[i])

  // 2. Pick agents (one or more), or a custom path.
  const agentChoices = [
    ...AGENTS.map((a, i) => ({
      name: `${a.label.padEnd(20)} → ${a.baseDir}`,
      value: i
    })),
    { name: 'Custom path', value: AGENTS.length }
  ]
  const selectedAgentIdx = await askCheckbox('Select your coding agent(s):', agentChoices)

  const targets: ResolvedTarget[] = []
  for (const skill of selectedSkills) {
    for (const idx of selectedAgentIdx) {
      if (idx < AGENTS.length) {
        const agent = AGENTS[idx]
        targets.push({
          skillId: skill.id,
          agent,
          path: join(process.cwd(), targetPathFor(agent, skill.id)),
          hints: agent.postInstallHints
        })
      } else {
        const customPath = await askText(
          `Enter target file path for "${skill.label}" (e.g. .foo/skills/${skill.id}/SKILL.md):`
        )
        targets.push({
          skillId: skill.id,
          agent: null,
          path: join(process.cwd(), customPath),
          hints: []
        })
      }
    }
  }

  for (const target of targets) {
    if (await fileExists(target.path)) {
      const overwrite = await askConfirm(`${target.path} already exists. Overwrite?`)
      if (!overwrite) {
        console.log(`Skipped ${target.path}`)
        continue
      }
    }

    const source = await readSkillSource(target.skillId)
    const format = target.agent?.format ?? 'plain-md'
    const content = transformContent(source, format)
    await writeSkillFile(target.path, content)
    console.log(`Created ${target.path}`)

    for (const hint of target.hints) {
      console.log(hint)
    }
  }
}
