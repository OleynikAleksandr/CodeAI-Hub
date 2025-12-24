# План разработки (Development TODO Plan)

## Phase 8 — Fix Gemini 2.5 Pro Thinking Constraints (owner: Gemini, updated: 2025-12-24)

### Stream 1: Registry Correction
1. [DONE] Обновить `src/types/gemini-model-registry.ts`: убрать `off` из `gemini-2.5-pro`, так как минимум 128 токенов.
2. [DONE] Git Commit: fix(types): remove unsupported 'off' level for Gemini 2.5 Pro

### Stream 2: Verification & Release
1. [TODO] Собрать релиз 1.1.349.
2. [TODO] Git Commit: chore: release v1.1.349 - strict thinking constraints for 2.5 Pro
