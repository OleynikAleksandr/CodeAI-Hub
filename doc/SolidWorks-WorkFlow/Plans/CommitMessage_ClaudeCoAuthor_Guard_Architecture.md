# Commit Message Claude Co-Author Guard

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Oleksandr + Codex
**Scope:** Git commit message hygiene for local developer workflows

## Problem

Historical commits on `main` contained `Co-Authored-By: Claude ... <noreply@anthropic.com>` trailers.
GitHub interpreted those trailers as contributor attribution, which polluted the repository contributors graph and later required a full history rewrite.

The current repository guard set validates code, docs, duplicates, and links, but it does not validate or sanitize the commit message itself.

## Goal

Prevent future commits from persisting Claude co-author trailers while keeping the local developer flow simple and low-friction.

## Solution

Add a dedicated Husky `commit-msg` hook backed by a repository script:

1. Read the commit message file passed by Git.
2. Remove any line matching the blocked trailer family:
   - `Co-Authored-By: Claude ... <noreply@anthropic.com>`
3. Re-check the file after sanitization.
4. Fail the commit only if a blocked trailer still remains.

This design makes the protection resilient against automated trailer injection without forcing the developer to re-run the entire commit flow manually for the common case.

## Files

- `.husky/commit-msg`
- `scripts/check-commit-message.sh`
- `scripts/README.md`

## Contract

- The guard is case-insensitive for the blocked Claude trailer prefix.
- The guard must operate only on the commit message file provided by Git.
- The guard may mutate the commit message file to remove blocked lines.
- The guard must print a visible warning when it sanitizes a message.
- The guard must exit non-zero if a blocked trailer still exists after sanitization.

## Verification

- Run the script manually against a temporary commit message fixture containing a blocked trailer.
- Verify that the blocked line is removed.
- Verify that the script exits successfully after cleanup.
- Verify that clean commit messages pass unchanged.
