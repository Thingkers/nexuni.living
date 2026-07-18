#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CPANEL_SSH_HOST="${CPANEL_SSH_HOST:-server184.web-hosting.com}"
CPANEL_SSH_PORT="${CPANEL_SSH_PORT:-21098}"
CPANEL_SSH_USER="${CPANEL_SSH_USER:-nexuvlco}"
CPANEL_SSH_KEY="${CPANEL_SSH_KEY:-$HOME/.ssh/nexuni_deploy}"
CPANEL_APP_ROOT="${CPANEL_APP_ROOT:-/home/nexuvlco/nexuni_app}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DRY_RUN="${DRY_RUN:-0}"

SSH=(
  ssh
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -i "$CPANEL_SSH_KEY"
  -p "$CPANEL_SSH_PORT"
)
REMOTE="$CPANEL_SSH_USER@$CPANEL_SSH_HOST"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

require_command ssh
require_command rsync
require_command curl

if [[ ! -f "$CPANEL_SSH_KEY" ]]; then
  echo "Private key not found: $CPANEL_SSH_KEY" >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  require_command docker
  if [[ ! -f "$ROOT_DIR/.env.production" ]]; then
    echo "Missing $ROOT_DIR/.env.production (public build variables only)." >&2
    exit 1
  fi

  docker_args=(
    --rm
    --platform "$DOCKER_PLATFORM"
    -v "$ROOT_DIR:/app"
    -v nexuni_node_modules:/app/node_modules
    -w /app
  )
  if [[ -n "${SENTRY_AUTH_TOKEN:-}" ]]; then
    docker_args+=(-e SENTRY_AUTH_TOKEN)
  fi

  docker run "${docker_args[@]}" node:22-bookworm \
    bash -lc "npm ci && npm run lint && npx tsc --noEmit && npm run build:cpanel"
fi

ARTIFACT="$ROOT_DIR/.next/standalone"
for required in \
  "$ARTIFACT/server.js" \
  "$ARTIFACT/.next/static" \
  "$ARTIFACT/public"; do
  if [[ ! -e "$required" ]]; then
    echo "Incomplete deployment artifact: $required" >&2
    exit 1
  fi
done

"${SSH[@]}" "$REMOTE" \
  "test -d '$CPANEL_APP_ROOT' && test -x '/home/$CPANEL_SSH_USER/nodevenv/nexuni_app/22/bin/node'"

rsync_options=(
  -az
  --delete
  --exclude=stderr.log
  --exclude=tmp/
  --exclude=.next/cache/
  --itemize-changes
)
if [[ "$DRY_RUN" == "1" ]]; then
  rsync_options+=(-n)
fi

rsync "${rsync_options[@]}" \
  -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -i $CPANEL_SSH_KEY -p $CPANEL_SSH_PORT" \
  "$ARTIFACT/" \
  "$REMOTE:$CPANEL_APP_ROOT/"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run complete; no files were uploaded."
  exit 0
fi

"${SSH[@]}" "$REMOTE" \
  "mkdir -p '$CPANEL_APP_ROOT/tmp' && touch '$CPANEL_APP_ROOT/tmp/restart.txt'"

sleep 5
for path in / /listings /manifest.json /sitemap.xml; do
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 "https://nexuni.living$path")"
  echo "$code $path"
  if [[ "$code" != "200" ]]; then
    echo "Smoke test failed for $path" >&2
    exit 1
  fi
done

echo "Deployment completed: https://nexuni.living"
