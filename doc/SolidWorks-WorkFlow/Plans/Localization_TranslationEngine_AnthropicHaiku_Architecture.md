# Архитектура: Anthropic Claude Haiku 4.5 как translation engine

**Status:** Draft
**Created:** 2026-04-15
**Owner:** Oleksandr + Claude
**Scope:** Добавление движка `anthropic-claude-haiku-4-5` в каталог Translation Engine наряду с Google GTX и Codex-моделями. Вызов модели `claude-haiku-4-5-20251001` через `@anthropic-ai/claude-agent-sdk` в подписочном режиме с полной заменой дефолтного Claude Code system preset на минимальный translator-промпт.

**Связанные документы:**
- `Modules/Shared_RuntimeTranslation_Module.md` — SSOT translation package, engine contract, chunk policy.
- `Modules/Localization.md` — каталог видимых engines, language catalog, materializer flow.
- `Modules/Claude.md` — SSOT Claude provider module, subscription auth, provider-home.
- `System/SystemArchitecture.md` — инвариант 5 (SDK isolation), список engines в §4.

---

## 1. Задача

Подключить в Translation Engine четвёртый движок — **Anthropic Claude Haiku 4.5** (`engineId: "anthropic-claude-haiku-4-5"`, label «Anthropic Claude · Haiku 4.5»), выполняющий перевод через модель `claude-haiku-4-5-20251001`. Вызов идёт через тот же `@anthropic-ai/claude-agent-sdk`, который уже используется для основных Opus/Sonnet turn-ов в workflow, через ту же подписочную OAuth аутентификацию и тот же provider-home (`~/.codeai-hub/providers/claude/home/`), но с принципиальным отличием: **дефолтный Claude Code system preset отключается через передачу своей короткой translator-инструкции строкой в `systemPrompt`**. Engine реализует существующий интерфейс `TranslationEngine` и становится выбираемым из UI Settings наравне с Google GTX / Codex Mini / Codex Spark.

## 2. Причина

**Подписка Anthropic уже оплачена.** Пользователь работает по подписке, Opus/Sonnet используются для основных агентских сессий. Запросы Haiku в рамках той же подписки не тарифицируются отдельно — это бесплатная translation-мощность, не нагружающая отдельные бюджеты.

**Haiku 4.5 быстрая и качественная.** Самая свежая low-latency модель Anthropic. Качество перевода выше, чем у коммодити-моделей; задержки существенно ниже, чем у Opus/Sonnet.

**Auth-инфраструктура уже развёрнута.** Claude_Module держит OAuth token, keychain-fallback, SDK installer, isolated provider-home. Добавление ещё одного потребителя SDK — аддитивное изменение.

**Agent SDK умеет заменять системный промпт целиком.** Тип `systemPrompt` в SDK поддерживает строку как полную замену дефолтного `claude_code` preset (килобайты описания tools/cwd/git/memory). Translator обходится 3-5 строками инструкции → экономия input-токенов ≈ 95% на каждом запросе, меньше latency, меньше usage-счётчика подписки.

## 3. Non-Goals

- Не меняем auth-поток основных Opus/Sonnet сессий.
- Не добавляем Opus/Sonnet как translation engines (избыточно для переводов, дороже по usage).
- Не вводим новый SDK package и не меняем версию установленного `@anthropic-ai/claude-agent-sdk`.
- Не меняем контракт `TranslationEngine` и поведение существующих engines (Google GTX / Codex Mini / Codex Spark).
- Не добавляем API-key fallback — только подписочная OAuth аутентификация.

---

## 4. Recap существующей системы

### 4.1. Translation Engine contract

[packages/translation/src/translation-engine.ts](packages/translation/src/translation-engine.ts):

```ts
interface TranslationEngine {
  readonly id: string;
  translate(request: NormalizedTranslationRequest): Promise<TranslationResult>;
}
```

