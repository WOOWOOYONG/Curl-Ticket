import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prompter, ValidationError, hasTrailingLineContinuation } from '../utils.js'

class TestPrompter extends Prompter {
  readonly prompts: string[] = []

  constructor(private readonly answers: Array<string | null>) {
    super()
  }

  protected override ask(prompt: string): Promise<string | null> {
    this.prompts.push(prompt)
    return Promise.resolve(this.answers.shift() ?? null)
  }
}

class FakeReadline extends EventEmitter {
  readonly prompts: string[] = []
  private currentPrompt = ''

  setPrompt(prompt: string): void {
    this.currentPrompt = prompt
  }

  prompt(): void {
    this.prompts.push(this.currentPrompt)
  }

  close(): void {
    this.emit('close')
  }
}

class BufferedTestPrompter extends Prompter {
  constructor(private readonly fakeReadline: FakeReadline) {
    super()
  }

  protected override ensureOpen() {
    return this.fakeReadline as never
  }
}

describe('hasTrailingLineContinuation', () => {
  it('returns true when a line ends with an unescaped backslash', () => {
    expect(hasTrailingLineContinuation("curl 'https://example.com' \\")).toBe(true)
  })

  it('returns false when the trailing backslash is escaped', () => {
    expect(hasTrailingLineContinuation(String.raw`printf '\\'`)).toBe(false)
  })

  it('ignores trailing whitespace after the continuation slash', () => {
    expect(hasTrailingLineContinuation("curl 'https://example.com' \\   ")).toBe(true)
  })
})

describe('Prompter.input', () => {
  const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY)
      return
    }

    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      configurable: true
    })
  })

  it('collects multi-line input while the current line ends with a continuation slash', async () => {
    const prompter = new TestPrompter([
      "curl 'https://example.com' \\",
      "-H 'accept: application/json' \\",
      '--data-raw \'{"ok":true}\''
    ])

    const value = await prompter.input('cURL command', {
      continueWhile: hasTrailingLineContinuation
    })

    expect(value).toBe(
      [
        "curl 'https://example.com' \\",
        "-H 'accept: application/json' \\",
        '--data-raw \'{"ok":true}\''
      ].join('\n')
    )
    expect(prompter.prompts).toEqual(['cURL command: ', '... ', '... '])
  })

  it('throws when stdin closes before any answer is completed', async () => {
    const prompter = new TestPrompter([null])

    await expect(prompter.input('cURL command', { continueWhile: () => false })).rejects.toThrow(
      ValidationError
    )
  })

  it('auto-submits a pasted multi-line cURL after input goes idle', async () => {
    const rl = new FakeReadline()
    const prompter = new BufferedTestPrompter(rl)
    const valuePromise = prompter.input('cURL command', {
      continueWhile: hasTrailingLineContinuation,
      submitOnIdleMs: 120
    })

    rl.emit('line', "curl 'https://example.com/api/test' \\")
    rl.emit('line', "-H 'accept: application/json' \\")
    rl.emit('line', '--data-raw \'{"ok":true}\'')

    let settled = false
    valuePromise.then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(119)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(valuePromise).resolves.toBe(
      [
        "curl 'https://example.com/api/test' \\",
        "-H 'accept: application/json' \\",
        '--data-raw \'{"ok":true}\''
      ].join('\n')
    )
    expect(rl.prompts).toEqual(['cURL command: ', '... ', '... '])
  })
})
