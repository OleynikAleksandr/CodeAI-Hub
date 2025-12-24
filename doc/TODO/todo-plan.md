# План разработки (Development TODO Plan)

## Phase 6 — Fix Gemini Thinking Hardcode (owner: Gemini, updated: 2025-12-24)

### Stream 1: Implementation of the Fix
1. [DONE] Обновить `gemini-session-manager.ts`: реализовать `monkeyPatchGeminiClient` для перехвата `startChat`.
2. [DONE] Внедрить применение патча в `createSession` до инициализации конфигурации.
3. [DONE] Git Commit: fix(gemini): monkey-patch startChat to enforce thinking configuration and bypass library hardcode

### Stream 2: Registry Alignment
1. [DONE] Обновить реестр моделей Gemini: убедиться в полноте и точности списков уровней.
2. [DONE] Git Commit: feat(gemini): polish thinking levels registry for patched implementation

### Stream 3: Verification & Release
1. [TODO] Проверить работу фикса через логи SDK.
2. [TODO] Собрать релиз 1.1.347.
3. [TODO] Git Commit: chore: release v1.1.347 - Gemini thinking persistence fix
