# Session 058 — Agent Packages Infrastructure (Phase 1)

**Date:** 2026-01-06 (UTC)
**Branch:** main
**Version:** 1.1.387

---

# 1. Work Done in This Session

## Work summary
- Провели архитектурный анализ Idea Collector — выявили распределение компонентов по 7 локациям (~21 файл)
- Приняли решение о рефакторинге по паттерну "Agent Packages" (самодостаточные пакеты для каждого агента)
- Создали архитектурный документ `doc/Project_Docs/AgentPackages_Architecture.md`
- Заархивировали предыдущий todo-plan в `doc/TODO/Archive/todo-plan-phase6-questionnaire-slim-output.md`
- Создали новый `doc/TODO/todo-plan.md` с 4 фазами рефакторинга
- **Полностью выполнили Phase 1 — Agent Packages Infrastructure**:
  - Создали пакет `@codeai-hub/agent-shared` с общими типами и утилитами
  - Создали пакет `@codeai-hub/idea-collector` и перенесли в него assets
  - Настроили npm workspaces для agent packages
  - Исправили конфигурацию Ultracite (отключили noBarrelFile для agent packages)

## Git commits
(Для восстановления контекста в следующей сессии используйте `git show <hash>`)
- `045ab7c` docs(agents): add agent packages architecture
- `1e7dd36` feat(agents): bootstrap agent-shared package
- `9a9fbb0` feat(agents): add shared agent types
- `d56de9a` feat(agents): add shared schema utilities
- `accd571` feat(agents): add shared contract utilities
- `94edcfb` feat(agents): bootstrap idea-collector package
- `2fbd2f0` feat(agents): move idea collector assets to package

## Created Structure
```
packages/agents/
├── shared/                          # @codeai-hub/agent-shared
│   ├── src/
│   │   ├── index.ts                 # Public exports
│   │   ├── types/
│   │   │   ├── agent-contract.ts    # BaseAgentContract, AgentTemplatePaths
│   │   │   ├── structured-output.ts # BaseStructuredOutput, ParseResult
│   │   │   └── index.ts
│   │   ├── schema-utils/
│   │   │   ├── schema-strictifier.ts
│   │   │   ├── schema-normalizer.ts
│   │   │   └── index.ts
│   │   └── contract-utils/
│   │       ├── file-reader.ts
│   │       ├── version-hasher.ts
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── idea-collector/                  # @codeai-hub/idea-collector
    ├── assets/
    │   ├── idea-collector-prompt.md
    │   ├── idea-collector-schema.json
    │   ├── idea-template.md
    │   └── questionnaire-template.md
    ├── src/
    │   └── index.ts                 # Placeholder
    ├── package.json
    └── tsconfig.json
```

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/AgentPackages_Architecture.md` — **ключевой документ архитектуры**
3. `doc/TODO/todo-plan.md` — **план работ (Phase 2-4 pending)**
4. `doc/Sessions/Session058.md` (THIS REPORT)

## Plans for next session

### Phase 2 — Idea Collector Migration (14 задач)
Согласно `doc/TODO/todo-plan.md`:

**Stream: Contract Logic Migration**
1. Перенести типы контракта (`IdeaContractPayload`) в `packages/agents/idea-collector/src/contract/`
2. Перенести логику построения контракта (`buildIdeaContract()`)
3. Перенести пути артефактов

**Stream: Parser Logic Migration**
4. Перенести типы structured output (`IdeaStructuredOutput`)
5. Перенести логику парсинга

**Stream: Facade Implementation**
6. Создать `IdeaCollectorFacade` с методами:
   - `buildContract()` — построение контракта для Claude
   - `parseStructuredOutput()` — парсинг ответа агента
   - `getArtifactPaths()` — пути сохранения артефактов
7. Обновить публичные экспорты пакета

### Последующие фазы
- **Phase 3**: Integration & Cleanup — интеграция фасада в Core и Claude Module, удаление legacy
- **Phase 4**: Spec Creator Skeleton + Release

## Key files to examine
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts` — текущая логика контракта
- `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts` — текущая логика парсинга
- `packages/agents/shared/src/` — shared utilities для использования в idea-collector

## Notes
- После каждой фазы делать паузу для подтверждения
- Гейты качества обязательны после каждой подзадачи
- Документация синхронизируется с кодом в том же коммите
