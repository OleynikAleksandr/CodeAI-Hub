#!/usr/bin/env bash

# Script to create a new Git worktree with sequential numeric suffixes
# and a corresponding branch named Agent-<NNN>.

# Change to the repository root (the workspace directory)
cd "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub" || exit 1

# Get existing numeric suffixes of worktrees
existing=$(git worktree list --porcelain | awk '/^worktree/ {print $2}' | grep -E -- '-[0-9]{3}$' | sed -E 's/.*-([0-9]{3})$/\1/')

if [ -z "$existing" ]; then
  next=001
else
  max=$(printf "%s\n" $existing | sort -V | tail -n1)
  next=$(printf "%03d" $((10#$max + 1)))
fi

# Ensure branch name is unique (in case a branch with this number already exists)
while git rev-parse --verify "Agent-$next" >/dev/null 2>&1; do
  next=$(printf "%03d" $((10#$next + 1)))
 done

wt_path="${PWD}-$next"
branch="Agent-$next"

# Create the worktree and the new branch
git worktree add "$wt_path" -b "$branch"
