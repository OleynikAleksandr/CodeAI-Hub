# Phase 172 Report — Release Build 1.1.595

**Date:** 2026-02-14 17:20 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.595

## Цель
Собрать новый patch релиз после изменений Phase 170-171 (PM dialog mode: history+send+live).

## Выполнено
- Прогнаны гейты качества:
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - `npm run typecheck:webview`
- Запущен `./scripts/build-all.sh` (bump + сборка модулей/ядра/UI/launcher) -> версия `1.1.595`.
- Запущен `./scripts/build-release.sh --use-current-version` -> собран VSIX.

## Артефакты
- VSIX:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.595.vsix`
- Tarballs (release cache):
  - `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.595.tar.bz2`
- Tarballs (repo copy):
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.595.tar.bz2`

## Связанные коммиты
- `d20b1547 chore(release): build-all for next patch`
- `04e0f375 docs(todo): record patch release build`
- `32d97892 docs(todo): finalize patch release build record`

## Замечания
- `check-architecture.sh` проходит с WARNING по файлам, приближающимся к лимиту 300 строк (без превышений). Это не блокер релиза.
