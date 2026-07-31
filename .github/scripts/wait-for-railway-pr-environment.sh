#!/usr/bin/env bash
# Local debugging helper. CI inlines this logic in pr-preview-database.yml so
# PR-controlled files never run with account-scoped Railway credentials.
set -euo pipefail

pr_number="${1:?PR number required}"
env_prefix="${2:-ploutizo-pr}"
project_id="${3:?Railway project ID required}"
target_name="${env_prefix}-${pr_number}"
# Link to a stable environment so the CLI can list ephemeral PR envs in CI.
railway link -p "$project_id" -e production >/dev/null

for attempt in $(seq 1 36); do
  if railway environment list --ephemeral --json \
    | jq -e --arg name "$target_name" '.environments[] | select(.name == $name)' >/dev/null; then
    echo "Found Railway PR environment: ${target_name}"
    exit 0
  fi

  echo "Waiting for Railway PR environment ${target_name} (${attempt}/36)..."
  sleep 10
done

echo "Railway PR environment ${target_name} not found after 6 minutes" >&2
exit 1
