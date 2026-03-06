# Session 065 — GPT-5.4 workflow commentary restore release 1.1.715

**Date:** 2026-03-06 09:47 (CET)
**Branch:** main
**Version:** 1.1.715

---

# 1. Work Done in This Session

## Work summary
- Реализован возврат raw workflow contract для Project Manager: legacy structured-output default path снят, `outputSchema` и JSON-only path сохранены только для explicit opt-in turns.
- Возвращены промежуточные `commentary` сообщения Codex workflow для `gpt-5.4` и восстановлено их сохранение в unified dialog history JSONL, включая стабильный порядок промежуточных сообщений при одинаковом timestamp.
- Обновлены workflow prompt templates `Description` и `Virtual Simulation`: короткие progress commentary теперь обязательны, а запрет касается только публикации полного markdown-артефакта в чат.
- Добавлены targeted regression checks для raw workflow turn options, commentary replay и persistence dialog history.
- Синхронизированы SSOT, release notes и пользовательские документы; собран локальный релиз `v1.1.715` через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` без флагов.

## Validation / checks
- `npm run build --workspace=@codeai-hub/codex-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run test --workspace=@codeai-hub/core`
- `node --import tsx --test src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/dialog-history-service.test.ts`
- `node --test packages/core/dist/remote-bridge/handlers/dialog-history-service.test.js`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- В release log подтверждены `Verifying SDK exclusions`, `Removing dev dependencies before packaging...`, `✅ Package created`.
- Подтверждены артефакты: `codeai-hub-1.1.715.vsix`, свежие tarball'ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `8036d8bd docs(plan): open phase 290 commentary restore`
- `2be5a234 fix(codex): disable default structured output injection`
- `bfa283f5 fix(codex): gate output schema cli flag behind opt-in`
- `8a918fcc fix(pm): stop default schema requests for workflow turns`
- `3c148191 fix(core): keep workflow turn options raw by default`
- `be98fb1d fix(codex): surface workflow commentary messages`
- `3484ecfd docs(prompts): require commentary in description workflow`
- `c17b2839 docs(prompts): require commentary in virtual simulation workflow`
- `02c6988d test(core): cover raw workflow turn options`
- `d6e1176f test(pm): cover workflow commentary replay`
- `bcf08939 docs(codex): sync workflow commentary contract`
- `3ef70fcc fix(core): persist intermediate codex workflow commentary`
- `7ed44385 docs(release): sync workflow commentary restore notes`
- `0b3b080f chore(release): build-all v1.1.715 workflow commentary restore`
- `94b73703 chore(release): build-release v1.1.715 workflow commentary restore`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session064.md`
8. `doc/Sessions/Session065.md` (THIS REPORT)

> Далее: начать с post-release smoke `v1.1.715` в PM и сравнить live dialog / provider rollout JSONL / unified session JSONL для fresh `gpt-5.4` workflow sessions.

## Plans for next session
- Прогнать пользовательский smoke `v1.1.715` в Project Manager и убедиться, что промежуточные commentary messages снова живут и в live dialog, и в persisted history.
- Если smoke найдёт остаточную проблему, сначала оформить новый архитектурный contract и новый phase plan, только после этого возвращаться к коду.
- Если smoke будет чистым, использовать `Phase 291` как отправную точку для следующей продуктовой задачи поверх релиза `1.1.715`.
