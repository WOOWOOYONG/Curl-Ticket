import { confirm, input, select } from '@inquirer/prompts'
import type { CurlTicketClient } from '../../api-client.js'
import type { CreateIssuePayload, IssueResponse } from '../../types.js'
import { ValidationError, resolveAssignee, validateProjectId } from '../../utils.js'
import {
  assertValidTitle,
  normalizeAcceptanceCriteria,
  parseDescriptionSections,
  validateTitle
} from './validators.js'
import { renderTemplate } from '../../templates/index.js'

export interface TaskInteractiveOptions {
  title?: string
  description?: string
  assignee?: string
  fromTemplate?: string
  status?: string
}

interface ProjectChoice {
  id: string
  label: string
}

interface Answers {
  projectId: string
  projectLabel: string
  title: string
  why: string
  acceptanceCriteria: string
  assignee: string
}

const FIELD_CHOICES = [
  { name: 'Project', value: 'project' as const },
  { name: 'Title', value: 'title' as const },
  { name: 'Why', value: 'why' as const },
  { name: 'Acceptance Criteria', value: 'acceptanceCriteria' as const },
  { name: 'Assignee', value: 'assignee' as const }
]

async function loadProjects(client: CurlTicketClient): Promise<ProjectChoice[]> {
  const res = await client.getProjects()
  if (res.data.length === 0) {
    throw new ValidationError(
      'No projects available. Create one with `curl-ticket create-project`.'
    )
  }
  return res.data.map((p) => ({ id: p.id, label: `${p.name} (${p.key})` }))
}

async function pickProject(
  projects: ProjectChoice[],
  providedId?: string,
  currentId?: string
): Promise<ProjectChoice> {
  if (providedId) {
    validateProjectId(providedId)
    const matched = projects.find((p) => p.id === providedId)
    return matched ?? { id: providedId, label: providedId }
  }
  if (projects.length === 1) {
    return projects[0]
  }
  const chosenId = await select({
    message: 'Which project?',
    default: currentId,
    choices: projects.map((p) => ({ name: p.label, value: p.id }))
  })
  return projects.find((p) => p.id === chosenId) ?? projects[0]
}

async function askTitle(defaultValue?: string): Promise<string> {
  const answer = await input({
    message: 'Title',
    default: defaultValue,
    required: true,
    validate: (v) => {
      const error = validateTitle(v)
      return error === '' ? true : error
    }
  })
  return answer.trim()
}

async function askWhy(defaultValue?: string): Promise<string> {
  const answer = await input({
    message: 'Why? (1–3 sentences; leave blank for none)',
    default: defaultValue
  })
  return answer.trim()
}

async function askAcceptanceCriteria(defaultValue?: string): Promise<string> {
  const answer = await input({
    message: 'Acceptance Criteria (one per line, separated by ";"; blank to skip)',
    default: defaultValue
  })
  // Allow `;` as a line separator since @inquirer/prompts input is single-line.
  const normalized = answer.replace(/;\s*/g, '\n')
  return normalizeAcceptanceCriteria(normalized)
}

async function askAssignee(defaultValue?: string): Promise<string> {
  const answer = await input({
    message: 'Assignee (me / none / <uuid> / <email>)',
    default: defaultValue ?? 'me'
  })
  const trimmed = answer.trim()
  return trimmed.length === 0 ? 'me' : trimmed
}

function renderPreview(answers: Answers, description: string): string {
  return [
    '--- Preview ---',
    `Project: ${answers.projectLabel}`,
    `Title: ${answers.title}`,
    `Assignee: ${answers.assignee}`,
    '---',
    description.trimEnd(),
    '--- End Preview ---'
  ].join('\n')
}

export async function taskInteractiveFlow(
  client: CurlTicketClient,
  projectIdArg: string | undefined,
  options: TaskInteractiveOptions
): Promise<void> {
  const projects = await loadProjects(client)
  const initialProject = await pickProject(projects, projectIdArg)

  const prefilled = options.description
    ? parseDescriptionSections(options.description)
    : { why: '', acceptanceCriteria: '', notes: '' }

  const answers: Answers = {
    projectId: initialProject.id,
    projectLabel: initialProject.label,
    title: await askTitle(options.title),
    why: await askWhy(prefilled.why),
    acceptanceCriteria: await askAcceptanceCriteria(prefilled.acceptanceCriteria),
    assignee: await askAssignee(options.assignee)
  }

  const fieldEditors: Record<(typeof FIELD_CHOICES)[number]['value'], () => Promise<void>> = {
    project: async () => {
      const next = await pickProject(projects, undefined, answers.projectId)
      answers.projectId = next.id
      answers.projectLabel = next.label
    },
    title: async () => {
      answers.title = await askTitle(answers.title)
    },
    why: async () => {
      answers.why = await askWhy(answers.why)
    },
    acceptanceCriteria: async () => {
      answers.acceptanceCriteria = await askAcceptanceCriteria(answers.acceptanceCriteria)
    },
    assignee: async () => {
      answers.assignee = await askAssignee(answers.assignee)
    }
  }

  while (true) {
    const description = await renderTemplate('task', {
      why: answers.why,
      acceptance_criteria: answers.acceptanceCriteria
    })
    process.stderr.write(renderPreview(answers, description) + '\n')

    const action = await select<'confirm' | 'edit' | 'cancel'>({
      message: 'Create this task?',
      choices: [
        { name: 'Confirm', value: 'confirm' },
        { name: 'Edit a field', value: 'edit' },
        { name: 'Cancel', value: 'cancel' }
      ]
    })

    if (action === 'cancel') {
      process.stderr.write('Cancelled.\n')
      return
    }

    if (action === 'edit') {
      const field = await select({ message: 'Which field?', choices: FIELD_CHOICES })
      await fieldEditors[field]()
      continue
    }

    assertValidTitle(answers.title)
    const assigneeId = await resolveAssignee({
      value: answers.assignee,
      projectId: answers.projectId,
      client
    })

    const payload: CreateIssuePayload = {
      issueType: 'task',
      title: answers.title,
      description,
      ...(options.status && { status: options.status }),
      assigneeId
    }

    const res: IssueResponse = await client.createIssue(answers.projectId, payload)
    const ok = await confirm({ message: 'Done. Show JSON?', default: false }).catch(() => false)
    if (ok) {
      process.stderr.write(JSON.stringify(res, null, 2) + '\n')
    }
    console.log(`Issue created: ${res.friendlyId} — ${res.data.title}`)
    return
  }
}
