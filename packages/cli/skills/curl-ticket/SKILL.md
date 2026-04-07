---
name: curl-ticket-issue-analyzer
description: >
  Curl Ticket issue query and analysis tool. Fetch issue details via CLI, locate problematic code in the local codebase, and provide fix suggestions.
  Trigger when: user mentions issue, bug, ticket, error, Curl Ticket, CT- identifiers (e.g. CT-42),
  issue tracking, analyze bug, update issue status, or requests task information from the issue tracker.
---

# First-Run Introspection

Run `curl-ticket schema` to get the full CLI schema — all commands, args, options, enum values, exit codes, and available fields. Use this to avoid invalid inputs and hallucinated values.

# CLI Commands

**Always use `--json` flag** to get structured JSON output. This avoids parsing human-readable text and preserves all fields including pagination.

```
curl-ticket projects --json                                            # List projects
curl-ticket project <projectId> --json                                 # Project details
curl-ticket create-project --name "X" --key "X" --json                 # Create project
curl-ticket members <projectId> --json                                 # List project members
curl-ticket issues <projectId> --json [-s Open] [-t api_bug] [-n 10]  # List issues
curl-ticket issue <projectId> <issueId|CT-42> --json                   # Issue details
curl-ticket issue <projectId> <issueId> --json --fields status,url,method  # Fetch only specific fields (saves tokens)
curl-ticket update-status <projectId> <issueId> <status> --json        # Update status (Open|in-progress|Done|Close)
curl-ticket update-status <projectId> <issueId> <status> --dry-run --json  # Preview without applying
curl-ticket delete-issue <projectId> <issueId> --force --json          # Delete an issue
curl-ticket comments <projectId> <issueId> --json                      # List comments on an issue
curl-ticket comment <projectId> <issueId> <commentId> --json           # Get a single comment
curl-ticket add-comment <projectId> <issueId> "content" --json         # Add a comment
curl-ticket edit-comment <projectId> <issueId> <commentId> "content" --json  # Edit a comment
curl-ticket delete-comment <projectId> <issueId> <commentId> --json    # Delete a comment
curl-ticket schema                                                     # Print CLI schema (no auth needed)
```

Authentication is handled automatically; first run opens the browser for login.

# Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 0    | Success                                        |
| 1    | General error                                  |
| 2    | Authentication / authorization error (401/403) |
| 3    | Resource not found (404)                       |
| 4    | Validation error (invalid input)               |
| 5    | Network connection error                       |

In `--json` mode, errors include `exitCode` in the response:

```json
{ "error": true, "code": 404, "exitCode": 3, "message": "Resource not found." }
```

# Field Filtering (`--fields`)

Use `--fields` on the `issue` command (JSON mode only) to fetch only the fields you need. This reduces output size and saves context tokens.

```bash
curl-ticket issue <projectId> CT-1 --json --fields status,method,url,responseStatus
```

The `id` field is always included. Run `curl-ticket schema` to see all valid field names.

# Dry Run (`--dry-run`)

Use `--dry-run` on `update-status` to preview a mutation without applying it:

```bash
curl-ticket update-status <projectId> CT-1 Done --dry-run --json
```

Returns a preview object with `dryRun: true` and the resolved `issueId`, `friendlyId`, and `newStatus`.

# JSON Output Format

List commands (`projects`, `issues`) return:

```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }
```

Single-resource commands (`issue`, `update-status`) return:

```json
{ "data": { "id": 1, "issueNumber": 42, "issueType": "api_bug", "title": "...", "status": "Open", "method": "GET", "url": "/api/users", "environment": "Prod", "responseStatus": 500, "rawCurl": "...", "responseBody": "...", ... }, "friendlyId": "PROJ-42" }
```

Comment commands (`comments`) return:

```json
{
  "data": [
    {
      "id": 1,
      "issueId": 42,
      "authorId": "uuid",
      "authorName": "Name",
      "authorEmail": "email",
      "content": "...",
      "createdAt": "...",
      "updatedAt": null
    }
  ]
}
```

Single comment commands (`comment`, `add-comment`, `edit-comment`) return:

```json
{ "data": { "id": 1, "issueId": 42, "authorName": "Name", "content": "...", ... } }
```

Delete commands (`delete-issue`, `delete-comment`) return:

```json
{ "success": true }
```

# Input Validation

- `projectId` must be a valid UUID — non-UUID values return exit code 4
- `--type` must be a valid issue type (`api_bug`, `task`) — invalid values return exit code 4
- `--status` must be a valid status (`Open`, `in-progress`, `Done`, `Close`) — invalid values return exit code 4
- `issueId` must be a numeric ID or friendly ID (e.g. `CT-42`) — invalid formats return exit code 4

# Analysis Workflow

1. Run `curl-ticket schema` to learn available commands and valid enum values
2. Run `curl-ticket projects --json` to get the projectId (or `curl-ticket project <id> --json` for details)
3. Run `curl-ticket issues <projectId> -s Open --json` to list open issues
4. Run `curl-ticket issue <projectId> <issueId> --json --fields status,method,url,responseStatus,rawCurl,responseBody` to get relevant details
5. Locate code by issue type:
   - **API Bug**: Search for the route handler matching the endpoint field (e.g. `POST /api/users`), then triage by status code:
     - 4xx → validation logic, access control, resource lookup
     - 5xx → application logic errors, DB query issues
   - **Task**: Search codebase using keywords from title and description
6. Grep for keywords from the error message to pinpoint the failure location
7. Trace the request chain: route → middleware → handler → business logic → DB query
8. Use comments to document progress:
   - `add-comment` to post investigation findings, root cause analysis, or fix details
   - `comments` to read prior discussion and context from other team members
   - `edit-comment` to update your own comments with new findings
9. Provide fix suggestions, then update status with `update-status` after resolving

# Constraints

- Always filter with `-s Open` to avoid loading resolved issues
- Analyze only 1-2 issues at a time to avoid context overload
- Use `--fields` to fetch only what you need — avoid loading full issue details when a summary suffices
- Use `--dry-run` before mutations in uncertain contexts
