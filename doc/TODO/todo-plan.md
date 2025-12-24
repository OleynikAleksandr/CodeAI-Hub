# План разработки (Development TODO Plan)

## Phase 5 — Intelligent Gemini Thinking Configuration (owner: Gemini, updated: 2025-12-24)

### Stream 1: Registry Refinement
1. [DONE] Обновить `src/types/gemini-model-registry.ts`: установить строгие списки уровней для каждого семейства.
2. [DONE] Git Commit: feat(types): align gemini thinking levels with model capabilities

### Stream 2: Manager Logic (The Bridge)
1. [TODO] Обновить `GeminiSessionManager.ts`: реализовать маппинг уровней в `thinkingLevel` (для G3) или `thinkingBudget` (для G2.5).
2. [TODO] Git Commit: feat(gemini): implement intelligent thinking mapping (level to budget)

### Stream 3: UI Description Polish
1. [TODO] Обновить описания `GEMINI_THINKING_LEVELS` для универсальности.
2. [TODO] Git Commit: chore(ui): polish thinking level descriptions

### Stream 4: Verification & Release
1. [TODO] Собрать релиз 1.1.346.
2. [TODO] Git Commit: chore: release v1.1.346 - intelligent gemini thinking config
