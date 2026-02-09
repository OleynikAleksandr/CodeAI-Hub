# Session 016 — Questionnaire Curator: Design + Transcript + Curator (Phase 62)

**Date:** 2026-01-19 13:19 (CET)
**Branch:** main
**Version:** 1.1.450

---

# 1. Work Done in This Session

## Work summary
- ✅ Design: подготовлен и утверждён архитектурный документ Questionnaire Curator.
- ✅ Core: добавлено сохранение per-run transcript в `.codeai-hub/<workspaceSlug>/<stage>/runs/<runSlug>/transcript.jsonl` (append-only).
- ✅ Templates: добавлен TemplateSync шаблон `questionnaire-curator.md`.
- ✅ Curator: реализован автоматический curator прогон после `approve/OK` (пока только `description`) с дописыванием `## Clarifications log` в `questionnaire.md`.
- ✅ Hygiene: curator разнесён на микро-файлы (≤300 строк) и добавлен фасад.
- ✅ `doc/TODO/todo-plan.md` обновлялся в реальном времени (статусы + commit hash).

## Key files changed (context restore)
1. `doc/SolidWorks-Flow/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
2. `packages/core/src/unified-session/storage.ts`
3. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
4. `packages/core/src/remote-bridge/handlers/questionnaire-curator-facade.ts`
5. `packages/core/src/remote-bridge/handlers/questionnaire-curator-service.ts`
6. `packages/core/src/remote-bridge/handlers/questionnaire-curator-provider-runner.ts`
7. `packages/agents/description-agent/assets/questionnaire-curator.md`
8. `packages/core/src/templates/bundled-templates.ts`
9. `doc/TODO/todo-plan.md`

## Git commits
(ВАЖНО: для восстановления контекста смотри каждый коммит через `git show --stat <hash>` и `git show <hash>`.)
- `cc44daae docs: add questionnaire curator architecture`
- `b9b91998 docs(todo): record questionnaire curator architecture`
- `216c7e4d feat(core): persist run transcript for curator`
- `2a7ae3db docs(todo): record run transcript persistence`
- `dfe99904 feat(templates): add questionnaire curator prompt`
- `10f6ab75 docs(todo): record questionnaire curator prompt`
- `e7eeafba feat(curator): append clarifications to questionnaire`
- `ec1ccd1a docs(todo): record questionnaire curator implementation`
- `8b296b96 refactor(curator): split provider runner`
- `13d68d3a refactor(curator): add curator facade`
- `f0d46753 docs(todo): record curator refactor commits`
- `ba841b79 docs: add session 016 report`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session015.md`
5. `doc/Sessions/Session016.md` (THIS REPORT)

## Context restore commands
- `git show --stat <hash>` и `git show <hash>` для каждого коммита из списка выше.
- Проверка артефактов в workspace:
  - `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/run.json`
  - `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/transcript.jsonl`
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md`

## Plans for next session (tests + release)

### A) Manual verification (Phase 62)
1. Run #1 (`description`): ответить на уточняющие вопросы.
2. Отправить finalize-триггер: `ok` / `approve` / `утверждаю`.
3. Проверить, что в `.codeai-hub/<workspaceSlug>/description/questionnaire.md` дописалась секция `## Clarifications log` и есть маркер `<!-- curator:runId=... -->`.
4. Run #2 (`description`): убедиться, что агент использует дополненную анкету и не повторяет уже отвеченные вопросы.
5. Обновить `doc/TODO/todo-plan.md`: отметить manual verification как `[DONE]` и зафиксировать hash.
6. Git Commit: `docs: verify questionnaire curator`.

### B) Release build для тестов
0. Убедиться что дерево чистое: `git status`.
1. Прогнать гейты (минимум): `./scripts/check-architecture.sh`, `npx ultracite check`, `npm run check:links`.
2. Собрать релизные артефакты (поднимает версии и собирает tarball’ы): `./scripts/build-all.sh`.
3. Собрать VSIX для тестов на текущей версии: `./scripts/build-release.sh --use-current-version`.
4. Проверить наличие:
   - `codeai-hub-<version>.vsix` в корне
   - tarball’ов в `~/.codeai-hub/releases/` и `doc/tmp/releases/`
5. Создать новый отчёт `doc/Sessions/Session017.md` с результатами сборки/тестов.

