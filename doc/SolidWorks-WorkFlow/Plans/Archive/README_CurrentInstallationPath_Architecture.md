# README Current Installation Path Section — Architecture

**Status:** Archived
**Date:** 2026-04-20
**Owner:** Codex

## 1. Goal

Add a short user-facing README section that explains how technically prepared users can try CodeAI Hub today.

## 2. Problem

The current README jumps from project description into generic `Getting Started` commands without clearly stating:
- that the product is already usable but still in active development;
- that the current recommended path is source-based;
- what prerequisites are expected before running the build scripts;
- what artefacts the user gets after the build.

## 3. Decision

Add a concise English section for early-access / technical users that includes:
- current installation status;
- prerequisites;
- build-from-source commands;
- resulting artefacts;
- VSIX install note;
- short limitations/notes.

The tone should target developers or technically prepared users, not complete beginners.

## 4. Scope

- `README.md`
- `doc/TODO/todo-plan.md`

## 5. Verification

- verify the final README wording and placement;
- ensure `git diff` only reflects the intended documentation change.
