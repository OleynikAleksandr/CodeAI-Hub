# Архитектура: Anthropic Claude Haiku 4.5 как translation engine

**Status:** Accepted
**Created:** 2026-04-15
**Updated:** 2026-04-15
**Accepted:** 2026-04-15
**Owner:** Oleksandr + Claude
**Scope:** Добавление движка `anthropic-claude-haiku-4-5` в каталог Translation Engine наряду с Google GTX и Codex-моделями. Перевод выполняется через `@anthropic-ai/claude-agent-sdk` в подписочном режиме по тому же provider-home/auth bootstrap path, который уже используется для обычных Claude turn-ов (Opus / Sonnet / Haiku) в workflow, но с translation-only query profile: отдельный translation slug, custom `systemPrompt`, `tools: []`, `maxTurns: 1`, `persistSession: false`.

**Связанные документы:**
- `Modules/Shared_RuntimeTranslation_Module.md` — SSOT translation package, engine contract, chunk policy.
- `Modules/Localization.md` — каталог видимых engines, language catalog, runtime/bootstrap materializer flow.
- `Modules/Claude.md` — SSOT Claude provider module, provider-home, auth bootstrap, SDK isolation mode.
- `System/SystemArchitecture.md` — инвариант 5 (provider-home + SDK isolation), translation execution-mode invariant.
- `Contracts/UserFacing_Text_Localization_Boundary.md` — правило для UI label source dictionary.

---

## 1. Задача

Подключить в Translation Engine четвёртый движок — **Anthropic Claude Haiku 4.5** (`engineId: "anthropic-claude-haiku-4-5"`, label `Anthropic Claude · Haiku 4.5`), выполняющий перевод через модель `claude-haiku-4-5-20251001`.

Ключевое требование реализации:

- **не вводить отдельный auth flow** для переводчика;
- использовать **тот же subscription/provider-home path**, по которому уже ходят обычные Claude turn-ы в CodeAI Hub;
- при этом переводчик должен оставаться **translation-only one-shot profile**:
  - без tool-layer,
  - без reasoning,
  - без session persistence,
  - без смешивания с обычными workflow Claude sessions.

---

## 2. Причина

**Подписка Anthropic уже оплачена.** Пользователь уже использует Claude provider в основном workflow. Значит Haiku translation должен использовать ту же auth/bootstrap инфраструктуру, а не заводить отдельный runtime-auth контур.

**Haiku 4.5 подходит по latency/quality.** Это быстрый и качественный движок для коротких и средних translation turn-ов.

**Claude SDK уже умеет translation-only profile.** Для этой задачи достаточно:

- передать короткий custom `systemPrompt`,
- отключить tools через `tools: []`,
- отключить persistence через `persistSession: false`,
- зафиксировать one-shot execution через `maxTurns: 1`.

Это позволяет получить аддитивный translation path без отдельной логики логина и без засорения provider-home native session JSONL.

---

## 3. Non-Goals

- Не меняем auth flow обычных Opus/Sonnet/Haiku workflow sessions.
- Не добавляем отдельный Claude API-key path.
- Не тащим Claude-specific runtime внутрь `@codeai-hub/translation`.
- Не создаём в этом scope новый shared package вроде `@codeai-hub/claude-runtime`.
- Не включаем native session persistence для translation turn-ов.
- Не меняем контракт `TranslationEngine`.

---

## 4. Принятые архитектурные решения

### 4.1. Финальная стратегия реализации

Принят **вариант C**:

- `@codeai-hub/translation` остаётся engine-neutral и transport-only;
- Claude-specific translation query path живёт **рядом с Claude provider runtime**, а не внутри shared translation package;
- shared translation consumers получают Claude Haiku через уже существующий hook `engines` / injected `TranslationFacade`, а не через прямую зависимость `translation -> Claude_Module`.

### 4.2. Почему варианты A/B отклонены

