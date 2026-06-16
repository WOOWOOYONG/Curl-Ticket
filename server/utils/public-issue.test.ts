import { describe, expect, it } from 'vitest'
import type { issues } from '~~/server/database/schema'
import { Environment, HttpMethod, IssueStatus, IssueType } from '~~/shared/constants'
import {
  buildPublicIssueDTO,
  buildPublicShareStatus,
  canShareIssue,
  generateShareToken
} from './public-issue'

type IssueRow = typeof issues.$inferSelect

function createIssueRow(overrides: Partial<IssueRow> = {}): IssueRow {
  return {
    id: 42,
    projectId: '11111111-1111-4111-8111-111111111111',
    issueNumber: 7,
    projectKey: 'API',
    issueType: IssueType.ApiBug,
    title: 'Webhook fails',
    description: 'Steps to reproduce',
    rawCurl: 'curl https://api.example.com',
    method: HttpMethod.POST,
    url: 'https://api.example.com/webhooks',
    environment: Environment.Staging,
    requestHeaders: {
      Authorization: 'Bearer raw-secret',
      'Content-Type': 'application/json'
    },
    requestBody: { event: 'created' },
    responseStatus: 500,
    responseBody: { error: 'failed' },
    publicShareToken: 'old-token',
    publicSharedAt: new Date('2026-01-01T00:00:00.000Z'),
    status: IssueStatus.Open,
    assigneeId: '22222222-2222-4222-8222-222222222222',
    createdBy: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides
  }
}

describe('buildPublicIssueDTO', () => {
  it('returns public-safe fields and masks sensitive request headers', () => {
    const dto = buildPublicIssueDTO(createIssueRow())

    expect(dto).toEqual({
      friendlyId: 'API-7',
      title: 'Webhook fails',
      description: 'Steps to reproduce',
      method: HttpMethod.POST,
      url: 'https://api.example.com/webhooks',
      environment: Environment.Staging,
      requestHeaders: {
        Authorization: 'Bearer ******',
        'Content-Type': 'application/json'
      },
      requestBody: { event: 'created' },
      responseStatus: 500,
      responseBody: { error: 'failed' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    })
    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('projectId')
    expect(dto).not.toHaveProperty('createdBy')
    expect(dto).not.toHaveProperty('status')
    expect(dto).not.toHaveProperty('assigneeId')
    expect(dto).not.toHaveProperty('publicShareToken')
  })
})

describe('public sharing helpers', () => {
  it('allows only API Bug issues to be shared', () => {
    expect(canShareIssue(createIssueRow({ issueType: IssueType.ApiBug }))).toBe(true)
    expect(canShareIssue(createIssueRow({ issueType: IssueType.Task }))).toBe(false)
  })

  it('requires API request data before sharing', () => {
    expect(canShareIssue(createIssueRow({ method: null }))).toBe(false)
    expect(canShareIssue(createIssueRow({ url: null }))).toBe(false)
  })

  it('builds enabled and disabled share status DTOs', () => {
    const sharedAt = new Date('2026-01-01T00:00:00.000Z')

    expect(
      buildPublicShareStatus(
        { publicShareToken: 'token-a', publicSharedAt: sharedAt },
        'https://curl-ticket.test'
      )
    ).toEqual({
      enabled: true,
      sharedAt,
      shareUrl: 'https://curl-ticket.test/share/issues/token-a'
    })

    expect(
      buildPublicShareStatus(
        { publicShareToken: null, publicSharedAt: null },
        'https://curl-ticket.test'
      )
    ).toEqual({
      enabled: false,
      sharedAt: null,
      shareUrl: null
    })
  })

  it('generates high-entropy URL-safe tokens', () => {
    const token = generateShareToken()

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token.length).toBeGreaterThanOrEqual(40)
  })
})
