# Session 059 — Phase 2: Idea Collector Migration

**Date:** 2026-01-06 (UTC)
**Branch:** main
**Version:** 1.1.387

---

# 1. Work Done in This Session

## Work summary

### Phase 2 — Idea Collector Migration — ПОЛНОСТЬЮ ЗАВЕРШЕНА

Выполнена миграция всей логики Idea Collector из разрозненных локаций в самодостаточный пакет `@codeai-hub/idea-collector`.

**Stream: Contract Logic Migration (3 коммита)**
- Созданы типы контракта (`IdeaContractPayload`, `IdeaQuestionnaireConfig`, `IdeaOutputPaths`)
- Реализован `buildIdeaContract()` с использованием shared utilities
- Вынесены константы путей в отдельный модуль `paths/`

**Stream: Parser Logic Migration (2 коммита)**
- Созданы типы structured output (`IdeaStructuredOutput`, `IdeaArtifact`, `IdeaParseResult`)
- Реализованы парсеры `parseIdeaOutputFromText()` и `parseIdeaOutputFromResultMessage()`

**Stream: Facade Implementation (2 коммита)**
- Создан `IdeaCollectorFacade` как единая точка входа
- Обновлены публичные экспорты пакета с документацией

**Результаты:**
- Все гейты качества пройдены (architecture, ultracite, ts-prune, jscpd)
- Сборка `@codeai-hub/idea-collector` успешна
- Код дублирования: 2.95% (в пределах порога 3%)

## Git commits
(Для восстановления контекста в следующей сессии используйте `git show <hash>`)

**Phase 2 коммиты:**
- `bdf5b26` feat(idea-collector): add contract types
- `f1ba68d` feat(idea-collector): add contract builder
- `80d6299` feat(idea-collector): add artifact paths
- `d3b0d84` feat(idea-collector): add parser types
- `8796335` feat(idea-collector): add structured output parser
- `eca4b59` feat(idea-collector): implement facade
- `8b4ffc9` feat(idea-collector): finalize public exports
- `dc09365` docs(todo): complete Phase 2 - Idea Collector Migration

## Created Structure

```
packages/agents/idea-collector/
├── assets/                              # Шаблоны агента (из Phase 1)
│   ├── idea-collector-prompt.md
│   ├── idea-collector-schema.json
│   ├── idea-template.md
│   └── questionnaire-template.md
├── src/
│   ├── index.ts                         # Public exports + usage docs
│   ├── facade.ts                        # IdeaCollectorFacade (ЕДИНАЯ точка входа)
│   ├── contract/
│   │   ├── contract-types.ts            # IdeaContractPayload, IdeaOutputPaths
│   │   ├── contract-builder.ts          # buildIdeaContract()
│   │   └── index.ts
│   ├── parser/
│   │   ├── parser-types.ts              # IdeaStructuredOutput, IdeaArtifact
│   │   ├── structured-output-parser.ts  # parseIdeaOutputFromText/Message()
│   │   └── index.ts
│   └── paths/
│       ├── artifact-paths.ts            # IDEA_TEMPLATE_PATHS, IDEA_OUTPUT_PATHS
│       └── index.ts
├── package.json
└── tsconfig.json
```

## Facade API

```typescript
import { IdeaCollectorFacade } from '@codeai-hub/idea-collector';

// Build contract for LLM (reads templates, normalizes schema, computes version)
const contract = await IdeaCollectorFacade.buildContract();

// Parse LLM response from raw JSON text
const output = IdeaCollectorFacade.parseStructuredOutput(responseText);

// Parse from message object (supports snake_case and camelCase)
const output2 = IdeaCollectorFacade.parseStructuredOutputFromMessage(message);

// Get artifact paths for specific initiative
const paths = IdeaCollectorFacade.getArtifactPaths('my-initiative');
```

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/AgentPackages_Architecture.md` — ключевой документ архитектуры
3. `doc/TODO/todo-plan.md` — план работ (Phase 3-4 pending)
4. `doc/Sessions/Session059.md` (THIS REPORT)

## Plans for next session

### Phase 3 — Integration & Cleanup (10 задач)

**Stream: Core Integration**
1. Обновить `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`:
   - Заменить локальную логику на вызов `IdeaCollectorFacade.buildContract()`
   - Удалить дублирующийся код (329 строк → ~20 строк)
2. Обновить questionnaire handlers в Core для использования путей из фасада

**Stream: Claude Module Integration**
3. Обновить `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`:
   - Re-export из `@codeai-hub/idea-collector` или удаление файла
   - Использовать `IdeaCollectorFacade.parseStructuredOutput()`

**Stream: Legacy Cleanup**
4. Удалить старые assets из `assets/templates/full-development-flow/idea/`
5. Обновить Extension installers для использования bundled assets из пакета

### Phase 4 — Spec Creator Skeleton + Release
После Phase 3 — создание скелета второго агента и релиз.

## Key files to modify in Phase 3

| File | Action |
|------|--------|
| `packages/core/src/remote-bridge/handlers/idea-contract-service.ts` | Заменить на вызов фасада |
| `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts` | Re-export или удалить |
| `assets/templates/full-development-flow/idea/*` | Удалить (перенесены в пакет) |
| `src/extension-module/templates/idea-collector-prompt-installer.ts` | Обновить путь к assets |
| `src/extension-module/templates/idea-questionnaire-template-installer.ts` | Обновить путь к assets |

## Dependencies for Phase 3

Перед интеграцией в Core и Claude Module необходимо:
1. Добавить `@codeai-hub/idea-collector` в dependencies этих пакетов
2. Обновить tsconfig references при необходимости

## Notes
- Phase 2 завершена на 100% — все 14 задач выполнены
- Пакет `@codeai-hub/idea-collector` готов к интеграции
- Legacy код пока НЕ удалён — это задача Phase 3
- После каждого Stream в Phase 3 делать паузу для проверки
