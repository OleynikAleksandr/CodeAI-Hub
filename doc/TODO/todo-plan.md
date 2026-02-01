# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session060.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 84 — Claude: fix token usage (context window vs run totals) (owner: Oleksandr, updated: 2026-02-01)

### Stream: token usage correctness
1. [DONE] Docs(todo): заархивировать завершённый Phase 83 план и создать новый Phase 84 — scope: `doc/TODO/Archive/todo-plan-phase83.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): start Phase 84 claude token usage fix`
2. [DONE] Git Commit: `docs(todo): start Phase 84 claude token usage fix` (hash: b1ccd52f)

3. [DONE] Fix(claude-module): не перезаписывать token usage snapshot данными из `sdk:result.usage` (это totals по run), использовать только per-turn usage из `stream_event.message_delta.usage` — scope: `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `fix(claude-module): use message_delta usage for context tokens`
4. [DONE] Git Commit: `fix(claude-module): use message_delta usage for context tokens` (hash: 4b085b8a)

5. [DONE] Verification: прогнать гейты + таргетный билд Claude module — scope: scripts; expected commit message: `chore: verify claude token usage fix`
6. [DONE] Git Commit: `chore: verify claude token usage fix` (hash: 9d806de1)

### Stream: release
7. [TODO] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
8. [TODO] Git Commit: `chore(release): build next version` (hash: TBD)

9. [TODO] Docs(session): создать отчёт `doc/Sessions/Session061.md` — scope: `doc/Sessions/Session061.md`; expected commit message: `docs(session): Session061 claude token usage fix`
10. [TODO] Git Commit: `docs(session): Session061 claude token usage fix` (hash: TBD)
