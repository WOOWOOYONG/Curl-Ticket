import {
  IssueStatus,
  IssueType,
  Environment,
  HttpMethod,
  issueStatuses,
  issueTypes,
  environments,
  httpMethods
} from '#shared/constants.js'
import { ExitCode, ISSUE_FIELDS } from '../constants.js'
import { VALID_STATUS_INPUTS } from '../utils.js'

const ASSIGNEE_OPTION = {
  type: 'string',
  description: 'Assignee: me, none, <uuid>, or <email>'
} as const

export function schemaCommand(): void {
  const schema = {
    commands: {
      projects: {
        description: 'List accessible projects',
        args: [],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      issues: {
        description: 'List issues for a project',
        args: [{ name: 'projectId', type: 'uuid', required: true }],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '-s, --status': {
            type: 'enum',
            values: [...VALID_STATUS_INPUTS],
            description: 'Filter by status'
          },
          '-t, --type': { type: 'enum', values: issueTypes, description: 'Filter by type' },
          '-n, --limit': { type: 'number', default: 10, max: 20, description: 'Max results' },
          '--assignee': ASSIGNEE_OPTION
        }
      },
      issue: {
        description: 'Get issue details',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          {
            name: 'issueId',
            type: 'string',
            required: true,
            description: 'Numeric ID or friendly ID (e.g. CT-42)'
          }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--fields': {
            type: 'string',
            description: 'Comma-separated fields to include (JSON mode only)',
            values: [...ISSUE_FIELDS]
          }
        }
      },
      'update-status': {
        description: 'Update issue status',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          {
            name: 'issueId',
            type: 'string',
            required: true,
            description: 'Numeric ID or friendly ID (e.g. CT-42)'
          },
          { name: 'status', type: 'enum', values: [...VALID_STATUS_INPUTS], required: true }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--dry-run': { type: 'boolean', description: 'Preview update without applying' }
        }
      },
      comments: {
        description: 'List comments for an issue',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric issue ID' }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      comment: {
        description: 'Get a single comment',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric issue ID' },
          { name: 'commentId', type: 'number', required: true, description: 'Numeric comment ID' }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      'add-comment': {
        description: 'Add a comment to an issue',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric issue ID' },
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'Comment content (1-5000 chars)'
          }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      'edit-comment': {
        description: 'Edit a comment',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric issue ID' },
          { name: 'commentId', type: 'number', required: true, description: 'Numeric comment ID' },
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'New comment content (1-5000 chars)'
          }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      'create-issue': {
        description: 'Create a new issue',
        args: [{ name: 'projectId', type: 'uuid', required: true }],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '-t, --type': {
            type: 'enum',
            values: issueTypes,
            description: 'Issue type (prompted interactively if omitted)'
          },
          '--curl': {
            type: 'string',
            description: 'Raw cURL command string (required for api_bug)'
          },
          '--title': {
            type: 'string',
            description: 'Issue title (auto-generated for api_bug from cURL if omitted)'
          },
          '--description': { type: 'string', description: 'Issue description (Markdown)' },
          '--env': {
            type: 'enum',
            values: environments,
            default: 'Dev',
            description: 'Environment (api_bug only)'
          },
          '--status': {
            type: 'enum',
            values: [...VALID_STATUS_INPUTS],
            description: 'Initial issue status'
          },
          '--assignee': ASSIGNEE_OPTION
        }
      },
      assign: {
        description: 'Assign an issue to a user',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          {
            name: 'issueId',
            type: 'string',
            required: true,
            description: 'Numeric ID or friendly ID (e.g. CT-42)'
          },
          {
            name: 'assignee',
            type: 'string',
            required: true,
            description: 'me, none, <uuid>, or <email>'
          }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--dry-run': { type: 'boolean', description: 'Preview assignment without applying' }
        }
      },
      'my-issues': {
        description: 'List issues assigned to you',
        args: [],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '-s, --status': {
            type: 'enum',
            values: [...VALID_STATUS_INPUTS],
            repeatable: true,
            description: 'Filter by status (repeatable)'
          },
          '--project': { type: 'uuid', description: 'Filter by project UUID' },
          '--environment': {
            type: 'enum',
            values: environments,
            description: 'Filter by environment'
          },
          '--search': { type: 'string', description: 'Search by title' },
          '--sort': {
            type: 'enum',
            values: ['updatedAt', 'createdAt', 'status'],
            default: 'updatedAt',
            description: 'Sort field'
          },
          '--order': {
            type: 'enum',
            values: ['asc', 'desc'],
            default: 'desc',
            description: 'Sort order'
          },
          '--page': { type: 'number', default: 1, description: 'Page number' },
          '--page-size': { type: 'number', default: 20, description: 'Page size' }
        }
      },
      'delete-comment': {
        description: 'Delete a comment',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric issue ID' },
          { name: 'commentId', type: 'number', required: true, description: 'Numeric comment ID' }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--force': { type: 'boolean', description: 'Skip confirmation prompt' }
        }
      },
      schema: {
        description: 'Print CLI schema for agent introspection',
        args: [],
        options: {}
      },
      'auth login': {
        description: 'Log in to Curl Ticket',
        args: [],
        options: {
          '--url': { type: 'string', description: 'Site URL' }
        }
      },
      'auth status': {
        description: 'Show current login status',
        args: [],
        options: {}
      },
      'auth logout': {
        description: 'Log out and delete local config',
        args: [],
        options: {}
      }
    },
    enums: {
      status: { values: issueStatuses, cliInputs: [...VALID_STATUS_INPUTS], map: IssueStatus },
      issueType: { values: issueTypes, map: IssueType },
      environment: { values: environments, map: Environment },
      httpMethod: { values: httpMethods, map: HttpMethod }
    },
    exitCodes: ExitCode,
    issueFields: [...ISSUE_FIELDS]
  }

  process.stdout.write(JSON.stringify(schema, null, 2) + '\n')
}
