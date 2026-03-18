import { join } from 'node:path'
import { homedir } from 'node:os'

// Valid issue fields for --fields filtering
// Type-safe: every entry must be a key of IssueDetail,
// and every key of IssueDetail must be listed here.
import type { IssueDetail } from './types.js'

// CLI app name and version
export const CLI_NAME = 'curl-ticket'
export const CLI_VERSION = '0.1.0'

// Config file paths
export const CONFIG_DIR = join(homedir(), '.config', CLI_NAME)
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
export const CONFIG_FILE_MODE = 0o600

// Environment variable names
export const ENV_URL = 'CURL_TICKET_URL'
export const ENV_TOKEN = 'CURL_TICKET_TOKEN'

// API defaults
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 20
export const PROJECTS_PAGE_SIZE = 100

// Device Code Flow
export const DEFAULT_POLL_INTERVAL_SEC = 5

// Browser open command (per platform)
export const BROWSER_COMMANDS: Record<string, string> = {
  darwin: 'open',
  linux: 'xdg-open',
  win32: 'start'
}

// Exit codes
export const ExitCode = {
  Success: 0,
  GeneralError: 1,
  AuthError: 2,
  NotFound: 3,
  ValidationError: 4
} as const

export type ExitCode = typeof ExitCode[keyof typeof ExitCode]

type AssertExhaustive<
  T extends readonly string[],
  U
> = Exclude<keyof U, T[number]> extends never
  ? Exclude<T[number], keyof U> extends never
    ? T
    : never
  : never

const _issueFields = [
  'id',
  'issueNumber',
  'projectId',
  'projectKey',
  'issueType',
  'title',
  'description',
  'method',
  'url',
  'environment',
  'status',
  'responseStatus',
  'rawCurl',
  'requestHeaders',
  'requestBody',
  'responseBody',
  'createdBy',
  'createdAt',
  'updatedAt'
] as const

export const ISSUE_FIELDS: AssertExhaustive<typeof _issueFields, IssueDetail> = _issueFields
