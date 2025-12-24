# План разработки (Development TODO Plan)

## Phase 8 — Fix Gemini 2.5 Pro Thinking Constraints (owner: Gemini, updated: 2025-12-24)

### Stream 3: Fix Thinking Off State
1. [DONE] Изменить `monkeyPatchGeminiClient`: для `level === "off"` явно удалять `thinkingConfig`.
2. [DONE] Git Commit: fix(gemini): force delete thinkingConfig (v1.1.351 - FAILED verification).

### Stream 4: Remove Unsupported 'Off' State
1. [TODO] Update `GeminiModelRegistry`: Remove `off` level from `gemini-2.5-flash` and `gemini-2.5-flash-lite`.
2. [TODO] Cleanup `GeminiSessionManager`: Revert force delete logic.
3. [TODO] Release v1.1.352.2.5 Pro

### Stream 2: Verification & Release
1. [TODO] Собрать релиз 1.1.349.
2. [TODO] Git Commit: chore: release v1.1.349 - strict thinking constraints for 2.5 Pro
