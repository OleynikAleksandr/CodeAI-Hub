# UI And Reasoning Translation Engine Split — Architecture Plan

**Status:** Proposed
**Created:** 2026-04-20
**Owner:** Oleksandr + Codex
**Scope type:** Design intake before implementation

---

## 1. Problem

Текущий контракт использует один общий `translationEngineId` для двух разных контуров:

- persistent UI localization / bootstrap bundles;
- live provider `Thinking / Reasoning` translation overlays.

Это создаёт нежелательную связность:

- деградация provider-backed engine для live reasoning одновременно бьёт по интерфейсной локализации и по runtime overlay path;
- reasoning translation имеет существенно более низкую критичность, чем UI/help/runtime product copy;
- пользователю сейчас нельзя выбрать безопасный и быстрый engine для reasoning, оставив более качественный engine для интерфейса;
- save-path и runtime gates трактуют engine как один общий localization-impacting переключатель, хотя реальный operational risk у UI bundles и live reasoning разный.

Дополнительный продуктовый вывод из текущих ретестов:

- visible `Thinking / Reasoning` — вспомогательная поверхность наблюдаемости, а не канонический user-facing artifact;
- fallback в source English для reasoning приемлем;
- скрытый `Thinking / Reasoning` вообще не должен переводиться и не должен входить в translation queue.

---

## 2. Goal

Разделить выбор translation engine на два независимых продукта/контракта:

1. `UI Translation Engine`
2. `Reasoning Translation Engine`

и изолировать их runtime ownership так, чтобы:

- интерфейсная локализация, help, warnings, status copy, bootstrap payload и product-authored artifacts продолжали жить на отдельном UI engine;
- live visible provider `Thinking / Reasoning` шёл через отдельный reasoning engine;
- reasoning engine можно было безопасно держать на `Google GTX Free` как на рекомендованном low-risk варианте;
- изменение reasoning engine не запускало blocking strict localization sync и не блокировало Project Manager / new session sends;
- скрытый `Thinking / Reasoning` по-прежнему не входил в translation queue.

---

## 3. Product Decisions

### 3.1 Settings UX

В `General Settings` / localization section:

- существующий selector `Translation engine` переименовывается в `UI Translation Engine`;
- рядом добавляется новый selector `Reasoning Translation Engine`.

Начальные значения:

- для новых установок:
  - `UI Translation Engine = Google GTX Free`
  - `Reasoning Translation Engine = Google GTX Free`
- для существующих установок при миграции:
  - legacy `general.localization.engineId` становится `general.localization.uiEngineId`;
  - новый `general.localization.reasoningEngineId` инициализируется в `google-gtx`.

### 3.2 Helper copy under Reasoning selector

Под selector `Reasoning Translation Engine` добавляется helper/warning copy в деликатной форме.

Целевой смысл:

- `Google GTX Free` остаётся рекомендуемым дефолтом для стабильного live reasoning;
- provider-backed engines могут дать лучший смысловой перевод, но под высокой параллельной нагрузкой увеличивают runtime cost/latency и могут привести к fallback reasoning в source English.

Целевой user-facing copy draft:

- label: `Reasoning Translation Engine`
- helper text:
  `Choose the engine used for visible Thinking and Reasoning bubbles. Google GTX Free is recommended for the most stable live translation.`
- warning text:
  `Provider-backed engines can improve reasoning translation quality, but under higher parallel activity they may increase runtime load and cause visible reasoning to fall back to source English.`

Эти строки должны быть локализованы через approved dictionaries и иметь явную ownership classification.

### 3.3 Visibility contract

Сохраняется текущий invariant:

- если для провайдера `Thinking in dialog` / `Reasoning in dialog` выключен, hidden messages:
  - не показываются;
  - не переводятся;
  - не должны попадать в Core overlay translation queue.

### 3.4 Language ownership

`Reasoning Translation Engine` выбирает только engine.

Target language для visible reasoning:

- остаётся тем же, что и у `Messages for the User`.

То есть scope split только по engine, а не по language selection.

---

## 4. New Ownership Marker

Текущий boundary имеет 4 user-facing product categories:

1. `UI Labels`
2. `UI Helper Text`
3. `Messages for the User`
4. `Artifacts for the User`

Для этого scope вводится дополнительный explicit runtime marker:

5. `Reasoning`

Важно:

- `Reasoning` не заменяет четыре существующие UI/product categories;
- `Reasoning` относится только к visible runtime provider `Thinking / Reasoning` overlays;
- `Reasoning` не является bundled dictionary category для интерфейсной локализации;
- `Reasoning` не участвует в browser bootstrap bundle materialization;
- `Reasoning` использует language ownership от `Messages for the User`, но отдельный engine ownership через `reasoningEngineId`.

Новая обязательная authoring rule для scope:

- весь новый текст, который будет добавлен в интерфейсы в рамках этого refactor, должен быть явно промаркирован по одной из категорий:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
  - `Reasoning`

Automatic guessing по-прежнему запрещён.

Практическая норма для этого scope:

- labels/selectors/buttons/settings card titles -> `UI Labels`;
- explanatory paragraphs / helper copy under selectors -> `UI Helper Text`;
- live visible provider thought bubbles -> `Reasoning`;
- user-facing warnings/status/errors outside thought bubbles -> `Messages for the User`;
- workflow-produced forms/templates/artifact shells -> `Artifacts for the User`.

---

## 5. Architecture Changes

### 5.1 Settings contract split

