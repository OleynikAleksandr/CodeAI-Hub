# Session 034 — Codex Session History Fix + Release v1.1.579

**Date:** 2026-02-13 09:24 (CET)
**Branch:** main
**Version:** 1.1.579

---

# 1. Work Done in This Session

## Work summary
- Исправлено сохранение `jsonlPath` в workflow/description metadata: теперь путь строится по `workspaceKey = sanitize(workspacePath)`, что соответствует реальному layout unified-session storage, который читает UI.
- Исправлено расслоение истории в UI при промоушене `providerSessionId` (temp -> real): JSONL истории переименовывается и продолжает писаться в один файл, чтобы Session UI всегда видел полную историю.
- Обновлены связанные архитектурные документы в `doc/SolidWorks-Flow/` с пояснением про:
  - разделение provider-home (rollouts/logs) vs unified-session (UI history);
  - `workspaceKey` derivation;
  - механизм promotion/rename JSONL.
- Выполнен полный релизный цикл под `v1.1.579`:
  - `./scripts/build-all.sh` (version bump до `1.1.579`, пересборка provider/core/ui/launcher артефактов);
  - `./scripts/build-release.sh --use-current-version` (финальные гейты + VSIX).
- Результат релиза: `codeai-hub-1.1.579.vsix` в корне репозитория.

## Verification
- Коммиты запускали pre-commit quality gates (архитектура, ts-prune, duplication guardrails).
- Релизные сборки:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- В release-логе подтверждены ключевые маркеры:
  - `Verifying SDK exclusions`
  - `Removing dev dependencies before packaging...`
  - `✅ Package created`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `51e098df fix(core): correct unified session jsonl paths and merge promotions`
- `ef226b95 docs(system): clarify unified session history and session id promotion`
- `2650dfae docs(release): sync docs for v1.1.579`
- `d87bc350 chore(release): run build-all for v1.1.579`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session034.md` (THIS REPORT)
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
4. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
5. `packages/core/src/unified-session/storage.ts`
6. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

## Plans for next session
- Smoke-проверка в Project Manager:
  - при первой загрузке workspace tree Codex Reviewer session должна появляться сразу;
  - клик по session в дереве должен корректно открывать историю;
  - история должна быть полной (не только последний thinking), читается из `~/.codeai-hub/sessions/<workspaceKey>/codexCli/*.jsonl`.
- При необходимости дополнить unit/e2e проверками кейс promotion `providerSessionId` (temp -> real), чтобы гарантировать отсутствие split-history регрессий.
