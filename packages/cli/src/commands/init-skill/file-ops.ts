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

export async function readSourceSkill(): Promise<string> {
  // Source skill file is bundled alongside dist/
  // In the npm package: skills/curl-ticket/SKILL.md
  // Relative to dist/index.js: ../skills/curl-ticket/SKILL.md
  const sourceFile = join(__dirname, '..', 'skills', 'curl-ticket', 'SKILL.md')

  try {
    return await readFile(sourceFile, 'utf-8')
  } catch {
    throw new Error('Skill file not found. Please verify the CLI installation is complete.')
  }
}

export async function writeSkillFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await fsWriteFile(path, content, 'utf-8')
}