- **A) Прямой импорт `Claude_Module` из `packages/translation`** отклонён.
  Причина: это ломает границу shared translation package и приводит к плохой зависимости вокруг уже существующей связки `Claude_Module -> @codeai-hub/translation`.

- **B) Выделение нового shared `@codeai-hub/claude-runtime` в этом scope** отклонено.
  Причина: это утяжеляет packaging/release path, не решает чисто проблему extension-host localization path и в текущем scope не нужно, потому что нам не нужен новый auth/runtime, нам нужен reuse существующего provider path.

### 4.3. Финальный принцип для Claude Haiku translation

Если обычные Claude turn-ы уже работают по подписке Anthropic, то и Haiku translation должен работать **без отдельной авторизации**.

Translation path использует:

- тот же Claude provider-home path `CODEAI_CLAUDE_HOME=~/.codeai-hub/providers/claude/home` (канонически: `~/.codeai-hub/providers/claude/home`);
- тот же auth bootstrap (`SDKInstaller` + `SDKAuthManager`);
- тот же provider-home preflight/bootstrap path, что и стандартный Claude provider.

Отличается только **query profile**.

---

## 5. Recap существующей системы

### 5.1. Shared Translation Engine contract

`packages/translation/src/translation-engine.ts`:

```ts
interface TranslationEngine {
  readonly id: string;
  translate(request: NormalizedTranslationRequest): Promise<TranslationResult>;
}
```

`TranslationFacade` уже умеет принимать кастомный набор `engines`, а значит shared package не обязан знать о каждом provider-specific runtime заранее.

### 5.2. Claude provider runtime path

Сейчас обычные Claude turn-ы используют:

- provider-home: `~/.codeai-hub/providers/claude/home`;
- provider projects: `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/`;
- auth bootstrap через `SDKAuthManager`, который:
  - поднимает provider-home bridge,
  - мигрирует legacy state,
  - проверяет auth,
  - делает provider-home preflight bootstrap.

Это уже рабочий и проверенный path. Новый translation engine должен его переиспользовать, а не дублировать.

### 5.3. Локализационный runtime сейчас создаётся в двух местах

Это важное ограничение текущей архитектуры:

- Core path уже строит `LocalizationFacade` для runtime payload / bootstrap snapshot.
- Extension-host path тоже локально создаёт `LocalizationFacade`.

Для Claude Haiku это критично, потому что extension-host сам по себе не должен создавать отдельный Claude auth/runtime контур. Значит engine-dependent localization materialization для Haiku должна быть приведена к **core-owned execution path**.

### 5.4. Chunking фактическое состояние

На практике chunking уже выключен для реальных путей:

- Core session translation — `category: "reasoning"` → `chunkingMode: "disabled"`.
- Localization materializer — передаёт `chunkingMode: "disabled"` явно.

Следовательно для Haiku engine chunk policy нужен как контрактный registry entry, но на практике будет формальным placeholder, а не активным execution-path behavior.

---

## 6. Архитектура решения

### 6.1. Provider-owned Claude translation service

Новый translation service живёт в Claude provider boundary и переиспользует существующий runtime/auth path.

Логика:

1. Core просит provider-owned Claude translation service выполнить one-shot translation запрос через Haiku.
2. Service использует те же `SDKInstaller` и `SDKAuthManager`, что обычный Claude provider.
3. Перед вызовом query выполняются:
   - `ensureInstalled()`;
   - `ensureSubscriptionAuth()`;
   - `ensureProviderHomeSessionBootstrap(...)`.
4. Затем выполняется отдельный translation-only `query(...)`.
5. Полученный `result` возвращается как обычный `TranslationResult`.

Следствие:

- нет отдельного логина для переводчика;
- нет отдельного нового auth runtime;
- если Claude provider уже готов к работе, Haiku translation получает тот же ready-state.

### 6.2. Translation-only query profile

Финальный query profile для Haiku:

