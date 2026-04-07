## ADDED Requirements

### Requirement: Configurable request timeout

The CLI SHALL support a `CURL_TICKET_TIMEOUT` environment variable that sets the request timeout in milliseconds. The default value SHALL be `30000` (30 seconds). When a request exceeds the timeout, the CLI SHALL abort the request and report a timeout error.

#### Scenario: Default timeout

- **WHEN** user runs any CLI command without setting `CURL_TICKET_TIMEOUT`
- **THEN** requests time out after 30 seconds

#### Scenario: Custom timeout

- **WHEN** user sets `CURL_TICKET_TIMEOUT=5000` and runs a CLI command
- **THEN** requests time out after 5 seconds

#### Scenario: Timeout triggers error

- **WHEN** a request exceeds the configured timeout
- **THEN** the CLI reports `Request timed out after {n}ms.` on stderr and exits with `ExitCode.NetworkError`

### Requirement: Automatic retry on network errors

The CLI SHALL retry failed requests once when a `NetworkError` occurs (fetch threw, no HTTP response received). Retries MUST only apply to safe (GET) requests. Mutating requests (`POST`, `PATCH`, `DELETE`) MUST NOT be retried on network errors.

#### Scenario: GET request with transient network failure

- **WHEN** a GET request fails with a network error on the first attempt
- **THEN** the CLI retries the request once
- **THEN** if the retry succeeds, the result is returned normally
- **THEN** if the retry also fails, the CLI reports the network error and exits

#### Scenario: POST request with network failure

- **WHEN** a POST request fails with a network error
- **THEN** the CLI MUST NOT retry and SHALL report the error immediately

### Requirement: Rate limit handling with Retry-After

The CLI SHALL handle HTTP 429 responses by waiting for the duration specified in the `Retry-After` header, then retrying once. This applies to all HTTP methods. The maximum wait time SHALL be capped at 60 seconds. If no `Retry-After` header is present, the CLI SHALL wait 5 seconds before retrying.

#### Scenario: 429 with Retry-After header

- **WHEN** a request receives a 429 response with `Retry-After: 10`
- **THEN** the CLI waits 10 seconds and retries once
- **THEN** if the retry succeeds, the result is returned normally

#### Scenario: 429 with excessive Retry-After

- **WHEN** a request receives a 429 response with `Retry-After: 120`
- **THEN** the CLI MUST NOT wait longer than 60 seconds and SHALL report `Rate limited. Retry-After exceeds maximum wait time (60s).` and exit

#### Scenario: 429 without Retry-After header

- **WHEN** a request receives a 429 response without a `Retry-After` header
- **THEN** the CLI waits 5 seconds and retries once
