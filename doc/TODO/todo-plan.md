# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз) и Stream (стримов).
- Каждая подзадача затрагивает ≤ 3 файлов.
- Если задача затрагивает > 3 файлов — разбить на более мелкие и переписать Stream.
- После **каждой** микро‑задачи обязан идти **отдельный** пункт `Git Commit: ...` (чтобы коммит нельзя было пропустить).
- Gates после каждой подзадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого workspace.
- После зелёных гейтов — commit + немедленный апдейт статуса в этом файле (дата, статус, commit).

---

## Phase 5 — Codex: RU Thinking Summary (Structured Outputs) (owner: Codex, updated: 2025-12-27)

### Stream 1: Доки и контракт
1. [DONE] Зафиксировать апрув и план (scope: `doc/Project_Docs/Codex_Thinking_RU_Summary_Structured_Outputs.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: approve codex RU thinking summary contract`.
2. [DONE] Git Commit: `docs: approve codex RU thinking summary contract` (hash: 163775c).

### Stream 2: Codex Module — Structured Output + streaming extractor
1. [TODO] Добавить тип `outputSchema` в `CodexTurnOptions` (scope: `packages/Codex_Module/src/types/index.ts`) — target commit: `feat(codex): support outputSchema in turn options`.
2. [TODO] Git Commit: `feat(codex): support outputSchema in turn options` (hash: TBD).
3. [TODO] Добавить потоковый извлекатель `answer` из JSON (микро-класс) (scope: `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`) — target commit: `feat(codex): add streamed answer extractor for structured output`.
4. [TODO] Git Commit: `feat(codex): add streamed answer extractor for structured output` (hash: TBD).
5. [TODO] Интегрировать Structured Outputs в `CodexMessageProcessor` (scope: `packages/Codex_Module/src/messaging/message-processor.ts`) — target commit: `feat(codex): replace native reasoning with RU thinking summary`.
6. [TODO] Git Commit: `feat(codex): replace native reasoning with RU thinking summary` (hash: TBD).
   Acceptance:
   - native `item.type="reasoning"` не попадает в UI.
   - на `turn.started` появляется первая thinking-плашка (placeholder `<!-- -->`).
   - `answer` стримится как обычный ответ ассистента.
   - RU summary появляется в thinking позже (если удалось распарсить), иначе thinking остаётся пустым.

### Stream 3: Smoke/UX проверка
1. [TODO] Зафиксировать результаты smoke/UX проверки (scope: `doc/Project_Docs/Codex_Thinking_RU_Summary_Structured_Outputs.md`) — target commit: `docs: document codex RU thinking summary verification`.
2. [TODO] Git Commit: `docs: document codex RU thinking summary verification` (hash: TBD).

---

## Legacy / Deferred

## Phase 4 — Final Polish & Release (owner: Gemini, updated: 2025-12-25)
1. [DONE] Актуализировать CHANGELOG.md и Architecture.md.
2. [TODO] Собрать все компоненты через `./scripts/build-all.sh`.
3. [TODO] Собрать VSIX через `./scripts/build-release.sh --use-current-version`.
4. [TODO] Проверить работоспособность релиза.
