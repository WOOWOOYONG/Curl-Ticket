## ADDED Requirements

### Requirement: Pagination summary in human-readable mode

List commands (`ct projects`, `ct issues`) SHALL display a pagination summary line on stderr after the data output in human-readable mode. The format SHALL be `Showing {start}-{end} of {total} (page {page}/{totalPages})`. This line MUST NOT appear in JSON mode.

#### Scenario: Issues list with multiple pages

- **WHEN** user runs `ct issues <projectId>` and the API returns `{ pagination: { page: 1, pageSize: 10, total: 42, totalPages: 5 } }`
- **THEN** the CLI prints issue summaries to stdout, followed by `Showing 1-10 of 42 (page 1/5)` on stderr

#### Scenario: Issues list with single page

- **WHEN** user runs `ct issues <projectId>` and the API returns `{ pagination: { page: 1, pageSize: 10, total: 3, totalPages: 1 } }`
- **THEN** the CLI prints issue summaries to stdout and MUST NOT print any pagination line

#### Scenario: Empty result set

- **WHEN** user runs `ct issues <projectId>` and the API returns `{ data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }`
- **THEN** the CLI prints `No issues found.` and MUST NOT print a pagination line

#### Scenario: JSON mode is unaffected

- **WHEN** user runs `ct issues <projectId> --json`
- **THEN** the CLI outputs the raw JSON response including the `pagination` object, with no additional text on stderr
