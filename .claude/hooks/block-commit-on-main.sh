#!/bin/bash
# block-commit-on-main.sh — PreToolUse hook: block git commits on main/master

INPUT=$(cat)
CMD=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).tool_input?.command||'')}catch{}})" 2>/dev/null)

# Match direct and git -C <dir> commit patterns
if [[ "$CMD" =~ (^git[[:space:]]+commit|&&[[:space:]]*git[[:space:]]+commit|^git[[:space:]]+-C[[:space:]].*[[:space:]]commit) ]]; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo '{"decision": "block", "reason": "You are on main — create a feature branch first: git checkout -b <branch-name>"}'
    exit 2
  fi
fi

exit 0
