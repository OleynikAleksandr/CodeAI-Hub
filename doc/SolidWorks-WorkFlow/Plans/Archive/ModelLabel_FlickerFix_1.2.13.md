# Model Label Flicker Fix 1.2.13 — Planning Doc

## 1. Problem

В нижней панели SESSION UI label модели "прыгает" между двумя формами: `Gemini 3.1 Pro Preview (thinking high)` и `Gemini 3.1 Pro Preview (high)`. Пользователь подтвердил скриншотами 17:0X — один turn показан первой формой, другой (той же моделью, тем же thinkingLevel) — второй. Косметический баг, функциональность не затронута.

## 2. Root cause

Два разных пути broadcast'a `session:model:update`:

- **Путь A — raw SDK `model_info` event.** `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` `broadcastRuntimeModelUpdate` форвардит `data.model` от Gemini SDK как-есть: `"gemini-3.1-pro-preview"` (без эффективного thinking suffix). UI клиент (`src/client/ui/src/session/model-info-builder.ts` `parseEffectiveModelId` + `resolveModelReasoning`) не находит regex match → fallback на `settings.providers.gemini.thinkingLevelByModel[modelId]` → получает строку `"high"` → label "(high)".

- **Путь B — applied turn config update.** `session-request-handler-message-dispatch.ts:388` шлёт `turnConfig.effectiveModelId` = `"gemini-3.1-pro-preview thinking:high"` (через `buildProviderEffectiveModelId`). UI парсит суффикс `thinking:high` → label "(thinking high)".

Mismatch: Путь A не выдаёт эффективную identity, Путь B выдаёт. Последний прилетевший update выигрывает — отсюда мерцание.

## 3. Solution

Обогатить Путь A эффективной identity через тот же `buildProviderEffectiveModelId` что использует Путь B.

- `SessionRequestHandlerAppliedTurnConfig` экспонирует новый публичный метод `resolveEffectiveModelId(providerId, targetModelId)` возвращающий effective id для конкретной modelId (или undefined если unable).
- `SessionProviderEventRouterDependencies` получает optional `resolveEffectiveModelId` прокинутый из wiring в `session-request-handler-runtime-core.ts`.
- `broadcastRuntimeModelUpdate` вызывает его, использует результат если non-null, fallback на raw modelId если helper не смог резолвить.

После fix оба пути будут отдавать одну и ту же effective identity → UI перестанет мерцать.

## 4. Structure

Изменения в трёх файлах:
- `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts` — новый публичный `resolveEffectiveModelId`.
- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` — deps + enrichment.
- `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts` — wire prop.

## 5. Contracts

**Invariant 26** (Effective model identity SSOT) расширяется: **любой** broadcast `session:model:update` обязан нести effective modelId (с thinking/reasoning суффиксом), а не raw base id от SDK. Это required для стабильного label'а UI. Raw `data.model` от provider SDK должен обогащаться через `AppliedTurnConfig.resolveEffectiveModelId` до broadcast.

## 6. Release

1.2.13 VSIX + tarballs. Косметический fix, без изменений бизнес-логики turn обработки.

## 7. Out of scope

- Per-turn actual-used thinking level (когда Gemini динамически пропускает reasoning — UI всё равно показывает settings-level, не actual used). Это product decision: показывать требуемый или фактический потреблённый. Не трогаем.
- Codex / Claude label (у них Путь A редко эмитит model_info через SDK — Claude SDK шлёт через другой путь; баг если проявится, чинится тем же механизмом).
