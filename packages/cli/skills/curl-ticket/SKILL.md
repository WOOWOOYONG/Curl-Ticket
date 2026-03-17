---
name: curl-ticket-issue-analyzer
description: >
  Curl Ticket issue query and analysis tool. Fetch issue details via CLI, locate problematic code in the local codebase, and provide fix suggestions.
  Trigger when: user mentions issue, bug, ticket, error, Curl Ticket, CT- identifiers (e.g. CT-42),
  issue tracking, analyze bug, update issue status, or requests task information from the issue tracker.
---

# CLI Commands

**Always use `--json` flag** to get structured JSON output. This avoids parsing human-readable text and preserves all fields including pagination.

```
curl-ticket projects --json                                            # List projects
curl-ticket issues <projectId> --json [-s Open] [-t api_bug] [-n 10]  # List issues
curl-ticket issue <projectId> <issueId|CT-42> --json                   # Issue details
curl-ticket update-status <projectId> <issueId> <status> --json        # Update status (Open|in-progress|Done|Close)
```

Authentication is handled automatically; first run opens the browser for login.

# JSON Output Format

List commands (`projects`, `issues`) return:
```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }
```

Single-resource commands (`issue`, `update-status`) return:
```json
{ "data": { "id": 1, "issueNumber": 42, "issueType": "api_bug", "title": "...", "status": "Open", "method": "GET", "url": "/api/users", "environment": "Prod", "responseStatus": 500, "rawCurl": "...", "responseBody": "...", ... }, "friendlyId": "PROJ-42" }
```

Errors return:
```json
{ "error": true, "code": 404, "message": "Resource not found." }
```

# Analysis Workflow

1. Run `curl-ticket projects --json` to get the projectId
2. Run `curl-ticket issues <projectId> -s Open --json` to list open issues
3. Run `curl-ticket issue <projectId> <issueId> --json` to get full details
4. Locate code by issue type:
   - **API Bug**: Search for the route handler matching the endpoint field (e.g. `POST /api/users`), then triage by status code:
     - 4xx → validation logic, access control, resource lookup
     - 5xx → application logic errors, DB query issues
   - **Task**: Search codebase using keywords from title and description
5. Grep for keywords from the error message to pinpoint the failure location
6. Trace the request chain: route → middleware → handler → business logic → DB query
7. Provide fix suggestions, then update status with `update-status` after resolving

# Constraints

- Always filter with `-s Open` to avoid loading resolved issues
- Analyze only 1-2 issues at a time to avoid context overload
