# Claude Workflow Turn Started ACK — Contract (SSOT)

## Назначение
Зафиксировать единый и недвусмысленный источник истины для verdict "пользовательский submit реально доставлен провайдеру Claude и новый turn начался" в workflow-сессиях Claude.

Этот контракт сознательно отделяет delivery verdict от локальных lifecycle-сигналов и от диагностических логов, чтобы runtime-логика не зависела от нескольких конкурирующих источников правды.

## Главный принцип
Для Claude workflow submit существует только один runtime truth source:

- `sdk:stream_event` с `event.type=message_start`

Сообщение считается доставленным тогда и только тогда, когда Claude SDK event stream вернул provider-originated `message_start` для этой конкретной попытки отправки.

## Scope
- Только workflow submit path Claude из Project Manager через Core в provider runtime.
- Только runtime verdict для состояний `pending/delivered/failed_no_ack`.
- Только online decision making в Core/PM.

## Не scope
- Не определяет, как устроен JSONL diagnostics trail.
- Не определяет post-mortem анализ и ручную диагностику.
- Не определяет retry UX целиком; он описывается в delivery contract.

## Недостаточные сигналы
Следующие сигналы не считаются подтверждением доставки:
- клик `Send` в PM;
- `dialog:send:ack` от Core;
- `core.dialog_send.*` trace;
- локальный Claude `turn_started`;
- `sdk:system` с `subtype=init`;
- `assistant` output как первый используемый ACK;
- terminal signals вроде `sdk:result` или `turn_completed`.

Причина одна: все эти сигналы либо подтверждают только transport/runtime bootstrap, либо генерируются локально, либо приходят слишком поздно и не подходят как единый turn-start verdict.

## Достаточный сигнал
Единственный достаточный сигнал:
- `sdk:stream_event` с `event.type=message_start`

Интерпретация:
- provider runtime принял submit;
- новый assistant turn реально стартовал;
- PM/Core могут перевести submit из `pending` в `delivered`.

## State machine

### 1. Pending
После `dialog:send` Core переводит outbound attempt в `pending`.

### 2. Delivered
Если в окне ACK-watchdog пришёл provider-originated `sdk:stream_event(message_start)`, attempt немедленно считается `delivered`.

### 3. Failed No Ack
Если ACK-watchdog истёк и `sdk:stream_event(message_start)` не пришёл, attempt считается `failed_no_ack`.

Никакой дополнительный runtime verdict из других SDK-событий или diagnostics логов в этой ветке не выполняется.

## ACK-watchdog
- ACK-watchdog запускается сразу после provider dispatch.
- Базовое целевое окно ожидания: `15s`.
- Конкретное значение может быть вынесено в настройку/константу, но SSOT-поведение не меняется:
  - ждём только `sdk:stream_event(message_start)`;
  - по timeout переходим в `failed_no_ack`.

## Retry contract
- Retry разрешён только после terminal verdict `failed_no_ack`.
- Причина retry не пересчитывается из других источников.
- Перед retry Core использует сохранённый payload предыдущей попытки, а не требует ручного повторного ввода.

## Diagnostics boundary
Следующие источники разрешены только для диагностики и post-mortem:
- `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`
- `~/.codeai-hub/logs/claude/sdk-claude-<providerSessionId>.jsonl`
- provider-home session JSONL под `~/.codeai-hub/providers/claude/home/.claude/projects/**/<sessionId>.jsonl`

Они помогают ответить на вопрос "что произошло", но не имеют права менять runtime verdict delivered/failed.

## Observed live baseline
В adapter-level live experiment для resume-path Claude последовательность была такой:
- локальный `turn_started`;
- `sdk:system (subtype=init)`;
- `sdk:stream_event (message_start)`;
- далее assistant output и terminal events.

Следовательно, первый пригодный provider-native ACK для начала нового turn у Claude — это именно `message_start`, а не локальный lifecycle signal.

## Rationale
У Claude и Codex разные event-модели. Контракт фиксирует не одинаковую метку события, а одинаковый архитектурный принцип:
- один provider-specific truth source на провайдера;
- никакой двойной бухгалтерии между локальными lifecycle и диагностическими логами.

Для Codex это `sdk:turn.started`; для Claude это `sdk:stream_event(message_start)`.

## Тестовый минимум
- Локальный Claude `turn_started` без provider `message_start` должен заканчиваться `failed_no_ack`.
- `sdk:system (subtype=init)` без `message_start` должен заканчиваться `failed_no_ack`.
- `sdk:stream_event(message_start)` в пределах ACK-watchdog должен немедленно переводить attempt в `delivered`.
- Runtime verdict не должен зависеть от provider-home session JSONL.

## Связанные контракты
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
