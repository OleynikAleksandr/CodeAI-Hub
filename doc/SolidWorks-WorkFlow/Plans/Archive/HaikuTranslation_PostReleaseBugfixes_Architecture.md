# Архитектура: Post-release bugfixes для Claude Haiku translation

**Status:** Archived
**Created:** 2026-04-15
**Updated:** 2026-04-15
**Accepted:** 2026-04-15
**Owner:** Oleksandr + Claude
**Scope:** Исправление post-release багов релиза `1.1.986` вокруг `anthropic-claude-haiku-4-5`: silent fallback на `google-gtx` в live reasoning translation, неверный localization runtime path для core-only engine, сохранение английского source/fallback content внутри `ru` helper/message bundles, а также пересмотр persistence-policy для native Claude JSONL в translation slug.
**Archive note:** Решения этого planning-дока реализованы и зафиксированы в release `1.1.987`; канонический итоговый SSOT перенесён в `Modules/Claude.md`, `Modules/Localization.md`, `Modules/Shared_RuntimeTranslation_Module.md`, `System/SystemArchitecture.md`.

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_TranslationEngine_AnthropicHaiku_Architecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`

---

## 1. Проблема

Релиз `1.1.986` формально добавил новый translation engine `anthropic-claude-haiku-4-5`, но в реальном пользовательском тесте возникли две разные группы регрессий:

1. **Live reasoning translation не шёл через Haiku.**
   В логах Core запросы стартовали с `engineId = anthropic-claude-haiku-4-5`, но завершались с `resolvedEngineId = google-gtx`.

2. **UI helper / help / user-facing message copy не была локализована корректно.**
   При `UI Labels = English` и `UI Helper Text / Messages for the User / Artifacts for the User = Russian` пользователь получил:
   - ожидаемо английские короткие labels;
   - но также и неожиданно английские helper/help тексты;
   - а часть `ru` bundles была сохранена с фактически английским source/fallback content.

Это означает, что релиз `1.1.986` не соответствует принятому design-intent предыдущего planning-дока.

---

## 2. Подтверждённые факты

### 2.1. UI Labels и helper/help — это разные категории

`UI Labels` не владеют help/body copy. Это подтверждено кодом:

- labels карточек настроек идут из `ui_interface`;
- descriptions карточек идут из `user_guidance`;
- intro/helper copy секции Localization тоже идёт из `user_guidance`;
- literal `Help` label действительно живёт в `ui_labels`;
- `Description Help` / `Virtual Simulation Help` живут в helper/message dictionaries, а не в `ui_labels`.

Следовательно поведение "labels английские, а help/helper русский" является корректным и ожидаемым режимом.

### 2.2. Live reasoning translation реально шёл не через Haiku

В `~/.codeai-hub/logs/core/core.log` для workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` зафиксировано:

- dispatch started с `engineId = anthropic-claude-haiku-4-5`;
- completed с `resolvedEngineId = google-gtx`.

Это повторялось по всей reasoning translation сессии. Значит пользователь видел не результат Haiku, а fallback на Google GTX.

### 2.3. Localization runtime snapshot был собран с неверным содержимым

В `browser-runtime-bootstrap.json` видно:

- `activeEngineId = anthropic-claude-haiku-4-5`;
- `user_guidance`, `system_feedback`, `interactive_templates` имеют `language = ru` и `source = materialized`;
- `ui_interface` и `workflow_terms` имеют `language = en` и `source = source_fallback`.

Это само по себе корректно для случая `UI Labels = English`.

Но проблема в том, что часть `ru` bundles содержит английский текст:

- `user_guidance/ru.json`
- `system_feedback/ru.json`

при том что `interactive_templates/ru.json` действительно переведён на русский.

### 2.4. Предыдущий planning-док предполагал работу без native JSONL

Архивный planning-док явно фиксировал `persistSession: false` и чтение translation result напрямую из `query()` stream, а не из native provider JSONL.

Следовательно само отсутствие native JSONL не доказывает баг. Но после пользовательского теста принято изменить эту policy ради forensics/debug traceability.

---

## 3. Root cause analysis

### 3.1. Silent fallback на `google-gtx`

Core translation factory добавляет Haiku engine только если ей явно передан `claudeHaikuTranslationService`.

Сейчас runtime-path создаёт `SessionTranslationFacade` без этой зависимости. В итоге registry не находит `anthropic-claude-haiku-4-5` и молча падает на default engine `google-gtx`.

Это не допустимая деградация:

- пользователь выбрал конкретный engine;
- runtime подменил его другим без явного отказа;
- лог по факту фиксирует рассинхрон между requested и resolved engine.

### 3.2. Localization path остался split-brain

Для core-only engine `anthropic-claude-haiku-4-5` extension-side `LocalizationRuntimeService.synchronizeRuntimePayload()` сейчас не идёт в Core strict materialization path, а деградирует в локальный `resolveRuntimePayload()`.

Это ломает базовый принцип из предыдущего accepted design:

- extension-host не должен локально материализовывать Haiku translation path;
- engine-dependent localization для Haiku должна идти через Core-owned path.

### 3.3. Localization strictness деградировала до best-effort

`resolveRuntimePayload()` допускает `source_fallback` и не валит build runtime snapshot при fallback content.

Для core-only engine это приводит к опасной ситуации:

- Settings Save внешне считается успешным;
- runtime snapshot сохраняется;
- `ru` bundles могут содержать английский текст;
- пользователь получает смешанный интерфейс без явного сигнала, что strict localization не состоялась.

