# Session 032 — Codex Usage Limits + Release v1.1.577

**Date:** 2026-02-13 07:49 (CET)
**Branch:** main
**Version:** 1.1.577

---

# 1. Work Done in This Session

## Work summary
- Реализован полный Phase 151 для Codex usage limits из provider-home rollout JSONL (`token_count.rate_limits -> usage_limits`) с контрактом, совместимым с Claude (`currentSession`, `currentWeekAllModels`, `currentWeekSonnetOnly=null`).
- Добавлен reader для Codex usage limits с throttle/cache по `providerSessionId` и улучшен resolver rollout-файлов (приоритет последних rollout).
- Обновлён delivery pipeline: `usageLimits` теперь публикуются и в `turn_completed` payload, и отдельным `stream_event` (`data.kind=usage_limits`), чтобы PM/UI сохранял provider-scoped cache и показывал последние лимиты в новых Codex-сессиях сразу.
- Синхронизирована документация (`SystemArchitecture`, `Codex_SDK_Module`) с provider-home контрактом и e2e smoke checklist для rollout/usage-limits потока.
- Обновлены release docs под `v1.1.577` (`README`, `CHANGELOG`, `SystemArchitecture`).
- Выполнен релизный цикл:
  - `./scripts/build-all.sh` (поднял версии до `1.1.577`, собрал provider/core/ui/launcher артефакты);
  - `./scripts/build-release.sh --use-current-version` (финальные гейты + VSIX).
- Результат релиза: `codeai-hub-1.1.577.vsix` в корне репозитория.

## Verification
- Таргетные тесты:
  - `npx tsx --test packages/Codex_Module/src/sdk/codex-usage-limits-snapshot.test.ts`
  - `npx tsx --test src/client/project-manager/components/sessions/usage-limits-stream.test.ts`
- Обязательные гейты (многократно, перед каждым микрокоммитом и релизными шагами):
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
- Таргетная сборка:
  - `npm run build --workspace=@codeai-hub/codex-module`
- Релизные сборки:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- В логе release build подтверждены ключевые маркеры:
  - `Verifying SDK exclusions`
  - `Removing dev dependencies...`
  - `✅ Package created`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `a0fdf82c feat(codex): parse usage limits from rollout rate_limits`
- `19dbdec8 feat(codex): add usage limits reader for provider-home rollouts`
- `12106bdd fix(codex): emit usage_limits per turn and keep latest across sessions`
- `c58d5f22 docs(codex): document provider-home rollout + usage limits flow`
- `1176021c docs(release): sync docs for v1.1.577`
- `1b412dac chore(release): run build-all for v1.1.577`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session032.md` (THIS REPORT)
2. `doc/TODO/todo-plan.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
5. `packages/Codex_Module/src/messaging/message-processor.ts`
6. `packages/Codex_Module/src/sdk/codex-usage-limits-reader.ts`
7. `packages/Codex_Module/src/sdk/codex-usage-limits-snapshot.ts`
8. `src/client/project-manager/components/sessions/usage-limits-stream.ts`

## Plans for next session
- Выполнить post-release smoke в рабочем PM/UI сценарии и подтвердить на живом Codex workflow, что `Session ID Bar` стабильно показывает last-known `session/weekly` в новой сессии до первого ответа.
- Проверить и при необходимости ужесточить cleanup `.vscodeignore`/release packaging (в текущем VSIX есть предупреждение про большое число файлов).
- Подготовить следующий TODO-план после закрытия Phase 151 и архивировать текущий `todo-plan.md` в `doc/TODO/Archive/`.
