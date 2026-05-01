# Session Status Panel — Factual Module Inventory

**Surface:** нижняя статусная строка  
**Primary code:** `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/status-panel-model-picker.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
**Canonical styles:** `media/session-view.css` блок `.session-status-row`, `.session-status-chip`, `.session-status-chip--label`, `.session-status-chip--limits`, `.session-status-button`, `.session-status-button--{claude,codex,gemini}`, `.session-status__debug-strip`.

## Роль

Показывает live state одной logical session в виде четырёх-chip ряда:
1. label `Модель:`;
2. имя выбранной модели (provider-tinted button shape; для Codex и Claude открывает picker модели);
3. опциональный `(reasoning)` / `(thinking)` (тот же button shape; для Codex открывает reasoning picker, для Claude открывает thinking picker; скрывается при отсутствующем `model.reasoning`);
4. правая `Токены:` плашка с `used (remaining%)` и свободным правым краем под будущие per-session signals.

Панель возвращает `null`, если Core не `ready` или в `status.models` нет хотя бы одного элемента; legacy single-line fallback и `Core Supervisor: starting…` сняты с оборота на этом surface.

## Что принимает

- `connectionStatus`
- `connectionDetail` (зарезервирован для совместимости caller'а; в текущей разметке не используется)
- `status`
- `tokenDebugSummary` — опционально, рендерится отдельным muted strip ниже chip-ряда.
- `onSelectModel(sessionId, modelId, reasoningEffort)` — optional callback; активный runtime/PM слой dispatch'ит его для Codex sessions.
- `onSelectReasoning(sessionId, reasoningEffort)` — optional callback; Codex reasoning-only selection resolves current base model before dispatch.
- `onSelectClaudeModel(sessionId, modelId, thinking)` — optional callback; Claude model selection preserves or resolves the current thinking selection before dispatch.
- `onSelectClaudeThinking(sessionId, thinking)` — optional callback; Claude thinking-only selection preserves the current base model before dispatch.

## Откуда берет правду

- `connectionStatus` / `connectionDetail` из `useProjectManagerCoreStatusHydrator()`;
- `status.models[0]` (single-model invariant per SystemArchitecture §3.14 / SMB-001/002): `modelDisplayName`, `reasoning`, `providerId` (`claudeCodeCli` / `codexCli` / `geminiCli`) → `session-status-button--{provider}` tint class;
- `status.tokenUsage.used` / `.limit` → токен-плашка (used + remaining percent);
- `tokenDebugSummary` либо вычисляется по chain/messages, либо в dialog mode приходит как override из parsed dialog history.

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

### Debug summary side
- пересчитывается по runtime chain или dialog history.

## Когда обновляется

- при старте PM/workspace hydrate;
- при restart/reconnect Core;
- при change настроек модели/reasoning только для snapshots без `binding`/`runtime` ownership;
- при пользовательском выборе Codex model/reasoning через chips: Core отдаёт `session:model:update` сразу после `session:codex:model-switch`, а следующий turn подтверждает binding через runtime path;
- при пользовательском выборе Claude model/thinking через chips: Core отдаёт `session:model:update` сразу после `session:claude:model-switch`, а следующий turn применяет binding в Claude SDK `query(...)`;
- при `session:model:update`;
- при новых token usage/history данных.

## Что отдает наружу

- Для Codex sessions вызывает `onSelectModel` / `onSelectReasoning`, если callback прокинут caller'ом.
- Для Claude sessions вызывает `onSelectClaudeModel` / `onSelectClaudeThinking`, если callback прокинут caller'ом.
- Для Gemini sessions selection no-op: chips остаются визуальной частью status row, но не dispatch'ят provider command в этом scope.

## Локальный state

- `openPicker: "model" | "reasoning" | null` внутри `status-panel.tsx`.
- picker закрывается после выбора или close action.
- Model picker использует тот же floating card component, что reasoning picker; левый край model card выравнивается по левому краю reasoning card anchor, чтобы карточка не выходила за visible session zone.

## Особенности

- в dialog mode `useRuntimeModelSync()` умеет fallback-обновлять snapshot по `activeSessionId`, если runtime broadcast пришёл с другим `sessionId`;
- панель зависит сразу от двух truth-lines: Core connection и active snapshot status.
- две logical sessions одного provider могут одновременно показывать разные модели, потому что label принадлежит session binding, а не текущему provider default в Settings.
- continuation session, созданная после `Remaining context threshold (%)`, должна показывать inherited binding предыдущей logical session, даже если Settings default у provider уже изменён.
- для `Virtual Simulation` / `Diagram Modules`, стартующих с confirmation card, нижняя панель не должна сохранять provider/model summary предыдущего trunk step: выбранный на карточке provider seed-ит bootstrap snapshot сразу, а затем live runtime model update уточняет effective model без возврата к старому provider context.
- 4-chip layout инвариант: chips 1–3 (`flex: 0 0 auto`) hug свой текст, правая `--limits` плашка (`flex: 1 1 0; min-width: 0`) поглощает весь оставшийся горизонт; внешняя ширина ряда фиксирована родителем (`width: 100%`). При смене модели (например Sonnet → Opus 4.7) reflow происходит только внутри ряда — токен-плашка автоматически меняет ширину, остальной layout остаётся стабильным.
- buttons (chips 2 и 3) интерактивны для Codex и Claude sessions. Runtime и dialog PM views прокидывают callbacks симметрично; Codex вызывает `api.requestCodexModelSwitch(...)`, Claude вызывает `api.requestClaudeModelSwitch(...)`.
- для Gemini sessions callbacks guard'ятся до dispatch: Gemini strategy seam пока отсутствует, поэтому selection is no-op.
- Codex model picker показывает текущий Codex registry order; reasoning picker показывает `reasoningEffortOptions` выбранной/current Codex модели.
- Claude model picker показывает provider-owned alias order `Sonnet` / `Opus` / `Haiku`; thinking picker показывает `off` плюс `low | medium | high | xhigh | max`.
- при выборе новой Codex модели reasoning сохраняется, если он поддержан target model; иначе выбирается первый effort из `reasoningEffortOptions`.
- при выборе новой Claude модели thinking сохраняется, если он поддержан target model; иначе используется `defaultThinkingEffort`; при выборе `off` dispatch идёт с `thinkingEnabled=false` и без stale effort.
- reasoning chip скрывается, когда `model.reasoning` — `undefined` или пустая строка. Для Claude `thinking off` приходит как непустая строка `"thinking off"` и попадает в плашку как `(thinking off)`.
- localization: ключ `session.status.model_label` лежит в approved dict `assets/localization/source/en/messages_for_the_user.json` и legacy mirror `system_feedback.json`; `session.status.tokens_label` переиспользуется без изменений.
- цветовой контракт правой `Токены:` плашки: метрика `used (remaining%)` рендерится тем же нейтральным серым `#b0b0b0`, что и default-фаза кнопок имени модели и reasoning (`color` для `.session-status-chip--limits .session-status-chip__value` в `media/session-view.css`). Цифры не должны притягивать визуальное внимание к себе сильнее, чем имя модели.
