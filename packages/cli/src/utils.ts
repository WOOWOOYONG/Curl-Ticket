import { createInterface, type Interface as ReadlineInterface } from 'node:readline'
import { IssueStatus, issueTypes, environments, COMMENT_MAX_LENGTH } from '#shared/constants.js'
import type { IssueType } from '#shared/constants.js'

export function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const STATUS_ALIASES: Record<string, IssueStatus> = {
  open: IssueStatus.Open,
  'in-progress': IssueStatus.InProgress,
  'in progress': IssueStatus.InProgress,
  done: IssueStatus.Done,
  close: IssueStatus.Close
}

export const VALID_STATUS_INPUTS = ['Open', 'in-progress', 'Done', 'Close'] as const

export function normalizeStatus(status: string): IssueStatus {
  const normalized = STATUS_ALIASES[status.toLowerCase()]
  if (!normalized) {
    throw new ValidationError(`Invalid status. Valid values: ${VALID_STATUS_INPUTS.join(', ')}`)
  }
  return normalized
}

export function parseIssueId(
  issueId: string
): { type: 'id'; value: string } | { type: 'number'; value: number } {
  if (/^\d+$/.test(issueId)) {
    return { type: 'id', value: issueId }
  }
  const match = issueId.match(/^[A-Z]+-(\d+)$/i)
  if (match) {
    return { type: 'number', value: parseInt(match[1], 10) }
  }
  throw new ValidationError(
    `Invalid issue ID format: ${issueId}. Use a numeric ID or friendly ID (e.g. CT-42).`
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateProjectId(projectId: string): void {
  if (!UUID_RE.test(projectId)) {
    throw new ValidationError(`Invalid projectId: "${projectId}" is not a valid UUID.`)
  }
}

export function validateCommentContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new ValidationError('Comment content cannot be empty.')
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    throw new ValidationError(`Comment content cannot exceed ${COMMENT_MAX_LENGTH} characters.`)
  }
}

export function normalizeType(type: string): IssueType {
  const lower = type.toLowerCase().replace(/-/g, '_')
  const valid = issueTypes as readonly string[]
  if (!valid.includes(lower)) {
    throw new ValidationError(`Invalid type "${type}". Valid values: ${issueTypes.join(', ')}`)
  }
  return lower as IssueType
}

export function normalizeEnvironment(env: string): string {
  const match = environments.find((e) => e.toLowerCase() === env.toLowerCase())
  if (!match) {
    throw new ValidationError(
      `Invalid environment "${env}". Valid values: ${environments.join(', ')}`
    )
  }
  return match
}

const MAX_PROMPT_ATTEMPTS = 3

function requireTTY(): void {
  if (!process.stdin.isTTY) {
    throw new ValidationError('Interactive prompt requires a TTY (stdin is not a terminal).')
  }
}

export interface PromptInputOptions {
  /** Return a non-empty error message to reject the answer and retry (up to MAX_PROMPT_ATTEMPTS). */
  validate?: (value: string) => string | null
  /** Continue collecting lines while this returns true for the latest line. */
  continueWhile?: (value: string, lines: string[]) => boolean
  /** Prompt shown for follow-up lines when continueWhile keeps the input open. */
  continuationPrompt?: string
  /** Auto-submit after this many milliseconds of input idle time. */
  submitOnIdleMs?: number
}

const DEFAULT_CONTINUATION_PROMPT = '... '

/**
 * Holds a single readline interface for the duration of an interactive flow.
 * Callers should `close()` it in a `finally` block to release stdin.
 */
export class Prompter {
  private rl: ReadlineInterface | null = null
  private closed = false

  constructor() {
    requireTTY()
  }

  protected ensureOpen(): ReadlineInterface {
    if (this.closed) {
      throw new ValidationError('Prompter is already closed.')
    }
    if (!this.rl) {
      this.rl = createInterface({ input: process.stdin, output: process.stderr })
      this.rl.once('close', () => {
        this.rl = null
      })
    }
    return this.rl
  }

  protected ask(prompt: string): Promise<string | null> {
    const rl = this.ensureOpen()
    return new Promise((resolve) => {
      let settled = false
      const onClose = () => {
        if (settled) return
        settled = true
        resolve(null)
      }
      rl.once('close', onClose)
      rl.question(prompt, (ans: string) => {
        if (settled) return
        settled = true
        rl.off('close', onClose)
        resolve(ans.trim())
      })
    })
  }

