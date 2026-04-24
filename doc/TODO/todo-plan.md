# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`
- **Related umbrella planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Stack_Tuning_Tests.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если по факту разработки конкретная подзадача требует больше 3 файлов, подзадача должна быть разбита до продолжения.
- Гейты качества запускаются через Husky hooks при `git commit`; не обходить hooks и `check-architecture.sh`.
- Таргетная проверка для этого цикла: `npm run build --workspace @codeai-hub/claude-module`.
- Raw provider/system prompt dumps не коммитить. В git фиксировать только summary, hashes, high-level section names and conclusions.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и module docs обновлять синхронно только если меняется product/runtime contract. Для экспериментального diagnostic-only флага без смены product baseline достаточно planning/evidence + TODO.

## Phase 1 — Claude diagnostic preset systemPrompt test (owner: Codex, updated: 2026-04-24)

### Stream: Minimal Claude capture toggle
1. [DONE] Создать execution plan для первого Claude-only test — scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: plan claude instruction stack preset capture test`
2. [DONE] Git Commit: `docs: plan claude instruction stack preset capture test` (hash: `7f57de989`)
3. [DONE] Добавить в Claude diagnostic capture path явный SDK preset `systemPrompt: { type: "preset", preset: "claude_code" }` без изменения `tools`, permissions, sandbox, `settingSources`, model или thinking policy — scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; expected commit message: `test: add claude preset system prompt capture flag`
4. [DONE] Git Commit: `test: add claude preset system prompt capture flag` (hash: `145ed0717`)
5. [DONE] Выполнить таргетную проверку Claude module и зафиксировать результат в TODO — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs: record claude preset capture verification`
   - Verification: `npm install` восстановил workspace dependencies; `npm run build --workspace @codeai-hub/translation` прошел; `npm run build --workspace @codeai-hub/claude-module` прошел; `node --test packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js` прошел; Husky pre-commit для `145ed0717` прошел `check-architecture.sh`, `npm run lint`, `npm run check:knip`, staged `format:fix`.
6. [IN_PROGRESS] Git Commit: `docs: record claude preset capture verification` (hash: TBD)
