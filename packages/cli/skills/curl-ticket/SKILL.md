---
name: curl-ticket-issue-analyzer
description: >
  Curl Ticket issue query and analysis tool. Fetch issue details via CLI, locate problematic code in the local codebase, and provide fix suggestions.
  Trigger when: user mentions issue, bug, ticket, error, Curl Ticket, CT- identifiers (e.g. CT-42),
  issue tracking, analyze bug, update issue status, or requests task information from the issue tracker.
---

# CLI Commands

```
curl-ticket projects                                            # List projects
curl-ticket issues <projectId> [-s Open] [-t api_bug] [-n 10]  # List issues
curl-ticket issue <projectId> <issueId|CT-42>                   # Issue details
curl-ticket update-status <projectId> <issueId> <status>        # Update status (Open|in-progress|Done|Close)
```

Authentication is handled automatically; first run opens the browser for login.

# Issue Output Fields

Issue details include: type (API Bug / Task), status, endpoint, environment, response status code, error message (auto-extracted from responseBody), simplified cURL (noise headers removed), and description.

# Analysis Workflow

1. Run `curl-ticket projects` to get the projectId
2. Run `curl-ticket issues <projectId> -s Open` to list open issues
3. Run `curl-ticket issue <projectId> <issueId>` to get details
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
