# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- TODO Plan состоит из Phase (Фаз). В каждой Phase — Stream (стримы) с микро‑задачами.
- Каждая микро‑задача затрагивает **≤ 3 файлов** (или пакетов).
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета/клиента.
- После зелёных гейтов: Git Commit + немедленный апдейт статусов/хешей в этом файле.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

Source of Truth (архитектура):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## Phase 183 — Осмысленные `dialogId` (имена файлов/папок) (owner: Codex+Oleksandr, updated: 2026-02-15)

**Goal:**
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl` получает человекочитаемое имя, включающее:
  - префикс провайдера (например `codex`, `claude`, `gemini` или `codexCli`, если решим оставить providerId),
  - стабильный уникальный идентификатор (uuid),
  - суффикс роли агента (`reviewer` / `collector`, и т.п.).
- Папки continuity становятся осмысленными (по `dialogId`), чтобы пользователь мог понять «что где».

### Stream: Design/Contracts (именование и миграция)
1. [DONE] Docs: зафиксировать формат `dialogId` и правила миграции/обратной совместимости (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): dialogId naming contract`)
2. [DONE] Git Commit: `docs(flow): dialogId naming contract` (hash: 8c27a8b6)

### Stream: Core — генерация/нормализация `dialogId`
1. [DONE] Implement: генератор `dialogId` (provider + uuid + role) + применение для flow‑сессий (continuity root) (scope: `packages/core/src/session-continuity/dialog-id.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): human-readable dialogId for flow sessions`)
2. [DONE] Git Commit: `feat(core): human-readable dialogId for flow sessions` (hash: 7f2fd026)

### Stream: Core — убрать «шумные» пустые unified-session JSONL
1. [DONE] Fix: не создавать пустые `*.jsonl` (≈136 байт) с одним `session-open`, пока не пришло первое реальное сообщение (scope: `packages/core/src/unified-session/storage.ts`; expected commit message: `fix(core): lazy init unified-session writer`)
2. [DONE] Git Commit: `fix(core): lazy init unified-session writer` (hash: d98152ef)

### Stream: Dialog — segment meta в `<dialogId>.jsonl` (replay-safe UI)
1. [DONE] Core: при старте нового provider‑сегмента (rollover) дописать marker+divider+meta в `<dialogId>.jsonl` **один раз** (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): persist dialog segment meta in jsonl`)
2. [DONE] Git Commit: `feat(core): persist dialog segment meta in jsonl` (hash: 660f1d3f)
3. [DONE] UI: распознавать divider по marker в content, рендерить только label, и не инжектить implicit boundaries если в истории уже есть explicit divider (scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `feat(ui): render explicit dialog segment boundaries`)
4. [DONE] Git Commit: `feat(ui): render explicit dialog segment boundaries` (hash: be607adc)
5. [DONE] PM/UI: восстановление token summary `#1 (..%) | #2 (..%)` из boundary-meta при `dialog:history` + обновление в live по system‑сообщению (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/dialog-segment-meta.ts`; expected commit message: `feat(pm): restore token summary from segment meta`)
6. [DONE] Git Commit: `feat(pm): restore token summary from segment meta` (hash: 9878a092)

### Stream: Core — миграция/alias для старых uuid-only dialogId
1. [TODO] Implement: обеспечить чтение/открытие старых диалогов (uuid-only) + мягкая миграция/alias в `continuity/index.json` и `chain.json` (scope: `packages/core/*` (≤3 файлов); expected commit message: `feat(core): dialogId alias for legacy ids`)
2. [TODO] Git Commit: `feat(core): dialogId alias for legacy ids` (hash: TBD)

### Stream: PM — отображение «человеческого имени»
1. [TODO] Implement: показать понятный label в UI (таб/заголовок) на базе `dialogId` (scope: `src/client/project-manager/*` (≤3 файлов); expected commit message: `feat(pm): display friendly dialog labels`)
2. [TODO] Git Commit: `feat(pm): display friendly dialog labels` (hash: TBD)

---

## Phase 184 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` (scope: repo)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — clean tree)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> `1.1.601`) (scope: repo)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: 24869a50)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (1.1.601)`)
   - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.601.vsix`
   - Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.601.tar.bz2`
   - Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.601.tar.bz2`
7. [DONE] Git Commit: `docs(todo): record patch release build (1.1.601)` (hash: 8f2d6232)

---

## Phase 185 — Fix: бесконечная сессия (resume не создаёт новый dialogId) + корректный role для Description (owner: Codex+Oleksandr, updated: 2026-02-15)

### Stream: Core — привязка resume к существующему `dialogId`
1. [DONE] Fix: при `session:create`/resume по `providerSessionId` находить существующий continuity root (`dialogId`) по `chain.json` и пинить unified-session `historySessionId` к нему (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): reuse dialogId when resuming provider session`)
2. [DONE] Git Commit: `fix(core): reuse dialogId for provider session resumes` (hash: 14bc2096)

