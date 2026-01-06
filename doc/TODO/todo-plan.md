# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента), например:
    - `npm run build --workspace @codeai-hub/core`
    - `npm run build --workspace @codeai-hub/codex-module`
    - `npm run build:webview`
    - `npm run typecheck:webview`
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт этого файла (дата, статус, хеш).
- Phase завершается на чистом дереве.

---

## Phase 1 — Agent Packages Infrastructure (owner: Oleksandr, updated: 2026-01-06)

### Stream: Архитектурный документ и согласование

1. [DONE] Создать архитектурный документ Agent Packages (scope: `doc/Project_Docs/AgentPackages_Architecture.md`; expected: описана проблема, целевая архитектура, миграционный план; commit: `docs(agents): add agent packages architecture`) (date: 2026-01-06)
2. [TODO] Git Commit: `docs(agents): add agent packages architecture` (hash: TBD)

### Stream: Shared Agent Package

3. [TODO] Создать пакет `@codeai-hub/agent-shared` (scope: `packages/agents/shared/package.json`, `packages/agents/shared/tsconfig.json`, `packages/agents/shared/src/index.ts`; expected: базовая структура пакета; commit: `feat(agents): bootstrap agent-shared package`)
4. [TODO] Git Commit: `feat(agents): bootstrap agent-shared package` (hash: TBD)

5. [TODO] Добавить общие типы контракта агента (scope: `packages/agents/shared/src/types/agent-contract.ts`, `packages/agents/shared/src/types/structured-output.ts`, `packages/agents/shared/src/types/index.ts`; expected: `AgentContractPayload`, `AgentStructuredOutput` типы; commit: `feat(agents): add shared agent types`)
6. [TODO] Git Commit: `feat(agents): add shared agent types` (hash: TBD)

7. [TODO] Добавить утилиты для схем (scope: `packages/agents/shared/src/schema-utils/schema-normalizer.ts`, `packages/agents/shared/src/schema-utils/schema-strictifier.ts`, `packages/agents/shared/src/schema-utils/index.ts`; expected: вынесена логика из `idea-contract-service.ts`; commit: `feat(agents): add shared schema utilities`)
8. [TODO] Git Commit: `feat(agents): add shared schema utilities` (hash: TBD)

9. [TODO] Добавить утилиты для контрактов (scope: `packages/agents/shared/src/contract-utils/file-reader.ts`, `packages/agents/shared/src/contract-utils/version-hasher.ts`, `packages/agents/shared/src/contract-utils/index.ts`; expected: чтение файлов, хеширование версии; commit: `feat(agents): add shared contract utilities`)
10. [TODO] Git Commit: `feat(agents): add shared contract utilities` (hash: TBD)

### Stream: Idea Collector Package — Bootstrap

11. [TODO] Создать пакет `@codeai-hub/idea-collector` (scope: `packages/agents/idea-collector/package.json`, `packages/agents/idea-collector/tsconfig.json`, `packages/agents/idea-collector/src/index.ts`; expected: зависимость от `@codeai-hub/agent-shared`; commit: `feat(agents): bootstrap idea-collector package`)
12. [TODO] Git Commit: `feat(agents): bootstrap idea-collector package` (hash: TBD)

13. [TODO] Перенести assets в пакет (scope: `packages/agents/idea-collector/assets/*`; expected: schema.json, prompt.md, template.md, questionnaire-template.md; commit: `feat(agents): move idea collector assets to package`)
14. [TODO] Git Commit: `feat(agents): move idea collector assets to package` (hash: TBD)

---

## Phase 2 — Idea Collector Migration (owner: Oleksandr, updated: 2026-01-06)

### Stream: Contract Logic Migration

1. [TODO] Перенести типы контракта (scope: `packages/agents/idea-collector/src/contract/contract-types.ts`, `packages/agents/idea-collector/src/contract/index.ts`; expected: `IdeaContractPayload` и связанные типы; commit: `feat(idea-collector): add contract types`)
2. [TODO] Git Commit: `feat(idea-collector): add contract types` (hash: TBD)

3. [TODO] Перенести логику построения контракта (scope: `packages/agents/idea-collector/src/contract/contract-builder.ts`; expected: `buildIdeaContract()` использует shared utilities; commit: `feat(idea-collector): add contract builder`)
4. [TODO] Git Commit: `feat(idea-collector): add contract builder` (hash: TBD)

