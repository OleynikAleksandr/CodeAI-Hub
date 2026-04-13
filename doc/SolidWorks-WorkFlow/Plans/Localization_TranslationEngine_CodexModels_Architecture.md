# Localization Translation Engine — Codex Models

**Status:** approved implementation scope  
**Date:** 2026-04-13  
**Owner:** Codex session

## 1. Problem

Текущий `Translation Engine` в настройках формально является pluggable, но фактически весь runtime работает только через `google-gtx`.

Это даёт два ограничения:

- thinking/reasoning overlay и localization bundle materialization не могут использовать более качественный engine;
- user-facing selector в `Settings > Localization > Translation Engine` не даёт реального выбора между `Google GTX Free` и доступными Codex-backed models.

Пользовательский scope для этой волны:

- оставить `Google GTX Free` как бесплатный default path;
- добавить ещё два selectable engine:
  - `GPT-5.4 Mini`
  - `GPT-5.3 Codex Spark`
- при выборе engine продукт обязан использовать именно его как для Core-owned thinking translation overlay, так и для остальных runtime localization paths, где сейчас используется shared translation facade.

## 2. Target Decision

Вместо provider-local ad hoc path вводится production-grade Codex-backed translation engine внутри `packages/translation`.

### 2.1 Engine IDs

Канонические engine ids этой волны:

- `google-gtx`
- `codex-gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark`

### 2.2 Translation Runtime

Новые Codex-backed engines используют облегчённый CLI runtime:

- отдельный minimal translation home;
- короткий translator instructions file;
- пустой temp workspace без project `AGENTS.md`;
- `read-only` sandbox;
- `--skip-git-repo-check`;
- `--ephemeral`;
- `model_reasoning_summary = "none"`.

Цель этой конфигурации:

- не тащить project instructions, skills и лишний agent overhead;
- использовать ту же Codex subscription surface, что уже подтверждена в продукте;
- держать translation path максимально близким к benchmark-runtime, который уже проверен вручную.

## 3. Architecture Changes

### 3.1 Shared translation package

Новые модули в `packages/translation/src/`:

- `codex-cli-path-resolver.ts`
  - вычисляет путь к установленному `codex` CLI по тому же npm-prefix contract, что и основной Codex provider;
  - не зависит от пользовательского shell `PATH`.
- `codex-translation-runtime-home-facade.ts`
  - materialize-ит temporary isolated `CODEX_HOME`;
  - копирует или связывает provider auth artifacts;
  - пишет minimal `config.toml` и `translation-instructions.md`.
- `codex-cli-translation-engine.ts`
  - фасад engine-а;
  - запускает `codex exec`;
  - парсит JSON stream;
  - возвращает `TranslationResult`.

`TranslationFacade` получает новый default registry:

- `GoogleTranslateClient`
- `CodexCliTranslationEngine` for `codex-gpt-5.4-mini`
- `CodexCliTranslationEngine` for `codex-gpt-5.3-codex-spark`

### 3.2 Localization runtime catalog

`packages/localization` расширяет engine catalog, чтобы settings UI видел три engine и language catalog оставался валидным.

На этой волне engine catalog остаётся product-owned static catalog:

- `google-gtx`
- `codex-gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark`

### 3.3 Settings UI

`Localization Settings` должен:

- показывать friendly labels вместо raw id;
- сохранять выбранный engine id в `settings.json`;
- оставлять `google-gtx` как default;
- не делать скрытый fallback в UI.

Если runtime engine недоступен в момент перевода, shared translation facade возвращает fallback result, а не ломает session/history path.

### 3.4 Provider-local translation parity

Core-owned thinking overlay уже использует shared translation facade и автоматически подхватит новый `engineId` после расширения registry.

Но в продукте ещё остаются provider-local translation adapters для коротких progress/pre-tool сообщений. Поэтому `translationEngineId` должен быть протянут в applied turn config и runtime session config для:

- Claude
- Codex
- Gemini

Иначе selector будет работать только для Core overlay path, а не для всего live user-facing translation behavior.

## 4. Contracts

### 4.1 Must-not-break

- canonical transcript остаётся source-first;
- `localizedContent` по-прежнему derived overlay, а не source of truth;
- `Google GTX Free` остаётся working fallback engine;
- settings snapshot остаётся единственным source of truth для выбранного `translationEngineId`;
- новые Codex translation engines не имеют права читать project `AGENTS.md` или рабочий репозиторий.

### 4.2 Applied turn config extension

`AppliedProviderTurnConfig` получает optional field:

- `translationEngineId?: string`

Provider runtime state получает тот же optional field, чтобы provider-local translation adapters использовали тот же engine, что и Core overlay policy.

## 5. Files / Modules Expected To Change

### Product code

- `packages/translation/src/*`
- `packages/localization/src/language-catalog.ts`
- `packages/core/src/session-translation/session-translation-facade.ts`
- `packages/core/src/remote-bridge/types.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
- `packages/Claude_Module/src/**`
- `packages/Codex_Module/src/**`
- `packages/Gemini_Module/src/**`
- `src/client/ui/src/components/settings/localization-settings-card.tsx`

### Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`

### Localization source dictionaries

- `assets/localization/source/en/ui_labels.json`
- `assets/localization/source/en/ui_helper_text.json`

## 6. Verification

Минимальная верификация этой волны:

- `npm run build --workspace=@codeai-hub/translation`
- `npm run build --workspace=@codeai-hub/localization`
- `npm run build --workspace=@codeai-hub/core`
- если затронут UI types/rendering: `npm run typecheck:webview`

Дополнительный manual sanity check:

- engine selector сохраняет `google-gtx` / `codex-gpt-5.4-mini` / `codex-gpt-5.3-codex-spark`;
- Core thinking overlay переводит через выбранный engine;
- provider-local translated progress text использует тот же engine id;
- при недоступном Codex runtime продукт деградирует в original text / fallback path без crash.
