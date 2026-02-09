# Plan.md — Project Orchestrator

**Версия:** 1.0
**Дата создания:** 2025-12-28
**Последнее обновление:** 2025-12-31

> Этот документ является **источником истины** для разработки Project Orchestrator.
> Структура плана визуализирует параллелизм — что можно делать одновременно.

---

## 0. Мета-информация

**Проект:** Project Orchestrator (Flow Wizard для CodeAI-Hub)
**Flow:** Full Development Flow
**Провайдер для тестирования:** Codex (Structured Outputs)

### Связанные артефакты
- Idea.md: `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/idea.md`
- Virtual Simulation: `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/virtual-simulation.md`
- Spec.md: `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/spec/spec.md` (single-module) или `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/modules/<moduleSlug>/spec/spec.md` (multi-module)
- Session Reports: `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/modules/<moduleSlug>/sessions/`
- Шаблоны: `~/.codeai-hub/templates/full-development-flow/`

---


## 0.1 Правила ручной параллельной оркестрации (важно)

- Оркестратор выдаёт саб-агенту **входной пакет (выжимку)**, а не полный текст плана.
  В пакете: `assignment` (Task ID/цель/критерии), `scope` (≤3 файла), `must_read` (минимум), `handoff` (как отчитаться).
- Саб-агент выполняет только свой `assignment` и **не начинает** задачи других волн/стримов без нового входного пакета.
- Метки `[Агент A/B/C]` — это **логические стримы**, не «имена процессов». Для реальных исполнителей используйте `Worker-1/Worker-2/Worker-3`.
- После выполнения саб-агент обязан в отчёте указать, какие пункты отметить `DONE` (дата + commit hash).
  - Для изменений в `~/.codeai-hub/templates/` (вне git) фиксируйте `Commit: N/A (global)`.

## 1. Правила выполнения

### 1.1 Правила параллелизма

- **Волна** — группа задач, которые можно выполнять одновременно
- **[Агент X]** — логический поток работы
- **"Ждёт:"** — явная зависимость от результатов предыдущей волны
- Следующая волна начинается **только после завершения предыдущей**

### 1.2 Правила задач

- Каждая задача затрагивает **≤ 3 файлов**
- После каждой задачи — **обязательный Git Commit**

### 1.3 Гейты качества

- Гейты запускаются автоматически git-hook'ом при `git commit` (команды не дублируем в плане, чтобы не тратить контекст).
- Если hook красный — задача не считается выполненной: исправить причину и повторить коммит.
- При необходимости ручного прогона: `./scripts/check-architecture.sh`.
---

## 2. Волна 1 — Независимые задачи

> Эти задачи не имеют зависимостей друг от друга.
> Можно запустить 3 агентов параллельно.

---

### [Stream W1.A] FlowWizard UI компонент

**Назначение:** Создать React-компонент визарда с кубиками этапов Flow.

1. [DONE] W1.A.1 Создать базовую структуру FlowWizard (scope: `src/client/ui/src/components/flow-wizard/index.tsx`, `src/client/ui/src/components/flow-wizard/flow-stage.tsx`, `src/client/ui/src/components/flow-wizard/styles.ts`; DoD: рендер без ошибок; props `onStageClick`/`activeStage`; 4 этапа) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(ui): add flow wizard component structure` (hash: b61de20)
3. [DONE] W1.A.2 Стилизация FlowWizard (scope: `src/client/ui/src/components/flow-wizard/styles.ts`, `src/client/ui/src/components/flow-wizard/flow-stage.tsx`; DoD: active accent; disabled opacity; hover) (date: 2025-12-29)
4. [DONE] Git Commit: `style(ui): add flow wizard stage styling` (hash: efd5dc6)

---

### [Stream W1.B] JSON Schema для Idea Collector

**Назначение:** Создать Structured Output схему для агента сбора идей.

1. [DONE] W1.B.1 Создать `idea-collector-schema.json` (scope: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`; DoD: Draft-07; `next_action=finalize` требует `artifact`) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): add idea collector json schema` (hash: N/A (global))

---

### [Stream W1.C] Системный промпт Idea Collector

**Назначение:** Инструкция для агента: цель, чек-лист, стиль диалога.

1. [DONE] W1.C.1 Создать `idea-collector-prompt.md` (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: RU; агент начинает сам; ответы валидируются schema; `finalize` только после явного «ОК/утверждаю») (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): add idea collector system prompt` (hash: N/A (global))

