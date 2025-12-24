# Phase 3 — Fix Gemini Model Selection persistence

## Stream 1: Update Gemini Module Types and Manager
1. [DONE] Добавить `settingsPath` в `SessionCreationOptions` в `packages/Gemini_Module/src/session/types.ts`.
2. [DONE] Реализовать чтение `defaultModel` из `settings.json` в `GeminiSessionManager.createSession` (`packages/Gemini_Module/src/session/gemini-session-manager.ts`).
3. [DONE] Git Commit: feat(gemini): support dynamic default model loading from settings.json

## Stream 2: Update Provider Adapter and Core
1. [DONE] Прокинуть `settingsPath` через `GeminiProviderAdapter.createSession` (`packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`).
2. [DONE] Обновить `CoreConfig` и `loadConfig`, чтобы включить `geminiSettingsPath` (или использовать общий `settingsPath`) в `packages/core/src/config/index.ts`.
3. [DONE] Обновить `ProviderRegistry`, чтобы передавать `settingsPath` в `GeminiAdapter` (`packages/core/src/provider-registry/index.ts`).
4. [DONE] Git Commit: feat(core): pass settings path to gemini provider for dynamic model loading

## Stream 3: Verification
1. [DONE] Запустить сборку и гейты качества.
2. [DONE] Собрать новый релиз 1.1.342.
3. [DONE] Git Commit: chore: release v1.1.342 - fix gemini model selection