`TranslationResult` обязан нести `engine`, `originalText`, `translatedText`, `finalText`, `sourceLanguage`, `targetLanguage`, `status` (`translated` / `fallback` / `skipped`), опционально `errorCode`. На любой ошибке engine возвращает fallback (`translatedText: null`, `finalText: originalText`).

Регистрация — [translation-facade.ts:16-30](packages/translation/src/translation-facade.ts) `createDefaultTranslationEngines()`. Chunk policy — [translation-engine-profile-registry.ts](packages/translation/src/translation-engine-profile-registry.ts). UI каталог — [use-settings-state-support.ts:107-111](src/client/ui/src/components/settings/use-settings-state-support.ts) + label resolver в [localization-settings-card.tsx:107-133](src/client/ui/src/components/settings/localization-settings-card.tsx).

### 4.2. Claude Agent SDK подписочный поток

- **Загрузка:** [sdk-installer.ts:80-85](packages/Claude_Module/src/installer/sdk-installer.ts) динамически импортирует `sdk.mjs` из `~/.npm-global/lib/node_modules/@anthropic-ai/claude-agent-sdk/`.
- **Provider-home:** [claude-provider-home.ts](packages/Claude_Module/src/sdk/claude-provider-home.ts) резолвит `~/.codeai-hub/providers/claude/home/.claude/`, включая `projects/<slug>/`, `.credentials.json`, symlink на `~/Library/Keychains`.
- **Auth:** [claude-auth-runtime.ts:103-131](packages/Claude_Module/src/auth/claude-auth-runtime.ts) собирает env с `HOME=<provider-home>`, `CLAUDE_USE_CLI_AUTH=true`, `CLAUDE_SUBSCRIPTION_MODE=true`; `ANTHROPIC_API_KEY` и `CLAUDECODE` удаляются. Token — по цепочке env → provider-home credentials → legacy `~/.claude` → Keychain/secret-tool/PowerShell.
- **Query:** [claude-sdk-manager.ts:249-294](packages/Claude_Module/src/sdk/claude-sdk-manager.ts) `buildQueryOptions()` собирает опции (`cwd`, `projectPath`, `settingSources: []`, `permissionMode: "bypassPermissions"`, `env`, `pathToClaudeCodeExecutable`, опциональные `model` / `thinking` / `effort` / `resume` / `outputFormat`). Поле `systemPrompt` **не передаётся** — идёт дефолтный Claude Code preset.
- **Result extraction:** `query()` возвращает `AsyncIterable<SDKMessage>`; финальный текст — в `msg.type === "result"` / `subtype === "success"` → `msg.result: string`.
- **SDK type `systemPrompt`** (из `sdk.d.ts:1434-1480`): `string | { type: 'preset', preset: 'claude_code', append?, excludeDynamicSections? }`. **Строка полностью заменяет дефолтный preset.**

### 4.3. Chunking фактическое состояние

На практике чанкинг выключен для всех реальных путей:
- Core session translation — всегда `category: "reasoning"` → default `chunkingMode: "disabled"` ([session-translation-facade.ts:218-225](packages/core/src/session-translation/session-translation-facade.ts)).
- Localization bundle materializer — передаёт `chunkingMode: "disabled"` явно, один batch с маркерами `__CODEAI_HUB_LOCALIZATION_ENTRY_*__` ([localization-materializer.ts:461](packages/localization/src/localization-materializer.ts)).
- Категории `generic` / `document` формально имеют default `"auto"`, но фактических вызовов нет.

Для Haiku engine chunk-policy в registry формально нужен (контракт), но на практике не активируется — engine всегда получает весь текст одним вызовом.

---

## 5. Архитектура решения

### 5.1. Путь вызова Haiku translator-turn