- `env` — из существующего Claude auth/runtime path.
- `pathToClaudeCodeExecutable` — из `SDKInstaller`.
- `cwd` — технический рабочий каталог под translation project slug.
- `projectPath` — `~/.codeai-hub/providers/claude/home/.claude/projects/translation-runtime-haiku`.
- `additionalDirectories: [cwd]`.
- `settingSources: []` — SDK isolation mode.
- `permissionMode: "bypassPermissions"`.
- `allowDangerouslySkipPermissions: true`.
- `includePartialMessages: false`.
- `model: "claude-haiku-4-5-20251001"`.
- `thinking: { type: "disabled" }`.
- `systemPrompt: <translator-instruction>`.
- `tools: []`.
- `maxTurns: 1`.
- `persistSession: false`.

Не передаём:

- `resume`;
- `continue`;
- `outputFormat`;
- `effort`;
- `allowedTools` (не использовать для tool blocking);
- `disallowedTools` (не нужен при `tools: []`).

### 6.3. Где будут писаться native Claude JSONL

Финальное решение:

- translation service использует тот же provider-home path;
- для логического разделения задаётся отдельный slug `translation-runtime-haiku`;
- **но native session persistence выключается через `persistSession: false`**.

Значит translation turn-ы **не создают** native provider session files:

- не пишут `~/.codeai-hub/providers/claude/home/.claude/projects/translation-runtime-haiku/<sessionId>.jsonl`;
- не участвуют в resume/replay Claude workflow sessions;
- не засоряют provider-home session history.

Provider-home при этом остаётся source of truth для:

- auth state,
- bootstrap artifacts,
- preflight readiness.

### 6.4. Translator instruction

Финальное решение: использовать **category-aware instruction builder**, а не один сверхкороткий слепой prompt.

Базовая формулировка:

```text
You are a precise translation engine. Translate the source text from {source} into the language identified by the code {target}. Preserve Markdown structure, file paths, filenames, code identifiers, provider names, model names, product names, URLs, placeholders, and compact canonical technical labels when they are already written exactly. Do not add commentary. Return only the translation.
```

Для structured localization bundle дополнительно добавляется marker rule:

```text
Preserve every marker line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly. Translate only the text between each START and END marker. Do not remove, rename, reorder, or merge markers.
```

Это сильнее и безопаснее исходного draft-варианта, потому что сохраняет защиту для product/provider/model labels и не жертвует семантической стабильностью ради экономии нескольких токенов.

### 6.5. Интеграция с shared translation facade

Shared package не должен знать про Claude runtime, но он должен позволять Core собирать единый engine catalog.

Итоговый подход:

- shared translation package экспортирует/централизует reusable factory для default built-in engines;
- Core добавляет к ним provider-owned `anthropic-claude-haiku-4-5`;
- один и тот же factory path используется и для:
  - live thinking/reasoning translation overlay;
  - localization materialization/runtime payload generation.

### 6.6. Core-owned localization materialization для Haiku

Так как extension-host не должен строить отдельный Claude auth/runtime path, финальное решение для Haiku такое:

- engine-dependent localization materialization и runtime bootstrap resolution идут через **Core-owned path**;
- extension-host больше не должен сам локально выполнять Haiku translation;
- extension-host получает runtime payload / bootstrap snapshot из Core bridge.

Это убирает split-brain, где часть системы знала бы про Haiku engine, а часть нет.

---

## 7. Финальные решения по decision points

### 7.1. Архитектурная стратегия

**Принято:** вариант `C` — provider-owned Claude translation service + shared translation injection.

### 7.2. Engine ID

**Принято:** `anthropic-claude-haiku-4-5`

### 7.3. UI label

**Принято:** `Anthropic Claude · Haiku 4.5`

### 7.4. Model pinning

**Принято:** `claude-haiku-4-5-20251001`

### 7.5. Project slug

**Принято:** `translation-runtime-haiku`

### 7.6. Tools blocking

**Принято:** `tools: []`

Причина: `allowedTools: []` не блокирует tool layer; он только не auto-allow’ит инструменты. Для полного отключения built-in tools нужен `tools: []`.