---

## 3. Волна 2 — После Волны 1

> Эти задачи требуют результатов из Волны 1.
> Начинать только после полного завершения Волны 1.

---

### [Stream W2.A] Интеграция FlowWizard с ProviderPicker

**Ждёт:** FlowWizard UI компонент готов (Волна 1, Stream W1.A)
**Назначение:** Показывать FlowWizard после выбора Codex.

1. [DONE] W2.A.1 Добавить состояние FlowWizard (scope: `src/client/ui/src/app-host/provider-picker-state.ts`; DoD: `flowWizardVisible`; `openFlowWizard()`; `closeFlowWizard()`) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(ui): add flow wizard state management` (hash: c2f6c1c)
3. [DONE] W2.A.2 Интегрировать FlowWizard в AppHost (scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/provider-picker.tsx`, `src/client/ui/src/app-host/session-region.tsx`; DoD: confirm Codex → FlowWizard; другие провайдеры без изменений; cancel → ProviderPicker; запуск сессии по клику "Idea") (date: 2025-12-29)
4. [DONE] Git Commit: `feat(ui): integrate flow wizard with provider picker` (hash: 2db9709)

---

### [Stream W2.B] Интеграция Idea Collector с Codex SDK

**Ждёт:** Schema + Prompt готовы (Волна 1, Stream W1.B + Stream W1.C)
**Назначение:** Подключить агента к UI через Codex exec.