1. `TranslationFacade.translate(req with engineId="anthropic-claude-haiku-4-5")` → `ClaudeHaikuTranslationEngine.translate(normalizedRequest)`.
2. Engine лениво инициализирует SDK (один раз на процесс): `SDKInstaller.ensureInstalled()` + `loadModule()` → `{ query }`; `ClaudeAuthRuntime.ensureSubscriptionAuth()` + `getAuthEnvironment()`.
3. Engine строит `query()` options (см. §5.3), передаёт `prompt: request.text`.
4. Итерирует `AsyncIterable<SDKMessage>` до `{ type: "result", subtype: "success" }`, возвращает `msg.result` как `translatedText`.
5. Ошибка / timeout / `error_max_turns` → возврат `status: "fallback"`, `finalText: request.text`, `errorCode` по классификации.

### 5.2. Отключение дефолтного системного промпта

В options передаётся `systemPrompt: <translator-instruction-string>`. Строка — одной формулировкой (см. §6.4), с интерполяцией `{source}` / `{target}` из `request.sourceLanguage` / `request.targetLanguage`. Дефолтный `claude_code` preset при этом **полностью заменяется** — тот факт подтверждён типом `sdk.d.ts`.

### 5.3. Минимальные query options для translator-turn

Обязательные:
- `env` — из `ClaudeAuthRuntime.getAuthEnvironment()`.
- `pathToClaudeCodeExecutable` — из `SDKInstaller.getExecutablePath()`.
- `cwd` — `<provider_home>/.claude/projects/<translation-slug>/cwd` (фиксированный путь).
- `projectPath` — `<provider_home>/.claude/projects/<translation-slug>`.
- `additionalDirectories: [cwd]`.
- `settingSources: []` — SDK isolation.
- `permissionMode: "bypassPermissions"` + `allowDangerouslySkipPermissions: true`.
- `includePartialMessages: false` — не нужны дельты.
- `model: "claude-haiku-4-5-20251001"`.
- `thinking: { type: "disabled" }`.
- `systemPrompt: <translator-instruction>`.

Страховочные (решение в §6.6):
- `allowedTools: []` — блокирует весь tool layer.
- `maxTurns: 1` если SDK его поддерживает.

Не передаём: `resume` (каждый перевод one-shot), `outputFormat` (plain text), `effort` (thinking off).

### 5.4. Изолированный project slug

Отдельный slug внутри provider-home (по умолчанию `translation-runtime-haiku`) предотвращает смешивание translation-сессий с workspace-сессиями основного workflow. Создаётся лениво при первом вызове `translate()`. Аналог `translation-runtime-home` у Codex, но без материализации временной копии — provider-home и credentials shared с основным Claude-потоком.

### 5.5. Concurrency

Session-translation-dispatcher уже держит max 1 concurrent translation ([session-translation-dispatcher.ts:41-62](packages/core/src/session-translation/session-translation-dispatcher.ts)). Haiku engine наследует это ограничение — дополнительной сериализации не требуется. Rate limit от Anthropic (429) → fallback-результат с `errorCode: "rate_limited"`, без retry внутри engine.

---

## 6. Decision points (решить до todo-plan.md)

### 6.1. Где живут SDKInstaller и ClaudeAuthRuntime

Translation-package сейчас не зависит от Claude_Module. Haiku engine требует доступа к SDK installer + auth runtime.

- **A) Прямой импорт из Claude_Module.** Быстро, но тянет в translation-package всю messaging / session / token-usage машинерию Claude_Module. Нарушает принцип "translation package transport-only" (Shared_RuntimeTranslation_Module.md §7).
- **B) Выделить shared `@codeai-hub/claude-runtime`.** Новый sub-package с тремя файлами: `sdk-installer`, `claude-auth-runtime`, `claude-provider-home`. Claude_Module и translation-package импортируют из него. Требует отдельного Phase 1 (выделение + миграция Claude_Module) и нового `Modules/Claude_Runtime.md`.

**Рекомендация:** **B**. Чистая граница, масштабируется на будущих потребителей (если кто-то ещё захочет Claude SDK). Дополнительная работа ограничена одной фазой.

### 6.2. Engine ID

- `anthropic-claude-haiku-4-5` — mirror стиля Codex (`codex-gpt-5.3-codex-spark`), включает вендор + family.
- `claude-haiku-4-5` — совпадает с auth probe alias в Claude_Module, источник путаницы.

