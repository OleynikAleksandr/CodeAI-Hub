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
6. [DONE] Git Commit: `docs: record claude preset capture verification` (hash: `116d7df12`)

### Stream: Runtime capture comparison
7. [DONE] Выполнить runtime capture через Project Manager Settings -> General для Claude `Description` scenario на текущей ветке; raw artifacts оставить только в `~/.codeai-hub/logs/native-request-capture/`; repo scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: record claude preset capture evidence`
   - Runtime capture: `2026-04-24T13-55-05-221Z-claude-native-request.jsonl`; diagnostic filter ignored Haiku translation request with `tools: 0` and captured main `claude-opus-4-7` workflow request with `tools: 10`.
8. [DONE] Git Commit: `docs: record claude preset capture evidence` (hash: `244c6d730`)
9. [DONE] Сравнить новый capture с baseline `2026-04-24T12-22-42-190Z-claude-native-request.md` и зафиксировать только high-level выводы, section names/counts/hashes без raw prompt dump — scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: summarize claude preset capture comparison`
   - Comparison: main workflow request kept identical `messages` hash `24c98fd552e2a4ba` and `tools` hash `4a3f9e88a7a8bd49`; `body.system` grew from `2` blocks / `146` text chars to `4` blocks / `28486` text chars with Claude Code preset sections.
10. [DONE] Git Commit: `docs: summarize claude preset capture comparison` (hash: `0065f49e0`)

### Stream: Test release package
11. [DONE] Подготовить release docs для будущей версии `1.2.68` перед `build-all.sh` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare claude preset capture release notes`
12. [DONE] Git Commit: `docs: prepare claude preset capture release notes` (hash: `0e117fa3d`)
13. [DONE] Собрать release artifacts через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` — scope: package manifests, release artifacts, `doc/TODO/todo-plan.md`; expected commit message: `chore: build claude preset capture test release`
   - `./scripts/build-all.sh` прошел: version/manifests обновлены до `1.2.68`, tarball artifacts созданы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
   - `./scripts/build-release.sh --use-current-version` прошел: проверены `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`; VSIX: `codeai-hub-1.2.68.vsix` (`2.4M`).
14. [DONE] Git Commit: `chore: build claude preset capture test release` (hash: `48fec390d`)

### Stream: Claude capture target filter
15. [DONE] Исправить diagnostic-only Claude capture target filter, чтобы translation/localization Haiku requests не закрывали Settings capture раньше workflow agent-loop request — scope: `packages/core/src/provider-network-capture/native-request-capture-types.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`, `packages/core/src/provider-network-capture/native-request-capture-proxy.ts`; expected commit message: `fix: filter claude native capture to agent requests`
16. [DONE] Git Commit: `fix: filter claude native capture to agent requests` (hash: `88df7c121`)
17. [DONE] Добавить targeted test и evidence note по regression `1.2.68 captured translation request first` — scope: `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`, `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: filter claude native capture to agent requests`
18. [DONE] Git Commit: `fix: filter claude native capture to agent requests` (hash: `88df7c121`)

### Stream: Corrective test release package
19. [DONE] Подготовить release docs для будущей версии `1.2.69` с diagnostic-only Claude capture target filter — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare claude capture filter release notes`
20. [DONE] Git Commit: `docs: prepare claude capture filter release notes` (hash: `ddc5db6db`)
21. [DONE] Собрать corrective release artifacts через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` — scope: package manifests, release artifacts, `doc/TODO/todo-plan.md`; expected commit message: `chore: build claude capture filter test release`
   - `./scripts/build-all.sh` прошел: version/manifests обновлены до `1.2.69`, tarball artifacts созданы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
   - `./scripts/build-release.sh --use-current-version` прошел: проверены `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`; VSIX: `codeai-hub-1.2.69.vsix` (`2.4M`).
22. [DONE] Git Commit: `chore: build claude capture filter test release` (hash: `2abfd0487`)

### Stream: Custom-only neutral Claude system prompt
23. [DONE] Зафиксировать C2 plan: заменить Claude diagnostic preset на custom-only neutral system prompt без переноса step templates — scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: plan claude custom system prompt test`
24. [DONE] Git Commit: `docs: plan claude custom system prompt test` (hash: `9c2d0083c`)
25. [DONE] Реализовать Claude diagnostic custom-only `systemPrompt` и обновить targeted test — scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; expected commit message: `test: use claude custom operating system prompt`
26. [DONE] Git Commit: `test: use claude custom operating system prompt` (hash: `08c575428`)
27. [DONE] Выполнить targeted Claude module verification и зафиксировать результат — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs: record claude custom system prompt verification`
   - Verification: `npm run build --workspace @codeai-hub/claude-module` прошел; `node --test packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js` прошел; Husky pre-commit для `08c575428` прошел `check-architecture.sh`, `npm run lint`, `npm run check:knip`, staged `format:fix`.
28. [DONE] Git Commit: `docs: record claude custom system prompt verification` (hash: `2f367ed62`)
29. [DONE] Подготовить release docs для будущей версии `1.2.70` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare claude custom system prompt release notes`
30. [DONE] Git Commit: `docs: prepare claude custom system prompt release notes` (hash: `e41c60d24`)
31. [DONE] Собрать test release artifacts через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` — scope: package manifests, release artifacts, `doc/TODO/todo-plan.md`; expected commit message: `chore: build claude custom system prompt test release`
   - `./scripts/build-all.sh` прошел: version/manifests обновлены до `1.2.70`, tarball artifacts созданы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
   - `./scripts/build-release.sh --use-current-version` прошел: проверены `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`; VSIX: `codeai-hub-1.2.70.vsix` (`2.4M`).
32. [DONE] Git Commit: `chore: build claude custom system prompt test release` (hash: `4fa9d7ae0`)
33. [DONE] Проверить runtime capture C2 после установки `1.2.70` и зафиксировать high-level evidence без raw prompt dump — scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Instruction_Stack_Flag_Evidence.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: record claude custom system prompt capture evidence`
   - Runtime capture: `2026-04-25T06-36-21-416Z-claude-native-request.jsonl`; captured main `claude-opus-4-7` workflow request at JSONL record `27`.
   - Result: `body.system` has `3` blocks / `2948` text chars and includes custom `Agent Operating Rules`; `body.tools` remains `10` tools with hash `4a3f9e88a7a8bd49`; Claude Code preset blocks from C1 are absent from `body.system`.
34. [DONE] Git Commit: `docs: record claude custom system prompt capture evidence` (hash: `adac28ef9`)
35. [DONE] Зафиксировать финальную спецификацию Claude diagnostic SDK call и полный custom system prompt в module SSOT — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: document claude custom system prompt contract`
36. [DONE] Git Commit: `docs: document claude custom system prompt contract` (hash: `69acd3842`)