  private collectBufferedInput(
    question: string,
    options: PromptInputOptions
  ): Promise<string | null> {
    const rl = this.ensureOpen()
    const lines: string[] = []
    const idleMs = options.submitOnIdleMs ?? 0
    const continuationPrompt = options.continuationPrompt ?? DEFAULT_CONTINUATION_PROMPT

    return new Promise((resolve) => {
      let settled = false
      let idleTimer: NodeJS.Timeout | null = null

      const clearIdleTimer = () => {
        if (!idleTimer) return
        clearTimeout(idleTimer)
        idleTimer = null
      }

      const cleanup = () => {
        clearIdleTimer()
        rl.off('line', onLine)
        rl.off('close', onClose)
      }

      const finish = (value: string | null) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(value)
      }

      const scheduleFinish = () => {
        clearIdleTimer()
        idleTimer = setTimeout(() => {
          finish(lines.join('\n'))
        }, idleMs)
      }

      const onClose = () => finish(null)

      const onLine = (answer: string) => {
        const normalized = answer.trim()
        lines.push(normalized)

        if (options.continueWhile?.(normalized, lines)) {
          rl.setPrompt(continuationPrompt)
          rl.prompt()
          return
        }

        scheduleFinish()
      }

      rl.on('line', onLine)
      rl.once('close', onClose)
      rl.setPrompt(`${question}: `)
      rl.prompt()
    })
  }

  private async collectInput(question: string, options: PromptInputOptions): Promise<string | null> {
    const lines: string[] = []

    while (true) {
      const prompt =
        lines.length === 0 ? `${question}: ` : options.continuationPrompt ?? DEFAULT_CONTINUATION_PROMPT
      const answer = await this.ask(prompt)
      if (answer === null) {
        return null
      }

      lines.push(answer)

      if (!options.continueWhile?.(answer, lines)) {
        return lines.join('\n')
      }
    }
  }

  async input(question: string, options: PromptInputOptions = {}): Promise<string> {
    for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt++) {
      const answer =
        options.submitOnIdleMs && options.submitOnIdleMs > 0
          ? await this.collectBufferedInput(question, options)
          : await this.collectInput(question, options)
      if (answer === null) {
        throw new ValidationError('No input available (stdin closed).')
      }
      const errorMsg = options.validate?.(answer)
      if (!errorMsg) return answer
      process.stderr.write(`${errorMsg}\n`)
    }
    throw new ValidationError(`Too many invalid inputs (max ${MAX_PROMPT_ATTEMPTS}).`)
  }

  async select(question: string, choices: string[]): Promise<string> {
    for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt++) {
      process.stderr.write(`${question}\n`)
      choices.forEach((choice, i) => {
        process.stderr.write(`  ${i + 1}) ${choice}\n`)
      })
      const answer = await this.ask('Select: ')
      if (answer === null) {
        throw new ValidationError('No input available (stdin closed).')
      }
      const index = parseInt(answer, 10)
      if (!Number.isNaN(index) && index >= 1 && index <= choices.length) {
        return choices[index - 1]
      }
      process.stderr.write(`Invalid selection. Enter a number between 1 and ${choices.length}.\n`)
    }
    throw new ValidationError(`Too many invalid selections (max ${MAX_PROMPT_ATTEMPTS}).`)
  }

  async confirm(message: string): Promise<boolean> {
    const answer = await this.ask(`${message} (y/N): `)
    return answer !== null && answer.toLowerCase() === 'y'
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.rl?.close()
    this.rl = null
  }
}

export function hasTrailingLineContinuation(value: string): boolean {
  const trimmed = value.trimEnd()
  let trailingSlashCount = 0

  for (let index = trimmed.length - 1; index >= 0 && trimmed[index] === '\\'; index--) {
    trailingSlashCount += 1
  }

  return trailingSlashCount % 2 === 1
}

export async function promptInput(
  question: string,
  options: PromptInputOptions = {}
): Promise<string> {
  const prompter = new Prompter()
  try {
    return await prompter.input(question, options)
  } finally {
    prompter.close()
  }
}

export async function promptSelect(question: string, choices: string[]): Promise<string> {
  const prompter = new Prompter()
  try {
    return await prompter.select(question, choices)
  } finally {
    prompter.close()
  }
}
