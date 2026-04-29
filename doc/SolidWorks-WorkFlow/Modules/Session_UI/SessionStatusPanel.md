# Session Status Panel — Factual Module Inventory

**Surface:** нижняя статусная строка  
**Primary code:** `src/client/ui/src/session/status-panel.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
**Canonical styles:** `media/session-view.css` блок `.session-status-row`, `.session-status-chip`, `.session-status-chip--label`, `.session-status-chip--limits`, `.session-status-button`, `.session-status-button--{claude,codex,gemini}`, `.session-status__debug-strip`.

## Роль

Показывает live state одной logical session в виде четырёх-chip ряда:
1. label `Модель:`;
2. имя выбранной модели (provider-tinted button shape, click handler пока не подключён);
3. опциональный `(reasoning)` (тот же button shape; скрывается при отсутствующем `model.reasoning`);
4. правая `Токены:` плашка с `used (remaining%)` и свободным правым краем под будущие per-session signals.

Панель возвращает `null`, если Core не `ready` или в `status.models` нет хотя бы одного элемента; legacy single-line fallback и `Core Supervisor: starting…` снят с обороты в этом surface.

## Что принимает

- `connectionStatus`
- `connectionDetail` (зарезервирован для совместимости caller'а; в текущей разметке не используется)
- `status`
- `tokenDebugSummary` — опционально, рендерится отдельным muted strip ниже chip-ряда.

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
- при `session:model:update`;
- при новых token usage/history данных.

## Что отдает наружу

Ничего. Это read-only projection panel.

## Локальный state

Отсутствует.

## Особенности

- в dialog mode `useRuntimeModelSync()` умеет fallback-обновлять snapshot по `activeSessionId`, если runtime broadcast пришёл с другим `sessionId`;
- панель зависит сразу от двух truth-lines: Core connection и active snapshot status.
- две logical sessions одного provider могут одновременно показывать разные модели, потому что label принадлежит session binding, а не текущему provider default в Settings.
- continuation session, созданная после `Remaining context threshold (%)`, должна показывать inherited binding предыдущей logical session, даже если Settings default у provider уже изменён.
- для `Virtual Simulation` / `Diagram Modules`, стартующих с confirmation card, нижняя панель не должна сохранять provider/model summary предыдущего trunk step: выбранный на карточке provider seed-ит bootstrap snapshot сразу, а затем live runtime model update уточняет effective model без возврата к старому provider context.
- 4-chip layout инвариант: chips 1–3 (`flex: 0 0 auto`) hug свой текст, правая `--limits` плашка (`flex: 1 1 0; min-width: 0`) поглощает весь оставшийся горизонт; внешняя ширина ряда фиксирована родителем (`width: 100%`). При смене модели (например Sonnet → Opus 4.7) reflow происходит только внутри ряда — токен-плашка автоматически меняет ширину, остальной layout остаётся стабильным.
- buttons (chips 2 и 3) в этом релизе остаются чисто визуальными: `<button type="button">` без `onClick`. Click-handlers (выбор модели / reasoning) — отдельный будущий scope.
- reasoning chip скрывается, когда `model.reasoning` — `undefined` или пустая строка. Для Claude `thinking off` уже приходит как непустая строка `"thinking off"` и попадает в плашку как `(thinking off)`; в будущем эта же строка станет одним из выборов в click-driven dropdown.
- localization: ключ `session.status.model_label` лежит в approved dict `assets/localization/source/en/messages_for_the_user.json` и legacy mirror `system_feedback.json`; `session.status.tokens_label` переиспользуется без изменений.
- цветовой контракт правой `Токены:` плашки: метрика `used (remaining%)` рендерится тем же нейтральным серым `#b0b0b0`, что и default-фаза кнопок имени модели и reasoning (`color` для `.session-status-chip--limits .session-status-chip__value` в `media/session-view.css`). Цифры не должны притягивать визуальное внимание к себе сильнее, чем имя модели.
