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
1. [DONE] Добавить тип `outputSchema` в `CodexTurnOptions` (scope: `packages/Codex_Module/src/types/index.ts`) — target commit: `feat(codex): support outputSchema in turn options`.
2. [DONE] Git Commit: `feat(codex): support outputSchema in turn options` (hash: 853252d).
3. [DONE] Добавить потоковый извлекатель `answer` из JSON (микро-класс) (scope: `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`) — target commit: `feat(codex): add streamed answer extractor for structured output`.
4. [DONE] Git Commit: `feat(codex): add streamed answer extractor for structured output` (hash: efe3404).
5. [DONE] Интегрировать Structured Outputs в `CodexMessageProcessor` (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`) — target commit: `feat(codex): replace native reasoning with RU thinking summary`.
6. [DONE] Git Commit: `feat(codex): replace native reasoning with RU thinking summary` (hash: 195c7bf).
   Acceptance:
   - native `item.type="reasoning"` не попадает в UI.
   - на `turn.started` появляется первая thinking-плашка (placeholder `<!-- -->`).
   - `answer` стримится как обычный ответ ассистента.
   - RU summary появляется в thinking позже (если удалось распарсить), иначе thinking остаётся пустым.

### Stream 3: Smoke/UX проверка
1. [DONE] Зафиксировать результаты smoke/UX проверки (scope: `doc/Project_Docs/Codex_Thinking_RU_Summary_Structured_Outputs.md`) — target commit: `docs: document codex RU thinking summary verification`.
2. [DONE] Git Commit: `docs: document codex RU thinking summary verification` (hash: cfc9bd3).


---

## Phase 6 — Docs sync for Codex structured outputs (owner: Codex, updated: 2025-12-27)

### Stream 1: README
1. [DONE] Обновить README с релизом 1.1.355 и ссылкой на structured outputs (scope: `README.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update README for codex structured outputs`.
2. [DONE] Git Commit: `docs: update README for codex structured outputs` (hash: 8e424ca).

### Stream 2: Architecture docs
1. [DONE] Обновить архитектурные документы под новый Codex вывод (scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update architecture for codex structured outputs`.
2. [DONE] Git Commit: `docs: update architecture for codex structured outputs` (hash: 0c2a150).

### Stream 3: Codex module doc
1. [DONE] Обновить `Codex_SDK_Module.md` под structured outputs (scope: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update codex module docs for structured outputs`.
2. [DONE] Git Commit: `docs: update codex module docs for structured outputs` (hash: fa9d0b4).

---

## Phase 7 — Hotfix: Codex structured output schema (owner: Codex, updated: 2025-12-27)

### Stream 1: Schema requirement
1. [DONE] Зафиксировать требование `reasoning_summary_ru` в схеме и задокументировать пустой fallback (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `doc/Project_Docs/Codex_Thinking_RU_Summary_Structured_Outputs.md`, `doc/TODO/todo-plan.md`) — target commit: `fix(codex): require reasoning_summary_ru in schema`.
2. [DONE] Git Commit: `fix(codex): require reasoning_summary_ru in schema` (hash: fd23e0f).

---

## Phase 8 — Release 1.1.357 (owner: Codex, updated: 2025-12-27)

### Stream 1: Release notes
1. [DONE] Обновить README/CHANGELOG для 1.1.357 и описать hotfix (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update README and changelog for 1.1.357`.
2. [DONE] Git Commit: `docs: update README and changelog for 1.1.357` (hash: f003b10).

### Stream 2: Architecture docs
1. [DONE] Обновить архитектурные документы под релиз 1.1.357 (scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update architecture for 1.1.357`.
2. [DONE] Git Commit: `docs: update architecture for 1.1.357` (hash: 1cbe146).

### Stream 3: Release build
1. [DONE] Собрать релиз `build-all.sh` + `build-release.sh --use-current-version` и зафиксировать артефакты (scope: release artifacts/manifests) — target commit: `chore: bump versions to 1.1.357 and build release`.
2. [DONE] Git Commit: `chore: bump versions to 1.1.357 and build release` (hash: 6baffaf).

---

## Phase 9 — Codex prompt enforcement (owner: Codex, updated: 2025-12-27)

### Stream 1: Structured output prompt
1. [DONE] Добавить префикс инструкций structured output в Codex prompt (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`, `doc/TODO/todo-plan.md`) — target commit: `fix(codex): enforce RU summary prompt`.
2. [DONE] Git Commit: `fix(codex): enforce RU summary prompt` (hash: e42e741).
3. [IN_PROGRESS] Обновить документацию structured outputs про новый префикс (scope: `doc/Project_Docs/Codex_Thinking_RU_Summary_Structured_Outputs.md`, `doc/Project_Docs/Stacks/Codex_SDK_Module.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: document codex summary prompt enforcement`.
4. [TODO] Git Commit: `docs: document codex summary prompt enforcement` (hash: TBD).

---

## Phase 10 — Release 1.1.358 (owner: Codex, updated: 2025-12-27)

### Stream 1: Release notes
1. [TODO] Обновить README/CHANGELOG для 1.1.358 и описать hotfix (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update README and changelog for 1.1.358`.
2. [TODO] Git Commit: `docs: update README and changelog for 1.1.358` (hash: TBD).

### Stream 2: Architecture docs
1. [TODO] Обновить архитектурные документы под релиз 1.1.358 (scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`) — target commit: `docs: update architecture for 1.1.358`.
2. [TODO] Git Commit: `docs: update architecture for 1.1.358` (hash: TBD).

### Stream 3: Release build
1. [TODO] Собрать релиз `build-all.sh` + `build-release.sh --use-current-version` и зафиксировать артефакты (scope: release artifacts/manifests) — target commit: `chore: bump versions to 1.1.358 and build release`.
2. [TODO] Git Commit: `chore: bump versions to 1.1.358 and build release` (hash: TBD).

---

## Legacy / Deferred

## Phase 4 — Final Polish & Release (owner: Gemini, updated: 2025-12-25)
1. [DONE] Актуализировать CHANGELOG.md и Architecture.md.
2. [DONE] Собрать все компоненты через `./scripts/build-all.sh` (v1.1.356, 2025-12-27).
3. [DONE] Собрать VSIX через `./scripts/build-release.sh --use-current-version` (v1.1.356, 2025-12-27).
4. [TODO] Проверить работоспособность релиза.