Текущий persisted shape:

- `general.localization.engineId`

Новый shape:

- `general.localization.uiEngineId`
- `general.localization.reasoningEngineId`

Compatibility contract:

- read-path поддерживает legacy `engineId`;
- migration-path materializes:
  - `uiEngineId = legacy engineId`
  - `reasoningEngineId = "google-gtx"`
- write-path больше не сохраняет legacy-only `engineId` как источник правды.

### 5.2 Localization runtime settings

Persistent UI localization / bootstrap path использует:

- `uiEngineId`

Core live reasoning overlay path использует:

- `reasoningEngineId`

Browser bootstrap snapshot и selective sync planner остаются привязаны к UI localization path:

- bootstrap/cache hash зависит от `uiEngineId`, category languages и glossary policy;
- `reasoningEngineId` не должен инвалидировать UI bundles и не должен требовать strict rebuild of runtime payload.

### 5.3 Save-impact classification

Текущий classifier считает engine change localization-impacting и запускает strict sync.

Новый contract:

- `uiEngineId` change -> strict localization impact
- `reasoningEngineId` change -> runtime-only / non-blocking impact

Следствие:

- изменение reasoning engine не блокирует Settings save;
- не запускает strict bundle rematerialization;
- не ставит busy overlay для PM/new session sends;
- начинает влиять только на будущие reasoning translation dispatches.

### 5.4 Runtime translation routing

Current:

- live reasoning overlays read the same persisted engine that UI localization uses.

Target:

- `LocalizationFacade` / browser bootstrap / bundle materialization -> `uiEngineId`
- `SessionTranslationPolicyResolver` / Core live reasoning overlay -> `reasoningEngineId`
- provider-local runtime translation adapters, которые переводят только visible live provider thought/progress copy, должны читать `reasoningEngineId`, а не UI engine.

### 5.5 Availability gating

Оба selector'а используют тот же provider availability gating principle:

- `google-gtx` всегда доступен;
- provider-backed engines отображаются как unavailable при disconnected/degraded backing provider.

Но operational copy у reasoning selector должна явно подсказывать, что `Google GTX` является recommended stability baseline.

---

## 6. Affected Boundaries

### 6.1 SSOT / docs

- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

### 6.2 Core / extension settings path

- settings read/write normalization
- localization save impact classifier
- runtime settings snapshot resolution
- applied turn config metadata if it still carries translation-engine fields
- session translation policy resolution

### 6.3 Browser settings UI

- settings state model / raw snapshot normalization
- settings mutation handlers
- localization settings card
- localized source dictionaries for new labels/helper copy/warning copy

### 6.4 Translation consumers

- UI/bootstrap/localization materializer path
- Core reasoning overlay path
- remaining provider-local live translation adapters for visible thought/progress text

---

## 7. Non-Goals

- Не вводить отдельный language selector для reasoning.
- Не менять fallback contract reasoning translation: source English остаётся допустимым fallback.
- Не переводить hidden thinking.
- Не делать retrospective retranslation старой session history.
- Не менять transport implementation самих translation engines в этом scope.

---

## 8. Risks

1. Legacy settings drift:
   если migration будет неполной, часть runtime paths может продолжить читать legacy `engineId`.

2. Partial split:
   если Core overlay path переключится на `reasoningEngineId`, а provider-local live adapters останутся на `uiEngineId`, появится split truth внутри runtime reasoning UX.

3. Wrong save-impact semantics:
   если `reasoningEngineId` ошибочно останется localization-impacting, Settings save будет unnecessarily blocking.

4. Wrong text ownership:
   если новые settings strings и warning copy не будут размечены по категориям, localization regressions вернутся.

5. Boundary confusion:
   если `Reasoning` начнут трактовать как обычную bundled dictionary category, это смешает runtime overlays с persistent UI localization.

---

## 9. Verification Strategy

### 9.1 Contract / migration

- legacy settings with only `engineId` migrate to:
  - `uiEngineId = legacy value`
  - `reasoningEngineId = google-gtx`
- fresh defaults produce `google-gtx` for both selectors.

### 9.2 Save path

- changing `UI Translation Engine` triggers strict localization sync when needed;
- changing `Reasoning Translation Engine` does not block PM/new session sends and does not rebuild browser bootstrap bundles.

### 9.3 Runtime behavior

- visible reasoning uses `reasoningEngineId`;
- hidden reasoning never enters translation queue;
- changing `Reasoning Translation Engine` affects only future reasoning messages;
- changing `UI Translation Engine` does not silently rewrite already persisted reasoning overlays.

### 9.4 UI copy ownership

- all new settings labels/helper/warning strings are added to approved English dictionaries;
- each new string has explicit category ownership;
- new `Reasoning` runtime marker is reflected in updated boundary docs.

### 9.5 Release verification

Targeted checks for implementation cycle:

- settings model / UI tests
- core session-translation tests
- localization save-impact tests
- `npm run build --workspace=@codeai-hub/core`
- `npm run build --workspace=@codeai-hub/localization`
- `npm run build:webview`
- `npm run typecheck:webview`
- final release pipeline:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

---

## 10. Implementation Slicing

Execution planning should follow these slices:

1. settings contract + migration
2. save-impact classifier split
3. Core/runtime reasoning engine routing
4. provider-local live translation routing audit
5. settings UI + localized copy
6. docs/SSOT synchronization
7. release preparation and final build pipeline

This document is the approved planning source for the next active `doc/TODO/todo-plan.md`.
