# Kimi Reasoning Toggle — Audit Followup Planning

- **Status:** Backlog intake. Critical blocker (C1), B/C2, C3, reset-path, release retest fixes, and documentation closeout items were handled by the `kimi-reasoning-toggle-2026-06-17` plan through release `1.2.545`.
- **Source audit:** сессия аудита release v1.2.543 (2026-06-18). Этот документ фиксирует оставшиеся **IMPORTANT и MINOR** findings, не блокирующие accepted release `1.2.545`, для отдельного execution scope.
- **Resolved during 2026-06-18 closeout:** E6, E7, E9, E18. Open IMPORTANT backlog remains A5, A10, D11, E8.

## Context Pack (read before execution)
- `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `packages/core/src/config/provider-turn-config-resolver.ts`
- `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
- `src/client/ui/src/components/settings/kimi-default-model-card.tsx`

## IMPORTANT issues

### A5. `thinkingEnabled` не участвует в `modelId` — нарушение EffectiveModelIdentity SSOT
- **Файл:** `packages/core/src/config/provider-turn-config-resolver.ts:146-187` (`buildProviderEffectiveModelId`)
- **Проблема:** Для Kimi нет ветки в `buildProviderEffectiveModelId`. Claude/GLM Native кодируют `reasoning:<effort>` / `thinking:off` в `modelId`; Kimi — нет. Две Kimi-сессии с противоположным toggle имеют одинаковый `modelId`.
- **Нарушение контракта:** `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md §3.2` (строки 57-63) требует включать в `modelId` всё, что меняет поведение turn-а.
- **Impact:** ломает identity-каналы — continuity restore, native capture artifact identity, UI label sync.
- **Fix:** добавить ветку `kimiCode`: `thinkingEnabled === false ? \`${baseModelId} thinking:off\` : baseModelId` (mirror GLM Native; default ON = без суффикса).
- **Risk note:** Kimi вышел недавно, continuity-history пуст; суффикс безопасен. Но изменение identity-формы после набора истории — breaking, поэтому лучше сделать сейчас, в начале жизни провайдера.

### A10. `resolveLocalModelsTurnConfig` получил фейковый `thinkingEnabled: true`
- **Файл:** `packages/core/src/config/provider-turn-config-resolver.ts:312-319, 413-419`
- **Проблема:** Поле добавлено только чтобы удовлетворить расширенный тип `ResolvedKimiTurnConfig`, переиспользуемый для `kimi`/`glmOpenCode`/`localModels`. В registry `buildResolvedProviderConfigRegistry` для `localModels` это поле **не пробрасывается** → `byProviderId.localModels.thinkingEnabled === undefined`.
- **Impact:** Тип врёт о домене; будущий читатель решит, что `glmOpenCode.thinkingEnabled` осмысленен.
- **Fix:** разнести resolved-shape типы по провайдерам (rename `ResolvedKimiTurnConfig` → `ResolvedSimpleProviderTurnConfig` или split per-provider) либо убрать фейковое поле.

### D11. Дублирование Kimi fallback-объекта в 3 местах
- **Файлы:**
  - `src/client/project-manager/components/settings/use-project-manager-kimi-settings-handlers.ts:34-53`
  - `src/client/ui/src/components/settings/settings-state-helpers.ts:143-159`
  - `src/client/project-manager/components/workflow-step-start-settings-defaults.ts:144-152`
- **Проблема:** Три разных литерала fallback для Kimi provider settings с расходящимися shape'ами. Коммит `ad74284b1` — прямое доказательство стоимости: пришлось точечно латать `defaultModel` и `thinkingEnabled`, потому что они разъехались.
- **Fix:** вынести единый `DEFAULT_KIMI_PROVIDER_SETTINGS` (single source of truth), применить во всех трёх сайтах.

