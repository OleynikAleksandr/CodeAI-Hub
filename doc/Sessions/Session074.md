# Session 074 — Research: universal provider usage limits module

**Date:** 2026-03-14 17:36 (CET)
**Branch:** main
**Version:** 1.1.726

---

# 1. Work Done in This Session

## Work summary
- Исследовано текущее поведение `Codex` usage limits и подтверждено, что текущий `Codex` path в `main` зависит от rollout JSONL, тогда как `Claude` уже использует live rate-limit headers, а `Gemini` dedicated limits module ещё не имеет.
- Проверены model cache/system instruction differences между `gpt-5.4` и `gpt-5.3-codex`; подтверждено, что различия относятся к system/base instructions и metadata модели, но не объясняют provider `Session/Weekly` limits.
- Изучен open-source reference `CodexBar` (`https://github.com/steipete/CodexBar`, MIT): выявлено, что их архитектура опирается на live provider surfaces (`Codex RPC/PTy`, `Claude OAuth/Web/CLI`, `Gemini quota API`) и нормализует данные в единый snapshot перед рендерингом UI.
- Подготовлен planning-док нового scope:
  - `doc/SolidWorks-WorkFlow/Plans/UniversalProviderUsageLimits_Module_Architecture.md`
- Сформулирован целевой подход для `CodeAI-Hub`: единый facade + provider-specific strategy chains + compat adapter в текущий `status.usageLimits`, с уходом `Codex` от JSONL в сторону `app-server` / PTY как primary sources.

## Git commits
- No commits created in this session.

## Verification
- Исследовательская верификация и code/doc review:
  - просмотр текущих модулей `Codex`, `Claude`, `Gemini` в `CodeAI-Hub`
  - просмотр UI contract `status.usageLimits` и Session ID bar rendering
  - анализ `CodexBar` provider implementation и docs
- Тесты и сборки в этой сессии не запускались, так как код проекта не менялся.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Plans/UniversalProviderUsageLimits_Module_Architecture.md`
6. `doc/Sessions/Session074.md` (THIS REPORT)

> Далее: если пользователь утверждает scope universal usage limits module, сначала развернуть execution-план в `doc/TODO/todo-plan.md`, а затем внедрять модуль микро-шагами с `<= 3` файлов на задачу.

## Plans for next session
- Обсудить и утвердить planning-док `UniversalProviderUsageLimits_Module_Architecture.md`.
- Зафиксировать окончательное placement решение:
  - shared facade в `packages/core`
  - provider-specific strategies для `Codex`, `Claude`, `Gemini`
- После approval создать execution `todo-plan.md` и начать с `Codex` migration:
  - `app-server` RPC
  - PTY `/status`
  - rollout JSONL только как fallback/diagnostic source
- Отдельно решить, оставлять ли текущий UI contract `currentWeekSonnetOnly` как compat slot или сразу планировать provider-aware labels в следующей фазе.