**Рекомендация:** `anthropic-claude-haiku-4-5`.

### 6.3. UI label

- `"Anthropic Claude · Haiku 4.5"` — mirror `"OpenAI Codex · GPT-5.3 Codex Spark"`.
- `"Claude Haiku 4.5"` — короче, но стилистически расходится.

**Рекомендация:** `"Anthropic Claude · Haiku 4.5"`.

### 6.4. System prompt (translator instruction)

Черновик:

```
You are a precise translator. Translate the user message from {source} to {target}. Preserve all marker tokens (including __CODEAI_HUB_LOCALIZATION_ENTRY_*__), code blocks, URLs, and placeholders unchanged. Output only the translated text, no preface or commentary.
```

~350 символов, экономия ≈ 95% input-токенов по сравнению с дефолтным Claude Code preset. Маркерное правило критично для localization-materializer batch-формата.

Альтернатива — ещё короче, без явного перечисления маркеров, полагаясь на поведенческие способности Haiku. Не рекомендую — explicit требование надёжнее.

**Рекомендация:** формулировка-черновик выше. Финальная правка — в stream реализации, если manual-test покажет проблемы.

### 6.5. Project slug

- `translation-runtime-haiku` — mirror `codex-translation-runtime-home`.

**Рекомендация:** `translation-runtime-haiku`.

### 6.6. Tools blocking

- `allowedTools: []` — формальный guarantee, что tool-layer не активируется. Одна строка.
- Ничего не передавать — полагаться на system prompt. Haiku редко самоинициативно дёргает tools.

**Рекомендация:** `allowedTools: []`. Стоимость копеечная, гарантия сильная.

### 6.7. Chunk policy значения

- `{ softCharacterLimit: 400, hardCharacterLimit: 600, mode: "auto" }` — формальный placeholder, фактически не активируется (см. §4.3).

**Рекомендация:** soft 400 / hard 600. На практике не проверяется.

---

## 7. Impact map

**Новые файлы:**
- `packages/translation/src/claude-haiku-translation-engine.ts` — engine класс.
- `packages/translation/src/claude-haiku-translator-instruction.ts` — билдер system prompt.
- (Вариант 6.1-B) `packages/claude-runtime/` — новый sub-package с тремя файлами: `sdk-installer.ts`, `claude-auth-runtime.ts`, `claude-provider-home.ts`, плюс `index.ts` + `package.json`.
- (Вариант 6.1-B) `doc/SolidWorks-WorkFlow/Modules/Claude_Runtime.md` — новый Module SSOT.

**Изменения существующих файлов:**
- `packages/translation/src/translation-facade.ts` — регистрация engine в `createDefaultTranslationEngines`.
- `packages/translation/src/translation-engine-profile-registry.ts` — chunk policy для `anthropic-claude-haiku-4-5`.
- `packages/translation/package.json` — зависимость на `@codeai-hub/claude-module` (A) или `@codeai-hub/claude-runtime` (B).
- `src/client/ui/src/components/settings/use-settings-state-support.ts` — `SUPPORTED_LOCALIZATION_ENGINE_IDS`.
- `src/client/ui/src/components/settings/localization-settings-card.tsx` — `resolveTranslationEngineLabel` case.
- `packages/localization/src/language-catalog.ts` — entry для нового engineId (reuse `GOOGLE_GTX_LANGUAGES`).
- (Вариант B) `packages/Claude_Module/**` — imports переехали на новый пакет во всех точках использования installer/auth/home резолверов.

