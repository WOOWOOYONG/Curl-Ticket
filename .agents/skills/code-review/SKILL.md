---
name: code-review
description: Review code changes for correctness, security, and adherence to project conventions. Use when asked to "review code", "review PR", "review my changes", "check this code", "code review", "review diff", or when reviewing diffs, new features, bug fixes, or refactors. Covers API routes, Vue components, Drizzle schemas, Zod validation, and Supabase auth patterns.
---

# Code Review

## Process

1. **Determine scope** — identify what to review:
   - PR number given → `gh pr diff <number>`
   - "my changes" / no target specified → `git diff HEAD` (unstaged + staged)
   - Specific files mentioned → read those files directly
2. **Read each changed file fully** before reviewing
3. **Load [references/checklist.md](references/checklist.md)** and apply sections matching the changed file paths:
   | Path pattern | Checklist sections |
   |---|---|
   | `server/api/**` | API Route, Security, Error Handling |
   | `app/components/**`, `app/pages/**` | Vue Component, Security |
   | `server/database/schema/**` | Database & Schema |
   | `shared/schemas/**`, `shared/constants.ts` | Validation & Types |
   | `app/composables/**` | Vue Component (data fetching), Performance |
   | `server/utils/**`, `server/middleware/**` | API Route (auth), Security, Error Handling |
4. **Always apply Security Review** regardless of file type
5. **Report findings** using the output format below

## Instant Red Flags

Flag these on sight — the most frequent mistakes in this codebase:

- `server/api/projects/[projectId]/**` route missing `getAccessibleProject()` call
- Raw string where a shared constant exists (`'Open'` instead of `IssueStatus.Open`)
- `v-html` with user-controlled content

## Output Format

```
## Code Review: [brief description]

### Summary
[1-2 sentence overview and assessment]

### Findings

#### 🔴 Critical
- **[file:line]**: [description and fix]

#### 🟡 Suggestions
- **[file:line]**: [description and suggestion]

#### 🟢 Good Patterns
- [positive patterns worth noting]

### Verdict
[APPROVE / REQUEST_CHANGES / COMMENT — with brief rationale]
```

Omit empty severity sections. If no issues found, state the code looks good with brief justification.
