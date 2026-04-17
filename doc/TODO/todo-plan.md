# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ClientLabelFallback_Fix_1.2.15.md`
- **Read this context before implementation:**
  - `src/client/ui/src/session/model-info-builder.ts` (единственный файл с fix'ом)
  - `src/client/ui/src/session/status-panel.tsx` (consumer label'а)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 14 client-side extension)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ModelLabel_FlickerFix_1.2.13.md` (precedent — Core-side fix)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Gates автоматически через Husky.

## Phase 1 — Client Label Fallback Fix 1.2.15 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.15
1. [TODO] README.md + CHANGELOG.md на v1.2.15. — scope: 2 файла; commit: `docs: prepare 1.2.15 release notes for client-side label fallback fix`
2. [TODO] Git Commit: `docs: prepare 1.2.15 release notes for client-side label fallback fix` (hash: TBD)

### Stream 2: Client fallback fix + SSOT update
1. [TODO] В `src/client/ui/src/session/model-info-builder.ts` обернуть Gemini и Codex fallback в `resolveModelReasoning` в provider-specific prefixes (`thinking ${level}`, `reasoning ${level}`). Обновить Invariant 14 в SystemArchitecture.md с client-side extension. — scope: 2 файла; commit: `fix(client): wrap Gemini/Codex settings fallback with provider-specific label prefix`
2. [TODO] Git Commit: `fix(client): wrap Gemini/Codex settings fallback with provider-specific label prefix` (hash: TBD)

### Stream 3: Planning archive
1. [TODO] Planning-doc → `Plans/Archive/`; `Docs_Index.md` entry. — scope: 2 файла; commit: `docs: archive 1.2.15 client label fallback planning doc`
2. [TODO] Git Commit: `docs: archive 1.2.15 client label fallback planning doc` (hash: TBD)

### Stream 4: Release build 1.2.15
1. [TODO] build-all.sh + build-release.sh.
2. [TODO] Git Commit: `chore: bump version to 1.2.15 for client-side label fallback fix release` (hash: TBD)
3. [TODO] Archive todo-plan; reset empty.
4. [TODO] Git Commit: `docs: close 1.2.15 todo-plan after build` (hash: TBD)