### 7.7. Session persistence

**Принято:** `persistSession: false`

Причина: translation turn-ы не должны создавать native Claude session JSONL и не должны становиться resumable Claude sessions.

### 7.8. maxTurns

**Принято:** `maxTurns: 1`

### 7.9. Chunk policy

**Принято:** `{ softCharacterLimit: 400, hardCharacterLimit: 600, mode: "auto" }`

Это формальный registry placeholder; фактически текущие live/localization paths идут без chunking.

### 7.10. Auth/bootstrap warmup

**Принято:** использовать существующий provider bootstrap path (`ensureSubscriptionAuth()` + `ensureProviderHomeSessionBootstrap(...)`), без нового отдельного pre-warm механизма в этом scope.

---

## 8. Impact map

### 8.1. Новые файлы

- `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts` — provider-owned translation query service на том же Claude auth/runtime path.
- `packages/Claude_Module/src/translation/claude-haiku-translator-instruction.ts` — category-aware instruction builder.
- `packages/core/src/translation/claude-haiku-translation-engine.ts` — `TranslationEngine`, использующий provider-owned Claude translation service.
- `packages/core/src/translation/core-translation-facade-factory.ts` — единая фабрика translation facade для Core с built-in engines + Haiku engine.

### 8.2. Изменения существующих файлов

- `packages/Claude_Module/src/index.ts` — экспорт translation service.
- `packages/translation/src/*` — экспорт reusable factory/default engine construction path для внешней композиции.
- `packages/translation/src/translation-engine-profile-registry.ts` — chunk profile для `anthropic-claude-haiku-4-5`.
- `packages/core/src/session-translation/session-translation-facade.ts` — переход на core-owned translation facade factory.
- `packages/localization/src/localization-contract.ts` — открыть injection path для custom translation facade / engine-aware factory.
- `packages/localization/src/localization-facade.ts` — поддержать injected translation facade.
- `packages/core/src/remote-bridge/handlers/settings-request-handler.ts` — использовать core-owned localization facade с Haiku support.
- `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts` — читать Core-generated bootstrap snapshot для Haiku-compatible runtime path.
- `src/extension-module/settings/localization-runtime-service.ts` — перестать локально материализовывать Haiku translation path, перейти на Core-backed payload/snapshot.
- `src/extension-module/message-handlers/settings-message-handler.ts` — использовать Core-backed localization runtime path.
- `src/extension-module/home-view-provider.ts` — использовать Core-backed bootstrap snapshot path.
- `src/client/ui/src/components/settings/use-settings-state-support.ts` — `SUPPORTED_LOCALIZATION_ENGINE_IDS`.
- `src/client/ui/src/components/settings/localization-settings-card.tsx` — label resolver case.
- `packages/localization/src/language-catalog.ts` — entry для нового engineId.
- `assets/localization/source/en/ui_labels.json` — canonical English label key для нового engine.

### 8.3. Документация

- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` — зафиксировать provider-owned external engine injection path и новый engine.
- `doc/SolidWorks-WorkFlow/Modules/Localization.md` — описать новый engine и core-owned localization materialization path для Haiku.
- `doc/SolidWorks-WorkFlow/Modules/Claude.md` — зафиксировать translation-only query profile (`tools: []`, `persistSession: false`, translation slug).
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — обновить список engines / инварианты при необходимости.
- `doc/SolidWorks-WorkFlow/Docs_Index.md` — обновить ссылки при необходимости.

### 8.4. Packaging / release impact

Финальное решение **не требует** нового workspace package и **не требует** отдельного release-bundle типа для `claude-runtime`.

Это важно:

- не добавляется новый tarball;
- не меняется схема provider archives;
- не появляется новая dependency `packages/translation -> Claude_Module`.

Изменения остаются в текущих Core / Claude module / localization / UI boundaries.

---

## 9. Follow-up вопросы (не блокируют старт)

1. **Rate limit policy.** Начальная версия опирается на существующий fallback-per-request и на уже имеющийся localization retry loop. Отдельный backoff/retry внутри engine в этот scope не входит.
2. **Diagnostic logging.** Базовый путь — reuse `TranslationReporter` с дополнительными метаданными (`engineId`, `modelId`, `translationSlug`, `provider=claude`).
3. **Future opt-in persistence.** Если когда-нибудь понадобится forensics/debug для translation turn-ов, это должно быть отдельным opt-in scope. Базовый accepted design сохраняет `persistSession: false`.

---

## 10. Phasing suggestion (для todo-plan.md)

Каждый stream должен сохранять правило: подзадача ≤ 3 файлов, за каждой подзадачей отдельный `Git Commit` пункт.

**Phase 1 — Claude translation service**

- Stream 1.1: добавить `claude-haiku-translator-instruction.ts` + `claude-haiku-translation-service.ts`.
- Stream 1.2: экспортировать service из `packages/Claude_Module/src/index.ts` + добавить тесты query options (`tools: []`, `persistSession: false`, `maxTurns: 1`).

**Phase 2 — Shared translation composition**

- Stream 2.1: вынести reusable factory/default engine construction path в `packages/translation`.
- Stream 2.2: добавить `packages/core/src/translation/claude-haiku-translation-engine.ts` + `core-translation-facade-factory.ts`.
- Stream 2.3: перевести `SessionTranslationFacade` на core-owned translation factory.
- Stream 2.4: добавить chunk profile для `anthropic-claude-haiku-4-5`.

**Phase 3 — Localization core-owned path**

- Stream 3.1: открыть injection path в `packages/localization` для custom translation facade.
- Stream 3.2: собрать Core-owned localization facade с Haiku engine и подключить его в `SettingsRequestHandler`.
- Stream 3.3: перевести `localization-bootstrap-http-handler.ts` на тот же Core-owned path.
- Stream 3.4: перевести extension-host `LocalizationRuntimeService` / `SettingsMessageHandler` / `HomeViewProvider` на Core-backed payload/snapshot.

**Phase 4 — UI exposure**

- Stream 4.1: `SUPPORTED_LOCALIZATION_ENGINE_IDS` + `localization-settings-card.tsx` + `ui_labels.json`.
- Stream 4.2: `language-catalog.ts` + связанные тесты / normalization checks.

**Phase 5 — Documentation + validation**

- Stream 5.1: `Shared_RuntimeTranslation_Module.md` + `Localization.md`.
- Stream 5.2: `Claude.md` + `SystemArchitecture.md` / `Docs_Index.md` при необходимости.
- Stream 5.3: manual validation:
  - engine выбирается в Settings;
  - save пересобирает approved bundles через Haiku;
  - live reasoning/thinking overlay использует Haiku;
  - translation turn-ы не создают native Claude session JSONL.

**Phase 6 — Release**

- `build-all.sh`
- `build-release.sh --use-current-version`
- VSIX / tarballs
- session report

---

## 11. Approved implementation decisions before `todo-plan.md`

1. Архитектурная стратегия: **C** — provider-owned Claude translation service, без зависимости `translation -> Claude_Module`.
2. Engine ID: `anthropic-claude-haiku-4-5`.
3. UI label: `Anthropic Claude · Haiku 4.5`.
4. Model ID: `claude-haiku-4-5-20251001`.
5. Translation slug: `translation-runtime-haiku`.
6. Tool isolation: `tools: []`.
7. One-shot limit: `maxTurns: 1`.
8. Session persistence: `persistSession: false`.
9. Chunk policy: `soft 400 / hard 600`.
10. Native Claude translation session JSONL: **не писать на диск**.
11. UI label обязан быть добавлен в approved source dictionary `assets/localization/source/en/ui_labels.json`.
12. `Localization_TranslationEngine_AnthropicHaiku_Architecture.md` может использоваться как `Planning source` для создания `doc/TODO/todo-plan.md`.
