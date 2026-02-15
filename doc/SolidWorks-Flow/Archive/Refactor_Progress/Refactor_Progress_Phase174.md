# Phase 174 Report — Patch Release Build 1.1.596

**Date:** 2026-02-14 17:45 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.596

## Цель
Собрать новый patch релиз после Phase 173.

## Выполнено
- Гейты качества:
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - `npm run typecheck:webview`
- `./scripts/build-all.sh` -> версия `1.1.596`.
- `./scripts/build-release.sh --use-current-version` -> VSIX.

## Артефакты
- VSIX:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.596.vsix`
- Tarballs (release cache):
  - `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.596.tar.bz2`
- Tarballs (repo copy):
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.596.tar.bz2`

## Коммиты
- `cf362b4e chore(release): build-all for next patch`
- `22685b2b docs(todo): record patch release build (1.1.596)`
- `a13c5014 docs(todo): finalize patch release record (1.1.596)`
