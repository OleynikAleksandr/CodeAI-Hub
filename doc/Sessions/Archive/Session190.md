# Session 190 — Effective Model Identity Release 1.1.835

**Date:** 2026-03-29 14:50 (CEST)
**Branch:** main
**Version:** 1.1.835

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован новый SSOT-contract: `modelId` по Core transport/runtime/UI означает полную effective model identity, а `~/.codeai-hub/settings/settings.json` стал единым source of truth для next-turn model selection.
- Core resolver и provider capability layer переведены на provider-neutral effective identity pipeline; для Codex reasoning-only switch теперь применяется тот же next-turn runtime path, что и для смены base model.
- Outbound `session:model:update` теперь публикует effective identity, а PM и обычный webview принимают runtime model update без возврата к stale split fields; ready-session labels больше не теряют reasoning/thinking для той же base model.
- Успешно выполнены `npm run build --workspace=@codeai-hub/core`, `npm run test --workspace=@codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`, затем `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.
- Собран VSIX `codeai-hub-1.1.835.vsix`; release tarball’ы `1.1.835` записаны в `doc/tmp/releases/`, а завершённый план архивирован в `doc/TODO/Archive/todo-plan-up-to-phase90-release-1.1.835-2026-03-29.md`.

## Git commits
- `d7388df2 docs(contract): define effective model identity`
- `f9db849f refactor(core): carry effective model identity`
- `804fc61e refactor(core): resolve effective model identity`
- `2e73b9f7 refactor(core): align provider identity capabilities`
- `412f5e07 fix(codex): apply effective model identity`
- `f837b9ce refactor(core): extract message dispatch sender`
- `ac0499c5 fix(core): publish effective model updates`
- `e37390b2 fix(ui): consume effective model updates`
- `6fcc97bc fix(ui): sync effective identity labels`
- `7b43eefa docs(release): prepare v1.1.835`
- `2215f69f chore: release effective model identity contract`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session190.md` (THIS REPORT)
6. `doc/TODO/Archive/todo-plan-up-to-phase90-release-1.1.835-2026-03-29.md`

> Далее: в зависимости от нового scope открыть нужные документы из `doc/SolidWorks-WorkFlow/Plans/`, `Contracts/`, `Modules/`, `Clusters/`.

## Plans for next session
- Использовать релиз `1.1.835` как новый baseline и восстанавливать контекст с коммитов этой сессии.
- Если начинается новый scope, сначала оформить planning-док в `doc/SolidWorks-WorkFlow/Plans/`, затем нарезать новый `todo-plan.md`.
- При необходимости выполнить пост-релизную smoke-проверку установленного `codeai-hub-1.1.835.vsix` и release bundle `1.1.835` на локальной установке.
