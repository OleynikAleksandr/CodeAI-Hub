# Session 017 — Обзор Codex Provider (SDK/CLI) и текущей интеграции

**Date:** 2025-12-27 15:34 (CET)
**Branch:** main
**Version:** 1.1.355

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст проекта по `doc/Sessions/Session016.md`: просмотрены все перечисленные коммиты через `git show --stat <hash>` и `git show <hash>`.
- Изучен документ стека `doc/Project_Docs/Stacks/Codex_SDK_Module.md` (контракт SDK/CLI, события JSONL, sandbox/approvals, auth, бинарники).
- Проведён быстрый аудит текущей реализации провайдера Codex в репозитории (`packages/Codex_Module/**`) и точки подключения в Core (`packages/core/src/provider-registry/index.ts`).

## Key findings (Codex provider)
- **Точка входа модуля:** `packages/Codex_Module/src/index.ts` экспортирует `CodexProviderAdapter` и типы.
- **ProviderRegistry (Core):** `packages/core/src/provider-registry/index.ts` создаёт адаптер Codex через `CodexModuleOptions` (workspace defaults, sandbox/approval/model/reasoning) и поддерживает override пути через `CODEX_MODULE_PATH`.
- **Установка Codex:** `packages/Codex_Module/src/installer/codex-installer.ts` ставит `@openai/codex-sdk` и `@openai/codex` через `npm -g` в префикс, вычисляемый от `installerPaths` (по сути — управляемый global prefix, привязанный к директории SDK).
- **Аутентификация:** `packages/Codex_Module/src/auth/sdk-auth-manager.ts` проверяет наличие `$CODEX_HOME/auth.json` (по умолчанию `~/.codex/auth.json`) и при отсутствии требует ручной `codex login`.
- **Запуск и стриминг:** `packages/Codex_Module/src/messaging/message-processor.ts` запускает `thread.runStreamed(...)`, логирует события и транслирует их в шину сообщений модуля (user_input/turn_*/assistant/stream_event).
- **Патчи SDK:** `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` патчит `Thread.runStreamedInternal` и `Exec.run`, чтобы:
  - поддержать `outputSchema` через временный файл,
  - инжектить `--config model_reasoning_effort=...`,
  - гарантированно подхватывать `thread_id` из `thread.started`.
- **Multi-workspace:** создание сессии принимает `workspacePath?: string`; в `ThreadOptions` выставляется `workingDirectory: session.workspacePath`.

## Git commits
- Нет коммитов в этой сессии (только анализ/аудит).

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
2. `packages/Codex_Module/src/provider/codex-provider-adapter.ts`
3. `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
4. `packages/core/src/provider-registry/index.ts`
5. `doc/Sessions/Session017.md` (THIS REPORT)

## Plans for next session
- Уточнить целевую модель интеграции approval mode: где именно маппить Core approval policy → Codex CLI (`--approval-mode` или config/env) и нужно ли расширять патчи SDK.
- Решить, какие `ThreadItem` типы (кроме `agent_message`/`reasoning`) должны транслироваться в UI (command/file/mcp/tool_call/web_search/error) и какой единый контракт событий нужен.
- Уточнить требования к `CODEX_HOME`: использовать общий `~/.codex` или задавать из CodeAI Hub изолированный каталог (например `~/.codeai-hub/codex/`) для управляемости.
