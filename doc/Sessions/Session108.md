# Session 108 — Phase 103 complete release build (v1.1.522)

**Date:** 2026-02-07 17:28 (CET)
**Branch:** main
**Version:** 1.1.522

---

# 1. Work Done in This Session

## Work summary
- Полностью завершён `Phase 103 — Core-first Immediate Input Lock Parity` из `doc/TODO/todo-plan.md`.
- Утверждён контракт и синхронизированы архитектурные документы:
  - Core-first мгновенный lock (`turn_state=running`) на accepted submit до `adapter.sendMessage`.
  - Rollback в `turn_state=idle` при ошибке `sendMessage`.
- Реализованы Core-изменения:
  - immediate `running` emission в `handleMessage` до provider send;
  - rollback в `idle` в send-error path.
- Добавлены регрессионные тесты:
  - Core: immediate lock до provider marker и rollback на send-failure;
  - PM/UI: provider-agnostic parity (`turn_state=running`) и running-placeholder контракт в `InputPanel`.
- Выполнены release-этапы:
  - `./scripts/build-all.sh` (bump `1.1.521 -> 1.1.522`);
  - `./scripts/build-release.sh --use-current-version`;
  - собран VSIX `codeai-hub-1.1.522.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `8f008571 docs(continuity): define core-first immediate lock and send-error rollback contract`
- `0600aaac fix(core): emit immediate running state before provider send`
- `6b318581 fix(core): rollback running state on provider send failure`
- `a91814c4 test(core): cover immediate lock and send-error rollback`
- `864d3119 test(ui): enforce provider-agnostic immediate input lock parity`
- `fe7db5e5 docs(release): prepare notes for immediate input lock parity release`
- `eb425406 test(core): fix immediate-lock test callback typing`
- `5a64cac5 chore(release): build-all after immediate lock parity`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session108.md` (THIS REPORT)

## Plans for next session
- Провести smoke-check установки `codeai-hub-1.1.522.vsix` в VS Code.
- Заархивировать завершённый `todo-plan.md` в `doc/TODO/Archive/` и открыть новый план под следующую фазу.

---

# 3. Release Artifacts

- VSIX:
  - `codeai-hub-1.1.522.vsix` (root, ~936K)
- Local release cache:
  - `/Users/oleksandroliinyk/.codeai-hub/releases/claude-module-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/codex-module-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/gemini-module-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/codeai-hub-core-darwin-arm64-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/CodeAIHubLauncher-macos-arm64-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/vscode-webview-1.1.522.tar.bz2`
  - `/Users/oleksandroliinyk/.codeai-hub/releases/project-manager-1.1.522.tar.bz2`
- Mirrored docs artifacts:
  - `doc/tmp/releases/*1.1.522.tar.bz2`
