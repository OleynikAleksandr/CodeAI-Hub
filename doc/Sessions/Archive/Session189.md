# Session 189 — Effective Model Identity Planning Intake

**Date:** 2026-03-29 13:53 (CEST)
**Branch:** main
**Version:** 1.1.834

---

# 1. Work Done in This Session

## Work summary
- Проанализирован ручной тест релиза `1.1.834`: base model switch работает корректно, но reasoning/thinking не проходит по системе как равноправная часть model identity.
- Зафиксировано архитектурное решение для следующего scope:
  - `modelId` должен означать полную effective model identity;
  - `reasoning` / `thinking` являются частью `modelId`;
  - единственным source of truth для next-turn identity становится `~/.codeai-hub/settings/settings.json`.
- Product invariant для следующего implementation block зафиксирован явно:
  - `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` — это разные `modelId`;
  - изменение reasoning/thinking должно идти по тому же next-turn path, что и смена base model;
  - UI/PM/runtime не имеют права использовать второй независимый source of truth поверх `~/.codeai-hub/settings/settings.json`.
- Подтверждённое тестовое наблюдение пользователя зафиксировано как входной факт:
  - в `1.1.834` переключение самой модели работает корректно и применяется на следующем turn;
  - переключение reasoning/thinking не проходит по системе как изменение identity и не даёт того же гарантированного эффекта;
  - проблема подтверждена как минимум на Codex и трактуется как архитектурная, а не как локальный UI-only defect.
- Создан новый planning-док `doc/SolidWorks-WorkFlow/Plans/Archive/EffectiveModelIdentity_And_SettingsSSOT_Architecture.md`.
- Активный `doc/TODO/todo-plan.md` заменён с intake-stub на новый phase/stream backlog под реализацию effective model identity contract.
- Код в этой сессии не менялся; это planning-only handoff перед следующим implementation block.
- Состояние дерева зафиксировано для следующей сессии:
  - в этой сессии существуют только документные изменения;
  - новые git commits не создавались;
  - следующий implementation block стартует с незафиксированного planning-only дерева и должен сам продолжить commit discipline с первой микро-задачи.

## Git commits
- Новые git commits в этой сессии не создавались.
- Актуальный baseline для следующей реализации:
  - `163270f3 docs(session): archive phase85 release plan`
  - `6f5a8eab chore: release stop recovery contract`
- Для полного восстановления контекста реализации также использовать список коммитов из `doc/Sessions/Archive/Session188.md`.
- Важно: `Session189` описывает planning-only handoff без собственных commit hashes; восстановление контекста нужно начинать от baseline-коммитов выше и от новых документов этой сессии, а не искать несуществующий implementation commit.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Archive/EffectiveModelIdentity_And_SettingsSSOT_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session188.md`
7. `doc/Sessions/Archive/Session189.md` (THIS REPORT)

> Далее: по ходу stream-ов открыть затронутые документы из `doc/SolidWorks-WorkFlow/Modules/`, `Contracts/` и связанные файлы resolver/bridge/UI.

## Plans for next session
- Начать с `Phase 86 / Stream: Effective model identity contract reset`.
- Не стартовать кодовую реализацию до синхронизации SSOT: `modelId` больше не должен означать только base model.
- Держать жёсткий инвариант: `~/.codeai-hub/settings/settings.json` является единственным source of truth для next-turn model identity.
- После contract reset перейти к provider-neutral Core resolver, затем к Codex runtime adoption, затем к UI/PM sync и регрессиям.
- Не расширять scope до session-side model switch UI; в этом этапе нужно только сделать правильный identity contract и подготовить систему к такому пути в будущем.
