#!/bin/bash

# Architecture Check Script for CodeAI Hub
# This script MUST run before every compile to prevent architecture violations

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAX_LINES=500
WARNING_LINES=400
MAX_LINES_ALLOWLIST_FILE="$SCRIPT_DIR/check-architecture-rules/max-lines-debt-allowlist.txt"

echo "🏗️  Architecture Check Starting..."
echo "================================"

# Color codes
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Flags
HAS_VIOLATIONS=0
HAS_WARNINGS=0

discover_source_roots() {
  if [ -d "src" ]; then
    printf '%s\n' "src"
  fi

  if [ -d "packages" ]; then
    find packages -type d -name "src" \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      | sort -u
  fi
}

load_allowlist() {
  if [ ! -f "$MAX_LINES_ALLOWLIST_FILE" ]; then
    return 0
  fi

  sed \
    -e 's/[[:space:]]*#.*$//' \
    -e '/^[[:space:]]*$/d' \
    "$MAX_LINES_ALLOWLIST_FILE"
}

is_allowlisted_path() {
  local candidate="$1"
  if [ -z "$MAX_LINES_ALLOWLIST" ]; then
    return 1
  fi
  printf '%s\n' "$MAX_LINES_ALLOWLIST" | grep -F -x -- "$candidate" >/dev/null 2>&1
}

