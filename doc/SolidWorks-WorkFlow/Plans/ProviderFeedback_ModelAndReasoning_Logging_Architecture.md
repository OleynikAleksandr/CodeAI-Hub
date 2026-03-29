# Provider Feedback Model And Reasoning Logging Architecture

## Problem
После релиза `1.1.835` effective model identity уже применяется внутри CodeAI Hub, но текущие SDK-логи не дают надёжного ответа на главный эксплуатационный вопрос: что именно реально подтвердил внешний provider runtime.

Проблема не в отсутствии внутренних intent-логов. Наоборот, внутренний лог `мы применили / мы отправили` не закрывает риск. Нам нужен только provider-side feedback, то есть сигнал, который пришёл обратно из Claude/Codex/Gemini runtime после запуска turn.

Сейчас картина асимметрична:
- `Codex` raw rollout пишет `turn_context` c `model` и `effort`, но этот feedback не поднимается в `sdk-codex-*.jsonl`.
- `Claude` SDK лог пишет сырые stream messages и thinking blocks, но не выделяет provider feedback отдельно как удобный observability record.
- `Gemini` raw log пишет `model_info`, `thought` и `finished.usageMetadata`, но `logEvent(...)` не сохраняется в `sdk-gemini-*.jsonl`, поэтому provider feedback не нормализован и неудобен для аудита.

## Goal
Сделать так, чтобы каждый provider писал в свой SDK log отдельные `provider_feedback` записи только на основе реально полученного runtime echo/ack от провайдера.

Критерий готовности:
- в `sdk-codex-*.jsonl` появляется provider feedback из raw `turn_context` с реально применёнными `model` и `reasoning effort`;
- в `sdk-claude-*.jsonl` появляются provider feedback записи о реально наблюдаемой provider model и реально наблюдаемых thinking blocks;
- в `sdk-gemini-*.jsonl` появляются provider feedback записи о `model_info`, `thought` и `thoughtsTokenCount` из `finished.usageMetadata`, то есть только о реально наблюдаемом provider behavior;
- ни одна новая запись не должна описывать внутренний intent как будто это provider ack.

## Non-goals
- Не добавляем fake-telemetry вида `requestedModel`, `requestedReasoning`, если они не подтверждены provider runtime.
- Не пытаемся выдумывать `thinking level`, если provider его не echo-ит.
- Не меняем transport contract Core/UI ради логирования.

## Provider-specific contract

### Codex
Источник правды: raw JSON events из `codex exec --experimental-json`.

Надёжный feedback:
- `turn_context.payload.model`
- `turn_context.payload.effort`
- при наличии `turn_context.payload.collaboration_mode.settings.reasoning_effort`

Решение:
- перехватывать raw parsed event до того, как Codex SDK схлопнет его в более узкий event stream;
- писать отдельную `provider_feedback` запись в `sdk-codex-*.jsonl` только для `turn_context`.

### Claude
Источник правды: stream messages от Claude SDK.

Надёжный feedback:
- `message.model` в `assistant/result/stream_event.message_start`
- `content block type = thinking`

Ограничение:
- Claude feedback не возвращает нормализованный `thinking:on/off` или `maxThinkingTokens` как applied echo.

Решение:
- логировать provider feedback только как:
  - `model_observed`
  - `thinking_block_observed`
- не логировать `maxThinkingTokens` как provider feedback.

### Gemini
Источник правды: server stream events от Gemini CLI runtime.

Надёжный feedback:
- `model_info`
- `thought`
- `finished.usageMetadata.thoughtsTokenCount`

Ограничение:
- Gemini runtime не echo-ит обратно точный `thinkingLevel`.

Решение:
- сохранять `logEvent(...)` в `sdk-gemini-*.jsonl`;
- выделять provider feedback записи для:
  - `model_info`
  - `thought_observed`
  - `thoughts_usage_observed`
- не писать `thinkingLevel` как подтверждённый provider feedback.

## Implementation slices
1. Codex: raw provider feedback bridge в SDK log.
2. Claude: provider feedback normalization поверх существующего stream router.
3. Gemini: persist structured event log + provider feedback normalization для `model_info`, `thought`, `thoughtsTokenCount`.
4. Docs and targeted verification.

## Verification
- Tarгетные тесты провайдерских пакетов.
- Ручная проверка `sdk-claude-*.jsonl`, `sdk-codex-*.jsonl`, `sdk-gemini-*.jsonl` на наличие `provider_feedback` после тестового turn.
- Проверять именно runtime echo, а не наличие local intent записи.
