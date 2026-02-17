# Agent Packages Architecture (targets + current reality)

**Status:** ARCHIVED DRAFT (target architecture; not canonical yet)
**Archived:** 2026-02-17
**Owner:** Oleksandr + Codex

Этот документ перенесён в `Archive/`, потому что на текущем этапе (1.1.622) agent-packages ещё не являются каноном для workflow contract’ов. Актуальный source-of-truth по системе: `doc/SolidWorks-Flow/System/SystemArchitecture.md`.

---

## 0) Зачем нужен этот документ

Исторически “агенты” (Description/Reviewer и будущие шаги) рискуют размазываться по слоям Core/PM/UI/Extension/Provider‑modules. Это приводит к:
- сложной навигации при фиксе багов (непонятно «кто владелец контракта»);
- регрессиям (фикс в одном контуре, а UI/рантайм использует другой);
- росту стоимости добавления следующего шага workflow.

Цель: держать **каждого агента** как пакет с чёткими границами и **одним публичным входом (facade)**.

---

## 1) Текущая реальность в коде (as-is)

### 1.1 Workflow contracts / templates сейчас

На текущем этапе FLOW (1.1.622) workflow‑контракты (prompt/template/questionnaire paths) собираются внутри Core:
- `packages/core/src/templates/bundled-templates.ts` (регистрация/резолв шаблонов)
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts` (build*Contract для Description/Virtual Simulation/Diagrams)

UI анкеты/отправки живёт в Project Manager:
- `src/client/project-manager/components/description/*`
- `src/client/project-manager/services/description-questionnaire-service.ts`

### 1.2 Пакеты `packages/agents/*` существуют, но не являются каноном

В репозитории присутствует scaffolding пакетов:
- `packages/agents/idea-collector/`
- `packages/agents/description-agent/`
- `packages/agents/reviewer-agent/`
- `packages/agents/shared/`

Однако на данный момент Core не использует их как единственный источник правды для workflow‑контрактов.

Вывод: **agent packages сейчас — цель/вектор**, а не завершённая миграция.

---

## 2) Target architecture (to-be)

### 2.1 Структура пакета агента

Каждый агент живёт в `packages/agents/<agent>/` и экспортирует **один facade**.

Минимум:
- `packages/agents/<agent>/src/facade.ts` — единственная публичная точка входа
- `assets/` — prompt/template/schema/questionnaire
- `src/contract/*` — сборка contract payload
- `src/parser/*` — парсинг structured output (если используется)
- `src/paths/*` — deterministic paths для артефактов

### 2.2 Интеграция слоёв

После миграции:
- Core обращается к агенту **только** через facade (buildContract/paths/parsers).
- Provider modules (Claude/Codex/Gemini) получают provider‑специфику, но не «знают» про файловые шаблоны агента.
- PM/UI не копируют шаблоны и не держат вторые источники правды — они только отображают и вызывают Core API.

---

## 3) DoD для перевода агента на packages/agents

1. У агента есть facade с контрактом buildContract().
2. Core использует facade как единственный источник prompt/template/questionnaire.
3. Все старые “дубли” удалены или помечены как legacy с guardrail в `scripts/check-architecture.sh`.
4. Документация обновлена:
   - `doc/SolidWorks-Flow/System/SystemArchitecture.md`
   - `doc/SolidWorks-Flow/Architecture/*` (узловые контракты)

---

## 4) Связанные документы

- `doc/SolidWorks-Flow/System/SystemArchitecture.md`
- `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
- `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