### E6. Архитектурный инвариант приземлён не в ту секцию — RESOLVED in closeout
- **Файл:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md:294-301`
- **Проблема:** "Kimi binary thinking toggle + force-restart contract" записан в §4 "Где искать правду в коде" (кодовая карта), а не в §3 "Глобальные инварианты (must-not-break)".
- **Impact:** §3 читается каждой сессией первой (по §0); контракт в §4 может молча дрейфовать. "Активный turn прерывается by design" — это must-not-break уровня существующих инвариантов #14, #23, #26, #27.
- **Fix:** promote в новый §3 invariant (например #32) с покрытием: (a) no Wire per-turn thinking field, (b) toggle spawn-time-only, (c) changing `providers.kimi.thinkingEnabled` must force `reconfigureThinking` + binding invalidation и прерывает активный turn by design, (d) `thinkingDisplaySyncEnabled` остаётся UI-only. §4-аннотацию оставить как code pointer.

### E7. `EffectiveModelIdentity_And_Settings_SSOT.md` не обновлён — RESOLVED in closeout
- **Файл:** `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md:75-82`
- **Проблема:** В контракте перечислены identity-поля для GLM (`thinkingEnabled`/`reasoningEffort`, строка 75), Claude/Codex/Gemini (§4.5, строки 166-170) — но **Kimi отсутствует**. Audit-stamp устарел (v1.2.121) относительно релиза 1.2.543.
- **Fix:**
  - добавить `providers.kimi.thinkingEnabled` (binary; default `true`; presentation-independent, как `thinkingDisplaySyncEnabled`) в §3.4 обсуждение settings-snapshot рядом со строками 77-84;
  - добавить Kimi-буллет в §4.5: binary on/off (no effort dimension), spawn-time-only.

### E8. Localization violation — "Reasoning" label захардкожен
- **Файл:** `src/client/ui/src/components/settings/kimi-default-model-card.tsx:88-91` (плюс sibling "Reasoning in dialog" на строках 104-107 — pre-existing)
- **Проблема:** Заголовок и helper-текст — английские литералы, без ключей в `assets/localization/source/en/ui_labels.json` / `ui_helper_text.json`.
- **Нарушение контракта:** SystemArchitecture invariants #16 (строка 89: "product-owned localizable copy must be authored in bundled English source dictionaries") и #17 (строка 91: "every new product-authored text surface must be classified up front").
- **Fix:** добавить `settings.kimi.reasoning.toggle.label` в `ui_labels.json` и `settings.kimi.reasoning.toggle.helper` в `ui_helper_text.json`; потребить через localization-lookup primitive в карточке. Если lookup-инфраструктуры в карточке нет — сначала добавить её (отдельная micro-task).

### E9. Overstatement "backward compatible" в CHANGELOG/Kimi.md — RESOLVED in closeout
- **Файлы:** `CHANGELOG.md:16`, `doc/SolidWorks-WorkFlow/Modules/Kimi.md:74`, plus planning doc §1 (строки 22-23)
- **Проблема:** Заявлено "Default is ON (backward compatible)". Но `Kimi.md:70` сам отмечает, что `~/.kimi/config.toml` `default_thinking` по умолчанию `false`. Для пользователей без явного `default_thinking = true` поведение меняется: reasoning теперь ON там, где был OFF.
- **Fix:** квалифицировать: "default ON; backward compatible only for users with explicit `default_thinking = true` in `~/.kimi/config.toml`; users on the Kimi default (false) will see reasoning enabled after upgrade".

## MINOR issues (nice-to-have, ниже приоритетом)

### C12. Reconciler как premature abstraction
- **Файл:** `packages/core/src/remote-bridge/handlers/kimi-thinking-reconciler.ts`
- **Проблема:** 57-строчный модуль с двумя interface'ами (`KimiReconfigureRegistry`/`KimiReconfigureSessionManager`) для 1 call-site. Ponytail-smell.
- **Fix (опционально):** inline private-метод в `settings-request-handler.ts` + извлечь Apple Native preflight (см. C13) для входа в 500-строковый лимит.

### C13. `max-lines-debt-allowlist.txt` gaming метрики
- **Файл:** `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts` (514 строк)
- **Проблема:** Allowlist comments сами указывают fix: извлечь Apple Native preflight (~218 строк, строки 64-281) в отдельный модуль → файл упадёт до ~296 строк, allowlist не нужен.
- **Fix:** extraction `apple-native-preflight.ts` (`collectAppleNativePreflightTargets`, `runAppleNativePreflight`, `parseAppleNativePreflightResponse`, `resolveAppleNativeReadinessMessage`, `assertAppleNativeSettingsReady`).

### A14. 4-я копия правила `!== false`
- **Файлы:** loader, resolver, adapter-bridge, reconciler
- **Fix:** hoist в единый `resolveKimiThinkingEnabled(raw)` helper в `provider-settings-snapshot.ts`; рассмотреть добавление `reconfigureThinking?` в `ProviderAdapter` interface.

### B15. Тесты проверяют `includes(flag)`, а не позицию
- **Файл:** `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts:82-118`
- **Fix:** assert `args.indexOf("--thinking")` и `args.indexOf("--yolo")` ordering.

### D16. Хардкод `"kimi-k2.7-code"`
- **Файлы:** `use-project-manager-kimi-settings-handlers.ts:44`, `project-manager-settings-host-message.ts:42`, `thinking-display-policy.test.tsx:89,90`
- **Fix:** импортировать `DEFAULT_KIMI_MODEL_ID`.

### D17. Webview-only host silent no-op
- **Файл:** `src/client/ui/src/components/settings/settings-provider-tab-content.tsx:293-305`
- **Проблема:** В `settings-only-host.tsx` `onKimiThinkingEnabledChange === undefined` → toggle работает визуально, но изменение silently теряется. Pre-existing для всех Kimi-настроек.
- **Fix:** либо скрыть Kimi-таб в webview-only host, либо добавить Kimi handlers в `use-settings-state.ts` для parity.

### E18. Planning doc stale status — RESOLVED in closeout
- **Файл:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Reasoning_Toggle_Planning_RU.md:3`
- **Проблема:** `Status: Proposed (intake)` на shipped-фиче. После closeout текущего plan — обновить статус или архивировать.

### B19. `reconfigureThinking` не чистит listeners
- **Файл:** `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- **Проблема:** Per-session listeners остаются после реконфигурации; могут получать события от нового lifecycle.
- **Fix:** clean `this.listeners` в `reconfigureThinking` (если это не сломает существующий subscribe-contract — проверить в execution).

## Execution note
Этот документ — **planning intake**, не активный `todo-plan.md`. Старт разрешён только после того, как текущий `kimi-reasoning-toggle-2026-06-17` plan перейдёт в terminal `NONE` state (через Phase 8 Scope Closeout). При запуске:
1. Прочитать `AGENTS.md §3, §4` и этот документ.
2. Создать новый `doc/TODO/todo-plan.md` с фазами, нарезанными из IMPORTANT issues выше (MINOR по желанию).
3. Каждая micro-task ≤3 файлов, после каждой — отдельный `Git Commit`.

## Open question for intake
- Включать ли MINOR issues в первый execution pass, или вынести в отдельный backlog-stream? Рекомендация: IMPORTANT (A5, A10, D11, E6, E7, E8, E9) — в первый pass; MINOR — по факту cleanup'а.