### Stream: Core — role slug для Description (не `agent`)
1. [DONE] Fix: если `runSlug` отсутствует, использовать `stage` как `agentRole` при генерации `dialogId` (чтобы Description сессия была `*-description`, а не `*-agent`) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): derive dialog role from stage when runSlug missing`)
2. [DONE] Git Commit: `fix(core): reuse dialogId for provider session resumes` (hash: 14bc2096)

### Stream: Docs — обновить контракт `dialogId`
1. [DONE] Docs: уточнить правило `agentRole` (runSlug иначе stage иначе agent) (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): clarify dialogId role derivation`)
2. [DONE] Git Commit: `docs(flow): clarify dialogId role derivation` (hash: ce127f74)

---

## Phase 186 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетная сборка `npm run build:core` (scope: repo)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — pre-commit hooks + manual gates)
3. [DONE] Build: `./scripts/build-all.sh --allow-dirty` (version bump -> `1.1.602`) (scope: repo)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: 7566aba3)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version --allow-dirty` (VSIX) (scope: repo build)
6. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (1.1.602)`)
   - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.602.vsix`
   - Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.602.tar.bz2`
   - Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.602.tar.bz2`
7. [DONE] Git Commit: `docs(todo): record patch release build (1.1.602)` (hash: ac8733a8)

---

## Phase 187 — Fix(UI): сегментные метаданные в бесконечной сессии (owner: Codex+Oleksandr, updated: 2026-02-15)

### Stream: UI — убрать двойной divider “Новая сессия”
1. [DONE] Fix: отключить старый implicit divider (UI‑хак после `thinking`) если в истории уже есть explicit boundary‑сообщения из JSONL (scope: `src/client/ui/src/session/dialog-panel.tsx` (≤1 файл); expected commit message: `fix(ui): avoid duplicate segment dividers`)
2. [DONE] Git Commit: `fix(ui): avoid duplicate segment dividers` (hash: 69bd804a)

### Stream: UI — восстановление `#1 (..%) | #2 (..%)` после рестартов
1. [DONE] Fix: в основной SessionView восстанавливать token summary из JSONL boundary‑meta сообщений (fallback от runtime chain), чтобы после рестартов Core/PM поле не пропадало (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/*` (≤3 файлов); expected commit message: `fix(ui): restore token summary from segment meta`)
2. [DONE] Git Commit: `fix(ui): restore token summary from segment meta` (hash: 319bdd73)

### Stream: Docs — уточнение контракта UI восстановления
1. [DONE] Docs: зафиксировать в архитектуре, что SessionView обязан парсить segment meta из JSONL и не использовать implicit divider при наличии explicit boundary (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): clarify replay-safe UI contract`)
2. [DONE] Git Commit: `docs(flow): clarify replay-safe UI contract` (hash: f56da9f9)

### Stream: Webview — обновить fallback bundle
1. [DONE] Build: пересобрать fallback webview bundle (`media/react-chat.js`), чтобы fallback UI внутри VSIX соответствовал Session UI фиксам (scope: `media/react-chat.js`; expected commit message: `chore(webview): rebuild bundle`)
2. [DONE] Git Commit: `chore(webview): rebuild bundle` (hash: 0d107a36)

---

## Phase 188 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` (scope: repo; expected commit message: `chore: quality gates before release`)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — clean tree)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> `1.1.603`) (scope: repo; expected commit message: `chore(release): build-all for next patch`)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: de6062e3)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (1.1.603)`)
   - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.603.vsix`
   - Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.603.tar.bz2`
   - Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.603.tar.bz2`
7. [DONE] Git Commit: `docs(todo): record patch release build (1.1.603)` (hash: 6949e960)

---

## Phase 189 — Fix(Arch): portable UI style guardrails (owner: Codex, updated: 2026-02-15)

### Stream: Architecture gates — ui-style-ssot without `rg`
1. [DONE] Fix: добавить `grep` fallback, если `rg` недоступен, чтобы `./scripts/check-architecture.sh` проходил в минимальных окружениях (scope: `scripts/check-architecture-rules/ui-style-ssot.sh`; expected commit message: `fix(arch): make ui-style-ssot work without rg`)
2. [DONE] Git Commit: `fix(arch): make ui-style-ssot work without rg` (hash: e527966b)
