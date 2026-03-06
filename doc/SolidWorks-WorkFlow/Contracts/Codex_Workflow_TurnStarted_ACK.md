# Codex Workflow Turn Started ACK — Contract (SSOT)

## Назначение
Зафиксировать единый и недвусмысленный источник истины для verdict "пользовательский submit реально доставлен провайдеру и новый turn начался" в workflow-сессиях Codex.

Этот контракт сознательно отделяет delivery verdict от диагностических логов и от provider rollout persistence, чтобы runtime-логика не зависела от нескольких конкурирующих источников правды.

## Главный принцип
Для Codex workflow submit существует только один runtime truth source:

- `sdk:turn.started`

Сообщение считается доставленным тогда и только тогда, когда Codex SDK event stream вернул событие `turn.started` для этой конкретной попытки отправки.

## Scope
- Только workflow submit path Codex из Project Manager через Core в provider runtime.
- Только runtime verdict для состояний `pending/delivered/failed_no_ack`.
- Только online decision making в Core/PM.

## Не scope
- Не определяет, как устроен JSONL diagnostics trail.
- Не определяет persistence provider rollout.
- Не определяет post-mortem анализ и ручную диагностику.
- Не определяет retry UX целиком; он описывается в delivery contract.

## Недостаточные сигналы
Следующие сигналы не считаются подтверждением доставки:
- клик `Send` в PM;
- `dialog:send:ack` от Core;
- `core.dialog_send.*` trace;
- `outbound.child.spawned`;
- `outbound.child.stdin_write_finished`;
- `sdk:processor.run_streamed.ready`;
- `sdk:thread.started`;
- provider rollout записи `user_message` / `response_item role:"user"` в runtime-логике verdict.

Причина одна: все эти сигналы либо подтверждают только transport path, либо относятся к диагностике/persistence и создают гонку, если использовать их как параллельный источник истины.

## Достаточный сигнал
Единственный достаточный сигнал:
- `sdk:turn.started`

Интерпретация:
- provider runtime принял submit;
- новый turn реально начался;
- PM/Core могут перевести submit из `pending` в `delivered`.

## State machine

### 1. Pending
После `dialog:send` Core переводит outbound attempt в `pending`.

### 2. Delivered
Если в окне ACK-watchdog пришёл `sdk:turn.started`, attempt немедленно считается `delivered`.

### 3. Failed No Ack
Если ACK-watchdog истёк и `sdk:turn.started` не пришёл, attempt считается `failed_no_ack`.

Никакой дополнительный runtime verdict из rollout, session metadata или других логов в этой ветке не выполняется.

## ACK-watchdog
- ACK-watchdog запускается сразу после provider dispatch.
- Базовое целевое окно ожидания: `15s`.
- Конкретное значение может быть вынесено в настройку/константу, но SSOT-поведение не меняется:
  - ждём только `sdk:turn.started`;
  - по timeout переходим в `failed_no_ack`.

## Retry contract
- Retry разрешён только после terminal verdict `failed_no_ack`.
- Причина retry не пересчитывается из других источников.
- Перед retry Core использует сохранённый payload предыдущей попытки, а не требует ручного повторного ввода.

## Diagnostics boundary
Следующие источники разрешены только для диагностики и post-mortem:
- `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`
- `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`
- provider rollout JSONL под `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`

Они помогают ответить на вопрос "что произошло", но не имеют права менять runtime verdict delivered/failed.

## Rationale
Если ждать truth из нескольких мест одновременно, система получает:
- гонку между stream event и rollout persistence;
- неоднозначный порядок событий;
- риск late-ACK / late-rollout;
- двойную бухгалтерию в PM/Core state machine.

Поэтому контракт жёстко выбирает single source of truth и оставляет остальные сигналы только для диагностики.

## Тестовый минимум
- `sdk:thread.started` без `sdk:turn.started` должен заканчиваться `failed_no_ack`.
- `sdk:turn.started` в пределах ACK-watchdog должен немедленно переводить attempt в `delivered`.
- runtime verdict не должен зависеть от rollout JSONL.
- retry должен появляться только после timeout без `sdk:turn.started`.

## Связанные контракты
- `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