collect_file_lengths() {
  while IFS= read -r root; do
    [ -n "$root" ] || continue
    find "$root" -type f \( -name "*.ts" -o -name "*.tsx" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      -print0
  done < <(printf '%s\n' "$SOURCE_ROOTS") \
    | while IFS= read -r -d '' file; do
        lines=$(wc -l < "$file")
        printf "%s\t%s\n" "$lines" "$file"
      done
}

SOURCE_ROOTS=$(discover_source_roots)
SOURCE_ROOT_COUNT=$(printf '%s\n' "$SOURCE_ROOTS" | sed '/^$/d' | wc -l | awk '{print $1}')
MAX_LINES_ALLOWLIST=$(load_allowlist)
ALLOWLIST_COUNT=$(printf '%s\n' "$MAX_LINES_ALLOWLIST" | sed '/^$/d' | wc -l | awk '{print $1}')
FILE_LENGTHS=$(collect_file_lengths)

echo ""
echo "📚 Source roots under architecture guard:"
echo "-----------------------------------"
printf '%s\n' "$SOURCE_ROOTS"
echo ""
echo "Source roots scanned: $SOURCE_ROOT_COUNT"
echo "Explicit oversized-file debt allowlist: $ALLOWLIST_COUNT"

# Check 1: Files > 300 lines (CRITICAL)
echo ""
echo "📏 Checking file sizes (max ${MAX_LINES} lines)..."
echo "-----------------------------------"

LARGE_FILES=""
ALLOWLISTED_LARGE_FILES=""
WARNING_FILES=""
LARGE_FILE_COUNT=0
ALLOWLISTED_LARGE_FILE_COUNT=0
WARNING_FILE_COUNT=0

while IFS=$'\t' read -r line_count file_path; do
  [ -n "$file_path" ] || continue

  if [ "$line_count" -gt "$MAX_LINES" ]; then
    if is_allowlisted_path "$file_path"; then
      ALLOWLISTED_LARGE_FILES="${ALLOWLISTED_LARGE_FILES}${file_path} - ${line_count} lines\n"
      ALLOWLISTED_LARGE_FILE_COUNT=$((ALLOWLISTED_LARGE_FILE_COUNT + 1))
    else
      LARGE_FILES="${LARGE_FILES}${file_path} - ${line_count} lines\n"
      LARGE_FILE_COUNT=$((LARGE_FILE_COUNT + 1))
    fi
    continue
  fi

  if [ "$line_count" -ge "$WARNING_LINES" ]; then
    WARNING_FILES="${WARNING_FILES}${file_path} - ${line_count} lines\n"
    WARNING_FILE_COUNT=$((WARNING_FILE_COUNT + 1))
  fi
done <<< "$FILE_LENGTHS"

if [ -n "$LARGE_FILES" ]; then
  echo -e "${RED}❌ VIOLATION: Files exceeding ${MAX_LINES} lines outside the debt allowlist:${NC}"
  printf '%b' "$LARGE_FILES"
  echo ""
  echo "Total blocking files over limit: $LARGE_FILE_COUNT"
  echo ""
  echo -e "${RED}⚠️  STOP! You MUST refactor these files before adding new features!${NC}"
  echo -e "${RED}Create new micro-classes instead of adding to existing large files!${NC}"
  HAS_VIOLATIONS=1
else
  echo -e "${GREEN}✅ No non-allowlisted files exceed ${MAX_LINES} lines${NC}"
fi

if [ -n "$ALLOWLISTED_LARGE_FILES" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  TEMPORARY DEBT: allowlisted oversized source files still over ${MAX_LINES} lines:${NC}"
  printf '%b' "$ALLOWLISTED_LARGE_FILES"
  echo ""
  echo "Total allowlisted oversized files: $ALLOWLISTED_LARGE_FILE_COUNT"
  echo -e "${YELLOW}These files are tracked debt, not hidden exclusions. New oversized files must not be added.${NC}"
  HAS_WARNINGS=1
fi

# Check 2: Files approaching limit (WARNING at 250 lines)
echo ""
echo "⚠️  Checking files approaching limit (${WARNING_LINES}-${MAX_LINES} lines)..."
echo "-----------------------------------"

if [ -n "$WARNING_FILES" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Files approaching ${MAX_LINES}-line limit:${NC}"
  printf '%b' "$WARNING_FILES"
  echo ""
  echo "Total files in warning zone: $WARNING_FILE_COUNT"
  echo -e "${YELLOW}Consider refactoring these files BEFORE adding new code!${NC}"
  HAS_WARNINGS=1
else
  echo -e "${GREEN}✅ No files in warning zone (${WARNING_LINES}-${MAX_LINES} lines)${NC}"
fi

# Check 3: Facade pattern check
echo ""
echo "🏛️  Checking facade pattern compliance..."
echo "-----------------------------------"

FACADE_FILES=$(while IFS= read -r root; do
  [ -n "$root" ] || continue
  find "$root" -type f \( -iname "*facade.ts" -o -iname "*facade.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*"
done <<< "$SOURCE_ROOTS")

if [ -z "$FACADE_FILES" ]; then
  FACADE_COUNT=0
else
  FACADE_COUNT=$(printf "%s\n" "$FACADE_FILES" | sed '/^$/d' | wc -l | awk '{print $1}')
fi
echo "Found $FACADE_COUNT facade file(s)"
if [ "$FACADE_COUNT" -gt 0 ]; then
  printf '%s\n' "$FACADE_FILES"
fi

LARGE_NON_FACADES=""
while IFS=$'\t' read -r line_count file_path; do
  [ -n "$file_path" ] || continue
  if [ "$line_count" -gt "$MAX_LINES" ] && ! is_allowlisted_path "$file_path" && [[ ! "$file_path" =~ [Ff]acade ]]; then
    LARGE_NON_FACADES="${LARGE_NON_FACADES}${file_path}\n"
  fi
done <<< "$FILE_LENGTHS"

if [ -n "$LARGE_NON_FACADES" ]; then
  echo -e "${RED}❌ Non-facade files over ${MAX_LINES} lines detected!${NC}"
  echo "These should be refactored into micro-classes with a facade"
fi

STALE_ALLOWLIST=""
while IFS= read -r allowlisted_path; do
  [ -n "$allowlisted_path" ] || continue
  if [ ! -f "$allowlisted_path" ]; then
    STALE_ALLOWLIST="${STALE_ALLOWLIST}${allowlisted_path} - missing file\n"
    continue
  fi
  allowlisted_lines=$(wc -l < "$allowlisted_path")
  if [ "$allowlisted_lines" -le "$MAX_LINES" ]; then
    STALE_ALLOWLIST="${STALE_ALLOWLIST}${allowlisted_path} - now ${allowlisted_lines} lines (remove from allowlist)\n"
  fi
done <<< "$MAX_LINES_ALLOWLIST"

if [ -n "$STALE_ALLOWLIST" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  WARNING: stale oversized-file allowlist entries detected:${NC}"
  printf '%b' "$STALE_ALLOWLIST"
  HAS_WARNINGS=1
fi

# Check 4: Empty directory detection
echo ""
echo "📁 Checking for empty directories..."
echo "-----------------------------------"
EMPTY_DIRECTORIES=$(find src packages -type d -empty -not -path "*/node_modules/*" -not -path "*/dist" -not -path "*/build" -not -path "*/.*")
if [ -n "$EMPTY_DIRECTORIES" ]; then
  EMPTY_DIR_COUNT=$(printf "%s\n" "$EMPTY_DIRECTORIES" | sed '/^$/d' | wc -l | awk '{print $1}')
  echo -e "${YELLOW}⚠️  WARNING: Empty directories detected:${NC}"
  printf '%s\n' "$EMPTY_DIRECTORIES"
  HAS_WARNINGS=1
else
  EMPTY_DIR_COUNT=0
  echo -e "${GREEN}✅ No empty directories found in src/ or packages/${NC}"
fi

# Check 5: New files check (reminder)
echo ""
echo "📝 Reminder for new code:"
echo "-----------------------------------"
echo "When adding new functionality:"
echo "1. ✅ Create NEW micro-class if existing file > 250 lines"
echo "2. ✅ Each micro-class should have single responsibility"
echo "3. ✅ Use Facade pattern for module coordination"
echo "4. ✅ Update Architecture.md after adding new classes"

# Check 6: Duplication guard
echo ""
echo "🔁 Running duplication check (jscpd)..."
echo "-----------------------------------"

DUPLICATION_THRESHOLD=3

npm run -s check:dup:repo

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Duplication threshold (${DUPLICATION_THRESHOLD}%) exceeded${NC}"
  HAS_VIOLATIONS=1
else
  echo -e "${GREEN}✅ Duplication within ${DUPLICATION_THRESHOLD}% threshold${NC}"
fi

# Check 7: UI style single-source guardrails
echo ""
echo "🎨 Running UI style SSOT guardrails..."
echo "-----------------------------------"
if ! bash scripts/check-architecture-rules/ui-style-ssot.sh; then
  HAS_VIOLATIONS=1
fi

# Final verdict
echo ""
echo "================================"
echo "Summary:"
echo "  Source roots scanned: $SOURCE_ROOT_COUNT"
echo "  Blocking >${MAX_LINES} lines: $LARGE_FILE_COUNT file(s)"
echo "  Allowlisted >${MAX_LINES} lines: $ALLOWLISTED_LARGE_FILE_COUNT file(s)"
echo "  ${WARNING_LINES}-${MAX_LINES} lines: $WARNING_FILE_COUNT file(s)"
echo "  Facades detected: $FACADE_COUNT"
echo "  Empty directories: $EMPTY_DIR_COUNT"
echo ""
if [ $HAS_VIOLATIONS -eq 1 ]; then
    echo -e "${RED}❌ ARCHITECTURE CHECK FAILED!${NC}"
    echo -e "${RED}You have files over 300 lines. Refactor them first!${NC}"
    echo ""
    echo "To fix:"
    echo "1. Create micro-classes for large files"
    echo "2. Extract methods to new classes"
    echo "3. Use facade pattern for coordination"
    exit 1
elif [ $HAS_WARNINGS -eq 1 ]; then
    echo -e "${YELLOW}⚠️  ARCHITECTURE CHECK PASSED WITH WARNINGS${NC}"
    echo "Some files are approaching the limit. Be careful!"
    exit 0
else
    echo -e "${GREEN}✅ ARCHITECTURE CHECK PASSED!${NC}"
    echo "All files comply with architecture rules."
    exit 0
fi
