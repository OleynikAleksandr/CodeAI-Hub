# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md` отдельным коммитом.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/CodexSessionContinuity_Settings_Architecture.md`
4. `doc/Project_Docs/Stacks/UI_Modules.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 94 — Settings: Codex Session Continuity threshold (future trigger) (owner: Oleksandr, updated: 2026-02-03)

### Stream: design + approval
1. [TODO] Docs(architecture): согласовать дизайн Codex Session Continuity threshold — scope: `doc/Project_Docs/SessionContinuity/CodexSessionContinuity_Settings_Architecture.md`; expected commit message: `docs: approve codex session continuity settings architecture`
2. [TODO] Git Commit: `docs: approve codex session continuity settings architecture` (hash: TBD)

### Stream: implementation (extension settings schema)
3. [TODO] Feat(settings): добавить `providers.codex.sessionContinuity.remainingPercentThreshold` (default 30, clamp 5..80) — scope: `src/extension-module/settings/codex-settings.ts`; expected commit message: `feat(settings): add codex session continuity threshold`
4. [TODO] Git Commit: `feat(settings): add codex session continuity threshold` (hash: TBD)

### Stream: implementation (webview state + UI)
5. [TODO] Feat(webview): добавить `sessionContinuity` в raw/model mapping для Codex — scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`; expected commit message: `feat(webview): add codex continuity settings state`
6. [TODO] Git Commit: `feat(webview): add codex continuity settings state` (hash: TBD)
7. [TODO] Feat(webview): добавить helpers + handler для Codex continuity threshold — scope: `src/client/ui/src/components/settings/settings-state-helpers.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`; expected commit message: `feat(webview): add codex continuity settings handlers`
8. [TODO] Git Commit: `feat(webview): add codex continuity settings handlers` (hash: TBD)
9. [TODO] Feat(webview): добавить SettingsCard "Codex Session Continuity" в Codex tab — scope: `src/client/ui/src/components/settings-view.tsx`; expected commit message: `feat(webview): add Codex Session Continuity card`
10. [TODO] Git Commit: `feat(webview): add Codex Session Continuity card` (hash: TBD)

### Stream: verification (manual)
11. [TODO] Verification(owner): в VS Code Settings → Codex появился блок "Codex Session Continuity"; значение сохраняется/восстанавливается из `~/.codeai-hub/settings/settings.json` — scope: manual; expected commit message: `chore: verify codex session continuity setting`
12. [TODO] Git Commit: `chore: verify codex session continuity setting` (hash: TBD)

