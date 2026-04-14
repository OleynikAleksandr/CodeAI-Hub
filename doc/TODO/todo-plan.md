# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Localization_Settings_RestartHydration_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки задача требует больше 3 файлов, её нужно разбить и переписать Stream до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: после зелёных гейтов — Git Commit с максимально релевантным описанием (код + доки) и немедленный апдейт `todo-plan.md` (статус + hash).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и релевантной документации `doc/` до коммита.

## Phase 1 — Localization settings restart hydration fix (owner: Codex, updated: 2026-04-14)
### Stream: Scope bootstrap
1. [TODO] Зафиксировать новый bugfix scope для restart hydration mismatch между persisted localization settings и Settings UI — scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Settings_RestartHydration_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: start localization settings hydration scope`
2. [TODO] Git Commit: `docs: start localization settings hydration scope` (hash: TBD)

### Stream: Host and webview hydration
3. [TODO] Исправить host/webview hydration path и truthfulness translation-engine selector после restart — scope: `src/extension-module/message-handlers/settings-message-handler.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings/localization-settings-card.tsx`; ожидаемый commit message: `fix: preserve localization settings after restart`
4. [TODO] Git Commit: `fix: preserve localization settings after restart` (hash: TBD)

### Stream: Documentation and verification
5. [TODO] Синхронизировать SSOT по restart hydration contract и зафиксировать targeted verification — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: record localization settings hydration fix`
6. [TODO] Git Commit: `docs: record localization settings hydration fix` (hash: TBD)
