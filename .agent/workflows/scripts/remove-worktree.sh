#!/usr/bin/env bash

# Script to interactively remove Git worktrees and their associated branches
# Provides a list of Agent-* worktrees and allows selection with confirmation

set -e

# Change to the repository root
cd "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub" || exit 1

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Git Worktree Removal Tool ===${NC}\n"

# Get list of worktrees with Agent-* pattern
worktrees=$(git worktree list --porcelain | awk '
  /^worktree/ { path=$2 }
  /^branch/ { 
    branch=$2
    gsub("refs/heads/", "", branch)
    if (branch ~ /^Agent-[0-9]{3}$/) {
      print path "|" branch
    }
  }
')

if [ -z "$worktrees" ]; then
  echo -e "${YELLOW}No Agent-* worktrees found.${NC}"
  exit 0
fi

# Display available worktrees
echo -e "${GREEN}Available worktrees:${NC}\n"
index=1
declare -a paths
declare -a branches

while IFS='|' read -r path branch; do
  echo -e "  ${BLUE}[$index]${NC} $branch"
  echo -e "      Path: $path"
  paths[$index]=$path
  branches[$index]=$branch
  ((index++))
done <<< "$worktrees"

echo ""

# Ask for selection
echo -e "${YELLOW}Enter numbers to remove (space-separated, e.g., '1 3 5'), or 'all' for all, or 'q' to quit:${NC}"
read -r selection

# Handle quit
if [[ "$selection" == "q" || "$selection" == "Q" ]]; then
  echo -e "${BLUE}Cancelled.${NC}"
  exit 0
fi

# Prepare list of items to remove
declare -a to_remove_indices

if [[ "$selection" == "all" || "$selection" == "ALL" ]]; then
  for i in "${!branches[@]}"; do
    if [ -n "${branches[$i]}" ]; then
      to_remove_indices+=("$i")
    fi
  done
else
  # Parse space-separated numbers
  for num in $selection; do
    if [[ "$num" =~ ^[0-9]+$ ]] && [ -n "${branches[$num]}" ]; then
      to_remove_indices+=("$num")
    else
      echo -e "${RED}Warning: Invalid selection '$num' - skipping${NC}"
    fi
  done
fi

# Check if anything to remove
if [ ${#to_remove_indices[@]} -eq 0 ]; then
  echo -e "${YELLOW}No valid selections made.${NC}"
  exit 0
fi

# Show what will be removed and ask for confirmation
echo -e "\n${RED}The following will be REMOVED:${NC}\n"
for idx in "${to_remove_indices[@]}"; do
  echo -e "  ${RED}✗${NC} ${branches[$idx]}"
  echo -e "    Path: ${paths[$idx]}"
done

echo -e "\n${YELLOW}Are you sure? This action cannot be undone! (yes/no):${NC}"
read -r confirmation

if [[ "$confirmation" != "yes" && "$confirmation" != "YES" ]]; then
  echo -e "${BLUE}Cancelled.${NC}"
  exit 0
fi

# Perform removal
echo -e "\n${GREEN}Removing worktrees and branches...${NC}\n"

for idx in "${to_remove_indices[@]}"; do
  path="${paths[$idx]}"
  branch="${branches[$idx]}"
  
  echo -e "${BLUE}Processing: $branch${NC}"
  
  # Remove worktree
  if git worktree remove "$path" --force 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Worktree removed: $path"
  else
    echo -e "  ${RED}✗${NC} Failed to remove worktree: $path"
    continue
  fi
  
  # Delete branch
  if git branch -D "$branch" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Branch deleted: $branch"
  else
    echo -e "  ${YELLOW}⚠${NC} Branch may not exist or already deleted: $branch"
  fi
  
  echo ""
done

echo -e "${GREEN}=== Cleanup complete! ===${NC}"