### 3.4. Persistence policy больше не соответствует debugging needs

`persistSession: false` был исходно принят как cleanliness / no-history policy. После реального post-release расследования пользователь явно требует provider-native translation trace.

Для этого translation slug должен писать native Claude JSONL в isolated provider project path.

Это не первопричина багов релиза `1.1.986`, но это новое принятое решение для repair scope.

---

## 4. Принятые архитектурные решения

### 4.1. Strategy C сохраняется

Базовая стратегия не меняется:

- `@codeai-hub/translation` остаётся engine-neutral;
- Claude-specific query path остаётся рядом с Claude provider runtime;
- dependency `translation -> Claude_Module` по-прежнему запрещена.

### 4.2. Haiku engine должен быть runtime-wired, а не optional-by-accident

Во всех production Core paths, где выбран `anthropic-claude-haiku-4-5`, provider-owned Claude translation service обязан быть реально injected.

Минимум это включает:

- live session/reasoning translation path;
- localization materialization/runtime snapshot path;
- bootstrap snapshot HTTP path.

### 4.3. Silent cross-engine fallback запрещён

Если пользователь явно выбрал `anthropic-claude-haiku-4-5`, runtime не имеет права тихо подменять его на `google-gtx`.

Принято:

- live translation path при недоступности Haiku должен возвращать controlled non-translated/fallback result с явным error signal;
- localization strict sync для Haiku должен fail-fast, а не сохранять частично английские bundles под видом `ru`.

### 4.4. Core-only localization engines должны идти только через Core strict path

Для `anthropic-claude-haiku-4-5` extension-host не должен:

- локально materialize bundles;
- локально собирать runtime payload как источник истины;
- quietly downgrade strict save в best-effort `resolveRuntimePayload()`.

Extension-side путь должен получать Core-produced snapshot/payload и показывать явную ошибку, если strict Core sync не состоялся.

### 4.5. Persistence policy меняется

Предыдущее решение `persistSession: false` отменяется для post-release fix scope.

Принято:

- translation slug `translation-runtime-haiku` сохраняется;
- native Claude translation sessions теперь **пишутся** в provider-home project path;
- это даёт audit/debug trace через provider-native JSONL;
- translation slug по-прежнему изолирован от обычных workspace Claude sessions.

### 4.6. Diagnostics должны показывать истинный execution path

Нужно явно логировать:

- requested engine;
- resolved engine;
- model id;
- provider id;
- translation slug;
- persistence mode;
- runtime path (`provider-owned` vs `fallback/default`).

После фикса лог обязан позволять без косвенных выводов понять, был ли реально использован Haiku.

---

## 5. Ожидаемое target behavior после фикса

1. При выборе `anthropic-claude-haiku-4-5` reasoning translation реально идёт через Haiku, а не через `google-gtx`.
2. При `UI Labels = English`, `UI Helper Text = Russian`, `Messages for the User = Russian`, `Artifacts for the User = Russian`:
   - labels остаются английскими;
   - helper/help/messages/artifacts переводятся на русский.
3. Save Settings для Haiku не считается успешным, если strict localization path дал fallback/partial fallback или не смог использовать Haiku runtime.
4. Native Claude translation JSONL появляются под isolated slug `translation-runtime-haiku`.
5. Логи прямо показывают, какой engine реально выполнил перевод.

---

## 6. Impact map

### 6.1. Код

- `packages/core/src/translation/core-translation-facade-factory.ts`
- `packages/core/src/translation/core-localization-facade-factory.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`
- `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
- `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`
- `src/extension-module/settings/localization-runtime-service.ts`
- `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts`
- `packages/core/src/session-translation/session-translation-facade.ts`

### 6.2. Тесты

- `packages/core/src/translation/core-translation-facade-factory.test.ts`
- `packages/core/src/session-translation/session-translation-facade.test.ts`
- `packages/localization/src/localization-materializer.test.ts`
- новые targeted tests для strict save / core-only localization path / persistence mode

### 6.3. SSOT

- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md` (при необходимости)

---

## 7. Phasing suggestion (для нового todo-plan.md)

**Phase 1 — Runtime wiring fix**

- Подключить provider-owned Haiku service в Core translation facade / session translation runtime.
- Запретить silent fallback на `google-gtx` для explicit Haiku engine.

**Phase 2 — Localization path fix**

- Подключить provider-owned Haiku service в Core localization facade.
- Убрать extension-side downgrade для core-only localization engine.
- Восстановить strict save semantics для Haiku.

**Phase 3 — Persistence and diagnostics**

- Перевести Haiku translation service на native JSONL persistence в isolated slug.
- Усилить diagnostics/logging для requested/resolved engine path.

**Phase 4 — SSOT sync**

- Обновить SSOT под новый persistence policy и fail-fast contract.

**Phase 5 — Release**

- Обновить `README.md` / `CHANGELOG.md`.
- Собрать новый релиз для ручного retest.

---

## 8. Approved implementation decisions before `todo-plan.md`

1. Strategy C сохраняется.
2. `anthropic-claude-haiku-4-5` остаётся финальным `engineId`.
3. Silent fallback на другой engine запрещён.
4. Для Haiku localization save обязан быть strict/fail-fast.
5. Extension-host не materialize-ит Haiku локально.
6. `translation-runtime-haiku` сохраняется как isolated project slug.
7. `persistSession: false` отменяется; translation turns должны писать native Claude JSONL.
8. Новый scope должен завершиться новым release build для пользовательского retest.
