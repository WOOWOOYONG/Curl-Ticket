#!/usr/bin/env bash
# Sync .agents/skills/* symlinks to .claude/skills and .codex/skills
# Usage: bash scripts/sync-skills.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$REPO_ROOT/.agents/skills"
TARGETS=("$REPO_ROOT/.claude/skills" "$REPO_ROOT/.codex/skills")

if [ ! -d "$SOURCE" ]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

for target_dir in "${TARGETS[@]}"; do
  mkdir -p "$target_dir"

  # Create missing symlinks
  for skill_dir in "$SOURCE"/*/; do
    skill_name="$(basename "$skill_dir")"
    link_path="$target_dir/$skill_name"

    if [ ! -e "$link_path" ]; then
      ln -s "../../.agents/skills/$skill_name" "$link_path"
      echo "  + $target_dir/$skill_name (created)"
    fi
  done

  # Remove broken symlinks (skill was deleted from .agents/skills)
  for link in "$target_dir"/*; do
    [ -L "$link" ] || continue
    if [ ! -e "$link" ]; then
      rm "$link"
      echo "  - $link (removed broken link)"
    fi
  done
done

echo ""
echo "Sync complete."