1. [DONE] W2.B.1a Прокинуть `turnOptions` из UI в core (scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/provider-registry/index.ts`; DoD: `session:message` принимает `turnOptions`, core передаёт их в adapter) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): pass turn options from ui to core` (hash: b33d18d)
3. [DONE] W2.B.1b Прокинуть `turnOptions` до Codex SDK manager (scope: `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`; DoD: adapter принимает options, processor получает их) (date: 2025-12-29)
4. [DONE] Git Commit: `feat(codex): forward turn options to sdk manager` (hash: 0154b62)
5. [DONE] W2.B.1c Поддержать Idea Collector schema/prompt в Codex Structured Output (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/messaging/message-processor.ts` [+ возможно `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`]; DoD: `suggested_response` выводится в SessionView, `artifact` доступен при finalize) (date: 2025-12-29)
6. [DONE] Git Commit: `feat(codex): support idea collector structured output` (hash: 18b4405)
7. [DONE] W2.B.1d Реализовать `IdeaCollectorService` (scope: `src/client/ui/src/services/idea-collector-service.ts` [+ до 2 файлов интеграции]; DoD: `startCollection()`/`continueConversation()`; подставляет schema+prompt; использует текущий SessionView) (date: 2025-12-29)
8. [DONE] Git Commit: `feat(orchestrator): add idea collector service` (hash: dfbae3c)

---

## 4. Волна 3 — После Волны 2

> Финальная интеграция всех компонентов.

---

### [Stream W3.A] Полная интеграция Flow

**Ждёт:** FlowWizard интегрирован + IdeaCollectorService готов (Волна 2, Stream W2.A + Stream W2.B)
**Назначение:** Связать клик на "Idea" с запуском агента.

1. [DONE] W3.A.1 Подключить FlowWizard к IdeaCollectorService (scope: `src/client/ui/src/components/flow-wizard/index.tsx`, `src/client/ui/src/app-host.tsx`; DoD: клик "Idea" вызывает `startCollection()`; диалог в UI; structured output парсится; финализация генерирует `Idea.md`) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): add idea collector service` (hash: dfbae3c; shared with W2.B.1d)

---

## 4.1 Волна 4 — Исправление фильтра Structured Output

> Эти задачи блокируют финальную проверку Idea Collector: `suggested_response` не отображается в UI.

### [Stream W4.A] Прокидка structured output в SessionView

**Назначение:** Извлечь `suggested_response` из structured output и отобразить его как сообщение ассистента.

1. [DONE] W4.A.1 Исправить обработку `suggested_response` в Codex structured output (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`; DoD: `suggested_response` превращается в `assistant` message, UI получает `session:message`) (commit: `fix(codex): surface idea collector suggested_response`) (date: 2025-12-30)
2. [DONE] Git Commit: `fix(codex): surface idea collector suggested_response` (hash: ef5e16e)
3. [DONE] W4.A.2 Добавить UI‑fallback парсинга structured output при чтении сообщений (scope: `src/client/ui/src/core-bridge/normalizers.ts`, `src/client/ui/src/services/idea-collector-service.ts`; DoD: если `content` — JSON с `suggested_response`, в UI показывается текст вопроса) (commit: `fix(ui): render idea collector structured output`) (date: 2025-12-30)
4. [DONE] Git Commit: `fix(ui): render idea collector structured output` (hash: bedfc82)

---

## 4.2 Волна 5 — Усиление Idea Collector + Thinking

> Цель: подготовить Idea.md для Spec.md и вернуть thinking (native + summary) для Codex structured outputs.

### [Stream W5.A] Spec-ready шаблон и контракт Idea Collector

**Назначение:** Сделать Idea.md достаточно конкретным для Spec.md, зафиксировать новые секции и правила.

1. [DONE] W5.A.1 Обновить idea-template.md под Spec.md (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-template.md`; DoD: секции UI/UX, триггеры, сущности, архитектурный контур + чек-лист Spec readiness) (commit: `feat(orchestrator): make idea template spec-ready`) (date: 2025-12-30)
2. [DONE] Git Commit: `feat(orchestrator): make idea template spec-ready` (hash: N/A (global))
3. [DONE] W5.A.2 Обновить prompt Idea Collector (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: явное требование Spec-ready, запрет заглушек, reasoning_summary_ru) (commit: `feat(orchestrator): tighten idea collector prompt`) (date: 2025-12-30)
4. [DONE] Git Commit: `feat(orchestrator): tighten idea collector prompt` (hash: N/A (global))
5. [DONE] W5.A.3 Обновить schema Idea Collector (scope: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`; DoD: новые секции + reasoning_summary_ru + финальные ограничения) (commit: `feat(orchestrator): extend idea collector schema`) (date: 2025-12-30)
6. [DONE] Git Commit: `feat(orchestrator): extend idea collector schema` (hash: N/A (global))

---

### [Stream W5.B] Thinking для Codex structured outputs

**Назначение:** Вернуть thinking summary для кастомных схем и восстановить native thinking поток.

1. [DONE] W5.B.1 Всегда извлекать `reasoning_summary_ru` из structured output (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `doc/SolidWorks-Flow/Stacks/Codex_Thinking_RU_Summary_Structured_Outputs.md`; DoD: summary эмитится как thinking даже для Idea Collector/кастомных схем) (commit: `fix(codex): parse reasoning summary in custom outputs`) (date: 2025-12-30)
2. [DONE] Git Commit: `fix(codex): parse reasoning summary in custom outputs` (hash: c9cea9e)
3. [DONE] W5.B.2 Восстановить native thinking из Codex SDK (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; DoD: SDK reasoning/events пробрасываются в UI как `thinking`) (commit: `fix(codex): surface native reasoning stream`) (date: 2025-12-30)
4. [DONE] Git Commit: `fix(codex): surface native reasoning stream` (hash: be2ee83)

---

## 4.3 Волна 6 — Универсальный контракт интервью + экономия токенов

> Цель: убрать привязку к Flow, сделать интервью адаптивным для любых идей и запретить длинные документы в диалоге.

### [Stream W6.A] Universal Idea Interview Contract

**Назначение:** Универсальный контракт для Idea Collector (app/feature/module) + адаптивные вопросы.

1. [DONE] W6.A.1 Синхронизировать контракт при старте ядра и отказаться от чтения документов агентом (scope: `packages/core/src/...`; DoD: ядро читает шаблоны, формирует контракт и гарантирует его передачу в Structured Output; агенту запрещено опираться на внешние документы) (commit: `feat(core): sync idea contract at startup`) (date: 2025-12-30)
2. [DONE] Git Commit: `feat(core): sync idea contract at startup` (hash: af3c91c)
3. [DONE] W6.A.2 Обновить документ универсального контракта интервью (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Universal_Contract.md`; DoD: универсальные принципы, адаптивный сценарий, обязательные/опциональные секции, критерии Spec-ready) (commit: `docs(orchestrator): define universal idea interview contract`) (date: 2025-12-30)
4. [DONE] Git Commit: `docs(orchestrator): define universal idea interview contract` (hash: 9ae16b7)
5. [DONE] W6.A.3 Универсализировать idea-template (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-template.md`; DoD: убрать привязку к Flow, добавить формулировки для микро‑модулей и фич) (commit: `feat(orchestrator): universalize idea template`) (date: 2025-12-30)
6. [DONE] Git Commit: `feat(orchestrator): universalize idea template` (hash: N/A (global))
7. [DONE] W6.A.4 Универсализировать schema Idea Collector (scope: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`; DoD: совместимость с универсальным шаблоном, поддержка разных типов идеи, поля для адаптации интервью) (commit: `feat(orchestrator): universalize idea collector schema`) (date: 2025-12-30)
8. [DONE] Git Commit: `feat(orchestrator): universalize idea collector schema` (hash: N/A (global))
9. [DONE] W6.A.5 Обновить prompt для адаптивного интервью (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: первые вопросы определяют тип идеи, далее перестройка блока вопросов под контекст) (commit: `feat(orchestrator): make idea collector interview adaptive`) (date: 2025-12-30)
10. [DONE] Git Commit: `feat(orchestrator): make idea collector interview adaptive` (hash: N/A (global))
11. [DONE] W6.A.6 Запретить публикацию длинных документов в диалоге (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: агент пишет только краткую выжимку + путь к файлу, полный текст — только в workspace) (commit: `fix(orchestrator): forbid long docs in dialog`) (date: 2025-12-30)
12. [DONE] Git Commit: `fix(orchestrator): forbid long docs in dialog` (hash: N/A (global))
13. [DONE] W6.A.7 Синхронизировать UI fallback schema и fallback prompt с универсальным контрактом (scope: `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; DoD: fallback schema + prompt соответствуют универсальному контракту) (commit: `fix(ui): sync idea collector fallbacks`) (date: 2025-12-30)
14. [DONE] Git Commit: `fix(ui): sync idea collector fallbacks` (hash: a52c4e0)
15. [DONE] W6.A.8 Переключить IdeaCollectorService на контракт из Core (scope: `src/client/ui/src/services/idea-collector-service.ts`; DoD: prompt/schema берутся из Core API, локальные file:// чтения удалены; fallback остаётся) (commit: `feat(ui): load idea collector contract from core`) (date: 2025-12-30)
16. [DONE] Git Commit: `feat(ui): load idea collector contract from core` (hash: da49866)

---

## 4.3 Волна 7 — Рефакторинг контракта Idea Collector (Spec-first)

> Цель: сделать интервью максимально «живым», а Structured Output использовать как **контракт результата** (handoff для Spec.md), а не как анкету/скрипт вопросов.

### [Stream W7.A] Refactor: Idea Collector Contract v2 (handoff для Spec.md)

**Назначение:** зафиксировать главную цель Idea.md (помочь Spec-агенту), добавить честную оценку готовности, и финализировать так, чтобы в UI/чате показывалась только краткая выжимка + путь, без полного текста Idea.md.

1. [DONE] W7.A.1 Обновить документ контракта v2 (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Universal_Contract.md`; DoD: описаны принципы «контракт результата, не сценарий», критерии Spec-ready/Blockers, правила финализации “файл создан” без публикации полного Idea.md) (commit: `docs(orchestrator): refine idea collector contract v2`) (date: 2025-12-31)
2. [DONE] Git Commit: `docs(orchestrator): refine idea collector contract v2` (hash: 2f16b57)
3. [DONE] W7.A.2 Добавить в контракт поля handoff/готовности (scope: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`; DoD: `readiness.ready_for_spec` + `readiness.blockers[]`; `handoff_for_spec` (assumptions/decisions/open_questions/next_steps) и запрет авто‑“[x] готово”, если есть блокеры) (commit: `feat(orchestrator): add spec handoff fields to idea contract`) (date: 2025-12-31)
4. [DONE] Git Commit: `feat(orchestrator): add spec handoff fields to idea contract` (hash: N/A (global))
5. [DONE] W7.A.3 Обновить prompt Idea Collector под v2 (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: нет фиксированного списка вопросов; 1–3 вопроса за ход; приоритет — закрывать неопределённость для Spec; на finalize — только “Idea.md создан” + выжимка + путь) (commit: `feat(orchestrator): make idea collector interview spec-first`) (date: 2025-12-31)
6. [DONE] Git Commit: `feat(orchestrator): make idea collector interview spec-first` (hash: N/A (global))
7. [DONE] W7.A.4 Убрать hardcoded путь и сохранять Idea.md в workspace (scope: `src/client/ui/src/services/idea-collector-service.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; DoD: путь берём из контракта (outputPath), Core пишет `.codeai-hub/orchestrator/idea.md` в workspace по `sessionId`, а в чате показывается только сообщение “создан файл” без markdown) (commit: `fix(orchestrator): write idea.md to workspace and hide markdown`) (date: 2025-12-31)
8. [DONE] Git Commit: `fix(orchestrator): write idea.md to workspace and hide markdown` (hash: b586084)
9. [DONE] W7.A.5 Синхронизировать UI fallback contract с v2 (scope: `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; DoD: fallback schema/prompt отражают v2 поля и правила финализации) (commit: `fix(ui): sync idea collector v2 fallbacks`) (date: 2025-12-31)
10. [DONE] Git Commit: `fix(ui): sync idea collector v2 fallbacks` (hash: 34946e5)

---

## 4.4 Волна 8 — Flow-local schema source of truth

> Цель: схема Idea Collector должна лежать внутри конкретного Flow (а не в общем каталоге), и Core должен читать её оттуда.

### [Stream W8.A] Перенос schema в flow-структуру

**Назначение:** перенести schema в `flows/full-development-flow/` и обновить Core path + документацию.

1. [DONE] W8.A.1 Перенести schema в Flow и обновить Core path (scope: `~/.codeai-hub/templates/flows/full-development-flow/schemas/idea-collector-schema.json`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; DoD: Core читает schema из flow‑папки, старый путь не используется) (commit: `fix(core): read idea collector schema from flow folder`) (date: 2025-12-31)
2. [DONE] Git Commit: `fix(core): read idea collector schema from flow folder` (hash: b2499e9)
3. [DONE] W8.A.2 Обновить документацию по контракту и архитектуре (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Universal_Contract.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; DoD: зафиксировано, что schema живёт в `flows/full-development-flow/schemas/`) (commit: `docs(orchestrator): align flow-local schema path`) (date: 2025-12-31)
4. [DONE] Git Commit: `docs(orchestrator): align flow-local schema path` (hash: dde3848)

---

## 4.5 Волна 9 — Артефакты по структуре Flow/Stage + Virtual Simulation

> Цель: артефакты Idea пишутся в `.codeai-hub/<flow>/<stage>/`, а Idea Collector создаёт второй документ `virtual-simulation.md`.

### [Stream W9.A] Idea Collector: dual artifacts + flow/stage paths

**Назначение:** добавить Virtual Simulation, перенести пути артефактов в flow/stage структуру и синхронизировать templates/docs.

1. [DONE] W9.A.1 Обновить Core paths и сохранение артефактов (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; DoD: contract возвращает `outputPaths` для Idea + Virtual Simulation в `.codeai-hub/full-development-flow/idea/`, API сохраняет оба файла) (commit: `feat(core): add virtual simulation artifact paths`) (date: 2025-12-31)
2. [DONE] Git Commit: `feat(core): add virtual simulation artifact paths` (hash: c15db20)
3. [DONE] W9.A.2 Обновить UI IdeaCollectorService под два артефакта (scope: `src/client/ui/src/services/idea-collector-service.ts`; DoD: читаем `virtual_simulation_*`, отправляем в API оба markdown, сообщения показывают два пути) (commit: `feat(ui): persist idea virtual simulation artifact`) (date: 2025-12-31)
4. [DONE] Git Commit: `feat(ui): persist idea virtual simulation artifact` (hash: ba822b5)
5. [DONE] W9.A.3 Синхронизировать UI fallback schema + prompt (scope: `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; DoD: schema включает Virtual Simulation, prompt требует второй артефакт, пути обновлены на flow/stage) (commit: `docs(ui): sync idea collector fallback for virtual simulation`) (date: 2025-12-31)
6. [DONE] Git Commit: `docs(ui): sync idea collector fallback for virtual simulation` (hash: dc81247)
7. [DONE] W9.A.4 Обновить global templates под новую структуру и второй артефакт (scope: `~/.codeai-hub/templates/full-development-flow/idea/idea-collector-prompt.md`, `~/.codeai-hub/templates/full-development-flow/idea/idea-template.md`, `~/.codeai-hub/templates/full-development-flow/idea/idea-collector-schema.json`; DoD: prompt/ schema учитывают virtual-simulation.md, файлы лежат в flow/stage папке) (commit: `feat(orchestrator): add virtual simulation artifact to idea contract`) (date: 2025-12-31)
8. [DONE] Git Commit: `feat(orchestrator): add virtual simulation artifact to idea contract` (hash: N/A (global))
9. [DONE] W9.A.5 Обновить документацию контракта и архитектуры (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Universal_Contract.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; DoD: отражены два артефакта и flow/stage пути) (commit: `docs(orchestrator): document virtual simulation artifact`) (date: 2025-12-31)
10. [DONE] Git Commit: `docs(orchestrator): document virtual simulation artifact` (hash: ef252aa)
11. [DONE] W9.A.6 Обновить README/CHANGELOG и пример Plan.md (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/knowledge/Образец Plan.md.md`; DoD: новые пути артефактов и session reports) (commit: `docs: update flow artifact paths`) (date: 2025-12-31)
12. [DONE] Git Commit: `docs: update flow artifact paths` (hash: 410ba58)

---

## 5. Сценарии проверки

### После Волны 1
- [TODO] FlowWizard рендерится изолированно (storybook/dev) (не проверено вручную)
- [TODO] Schema проходит валидацию (не прогоняли после последних правок schema)
- [TODO] Prompt читается корректно (не проверено после замены fallback prompt)

### После Волны 2
- [TODO] New Session → Codex → видим FlowWizard (не проверено, фокус на баге structured output)
- [TODO] New Session → Claude → стандартная сессия (не проверено вручную)
- [TODO] IdeaCollectorService запускает Codex без ошибок (не проверено после W4.A)

### После Волны 3 (Финальная)
- [TODO] Полный flow: New Session → Codex → Idea → диалог → Idea.md (не проверено после W4.A)
- [TODO] Idea.md создаётся в `.codeai-hub/orchestrator/` (не проверено после W4.A)
- [TODO] Structured Output ответы корректно парсятся (не проверено после W4.A)
- [TODO] UI показывает прогресс диалога (не проверено после W4.A)

---

## 6. Отклонения от спецификации

> Заполняется **только если** агент был вынужден отойти от плана.

| Task ID | Причина | Решение | Требует обновления Spec |
|---------|---------|---------|------------------------|
| W2.B.1d | Core-путь записи Idea.md ещё не готов | Временно жёстко задан абсолютный путь `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/.codeai-hub/orchestrator/idea.md` в `IdeaCollectorService` | Да |

---

## 7. Обновляемые документы

- [TODO] `.codeai-hub/orchestrator/idea.md`
- [TODO] `doc/SolidWorks-Flow/knowledge/Автоматизация Flow разработки на основе Plan.md.md`
- [DONE] `doc/Architecture/Architecture.md` (date: 2025-12-30)
- [DONE] `doc/SolidWorks-Flow/System/SystemArchitecture.md` (date: 2025-12-30)
- [DONE] `doc/SolidWorks-Flow/Stacks/Codex_Thinking_RU_Summary_Structured_Outputs.md` (date: 2025-12-30)
- [DONE] `README.md` (date: 2025-12-29)

---

## 8. Завершение сессии

### Сессия 023 (текущая)

**Session ID:** S023
**Статус:** `in_progress`

### Выполнено
- Волна 1: UI+контракты (частично в global templates)
- Commits (repo): `b61de20`, `efd5dc6`, `c2f6c1c`, `2db9709`, `bbf4af3`, `00fcd14`, `94727a2`, `ba4b8c0`, `3a50aa2`, `c9cea9e`, `be2ee83`
- Изменения вне git: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`, `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`

### Следующая сессия

**Продолжить с:** Сценарии проверки (раздел 5)
**Обязательно прочитать:**
- `doc/TODO/todo-plan.md`
- `.codeai-hub/orchestrator/idea.md`
- `src/client/ui/src/provider-picker.tsx`
- `src/client/ui/src/app-host/session-region.tsx`
- `src/client/ui/src/core-bridge/normalizers.ts`
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
- `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`

**Открытые вопросы:**
- Точный формат Session Report (уточняется при отладке)

**Риски:**
- Интеграция с Codex exec может потребовать доработок
- Structured Output всё ещё требует e2e проверки после фикса

---

## 9. Правило продолжения

> При начале новой сессии агент **обязан**:

1. Прочитать этот план
2. Загрузить файлы из раздела "Обязательно прочитать"
3. Найти первую незавершённую задачу в текущей волне
4. Продолжить выполнение
5. При неясностях — задать вопросы пользователю
