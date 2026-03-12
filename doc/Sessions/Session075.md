# Session 075 — Test Release 1.1.719 Build

**Date:** 2026-03-12 15:01 (CET)
**Branch:** main
**Version:** 1.1.719

---

# 1. Work Done in This Session

## Work summary
- По явному запросу пользователя собран новый тестовый релиз `v1.1.719` с PM hydration repair-фиксами поверх `1.1.718`.
- Перед сборкой синхронизированы release-facing документы `README.md` и `CHANGELOG.md` под `v1.1.719`; `todo-plan` дополнен отдельным user-requested test release stream.
- Успешно выполнен `./scripts/build-all.sh`: unified version поднята до `1.1.719`, пересобраны provider/core/ui/launcher артефакты и tarball’ы.
- Успешно выполнен `./scripts/build-release.sh --use-current-version`: собран VSIX `codeai-hub-1.1.719.vsix`.
- Подтверждены локальные release artefacts:
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.719.vsix`
  - tarball’ы: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/`
- Рабочее дерево очищено после release build.
- После пользовательского smoke на `v1.1.719` regression не закрыт:
  - после `Submit questionnaire` справа показывается read-only `questionnaire.md`, а не стабильный переход к Description artifact/session state;
  - session pane появляется, но обе панели визуально "стробят"/перемонтируются;
  - workflow tree в левом sidebar остаётся на жёлтом статусе `Description` и не показывает children (`questionnaire.md`, session node, `Final_Description.md`).
- По истории git подтверждено, что codex `gpt-5.4` rollout был в коммитах `b78d78a8` / `93d75291`, а основной PM shared workflow-state refactor начался позже в `e6cd53da`; так как текущий дефект воспроизводится и на Claude workspace, следующий шаг — historical compare с pre-`gpt-5.4` baseline, а не слепой rollback текущего `main`.

## Git commits
- `c5aad906 docs(release): prepare pm hydration repair test build`
- `f6d56a5e build(release): stage pm hydration repair test artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session072.md`
7. `doc/Sessions/Session074.md`
8. `doc/Sessions/Session075.md` (THIS REPORT)

## Plans for next session
- Установить и прогнать ручной smoke на `codeai-hub-1.1.719.vsix` для двух проблемных workspace из `Session072.md`.
- Проверить конкретно: появление Description session node, артефактов `questionnaire.md`/`Final_Description.md` в tree, отсутствие `Description Help` fallback после submit, отсутствие стробирования правой панели.
- Выполнить historical compare против pre-`gpt-5.4` baseline (`9614ab37` / до `b78d78a8`) и отделить model-switch дельту от более поздних PM workflow-state рефакторингов.
- Если smoke зелёный, закрыть `Phase 301 / Stream 9` verification commit и решать, нужен ли уже обычный patch release closeout или ещё один repair loop.
