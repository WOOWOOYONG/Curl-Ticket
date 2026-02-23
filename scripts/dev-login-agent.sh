#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
LOGIN_API_PATH="${DEV_LOGIN_API_PATH:-/api/dev/login}"
PROTECTED_PATH="${DEV_LOGIN_PROTECTED_PATH:-/}"
SESSION="${AGENT_BROWSER_SESSION:-dev-login}"
WAIT_MS="${DEV_LOGIN_WAIT_MS:-1200}"
SHOT_PATH="${DEV_LOGIN_SCREENSHOT_PATH:-/tmp/curl-ticket-logged-in.png}"
KEY="${DEV_LOGIN_KEY:-}"
REDIRECT_ENCODED="$(node -p "encodeURIComponent(process.argv[1])" "$PROTECTED_PATH")"

LOGIN_URL="${BASE_URL}${LOGIN_API_PATH}?redirect=${REDIRECT_ENCODED}"

if [[ -n "$KEY" ]]; then
  KEY_ENCODED="$(node -p "encodeURIComponent(process.argv[1])" "$KEY")"
  LOGIN_URL="${LOGIN_URL}&key=${KEY_ENCODED}"
fi

echo "[1/8] Open login page to initialize origin context"
pnpm exec agent-browser --session "$SESSION" open "${BASE_URL}/login"

echo "[2/8] Clear cookies"
pnpm exec agent-browser --session "$SESSION" cookies clear

echo "[3/8] Clear localStorage"
pnpm exec agent-browser --session "$SESSION" storage local clear

echo "[4/8] Clear sessionStorage"
pnpm exec agent-browser --session "$SESSION" storage session clear

echo "[5/8] Call dev login API via fetch: ${LOGIN_URL}"
LOGIN_URL_JSON="$(node -p "JSON.stringify(process.argv[1])" "$LOGIN_URL")"
pnpm exec agent-browser --session "$SESSION" eval "(async () => { const res = await fetch(${LOGIN_URL_JSON}, { method: 'GET', credentials: 'include' }); if (!res.ok) { throw new Error('Dev login API failed with status ' + res.status); } const finalPath = new URL(res.url).pathname; if (finalPath === '/login') { throw new Error('Dev login did not establish session (final URL: ' + res.url + ')'); } return { status: res.status, redirected: res.redirected, url: res.url }; })()"
pnpm exec agent-browser --session "$SESSION" wait "$WAIT_MS"

echo "[6/8] Open protected page: ${BASE_URL}${PROTECTED_PATH}"
pnpm exec agent-browser --session "$SESSION" open "${BASE_URL}${PROTECTED_PATH}"
pnpm exec agent-browser --session "$SESSION" wait "$WAIT_MS"

echo "[7/8] Current URL"
pnpm exec agent-browser --session "$SESSION" get url

echo "[8/8] Capture authenticated evidence"
pnpm exec agent-browser --session "$SESSION" screenshot "$SHOT_PATH"
pnpm exec agent-browser --session "$SESSION" snapshot -i

echo "Done."
echo "Screenshot: ${SHOT_PATH}"
echo "Session: ${SESSION}"
echo "Tip: Use the same session for follow-up actions."
