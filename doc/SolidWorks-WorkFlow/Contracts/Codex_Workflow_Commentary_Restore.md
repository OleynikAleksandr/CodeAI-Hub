# Codex Workflow Commentary Restore for GPT-5.4 — Contract (SSOT)

## Назначение
Вернуть для workflow-сессий Project Manager поведение Codex уровня `gpt-5.3-codex`: промежуточные комментарии агента по ходу работы должны появляться в live stream, сохраняться в unified dialog JSONL и отображаться в диалоговой панели PM при использовании `gpt-5.4`.

## Подтверждённая проблема
- В live Codex session с `gpt-5.4` модель публикует `event_msg.payload.type="agent_message"` с `phase="commentary"`.
- В workflow-сессиях PM (`Description`, `Virtual Simulation`) при `gpt-5.4` в диалог попадает только финальный ответ; промежуточные commentary/thinking отсутствуют.
- Запрет в workflow prompt относится только к публикации полного артефакта в чат. Промежуточные комментарии не запрещены и должны быть обязательными.

## Наблюдаемая причина
- Legacy structured-output path всё ещё живёт в runtime PM workflow turns.
- `outputSchema` и JSON-only contract навязываются не только там, где потребитель явно требует structured result, но и для обычных raw workflow turns.
- `gpt-5.4` в таком контракте уходит в tool-first / final-only поведение: работа идёт через tool/todo events, а промежуточные `agent_message` почти не материализуются.
- Для `gpt-5.3-codex` это долгое время маскировалось тем, что модель чаще публиковала промежуточные commentary даже при более жёстком runtime contract.

## Контрактные инварианты
- Workflow turns Project Manager по умолчанию должны идти в raw conversational contract.
- Structured output для Codex разрешён только по явному opt-in от конкретного caller.
- JSON-only wrapper разрешён только там, где активен explicit structured-output contract.
- Workflow prompt обязан требовать короткие комментарии по ходу работы и после значимых изменений файла.
- Запрет на публикацию полного артефакта в чат не должен трактоваться как запрет на промежуточные commentary messages.
- Unified dialog history для workflow turn обязан содержать не только финальный ответ, но и промежуточные `assistant/commentary`, если провайдер их прислал.

## Границы решения

### 1. PM / Core turn-options boundary
- PM callers не должны подмешивать `outputSchema` в обычные workflow messages.
- Core сохраняет возможность explicit structured turns, но не делает их дефолтом для workflow stages.

### 2. Codex module structured-output boundary
- `StructuredOutputStreamController` не имеет права автоподставлять дефолтную schema в raw turn.
- Если `outputSchema` отсутствует, turn остаётся raw и prompt не получает JSON-only надстройку.

### 3. Codex CLI invocation boundary
- `codex exec` получает `--output-schema` только для explicit structured turn.
- Обычные PM workflow turns должны вызываться без schema-флага.

### 4. Prompt contract boundary
- Description / Virtual Simulation prompts явно требуют progress commentary.
- Формулировка о чате должна запрещать только dump полного markdown-артефакта, а не короткие рабочие апдейты.

### 5. Persistence / PM dialog boundary
- Всё, что приходит как валидные промежуточные commentary от Codex runtime, должно доходить до unified-session writer и сохраняться в dialog JSONL без схлопывания в один финальный ответ.

## План верификации
- Сравнить live workflow rollout `gpt-5.4` до и после фикса: должны появиться несколько `agent_message`/`commentary`, а не только final answer.
- Сравнить unified session JSONL: в диалоге PM должны сохраниться промежуточные реплики, как это было на `gpt-5.3-codex`.
- Проверить, что explicit structured-output use cases, если они остаются, продолжают работать по opt-in и не ломают raw workflow turns.

## Implementation status (2026-03-06)
- Убран implicit structured-output default в Codex runtime: raw turn без `outputSchema` больше не получает JSON-only prompt и не переводится в schema-driven path.
- `codex exec` получает `--output-schema` только для explicit structured turn; PM/Core workflow contract переведён в raw-by-default режим с opt-in marker `allowStructuredOutput`.
- `agent_message/commentary` больше не подавляется для raw turns; suppress commentary остаётся только для explicit structured turns.
- Workflow prompts `Description` и `Virtual Simulation` теперь явно требуют короткие progress commentary updates.
- Core/PM regression coverage добавлена для opt-in boundary и dialog history replay; release/docs финализация остаются в следующих stream'ах Phase 290.

## Связанные документы
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
