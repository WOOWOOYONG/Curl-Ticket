import { checkbox, confirm, input } from '@inquirer/prompts'

export async function askCheckbox<T>(
  message: string,
  choices: { name: string; value: T }[]
): Promise<T[]> {
  const result = await checkbox({
    message,
    choices,
    required: true
  })
  return result
}

export async function askConfirm(message: string): Promise<boolean> {
  return confirm({ message, default: false })
}

export async function askText(message: string): Promise<string> {
  const result = await input({ message, required: true })
  return result.trim()
}
