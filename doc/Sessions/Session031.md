# Session 031 — Codex Usage Limits Planning (Provider-Home)

**Date:** 2026-02-12 19:33 (CET)
**Branch:** main
**Version:** 1.1.576

---

# 1. Work Done in This Session

## Work summary
- Заархивирован текущий `doc/TODO/todo-plan.md` (с Phase 147-149 по Claude usage limits).
- Создан новый `doc/TODO/todo-plan.md` с Phase 151 под реализацию Codex usage limits из rollout JSONL (provider-home), с тем же UI-контрактом `usage_limits`, что и для Claude.
- В архитектурных документах зафиксирован Codex provider-home контракт: сессии/rollout читаются только из `~/.codeai-hub/providers/codex/home/sessions/**`.
- Начата чистка Codex stack-документации от неверного источника сессий (`~/.codex/sessions`), чтобы не повторить ошибку при реализации.

## Notes / Constraints
- Для CodeAI Hub источником правды для сессий провайдера является только provider-home:
  - Codex: `CODEX_HOME=~/.codeai-hub/providers/codex/home`
  - Claude: `HOME=~/.codeai-hub/providers/claude/home`
- Rollout, на котором проверяем парсинг Codex rate limits:
  - `~/.codeai-hub/providers/codex/home/sessions/2026/02/12/rollout-2026-02-12T19-14-17-019c530f-9938-7331-8354-648600e6ea96.jsonl`

## Verification
- В этой сессии реализация не выполнялась (только планирование/доки), сборки/гейты не запускались.

## Git commits
- Нет (планирование/документация локально; коммиты будут в следующей сессии по `doc/TODO/todo-plan.md`).

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session031.md` (THIS REPORT)
2. `doc/TODO/todo-plan.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
5. `packages/Codex_Module/src/messaging/message-processor.ts` (куда встраиваем delivery `usage_limits`)
6. `packages/Codex_Module/src/token-usage/codex-token-usage-resolver.ts` (поиск rollouts в provider-home)
7. `src/client/project-manager/components/sessions/usage-limits-stream.ts` (provider-scoped cache)
8. `src/client/ui/src/session/usage-limits-cache.ts` (persist cache)
9. `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (гарантированная доставка `turn_completed` как `session:stream`)

## Plans for next session
- Реализовать Phase 151: Codex `usage_limits` из rollout `token_count.rate_limits` и доставка в PM/UI в том же контракте, что у Claude.
- Убедиться, что "последние известные" лимиты отображаются в `Session ID Bar` сразу при старте любой новой Codex-сессии (до первого ответа агента), используя уже реализованный provider-scoped cache.
- Довести до конца правку документации Codex: убрать/пометить как standalone CLI только `~/.codex/sessions`, и закрепить provider-home как единственный источник сессий для Hub.
