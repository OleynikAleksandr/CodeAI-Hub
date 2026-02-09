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

1. [DONE] Создать архитектурный документ Agent Packages (scope: `doc/SolidWorks-Flow/System/AgentPackages_Architecture.md`; expected: описана проблема, целевая архитектура, миграционный план; commit: `docs(agents): add agent packages architecture`) (date: 2026-01-06)
2. [DONE] Git Commit: `docs(agents): add agent packages architecture` (hash: 045ab7c) (date: 2026-01-06)

### Stream: Shared Agent Package

3. [DONE] Создать пакет `@codeai-hub/agent-shared` (scope: `packages/agents/shared/package.json`, `packages/agents/shared/tsconfig.json`, `packages/agents/shared/src/index.ts`; expected: базовая структура пакета; commit: `feat(agents): bootstrap agent-shared package`) (date: 2026-01-06)
4. [DONE] Git Commit: `feat(agents): bootstrap agent-shared package` (hash: 1e7dd36) (date: 2026-01-06)

5. [DONE] Добавить общие типы контракта агента (scope: `packages/agents/shared/src/types/agent-contract.ts`, `packages/agents/shared/src/types/structured-output.ts`, `packages/agents/shared/src/types/index.ts`; expected: `AgentContractPayload`, `AgentStructuredOutput` типы; commit: `feat(agents): add shared agent types`) (date: 2026-01-06)
6. [DONE] Git Commit: `feat(agents): add shared agent types` (hash: 9a9fbb0) (date: 2026-01-06)

7. [DONE] Добавить утилиты для схем (scope: `packages/agents/shared/src/schema-utils/schema-normalizer.ts`, `packages/agents/shared/src/schema-utils/schema-strictifier.ts`, `packages/agents/shared/src/schema-utils/index.ts`; expected: вынесена логика из `idea-contract-service.ts`; commit: `feat(agents): add shared schema utilities`) (date: 2026-01-06)
8. [DONE] Git Commit: `feat(agents): add shared schema utilities` (hash: d56de9a) (date: 2026-01-06)

9. [DONE] Добавить утилиты для контрактов (scope: `packages/agents/shared/src/contract-utils/file-reader.ts`, `packages/agents/shared/src/contract-utils/version-hasher.ts`, `packages/agents/shared/src/contract-utils/index.ts`; expected: чтение файлов, хеширование версии; commit: `feat(agents): add shared contract utilities`) (date: 2026-01-06)
10. [DONE] Git Commit: `feat(agents): add shared contract utilities` (hash: accd571) (date: 2026-01-06)

### Stream: Idea Collector Package — Bootstrap

11. [DONE] Создать пакет `@codeai-hub/idea-collector` (scope: `packages/agents/idea-collector/package.json`, `packages/agents/idea-collector/tsconfig.json`, `packages/agents/idea-collector/src/index.ts`; expected: зависимость от `@codeai-hub/agent-shared`; commit: `feat(agents): bootstrap idea-collector package`) (date: 2026-01-06)
12. [DONE] Git Commit: `feat(agents): bootstrap idea-collector package` (hash: 94edcfb) (date: 2026-01-06)

13. [DONE] Перенести assets в пакет (scope: `packages/agents/idea-collector/assets/*`; expected: schema.json, prompt.md, template.md, questionnaire-template.md; commit: `feat(agents): move idea collector assets to package`) (date: 2026-01-06)
14. [DONE] Git Commit: `feat(agents): move idea collector assets to package` (hash: 2fbd2f0) (date: 2026-01-06)

---

## Phase 2 — Idea Collector Migration (owner: Oleksandr, updated: 2026-01-06)

### Stream: Contract Logic Migration

1. [DONE] Перенести типы контракта (scope: `packages/agents/idea-collector/src/contract/contract-types.ts`, `packages/agents/idea-collector/src/contract/index.ts`; expected: `IdeaContractPayload` и связанные типы; commit: `feat(idea-collector): add contract types`) (date: 2026-01-06)
2. [DONE] Git Commit: `feat(idea-collector): add contract types` (hash: bdf5b26) (date: 2026-01-06)

3. [DONE] Перенести логику построения контракта (scope: `packages/agents/idea-collector/src/contract/contract-builder.ts`; expected: `buildIdeaContract()` использует shared utilities; commit: `feat(idea-collector): add contract builder`) (date: 2026-01-06)
4. [DONE] Git Commit: `feat(idea-collector): add contract builder` (hash: f1ba68d) (date: 2026-01-06)

