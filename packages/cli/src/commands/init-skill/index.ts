import { join } from 'node:path'
import { AGENTS } from './agents.js'
import { askCheckbox, askConfirm, askText } from './prompts.js'
import { transformContent } from './transform.js'
import { fileExists, readSourceSkill, writeSkillFile } from './file-ops.js'

interface Target {
  path: string
  format: 'skill-md' | 'cursor-mdc' | 'plain-md'
  hints: string[]
}

export async function initSkillCommand(): Promise<void> {
  const sourceContent = await readSourceSkill()

  const choices = [
    ...AGENTS.map((a, i) => ({
      name: `${a.label.padEnd(20)} → ${a.targetPath}`,
      value: i
    })),
    { name: 'Custom path', value: AGENTS.length }
  ]

  const selected = await askCheckbox('Select your coding agent(s):', choices)

  const targets: Target[] = []

  for (const idx of selected) {
    if (idx < AGENTS.length) {
      const agent = AGENTS[idx]
      targets.push({
        path: join(process.cwd(), agent.targetPath),
        format: agent.format,
        hints: agent.postInstallHints
      })
    } else {
      const customPath = await askText('Enter target file path (e.g. .windsurf/skills/curl-ticket/SKILL.md):')
      targets.push({
        path: join(process.cwd(), customPath),
        format: 'plain-md',
        hints: []
      })
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

    const content = transformContent(sourceContent, target.format)
    await writeSkillFile(target.path, content)
    console.log(`Created ${target.path}`)

    for (const hint of target.hints) {
      console.log(hint)
    }
  }
}
