# План разработки (Development TODO Plan)

## Phase 4 — Gemini Thinking Configuration (owner: Gemini, updated: 2025-12-24)

### Stream 1: Types & Core Support
1. [DONE] Обновить `src/types/gemini-model-registry.ts`: добавить список поддерживаемых уровней мышления для каждой модели.
2. [DONE] Git Commit: feat(types): add supported thinking levels to gemini registry
3. [DONE] Обновить типы в расширении (`src/extension-module/settings/gemini-settings.ts`): добавить `thinkingLevelByModel`.
4. [DONE] Git Commit: feat(extension): add thinkingLevelByModel to gemini settings

### Stream 2: UI State & Dialog
1. [DONE] Обновить `settings-state-raw.ts` и `settings-state-model.ts`: добавить маппинг `thinkingLevelByModel`.
2. [DONE] Git Commit: feat(ui): map gemini thinking levels in settings state
3. [DONE] Создать `src/client/ui/src/components/settings/gemini-default-model/gemini-thinking-dialog.tsx`.
4. [DONE] Git Commit: feat(ui): implement GeminiThinkingDialog

### Stream 3: UI Integration & Logic
1. [DONE] Обновить `GeminiDefaultModelCard.tsx`: добавить кнопку «Configure Thinking» и логику открытия диалога.
2. [DONE] Git Commit: feat(ui): integrate thinking selection into Gemini model cards
3. [DONE] Обновить `use-settings-state.ts` и `settings-state-helpers.ts`: добавить хендлер `handleGeminiThinkingChange`.
4. [DONE] Git Commit: feat(ui): add gemini thinking change handler

### Stream 4: Gemini Module Implementation
1. [TODO] Обновить `SessionCreationOptions` в `packages/Gemini_Module/src/session/types.ts`: добавить `thinkingLevel`.
2. [TODO] Реализовать применение `thinkingLevel` в `GeminiSessionManager.createSession`.
3. [TODO] Git Commit: feat(gemini): apply thinking level to gemini session

### Stream 5: Verification & Release
1. [TODO] Проверить работу Thinking для Gemini 3 Pro/Flash.
2. [TODO] Собрать релиз 1.1.343.
3. [TODO] Git Commit: chore: release v1.1.343 - Gemini thinking support