5. [DONE] Перенести пути артефактов (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/src/paths/index.ts`; expected: константы путей для idea артефактов; commit: `feat(idea-collector): add artifact paths`) (date: 2026-01-06)
6. [DONE] Git Commit: `feat(idea-collector): add artifact paths` (hash: 80d6299) (date: 2026-01-06)

### Stream: Parser Logic Migration

7. [DONE] Перенести типы structured output (scope: `packages/agents/idea-collector/src/parser/parser-types.ts`, `packages/agents/idea-collector/src/parser/index.ts`; expected: `IdeaStructuredOutput` и связанные типы; commit: `feat(idea-collector): add parser types`) (date: 2026-01-06)
8. [DONE] Git Commit: `feat(idea-collector): add parser types` (hash: d3b0d84) (date: 2026-01-06)

9. [DONE] Перенести логику парсинга (scope: `packages/agents/idea-collector/src/parser/structured-output-parser.ts`; expected: логика из `idea-collector-structured-output.ts`; commit: `feat(idea-collector): add structured output parser`) (date: 2026-01-06)
10. [DONE] Git Commit: `feat(idea-collector): add structured output parser` (hash: 8796335) (date: 2026-01-06)

### Stream: Facade Implementation

11. [DONE] Создать фасад Idea Collector (scope: `packages/agents/idea-collector/src/facade.ts`; expected: `IdeaCollectorFacade` с `buildContract()`, `parseStructuredOutput()`, `getArtifactPaths()`; commit: `feat(idea-collector): implement facade`) (date: 2026-01-06)
12. [DONE] Git Commit: `feat(idea-collector): implement facade` (hash: eca4b59) (date: 2026-01-06)

13. [DONE] Обновить публичные экспорты (scope: `packages/agents/idea-collector/src/index.ts`; expected: экспорт фасада и типов; commit: `feat(idea-collector): finalize public exports`) (date: 2026-01-06)
14. [DONE] Git Commit: `feat(idea-collector): finalize public exports` (hash: 8b4ffc9) (date: 2026-01-06)

---

## Phase 3 — Integration & Cleanup (owner: Oleksandr, updated: 2026-01-06)

### Stream: Core Integration

1. [DONE] Обновить Core для использования фасада (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected: вызов `IdeaCollectorFacade.buildContract()`; commit: `refactor(core): use idea collector facade for contract`) (date: 2026-01-06)
2. [DONE] Git Commit: `refactor(core): use idea collector facade for contract` (hash: dc74592) (date: 2026-01-06)

3. [DONE] Обновить questionnaire handlers в Core (scope: `packages/core/src/remote-bridge/handlers/idea-questionnaire-*.ts`; expected: импорт путей из фасада; commit: `refactor(core): use idea collector facade for paths`) (date: 2026-01-06)
4. [DONE] Git Commit: `refactor(core): use idea collector facade for paths` (hash: ba245b5) (date: 2026-01-06)

### Stream: Claude Module Integration

5. [DONE] Обновить Claude Module для использования парсера (scope: `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`; expected: re-export из `@codeai-hub/idea-collector` или удаление; commit: `refactor(claude): use idea collector facade for parser`) (date: 2026-01-06)
6. [DONE] Git Commit: `refactor(claude): use idea collector facade for parser` (hash: 2774132) (date: 2026-01-06)

### Stream: Legacy Cleanup

7. [DONE] Удалить старые assets (scope: `assets/templates/full-development-flow/idea/*`; expected: файлы перенесены в пакет; commit: `refactor(assets): remove legacy idea collector templates`) (date: 2026-01-06)
8. [DONE] Git Commit: `refactor(assets): remove legacy idea collector templates` (hash: 8f0b5cf) (date: 2026-01-06)

9. [DONE] Обновить Extension installers (scope: `src/extension-module/templates/idea-collector-prompt-installer.ts`, `src/extension-module/templates/idea-questionnaire-template-installer.ts`; expected: путь к bundled assets из пакета; commit: `refactor(extension): update idea collector installers`) (date: 2026-01-06)
10. [DONE] Git Commit: `refactor(extension): update idea collector installers` (hash: 69f962d) (date: 2026-01-06)

---

## Phase 4 — Spec Creator Skeleton (owner: Oleksandr, updated: 2026-01-06)

### Stream: Spec Creator Package Bootstrap

1. [DONE] Создать пакет `@codeai-hub/spec-creator` (scope: `packages/agents/spec-creator/package.json`, `packages/agents/spec-creator/tsconfig.json`, `packages/agents/spec-creator/src/index.ts`; expected: структура аналогична idea-collector; commit: `feat(agents): bootstrap spec-creator package`) (date: 2026-01-06)
2. [DONE] Git Commit: `feat(agents): bootstrap spec-creator package with facade skeleton` (hash: 801135f) (date: 2026-01-06)

3. [DONE] Добавить placeholder assets (scope: `packages/agents/spec-creator/assets/spec-creator-schema.json`, `packages/agents/spec-creator/assets/spec-creator-prompt.md`, `packages/agents/spec-creator/assets/spec-template.md`; expected: заглушки для будущей реализации) (date: 2026-01-06)
4. [DONE] Git Commit: (included in 801135f)

5. [DONE] Создать скелет фасада (scope: `packages/agents/spec-creator/src/facade.ts`, `packages/agents/spec-creator/src/contract/`, `packages/agents/spec-creator/src/parser/`; expected: `SpecCreatorFacade` с TODO методами) (date: 2026-01-06)
6. [DONE] Git Commit: (included in 801135f)

### Stream: Documentation & Release

7. [DONE] Обновить Architecture.md (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/AgentPackages_Architecture.md`; expected: описание Agent Packages архитектуры) (date: 2026-01-06)
8. [DONE] Git Commit: `docs(architecture): document agent packages structure` (hash: 946501d) (date: 2026-01-06)

9. [DONE] Обновить README + CHANGELOG (scope: `README.md`, `CHANGELOG.md`; expected: release notes для рефакторинга) (date: 2026-01-06)
10. [DONE] Git Commit: (included in 946501d)

11. [DONE] Подготовить релиз (scope: версии/манифесты; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`) (date: 2026-01-06)
12. [DONE] Git Commit: `chore(release): bump versions to 1.1.388` (hash: 9a04d43) (date: 2026-01-06)

✅ **Phase 4 COMPLETE** — Release 1.1.388 built successfully!

---

## Notes

- Архитектурный документ: `doc/SolidWorks-Flow/System/AgentPackages_Architecture.md`
- Каждый агент-пакет имеет ЕДИНУЮ точку входа — Facade
- UI компоненты остаются в `src/client/ui/` (webview-specific)
- Assets синхронизируются в `~/.codeai-hub/templates/` через Core
