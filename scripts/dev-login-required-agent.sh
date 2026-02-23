#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PROTECTED_PATH="${DEV_LOGIN_PROTECTED_PATH:-/}"
SESSION="${AGENT_BROWSER_SESSION:-dev-login-required}"
WAIT_MS="${DEV_LOGIN_WAIT_MS:-800}"
SHOT_PATH="${DEV_LOGIN_SCREENSHOT_PATH:-/tmp/curl-ticket-login-required.png}"

echo "[1/7] Open login page to initialize origin context"
pnpm exec agent-browser --session "$SESSION" open "${BASE_URL}/login"

echo "[2/7] Clear cookies"
pnpm exec agent-browser --session "$SESSION" cookies clear

echo "[3/7] Clear localStorage"
pnpm exec agent-browser --session "$SESSION" storage local clear

echo "[4/7] Clear sessionStorage"
pnpm exec agent-browser --session "$SESSION" storage session clear

echo "[5/7] Open protected page: ${BASE_URL}${PROTECTED_PATH}"
pnpm exec agent-browser --session "$SESSION" open "${BASE_URL}${PROTECTED_PATH}"
pnpm exec agent-browser --session "$SESSION" wait "$WAIT_MS"

echo "[6/7] Current URL (expected: /login when unauthenticated)"
pnpm exec agent-browser --session "$SESSION" get url

echo "[7/7] Capture login-required evidence"
pnpm exec agent-browser --session "$SESSION" screenshot "$SHOT_PATH"
pnpm exec agent-browser --session "$SESSION" snapshot -i

echo "Done."
echo "Screenshot: ${SHOT_PATH}"
echo "Session: ${SESSION}"
