# SolidWorks Flow — Rebuild Propagation (Architecture)

**Status:** Draft
**Updated:** 2026-02-03
**Owner:** Oleksandr + Codex

---

## 1) Problem

В SolidWorks‑подобном Workflow Tree узлы связаны зависимостями: downstream узлы опираются на результаты upstream узлов (артефакты/диаграммы/спеки/код).

Когда пользователь возвращается “наверх” и изменяет исходный документ/диаграмму/модуль, все узлы ниже могут стать **устаревшими** (OUTDATED) и должны быть обновлены.

Нужно обеспечить:
- автоматическое определение того, какие узлы стали устаревшими;
- понятный UX (что устарело, почему, что надо сделать);
- (опционально) автоматический rebuild узлов ниже;
- корректную интеграцию с **бесконечными сессиями** узлов (Session Continuity): не “впрыскивать” тонны текста в контекст, а безопасно и минимально обновлять.

---

## 2) Goals

1. **Deterministic propagation:** изменение канонического артефакта upstream помечает все зависимые узлы как `OUTDATED`.
2. **Minimal context transfer:** обновления передаются вниз не копированием контента, а ссылками на канонические артефакты (пути) и короткой инструкцией “перечитать”.
3. **Core as orchestrator/watcher:** Core не переписывает доменные артефакты (docs/code) и не пишет continuity‑отчёты; он:
   - отслеживает изменения артефактов (watch/events),
   - вычисляет impacted узлы,
   - запускает rebuild‑процессы (агентные сессии) по политике.
4. **Session‑safe:** если у downstream узла уже открыта активная сессия, мы не подмешиваем “новые данные” в текущий контекст; вместо этого инициируем безопасный refresh через Continuity.

---

## 3) Non‑Goals

- Не делаем “магическое” обновление всех узлов без участия агентов.
- Не переносим полные тексты upstream документов вниз как контекст.
- Не реализуем в этой фазе полноценную систему тестов/симуляций (это отдельный слой после rebuild).

---

## 4) Terms

- **Artifact Slot:** семантический ключ результата шага (например: `workspace.final_description`, `diagram.modules`, `module.<slug>.spec`).
- **Canonical Artifact:** единственный “current” файл для слота (source‑of‑truth для downstream).
- **Dependency Graph:** граф, где узлы потребляют слоты и производят слоты.
- **OUTDATED:** состояние узла, означающее “входы изменились, выходы могут быть невалидны”.
- **Rebuild:** процесс обновления узла так, чтобы его outputs снова соответствовали текущим inputs.

---

## 5) Key Decisions

### 5.1 Пропагация строится по слотам, а не по “файлам вообще”
Мы отслеживаем только канонические слоты (source‑of‑truth). Любые промежуточные файлы/черновики не запускают propagation.

### 5.2 Пропагация не “вливает” данные в контекст
Downstream агент получает только:
- список слотов/артефактов, которые обновились (пути);
- короткую инструкцию, что перечитать;
- целевой контракт outputs его узла.

### 5.3 Интеграция с Infinite Session
Если узел ниже активен:
- Core отмечает его как `OUTDATED(upstreamChanged)`;
- по политике может инициировать **Continuity Refresh**:
  - попросить агента сформировать continuity‑отчёт;
  - открыть новый provider segment;
  - первым действием нового segment попросить прочитать upstream обновления и продолжить;
  - держать input locked до первого bootstrap assistant answer нового segment (не unlock по одному `turn_completed` старого segment).

---

## 6) Data Model (conceptual)

### 6.1 Node Definition
Каждый узел дерева описывается как:
- `nodeId`
- `kind`: `doc` | `code`
- `roles[]` (какие агентные роли существуют в узле)
- `inputs[]`: список Artifact Slots, которые узел читает
- `outputs[]`: список Artifact Slots, которые узел производит

### 6.2 Slot Registry
Для каждого `Artifact Slot` определяем:
- `slotId`
- `canonicalPath` (где лежит текущий файл)

### 6.3 Node State
Минимальный runtime‑state, который нужен UI:
- `fresh | outdated`
- `outdatedReason` (например `upstreamChanged`)
- `changedInputs[]` (какие слоты поменялись)

Примечание: persistence node‑state может быть вынесен в существующий workflow state snapshot или вычисляться при старте через скан артефактов.

---

## 7) Flow

### 7.1 Upstream change → Propagation
1. В узле X обновился канонический артефакт слота `S`.
2. Core фиксирует событие “slot S updated”.
3. Core по Dependency Graph находит все узлы, которые имеют `S` в `inputs[]` (прямые потребители) и далее их downstream зависимых.
4. Все найденные узлы помечаются `OUTDATED`, с `changedInputs` включая `S` (и/или агрегированно по пути).

### 7.2 OUTDATED → Rebuild (policy)
Возможные политики (настраиваемые):
- **Suggest only (MVP‑safe):** Core только помечает узлы и показывает в UI кнопку `Rebuild`.
- **Auto rebuild (advanced):** Core сам планирует rebuild узлов ниже в фоне (с лимитами/очередью).

### 7.3 Rebuild execution (agent‑driven)
При запуске rebuild для узла Y:
- Core стартует сессию/segment нужной роли агента.
- В стартовом сообщении:
  - перечисляет изменившиеся input slots (пути к каноническим артефактам);
  - указывает outputs, которые должны быть обновлены;
  - задаёт ограничения (не копировать большие документы, писать артефакты на диск как канонические outputs узла).

После обновления outputs узла Y его слоты считаются “updated”, что может запустить propagation дальше.

---

## 8) UI/UX

### 8.1 Визуализация устаревания
- Узлы со статусом `OUTDATED` получают явный маркер (иконка/цвет).
- При выборе узла показываем:
  - “Почему устарел” (какой upstream слот поменялся);
  - “Что делать” (Rebuild).

### 8.2 Активная сессия в устаревшем узле
Если пользователь сейчас в узле, который стал `OUTDATED`:
- показываем небольшой баннер “Upstream обновился — этот шаг устарел”.
- действие: `Refresh session` (через Continuity) или `Rebuild now`.

---

## 9) Failure Modes / Safety

- **Дребезг (частые изменения):** debounce событий по слоту (например 500–1500ms).
- **Циклы:** граф зависимостей должен быть ацикличным (или иметь защиту от циклов).
- **Шум:** propagation запускаем только по каноническим слотам (source‑of‑truth).

---

## 10) Related docs

- `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`
- `doc/SolidWorks-Flow/SessionContinuity/ContinuityReport_Contracts.md`
- `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