5. [TODO] Перенести пути артефактов (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/src/paths/index.ts`; expected: константы путей для idea артефактов; commit: `feat(idea-collector): add artifact paths`)
6. [TODO] Git Commit: `feat(idea-collector): add artifact paths` (hash: TBD)

### Stream: Parser Logic Migration

7. [TODO] Перенести типы structured output (scope: `packages/agents/idea-collector/src/parser/parser-types.ts`, `packages/agents/idea-collector/src/parser/index.ts`; expected: `IdeaStructuredOutput` и связанные типы; commit: `feat(idea-collector): add parser types`)
8. [TODO] Git Commit: `feat(idea-collector): add parser types` (hash: TBD)

9. [TODO] Перенести логику парсинга (scope: `packages/agents/idea-collector/src/parser/structured-output-parser.ts`; expected: логика из `idea-collector-structured-output.ts`; commit: `feat(idea-collector): add structured output parser`)
10. [TODO] Git Commit: `feat(idea-collector): add structured output parser` (hash: TBD)

### Stream: Facade Implementation

11. [TODO] Создать фасад Idea Collector (scope: `packages/agents/idea-collector/src/facade.ts`; expected: `IdeaCollectorFacade` с `buildContract()`, `parseStructuredOutput()`, `getArtifactPaths()`; commit: `feat(idea-collector): implement facade`)
12. [TODO] Git Commit: `feat(idea-collector): implement facade` (hash: TBD)

13. [TODO] Обновить публичные экспорты (scope: `packages/agents/idea-collector/src/index.ts`; expected: экспорт фасада и типов; commit: `feat(idea-collector): finalize public exports`)
14. [TODO] Git Commit: `feat(idea-collector): finalize public exports` (hash: TBD)

---

## Phase 3 — Integration & Cleanup (owner: Oleksandr, updated: 2026-01-06)

### Stream: Core Integration

1. [TODO] Обновить Core для использования фасада (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected: вызов `IdeaCollectorFacade.buildContract()`; commit: `refactor(core): use idea collector facade for contract`)
2. [TODO] Git Commit: `refactor(core): use idea collector facade for contract` (hash: TBD)

3. [TODO] Обновить questionnaire handlers в Core (scope: `packages/core/src/remote-bridge/handlers/idea-questionnaire-*.ts`; expected: импорт путей из фасада; commit: `refactor(core): use idea collector facade for paths`)
4. [TODO] Git Commit: `refactor(core): use idea collector facade for paths` (hash: TBD)

### Stream: Claude Module Integration

5. [TODO] Обновить Claude Module для использования парсера (scope: `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`; expected: re-export из `@codeai-hub/idea-collector` или удаление; commit: `refactor(claude): use idea collector facade for parser`)
6. [TODO] Git Commit: `refactor(claude): use idea collector facade for parser` (hash: TBD)

### Stream: Legacy Cleanup

7. [TODO] Удалить старые assets (scope: `assets/templates/full-development-flow/idea/*`; expected: файлы перенесены в пакет; commit: `refactor(assets): remove legacy idea collector templates`)
8. [TODO] Git Commit: `refactor(assets): remove legacy idea collector templates` (hash: TBD)

9. [TODO] Обновить Extension installers (scope: `src/extension-module/templates/idea-collector-prompt-installer.ts`, `src/extension-module/templates/idea-questionnaire-template-installer.ts`; expected: путь к bundled assets из пакета; commit: `refactor(extension): update idea collector installers`)
10. [TODO] Git Commit: `refactor(extension): update idea collector installers` (hash: TBD)

---

## Phase 4 — Spec Creator Skeleton (owner: Oleksandr, updated: 2026-01-06)

### Stream: Spec Creator Package Bootstrap

1. [TODO] Создать пакет `@codeai-hub/spec-creator` (scope: `packages/agents/spec-creator/package.json`, `packages/agents/spec-creator/tsconfig.json`, `packages/agents/spec-creator/src/index.ts`; expected: структура аналогична idea-collector; commit: `feat(agents): bootstrap spec-creator package`)
2. [TODO] Git Commit: `feat(agents): bootstrap spec-creator package` (hash: TBD)

3. [TODO] Добавить placeholder assets (scope: `packages/agents/spec-creator/assets/spec-creator-schema.json`, `packages/agents/spec-creator/assets/spec-creator-prompt.md`, `packages/agents/spec-creator/assets/spec-template.md`; expected: заглушки для будущей реализации; commit: `feat(spec-creator): add placeholder assets`)
4. [TODO] Git Commit: `feat(spec-creator): add placeholder assets` (hash: TBD)

5. [TODO] Создать скелет фасада (scope: `packages/agents/spec-creator/src/facade.ts`, `packages/agents/spec-creator/src/contract/`, `packages/agents/spec-creator/src/parser/`; expected: `SpecCreatorFacade` с TODO методами; commit: `feat(spec-creator): implement facade skeleton`)
6. [TODO] Git Commit: `feat(spec-creator): implement facade skeleton` (hash: TBD)

### Stream: Documentation & Release

7. [TODO] Обновить Architecture.md (scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected: описание Agent Packages архитектуры; commit: `docs(architecture): document agent packages structure`)
8. [TODO] Git Commit: `docs(architecture): document agent packages structure` (hash: TBD)

9. [TODO] Обновить README + CHANGELOG (scope: `README.md`, `CHANGELOG.md`; expected: release notes для рефакторинга; commit: `docs(release): update agent packages refactoring notes`)
10. [TODO] Git Commit: `docs(release): update agent packages refactoring notes` (hash: TBD)

11. [TODO] Подготовить релиз (scope: версии/манифесты; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit: `chore(release): prepare X.X.XXX`)
12. [TODO] Git Commit: `chore(release): prepare X.X.XXX` (hash: TBD)

---

## Notes

- Архитектурный документ: `doc/Project_Docs/AgentPackages_Architecture.md`
- Каждый агент-пакет имеет ЕДИНУЮ точку входа — Facade
- UI компоненты остаются в `src/client/ui/` (webview-specific)
- Assets синхронизируются в `~/.codeai-hub/templates/` через Core
