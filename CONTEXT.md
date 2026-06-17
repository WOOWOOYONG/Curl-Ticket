# Curl Ticket

Curl Ticket tracks API problems as reproducible issue records that can be shared across engineering workflows.

## Language

**Issue**:
A work record for something the team wants to track.

**API Bug**:
An **Issue** that captures a reproducible API problem from a cURL command and optional response.
_Avoid_: cURL Issue

**Public Issue Page**:
A read-only public view of an existing **API Bug** that can be opened through a share link without signing in.
_Avoid_: Public cURL Issue Page, public ticket

**Protected Issue View**:
The full **Issue** content a **Registered User** sees inside the app, including internal workflow details (status, assignee) and **Public Sharing** state — in contrast to the public-safe **Public Issue Page**. Never exposes the **Share Token** itself.
_Avoid_: Issue detail, internal issue

**Registered User**:
A signed-in person who has completed invitation-code registration.
_Avoid_: User when the authentication state matters

**Public Viewer**:
A person who opens a **Public Issue Page** without needing to sign in.
_Avoid_: User when referring to anonymous readers

**Public Sharing**:
An explicit opt-in state that makes an existing **API Bug** available through a **Public Issue Page**.
_Avoid_: Auto-public, default public

**Share Token**:
An unguessable link identifier that grants read-only access to a **Public Issue Page**.
_Avoid_: Friendly ID, issue number, project ID

**Share Link**:
A URL containing a **Share Token** that opens a **Public Issue Page**.
_Avoid_: Public URL when the token matters

## Relationships

- An **API Bug** is exactly one kind of **Issue**
- An **API Bug** belongs to exactly one Project
- A **Public Issue Page** represents exactly one **API Bug**
- Only an **API Bug** can have **Public Sharing**
- **Public Sharing** is disabled unless a **Registered User** enables it
- Any **Registered User** with access to the Project can manage **Public Sharing** for its **API Bugs**
- **Public Sharing** uses a **Share Token** instead of a guessable Issue identifier
- Disabling **Public Sharing** immediately invalidates the existing **Share Token**
- A **Share Link** opens a **Public Issue Page** without exposing Project or Issue identifiers
- An invalid **Share Link** does not reveal whether sharing was disabled, the token never existed, or the **API Bug** was deleted
- A **Public Issue Page** reflects the current **API Bug**, not a saved snapshot
- An **API Bug** has at most one active **Share Link**
- A **Public Viewer** can read a **Public Issue Page** but cannot change it
- A **Public Issue Page** shows reproducibility details but excludes internal workflow details
- A **Public Issue Page** does not include Issue comments
- A **Public Issue Page** exposes a public-safe view of request headers, not raw secret values
- A **Public Issue Page** does not automatically clean request or response bodies
- A **Registered User** is responsible for confirming body content before enabling **Public Sharing**
- A **Registered User** creates and manages **Issues**

## Example dialogue

> **Dev:** "Can a **Public Viewer** update the status on a **Public Issue Page**?"
> **Domain expert:** "No. A **Public Viewer** can only read the shared **API Bug** after **Public Sharing** is enabled; a **Registered User** manages the actual **Issue**."

## Flagged ambiguities

- "User" was used to mean both a signed-in app user and an anonymous reader. Resolved: use **Registered User** for authenticated app users and **Public Viewer** for anonymous readers.
