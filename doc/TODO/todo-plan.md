# План разработки (Development TODO Plan)

## Phase 7 — Fix Gemini Thinking Configuration Accuracy (owner: Gemini, updated: 2025-12-24)

### Stream 1: Registry Correction
1. [TODO] Обновить `src/types/gemini-model-registry.ts`: убрать `off` из списков Gemini 3, так как эти модели не поддерживают полное отключение.
2. [TODO] Git Commit: fix(types): remove unsupported 'off' thinking level for Gemini 3

### Stream 2: Logic Correction
1. [TODO] Обновить `gemini-session-manager.ts`: исправить патч, чтобы для Gemini 3 никогда не передавался `thinkingBudget`, а предыдущая конфигурация очищалась корректно.
2. [TODO] Git Commit: fix(gemini): prevent sending thinkingBudget to Gemini 3 models

### Stream 3: Verification & Release
1. [TODO] Собрать релиз 1.1.348.
2. [TODO] Git Commit: chore: release v1.1.348 - strict thinking levels fix
