---
name: curl-ticket-create-task
description: >
  Curl Ticket task creation tool. Guide the user through creating a structured Task
  (## Why / ## Acceptance Criteria) by collecting project, title, why, acceptance
  criteria, and assignee, then call `curl-ticket create-issue --type task --json`.
  Trigger when: user says "create task", "新增 task", "add task", "open ticket as
  task", "建立 task", "open a task", "create a ticket", "幫我開一張 task", or pastes
  a PRD / requirement document and asks to file it as a task.
  Do NOT use for analyzing existing issues or for `api_bug` cURL flows — use
  `curl-ticket-issue-analyzer` for those.
---

# First-Run Introspection

Before driving the flow:

1. Run `curl-ticket schema` once to learn the current set of commands, exit codes,
   and required fields. If the schema reports new required fields on
   `create-issue --type task` that are not covered here, surface them in the
   final preview before submitting.
2. Run `curl-ticket projects --json` to discover available projects (used both to
   resolve the Project answer and to fail fast when the user has none).

# Mode Detection

Pick one of two modes — **Step-by-step** or **Fast Path** — using a deterministic
three-layer decision tree applied to the user's trigger message. Do not decide
this freely; follow the layers in order.

## Layer 1 — Explicit keyword override

- Force **Fast Path** if the message contains any of:
  `from this PRD`, `parse this`, `依這份`, `根據以下`, `直接建`, `skip questions`.
- Force **Step-by-step** if the message contains any of:
  `step by step`, `one by one`, `逐題`, `問我`.

If a Layer 1 keyword matched, skip Layers 2–3.

## Layer 2 — Structural signal

If the message is two lines or fewer **and** contains no Markdown heading,
no bullet list, and no token matching `[A-Z]+-\d+(\.\d+)*`, choose
**Step-by-step**. Otherwise the message is a Fast Path **candidate** — proceed
to Layer 3.

## Layer 3 — Field extractability

Run the Fast Path extraction rules below against the message:

- `title`: first `#` / `##` Markdown heading text; fallback to the first sentence
  truncated to 200 characters.
- `why`: body of the first `## Why`, `## Background`, `## 動機`, or `## 為什麼`
  section; fallback to the first non-heading paragraph.
- `acceptance_criteria`: body of the first `## Acceptance Criteria`, `## AC`,
  `## Done`, `## 驗收`, or `## Requirements` section; fallback to the first
  bullet list found in the message.
- `references` (optional): all unique tokens matching `[A-Z]+-\d+(\.\d+)*`,
  preserving first-appearance order.

Decision:

- All three core fields (`title`, `why`, `acceptance_criteria`) extracted →
  enter **Fast Path** and skip the per-field prompts for those three.
- One or two of the three extracted → ask the user **once** via
  `AskUserQuestion`: choose `Use auto-derived values` or `Ask me one by one`,
  then proceed accordingly (Hybrid).
- `title` or `why` cannot be extracted → fall back to **Step-by-step**, but
  carry the pasted text as a hint inside each prompt so the user can copy from
  it.

## Project / Assignee are never auto-derived

Regardless of the chosen mode:

- **Project**: only skipped when `curl-ticket projects --json` returns exactly
  one project. If the message contains a project key (e.g. `BA`) that maps
  unambiguously to one of the listed projects, you may pre-select it but still
  show the choice in the preview. Otherwise prompt as in Step-by-step.
- **Assignee**: only auto-derived when the message contains `@<name>` or
  `assign to <name>` / `指派給 <name>`. Otherwise prompt as in Step-by-step
  (default `me`).

# Question Flow (Step-by-step)

Ask each question with a separate `AskUserQuestion` invocation, in this order.
Do not bundle multiple questions into one prompt.

## 1. Project

Run `curl-ticket projects --json`.

- 0 projects → stop and tell the user to create a project first
  (e.g. `curl-ticket create-project --name ... --key ...`).
- 1 project → skip this question; use that project's `id`.
- ≥ 2 projects → ask `Which project?`, present each project as an option
  labelled `<name> (<key>)` with the project `id` as the value. Allow a
  free-form fallback so the user can paste a project ID directly.

## 2. Title

Open-ended. Trim whitespace. Reject empty strings or strings longer than
200 characters and re-ask until valid.

## 3. Why

Open-ended. Suggest 1–3 sentences. An empty answer is allowed but the
description will display `_(not provided)_`.

## 4. Acceptance Criteria

Open-ended, multiline. Hint: "one criterion per line; leading `- ` is
optional". Normalise each non-empty line into a `- <line>` bullet, stripping
any leading `- ` the user already typed. Empty input drops the section
entirely.

## 5. Assignee

Open-ended, default `me`. Resolve using the same rules as
`curl-ticket-issue-analyzer`:

- empty answer or `me` → pass `--assignee me`
- `none` / `null` → pass `--assignee none`
- a UUID → pass through verbatim
- an email → pass through verbatim
- a natural-language name (e.g. `Alice`, `小明`) → first run
  `curl-ticket members <projectId> --json`, match case-insensitively against
  member `name` (fall back to email local-part):
  - exact one match → pass that member's `email` (or `userId`) to `--assignee`
  - multiple matches → list the candidates with their emails and ask the user
    to confirm
  - zero matches → tell the user no such member exists in the project and
    re-ask

# Description Template

Assemble the issue description from this Markdown template. The canonical
source is `packages/cli/src/templates/task.md` (shipped with the CLI as
`templates/task.md`); the inline copy below is kept in sync.

```
## Why
{{why}}

## Acceptance Criteria
{{acceptance_criteria}}

## Notes
{{notes}}

## References
{{references}}
```

Substitution rules:

- `{{why}}` empty → replace with `_(not provided)_`.
- `{{acceptance_criteria}}` empty → remove the entire section
  (heading + body + the preceding blank line).
- `{{notes}}` empty → remove the entire section as above.
- `{{references}}` is rendered from the Fast Path requirement-ID list as
  `- <ID>` bullets in first-appearance order. If the list is empty, remove the
  section as above.

# Preview / Confirm / Edit / Cancel Gate

Before calling any mutating CLI command, show a preview and ask the user to
choose one of `Confirm` / `Edit` / `Cancel` via `AskUserQuestion`.

Preview format:

```
Title: <title>
Project: <name> (<key>)
Assignee: <resolved value>
---
<rendered description>
---
```

Fast Path / Hybrid only — prefix the preview with
`[Auto-derived from your message]` so the user can spot Agent-inferred values
at a glance. After an `Edit` round-trip the marker disappears (the value is no
longer purely auto-derived).

`Edit` → ask which field to change
(`Title` / `Why` / `Acceptance Criteria` / `Assignee` / `Project`), re-run
only that question, then re-render the preview.

`Cancel` → exit immediately without calling any CLI mutation.

# CLI Invocation

On `Confirm`, run:

```bash
curl-ticket create-issue <projectId> \
  --type task \
  --title "<title>" \
  --description "<rendered description>" \
  --assignee <resolved> \
  --json
```

Example successful response:

```json
{
  "data": { "id": 42, "issueNumber": 12, "title": "Add rate limiting", ... },
  "friendlyId": "CT-12"
}
```

Report back to the user the `friendlyId` and the issue URL constructed as
`<site URL>/projects/<projectId>/issues/<id>` (the site URL is whatever the
authenticated CLI is pointed at — derive it from the user's environment if
already known; otherwise just print the `friendlyId` and instruct the user to
open it in the web UI).

# Error Handling

Map CLI exit codes to user-facing guidance — do NOT retry automatically.

| Exit code | Meaning                           | Action                                                               |
| --------- | --------------------------------- | -------------------------------------------------------------------- |
| 2         | Authentication / authorization    | Ask the user to run `curl-ticket auth login` (or check the token)    |
| 3         | Resource not found (e.g. project) | Re-run `curl-ticket projects --json` and re-ask the project question |
| 4         | Validation error                  | Surface the `message` field; offer to `Edit` the offending field     |
| 5         | Network connection error          | Tell the user to check connectivity; offer to retry the same command |

In `--json` mode the CLI returns errors as
`{ "error": true, "code": <httpStatus>, "exitCode": <n>, "message": "..." }`.
Read `exitCode` from that payload.

# Cross-skill Reference

This skill only **creates** tasks. For listing, analysing, updating status,
assigning, or commenting on existing issues, the host should use
`curl-ticket-issue-analyzer` instead.
