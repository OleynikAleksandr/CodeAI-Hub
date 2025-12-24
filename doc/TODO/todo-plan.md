# План разработки (Development TODO Plan)

## Phase 5 — Strict Gemini Thinking Configuration (owner: Gemini, updated: 2025-12-24)

### Stream 1: Registry Cleanup
1. [TODO] Обновить `src/types/gemini-model-registry.ts`: установить строгие списки уровней для Gemini 3 и пустые для 2.5.
2. [TODO] Git Commit: feat(types): restrict gemini thinking levels to officially supported only

### Stream 2: UI Logic Update
1. [TODO] Обновить `GeminiDefaultModelCard.tsx`: скрывать кнопку настройки, если модель не поддерживает конфигурацию Thinking.
2. [TODO] Git Commit: feat(ui): hide thinking config for models that do not support it

### Stream 3: Manager Refinement
1. [TODO] Обновить `GeminiSessionManager.ts`: добавить валидацию уровня перед применением к конфигурации.
2. [TODO] Git Commit: fix(gemini): validate thinking level before applying to session

### Stream 4: Verification & Release
1. [TODO] Собрать релиз 1.1.346.
2. [TODO] Git Commit: chore: release v1.1.346 - strict gemini thinking config
