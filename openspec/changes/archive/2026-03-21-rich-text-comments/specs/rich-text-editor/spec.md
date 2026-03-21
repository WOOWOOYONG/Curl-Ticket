## ADDED Requirements

### Requirement: Rich text comment composer
The comment composer SHALL use Nuxt UI's `Editor` and `EditorToolbar` components to provide rich text editing. The editor SHALL replace the existing `UTextarea` input in `IssueComments.vue`.

#### Scenario: User opens comment composer
- **WHEN** user views the comment section of an issue
- **THEN** a rich text editor with toolbar SHALL be displayed in place of the plain textarea
- **THEN** the toolbar SHALL include: Bold, Italic, Strikethrough, Inline Code, Code Block, Bullet List, Ordered List, Blockquote, and Link actions

#### Scenario: User applies formatting via toolbar
- **WHEN** user selects text and clicks a toolbar action (e.g., Bold)
- **THEN** the selected text SHALL be wrapped in the corresponding formatting
- **THEN** the toolbar button SHALL visually indicate the active formatting state

#### Scenario: User submits a formatted comment
- **WHEN** user types formatted content and clicks the "Comment" button
- **THEN** the comment SHALL be submitted with HTML content to the API
- **THEN** the editor SHALL be cleared after successful submission

#### Scenario: Empty editor submission prevention
- **WHEN** the editor contains no visible text (only empty tags like `<p></p>`)
- **THEN** the "Comment" button SHALL be disabled

### Requirement: HTML content storage
The system SHALL store comment content as HTML in the existing `content` column of the `issue_comments` table. No database schema migration SHALL be required.

#### Scenario: HTML content saved to database
- **WHEN** a comment is submitted with rich text formatting
- **THEN** the `content` column SHALL contain the HTML representation of the formatted text

#### Scenario: Content length validation
- **WHEN** a comment is submitted
- **THEN** the server SHALL validate that the HTML content does not exceed 5000 characters
- **THEN** the server SHALL reject content exceeding 5000 characters with a 400 error

### Requirement: Safe HTML rendering
The system SHALL render stored HTML content safely in the comment display area, preventing XSS attacks.

#### Scenario: Rendering a rich text comment
- **WHEN** a comment with HTML content is displayed
- **THEN** the HTML SHALL be rendered with formatting intact (bold, code blocks, lists, etc.)
- **THEN** only allowed HTML tags SHALL be rendered (p, strong, em, s, code, pre, ul, ol, li, blockquote, a, br)

#### Scenario: Rendering an existing plain-text comment
- **WHEN** a comment with plain-text content (no HTML tags) is displayed
- **THEN** the content SHALL be rendered as plain text with whitespace preserved
- **THEN** the display SHALL be visually consistent with HTML-formatted comments

#### Scenario: Malicious HTML content
- **WHEN** comment content contains script tags, event handlers, or other XSS vectors
- **THEN** the dangerous elements SHALL be stripped or escaped before rendering
- **THEN** safe content within the comment SHALL still render correctly

### Requirement: Notification preview text
The system SHALL generate plain-text previews from HTML comment content for notifications.

#### Scenario: Notification created from rich text comment
- **WHEN** a user comments on another user's issue with formatted content
- **THEN** the notification `content` SHALL contain a plain-text version with HTML tags stripped
- **THEN** the preview SHALL be truncated to 200 characters if the stripped text exceeds that length

### Requirement: Character count display
The editor SHALL display a character count indicator showing the current content length relative to the maximum.

#### Scenario: Character count reflects content length
- **WHEN** user types in the rich text editor
- **THEN** a character count SHALL be displayed showing current length vs 5000 maximum
- **THEN** the count SHALL reflect the HTML content length (not visible text length)

#### Scenario: Character count color warning
- **WHEN** content length exceeds 4500 characters
- **THEN** the character count SHALL display in amber/warning color
- **WHEN** content length exceeds 4750 characters
- **THEN** the character count SHALL display in red/error color