**Документация:**
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` — новый engine в bundled set.
- `doc/SolidWorks-WorkFlow/Modules/Localization.md` — видимый engine в каталоге (§4-5).
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — список engines в §4 при необходимости.
- `doc/SolidWorks-WorkFlow/Docs_Index.md` — добавить `Modules/Claude_Runtime.md` при Варианте B.

**Не трогаем:**
- `packages/core/src/session-translation/*` — facade contract тот же, engine выбирается по id.
- `packages/localization/src/localization-materializer.ts` — тот же facade API.
- Существующие engines Google GTX / Codex Mini / Codex Spark.

---

## 8. Open questions

1. **Rate limit awareness.** У Anthropic subscription RPM/TPM лимиты различаются по tier. При материализации bundles (4 approved группы × несколько языков) теоретически возможны 429. Достаточно ли fallback-per-request поведения, или нужен explicit backoff/retry в engine?
2. **Token refresh.** `ClaudeAuthRuntime.bootstrapOAuthToken()` поддерживает `forceRefresh: true`. На практике при активных Opus/Sonnet сессиях token всегда свежий. Нужен ли explicit pre-warm при старте Core, или полагаемся на shared runtime?
3. **Keychain prompts (macOS).** Первый доступ к Keychain может триггерить системный запрос авторизации. Для background translator это нежелательно. Решение: требовать, чтобы первая Claude-сессия (Opus/Sonnet) была запущена до первого translate(), или добавить в Core warmup.
4. **Diagnostic logging.** Codex engines пишут через `TranslationReporter`. Haiku engine использует тот же reporter, или нужен отдельный `claude-translation-logger` с тегированием latency / tokens / model_id?
5. **Version pinning.** Зафиксировать snapshot `claude-haiku-4-5-20251001` или alias `claude-haiku-4-5`? Snapshot стабильнее; alias облегчает upgrades. Рекомендация — snapshot с явной процедурой bump в release checklist.

---

## 9. Phasing suggestion (для todo-plan.md)

Предварительная разбивка. Финальная нарезка — после утверждения этого дока. Каждый stream ≤ 3 файла / пакета, каждая подзадача пара «реализация + Git Commit».

**Phase 1 — Infrastructure readiness.** *(только при Варианте 6.1-B; при A — пропускается)*
- Stream 1.1: выделить `@codeai-hub/claude-runtime` (SDKInstaller + ClaudeAuthRuntime + claude-provider-home + package.json).
- Stream 1.2: перевести Claude_Module на новый пакет, таргетный build.
- Stream 1.3: `Modules/Claude_Runtime.md` + Docs_Index.

**Phase 2 — Haiku engine implementation.**
- Stream 2.1: `ClaudeHaikuTranslationEngine` + `claude-haiku-translator-instruction` (два файла).
- Stream 2.2: регистрация в `translation-facade.ts` + chunk policy в `translation-engine-profile-registry.ts` + `package.json` dependency (три файла).

**Phase 3 — UI exposure.**
- Stream 3.1: `SUPPORTED_LOCALIZATION_ENGINE_IDS` + `resolveTranslationEngineLabel` + `language-catalog` (три файла).

**Phase 4 — Documentation + validation.**
- Stream 4.1: `Shared_RuntimeTranslation_Module.md` + `Localization.md` (два файла).
- Stream 4.2: `SystemArchitecture.md` + `Docs_Index.md` при необходимости (два файла).
- Stream 4.3: manual-test — engine выбирается в Settings, save пересобирает approved bundles через Haiku, живой overlay (reasoning) работает.

**Phase 5 — Release.**
- `build-all.sh` → `build-release.sh --use-current-version` → VSIX → session report.

---

## 10. Что должно быть решено до старта todo-plan.md

1. Вариант 6.1 — sharing strategy (A / B).
2. Вариант 6.2 — engine ID.
3. Вариант 6.3 — UI label.
4. Вариант 6.4 — финальная формулировка translator instruction.
5. Вариант 6.5 — project slug.
6. Вариант 6.6 — `allowedTools: []` да / нет.
7. Вариант 6.7 — chunk policy значения.
8. Open questions §8 — при необходимости принять решения по auth pre-warm, logger, version pinning.

После выбора документ переводится в Status: Accepted и становится `Planning source` для `doc/TODO/todo-plan.md` Context Pack.
