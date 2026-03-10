import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function askConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer: string) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

export async function initSkillCommand(): Promise<void> {
  const targetDir = join(process.cwd(), '.claude', 'skills', 'curl-ticket')
  const targetFile = join(targetDir, 'SKILL.md')

  // Source skill file is bundled alongside dist/
  // In the npm package: skills/curl-ticket/SKILL.md
  // Relative to dist/index.js: ../skills/curl-ticket/SKILL.md
  const sourceFile = join(__dirname, '..', 'skills', 'curl-ticket', 'SKILL.md')

  let sourceContent: string
  try {
    sourceContent = await readFile(sourceFile, 'utf-8')
  } catch {
    throw new Error(`找不到 Skill 檔案，請確認 CLI 安裝完整。`)
  }

  if (await fileExists(targetFile)) {
    const overwrite = await askConfirm('SKILL.md 已存在，是否覆蓋？')
    if (!overwrite) {
      console.log('已取消。')
      return
    }
  }

  await mkdir(targetDir, { recursive: true })
  await writeFile(targetFile, sourceContent, 'utf-8')
  console.log(`已建立 ${targetFile}`)

  // Check if .claude/settings.json exists and remind about permissions
  const settingsFile = join(process.cwd(), '.claude', 'settings.json')
  if (await fileExists(settingsFile)) {
    console.log('')
    console.log('請確認 .claude/settings.json 的 permissions.allow 中包含：')
    console.log('  "Bash(curl-ticket:*)"')
  } else {
    console.log('')
    console.log('請在 .claude/settings.json 或 .claude/settings.local.json 中加入：')
    console.log('  { "permissions": { "allow": ["Bash(curl-ticket:*)"] } }')
  }
}
