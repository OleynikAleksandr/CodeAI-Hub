# План разработки (Development TODO Plan)

## Phase 8 — Fix Gemini 2.5 Pro Thinking Constraints (owner: Gemini, updated: 2025-12-24)

### Stream 3: Fix Thinking Off State
1. [DONE] Изменить `monkeyPatchGeminiClient`: для `level === "off"` явно удалять `thinkingConfig` из запроса, чтобы не отправлять `thinkingBudget: 0`.
2. [DONE] Git Commit: fix(gemini): force delete thinkingConfig when level is off (pending release)2.5 Pro

### Stream 2: Verification & Release
1. [TODO] Собрать релиз 1.1.349.
2. [TODO] Git Commit: chore: release v1.1.349 - strict thinking constraints for 2.5 Pro
