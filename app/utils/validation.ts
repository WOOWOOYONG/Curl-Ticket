import { z } from 'zod'
import {
  Environment,
  environments,
  httpMethods,
  IssueStatus,
  issueStatuses
} from '~~/shared/constants'

type Translate = (key: string, params?: Record<string, unknown>) => string

export function createProjectFormSchema(t: Translate) {
  return z.object({
    name: z
      .string()
      .min(1, t('validation.project.name.required'))
      .max(100, t('validation.project.name.max')),
    key: z
      .string()
      .min(2, t('validation.project.key.min'))
      .max(10, t('validation.project.key.max'))
      .regex(/^[A-Z0-9]+$/, t('validation.project.key.format')),
    description: z.string().nullish(),
    environments: z
      .array(z.enum(environments))
      .min(1, t('validation.project.environments.required'))
  })
}

export function createInvitationCodeFormSchema(t: Translate) {
  return z.object({
    code: z.string().length(6, t('validation.invitationCode.invalidLength'))
  })
}

export function createProjectInvitationFormSchema(t: Translate) {
  return z.object({
    email: z.email(t('validation.projectInvitation.email.invalid'))
  })
}

export function createTaskValidationSchema(t: Translate) {
  return z.object({
    title: z
      .string()
      .min(1, t('validation.issue.title.required'))
      .max(200, t('validation.issue.title.max')),
    description: z.string().nullish(),
    status: z.enum(issueStatuses).default(IssueStatus.Open)
  })
}

export function createApiBugValidationSchema(t: Translate) {
  return z.object({
    title: z
      .string()
      .min(1, t('validation.issue.title.required'))
      .max(200, t('validation.issue.title.max')),
    description: z.string().nullish(),
    rawCurl: z.string().nullish(),
    method: z.enum(httpMethods, {
      message: t('validation.issue.method.invalid')
    }),
    url: z.string().min(1, t('validation.issue.url.required')),
    environment: z.enum(environments).default(Environment.Dev),
    requestHeaders: z.record(z.string(), z.string()).nullish(),
    requestBody: z.unknown().nullish(),
    responseStatus: z
      .number(t('validation.issue.responseStatus.invalid'))
      .int()
      .min(100, t('validation.issue.responseStatus.invalid'))
      .max(599, t('validation.issue.responseStatus.invalid'))
      .nullish(),
    responseBody: z.unknown().nullish(),
    status: z.enum(issueStatuses).default(IssueStatus.Open)
  })
}
