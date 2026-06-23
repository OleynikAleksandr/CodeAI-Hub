# Session Status Panel — Factual Module Inventory

**Surface:** нижняя статусная строка  
**Primary code:** `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/status-panel-model-picker.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
**Canonical styles:** `media/session-view.css` блок `.session-status-row`, `.session-status-chip`, `.session-status-chip--label`, `.session-status-chip--limits`, `.session-status-button`, `.session-status-button--{claude,codex,gemini,kimi}`, `.session-status__debug-strip`.

## Роль

Показывает live state одной logical session в виде четырёх-chip ряда:
1. label `Модель:`;
2. имя выбранной модели (provider-tinted button shape; для Codex, Claude, Kimi, GLM/OpenCode и Local Models открывает picker модели);
3. опциональный `(reasoning)` / `(thinking)` (тот же button shape; для Codex открывает reasoning picker, для Claude открывает thinking picker; скрывается при отсутствующем `model.reasoning`; для Kimi скрыт всегда);
4. правая `Токены:` плашка с `used (remaining%)` и свободным правым краем под будущие per-session signals.

Панель возвращает `null`, если Core не `ready` или в `status.models` нет хотя бы одного элемента; legacy single-line fallback и `Core Supervisor: starting…` сняты с оборота на этом surface.

## Что принимает

- `connectionStatus`
- `connectionDetail` (зарезервирован для совместимости caller'а; в текущей разметке не используется)
- `status`
- `tokenDebugSummary` — опционально, рендерится отдельным muted strip ниже chip-ряда.
- `onSelectModel(sessionId, modelId, reasoningEffort)` — optional callback; активный runtime/PM слой dispatch'ит его для Codex, Kimi, GLM/OpenCode и Local Models sessions.
- `onSelectReasoning(sessionId, reasoningEffort)` — optional callback; Codex reasoning-only selection resolves current base model before dispatch.
- `onSelectClaudeModel(sessionId, modelId, thinking)` — optional callback; Claude model selection preserves or resolves the current thinking selection before dispatch.
- `onSelectClaudeThinking(sessionId, thinking)` — optional callback; Claude thinking-only selection preserves the current base model before dispatch.

## Откуда берет правду

- `connectionStatus` / `connectionDetail` из `useProjectManagerCoreStatusHydrator()`;
- `status.models[0]` (single-model invariant per SystemArchitecture §3.14 / SMB-001/002): `modelDisplayName`, `reasoning`, `providerId` (`claudeCodeCli` / `codexCli` / `geminiCli` / `kimiCode` / `glmNative` / `glmOpenCode` / `localModels`) → provider tint class;
- Local Models status identity is rendered directly from `status.models[0].modelDisplayName`; until a dedicated local tint exists, Local Models uses the existing Gemini/cool tint class.
- `status.tokenUsage.used` / `.limit` → токен-плашка (used + remaining percent);
- `tokenDebugSummary` либо вычисляется по chain/messages, либо в dialog mode приходит как override из parsed dialog history.

The user-facing percentage in the chip is **remaining context window percentage**. Current rendering is `used (remaining%)`, not `used%`. `status-panel.tsx` owns this formatting through `formatContextWindowUsage(...)`; provider adapters only supply `used/limit` snapshots.

## Как обновляется

### Connection side
- `/api/v1/status` hydrate;
- `core:state` rehydrate.

### Models side
- initial snapshot строится из `SessionRecord.modelBinding`, если он есть; такой label помечается `ModelInfo.source = "binding"`;
- restored dialog/bootstrap snapshot обязан принимать persisted `modelBinding` из Core dialog list / continuity materializer до первого provider hydration;
- `useSettingsModelsSync()` на change provider settings обновляет только settings-owned snapshots и не переписывает `binding`/`runtime` sources;
- `useRuntimeModelSync()` на `session:model:update` применяет Core-confirmed runtime identity и помечает её `ModelInfo.source = "runtime"`;
- `useRuntimeModelSync()` не заменяет binding-owned label unbound runtime fallback-ом; runtime payload должен нести `modelBinding` или Core-confirmed effective identity этой logical session.
- для нового trunk-step dialog/bootstrap snapshot provider/model seed сначала берётся из explicit `pm:dialog:open` / startup intent provider, если dialog list payload ещё не дал нормализованный provider;
- после materialization runtime session панель обязана converge-иться к live provider/model identity через обычный `useRuntimeModelSync()` path.

### Token side
- `session:stream` token-usage events -> `updateSnapshotsWithTokenUsage(...)`.
- Kimi-specific discovery, updated 2026-06-23: Kimi ACP `usage_update`, when present, carries context-window fields as `used` and `size`; legacy Kimi Wire `StatusUpdate` compatibility still maps:
  - `context_usage` as a `0..1` used ratio;
  - `context_tokens` as current context tokens;
  - `max_context_tokens` as the model context window.
  The Kimi adapter must normalize these into the same `tokenUsage` snapshot shape consumed by `updateSnapshotsWithTokenUsage(...)`: `used = context_tokens`, `limit = max_context_tokens`. `context_usage` is useful as provider evidence/debug, but the UI chip still derives the displayed percentage from `used / limit` to keep the provider-neutral status-panel contract.
- Current Kimi CLI builds may omit ACP `usage_update`. For those sessions the Kimi adapter emits a post-turn native-wire token snapshot from `~/.kimi-code/sessions/.../<providerSessionId>/agents/main/wire.jsonl` by reading the latest `usage.record` / `step.end.usage` and summing `inputOther + inputCacheRead + inputCacheCreation + output`. This is a best-effort context-window snapshot for the lower `Токены:` chip, not Kimi 5h/Weekly quota state and not OCR/text extraction.
- Kimi per-turn billing/quota accounting must not replace context-window usage in the `Токены:` chip.

### Debug summary side
- пересчитывается по runtime chain или dialog history.

## Когда обновляется

- при старте PM/workspace hydrate;
- при restart/reconnect Core;
- при change настроек модели/reasoning только для snapshots без `binding`/`runtime` ownership;
- при пользовательском выборе Codex model/reasoning через chips: контракт раздельный — `session:codex:model-switch` несёт только `targetModelId`, а `session:codex:reasoning-switch` только `targetReasoningEffort`. После каждой команды Core отдаёт `session:model:update`, а следующий turn подтверждает binding через runtime path;
- при пользовательском выборе Claude model/thinking через chips: контракт раздельный — `session:claude:model-switch` несёт только `targetModelId`, а `session:claude:thinking-switch` только `thinkingEnabled` + опциональный `targetReasoningEffort`. После каждой команды Core отдаёт `session:model:update`, а следующий turn применяет binding в Claude SDK `query(...)`;
- при пользовательском выборе Kimi model через chip: model picker показывает `Kimi K2.7 Code` и `Kimi K2.7 Code High Speed`, отправляет только `targetModelId`, reasoning picker не открывается;
- model-card popup рендерит только список моделей; reasoning-card popup рендерит только список значений reasoning/thinking. Активный пункт обеих карт подсвечен провайдерным цветом через `data-active="true"` + `data-provider`, без отдельного текстового маркера;
- при `session:model:update`;
- при новых token usage/history данных.
- the token chip tooltip must spell out the meaning explicitly: `Context window: <used> used, <limit> limit, <remaining>% remaining`. This prevents ambiguity between used percentage and remaining percentage while preserving the compact chip text.

## Что отдает наружу

- Для Codex sessions вызывает `onSelectModel(modelId)` / `onSelectReasoning(reasoning)` — каждый callback несёт только своё поле, без второго аргумента.
- Для Claude sessions вызывает `onSelectClaudeModel(modelId)` / `onSelectClaudeThinking(thinking)` — model-callback теряет thinking-аргумент, thinking-callback не передаёт модель.
- Для Kimi sessions вызывает только `onSelectModel(modelId)`.
- Для Gemini sessions selection no-op: chips остаются визуальной частью status row, но не dispatch'ят provider command в этом scope.

## Локальный state

- `openPicker: "model" | "reasoning" | null` внутри `status-panel.tsx`.
- picker закрывается после выбора или close action.
- Model picker использует тот же floating card component, что reasoning picker; левый край model card выравнивается по левому краю reasoning card anchor, чтобы карточка не выходила за visible session zone.
- picker option states (release `1.2.121`): опции рендерятся через CSS-класс `.session-status-picker__option`, а picker-контейнер несёт `data-provider`, который проставляет провайдерный набор CSS-переменных (`--picker-bg/-hover/-active`, `--picker-border/-hover/-active`, `--picker-accent/-hover/-active`). Активный пункт несёт `data-active="true"` и подсвечен теми же RGBA tokens, что и кнопка `session-status-button--{claude|codex|gemini}` на нажатой фазе; hover лайтит опцию в провайдерном цвете (warm peach / cyan / cool lavender) с переходом 120 ms, focus-visible — 1px outline. Клик переносит `data-active` с прежнего пункта на новый и закрывает popup; никаких inline `optionStyle`/`closeStyle` больше нет, текстовая метка "active" удалена.

## Особенности

- в dialog mode `useRuntimeModelSync()` умеет fallback-обновлять snapshot по `activeSessionId`, если runtime broadcast пришёл с другим `sessionId`;
- панель зависит сразу от двух truth-lines: Core connection и active snapshot status.
- две logical sessions одного provider могут одновременно показывать разные модели, потому что label принадлежит session binding, а не текущему provider default в Settings.
- continuation session, созданная после `Remaining context threshold (%)`, должна показывать inherited binding предыдущей logical session, даже если Settings default у provider уже изменён.
- для `Virtual Simulation` / `Diagram Modules`, стартующих с confirmation card, нижняя панель не должна сохранять provider/model summary предыдущего trunk step: выбранный на карточке provider seed-ит bootstrap snapshot сразу, а затем live runtime model update уточняет effective model без возврата к старому provider context.
- 4-chip layout инвариант: chips 1–3 (`flex: 0 0 auto`) hug свой текст, правая `--limits` плашка (`flex: 1 1 0; min-width: 0`) поглощает весь оставшийся горизонт; внешняя ширина ряда фиксирована родителем (`width: 100%`). При смене модели (например Sonnet → Opus 4.7) reflow происходит только внутри ряда — токен-плашка автоматически меняет ширину, остальной layout остаётся стабильным.
- buttons (chips 2 и 3) интерактивны для provider-ов, у которых есть соответствующий callback. Runtime и dialog PM views прокидывают callbacks симметрично. Каждая chip dispatch'ит свою команду: model chip → provider model switch/default update, reasoning/thinking chip → provider-specific reasoning/thinking command. Никаких объединённых payload'ов с двумя полями.
- для Gemini sessions callbacks guard'ятся до dispatch: Gemini strategy seam пока отсутствует, поэтому selection is no-op.
- Codex model picker показывает текущий Codex registry order; reasoning picker показывает `reasoningEffortOptions` выбранной/current Codex модели.
- Claude model picker показывает provider-owned alias order `Sonnet` / `Opus` / `Haiku`; thinking picker показывает `off` плюс `low | medium | high | xhigh | max`.
- Kimi model picker показывает registry order `kimi-k2.7-code` / `kimi-k2.7-code-highspeed`; Kimi reasoning picker не используется.
- при выборе новой Codex модели через model chip UI ничего не пересчитывает на клиенте — отправляется только `targetModelId`. Сохранение/нормализация reasoning происходит исключительно в Core handler по правилу: prior `reasoningEffort` сохраняется, если поддержан target model, иначе fallback к первому варианту из `reasoningEffortOptions`.
- при выборе новой Claude модели через model chip UI отправляет только `targetModelId`. Claude handler сохраняет previous `thinkingEnabled` + `reasoningEffort` и нормализует effort через `findClaudeModelCapabilities`; Status Panel не несёт эту логику.
- thinking chip dispatch'ит `api.requestClaudeThinkingSwitch(sessionId, thinkingEnabled, effort?)`; для `off` UI не передаёт effort, для остальных уровней передаёт `(true, level)`. Модель в этой команде не присутствует.
- reasoning chip скрывается, когда `model.reasoning` — `undefined` или пустая строка. Для Claude `thinking off` приходит как непустая строка `"thinking off"` и попадает в плашку как `(thinking off)`.
- localization: ключ `session.status.model_label` лежит в approved dict `assets/localization/source/en/messages_for_the_user.json` и legacy mirror `system_feedback.json`; `session.status.tokens_label` переиспользуется без изменений.
- цветовой контракт правой `Токены:` плашки: метрика `used (remaining%)` рендерится тем же нейтральным серым `#b0b0b0`, что и default-фаза кнопок имени модели и reasoning (`color` для `.session-status-chip--limits .session-status-chip__value` в `media/session-view.css`). Цифры не должны притягивать визуальное внимание к себе сильнее, чем имя модели.
