# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DialogPanel_LocalizedLastBubble_Autoscroll_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.

## Phase 1 — Fix localized last-bubble autoscroll (owner: Codex, updated: 2026-04-20)
### Stream: Session dialog bottom-lock
1. [DONE] Обновить Session dialog scroll anchor так, чтобы late `localizedContent` patch последней bubble считался изменением display payload и повторно триггерил bottom-lock autoscroll; scope: `src/client/ui/src/session/dialog-panel-scroll-anchor.ts`, `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; commit: `fix(ui): re-scroll after localized last bubble growth`
2. [DONE] Git Commit: `fix(ui): re-scroll after localized last bubble growth` (hash: `04ce733eb`)
3. [DONE] Прогнать таргетную verification для Session UI scroll-anchor regression и зафиксировать результаты; scope: `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts`; commit: `test(ui): verify localized autoscroll anchor`
4. [DONE] Git Commit: `test(ui): verify localized autoscroll anchor` (hash: `8b3e69b29`)

Verification notes:
- `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts` ✅
- `npm run build:webview` ✅
