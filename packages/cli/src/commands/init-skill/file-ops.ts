import { readFile, writeFile as fsWriteFile, mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve a skill source file from the installed package layout:
 *   <packageRoot>/skills/<skillId>/SKILL.md
 * Relative to dist/index.js, that is `../skills/<skillId>/SKILL.md`.
 */
export async function readSkillSource(skillId: string): Promise<string> {
  const sourceFile = join(__dirname, '..', 'skills', skillId, 'SKILL.md')
  try {
    return await readFile(sourceFile, 'utf-8')
  } catch {
    throw new Error(
      `Skill source for "${skillId}" not found. Verify the CLI installation is complete.`
    )
  }
}

export async function writeSkillFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await fsWriteFile(path, content, 'utf-8')
}
