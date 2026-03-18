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

export function schemaCommand(): void {
  const schema = {
    commands: {
      'projects': {
        description: 'List accessible projects',
        args: [],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' }
        }
      },
      'issues': {
        description: 'List issues for a project',
        args: [
          { name: 'projectId', type: 'uuid', required: true }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '-s, --status': { type: 'enum', values: [...VALID_STATUS_INPUTS], description: 'Filter by status' },
          '-t, --type': { type: 'enum', values: issueTypes, description: 'Filter by type' },
          '-n, --limit': { type: 'number', default: 10, max: 20, description: 'Max results' }
        }
      },
      'issue': {
        description: 'Get issue details',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric ID or friendly ID (e.g. CT-42)' }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--fields': { type: 'string', description: 'Comma-separated fields to include (JSON mode only)', values: [...ISSUE_FIELDS] }
        }
      },
      'update-status': {
        description: 'Update issue status',
        args: [
          { name: 'projectId', type: 'uuid', required: true },
          { name: 'issueId', type: 'string', required: true, description: 'Numeric ID or friendly ID (e.g. CT-42)' },
          { name: 'status', type: 'enum', values: [...VALID_STATUS_INPUTS], required: true }
        ],
        options: {
          '--json': { type: 'boolean', description: 'Output raw JSON' },
          '--dry-run': { type: 'boolean', description: 'Preview update without applying' }
        }
      },
      'schema': {
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
