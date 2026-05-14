# Claude Diagram Modules Provider Audit

**Status:** Historical audit only. The managed workflow runtime paths named in
this report were removed or suspended during the 2026-05-14 managed
orchestration cleanup. This document is retained as evidence for the earlier
Claude/Core feedback investigation and is not an active runtime or servicing
contract.

Дата аудита: 2026-05-09

## Scope

Цель аудита: сравнить успешный проход `Diagram Modules` с провайдером Codex и проблемный проход с провайдером Claude, определить фактический источник повторных отказов Core, проверить `todo-plan`, Git, код Core/provider lifecycle и системные промпты.

Сравниваемые workspace:

- Codex: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.3`
- Claude: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`

Основные источники:

- Codex UI session: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-3/codexCli/codex-1c5f9435-e0d1-47b4-9195-70eadaf5a31a-diagram-modules.jsonl`
- Claude UI session: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/claudeCodeCli/claude-fde4e303-f2db-4c3a-8aa1-4baf3f5861e5-diagram-modules.jsonl`
- Claude native session: `/Users/oleksandroliinyk/.codeai-hub/providers/claude/home/.claude/projects/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/46831dbc-2638-4881-96f0-02be81849bd4.jsonl`
- Core log: `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`
- Stage plans: `doc/TODO/stages/diagram-modules/todo-plan.md` в обоих workspace
- Core/provider code paths:
  - `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
  - `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts`
  - `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-turn-completion.ts`
  - `packages/Claude_Module/src/messaging/message-processor.ts`
  - `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
  - `packages/Claude_Module/src/sdk/claude-workflow-system-prompt.ts`
  - `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`

## Executive Finding

Проблема не сводится к тому, что Claude не понял формат или написал невалидные Product Part artifacts. Первый materialization Claude уже содержал все четыре Product Part files, и Core managed commit `235329a` был создан до того, как Claude получил Core feedback `0/4`.

Историческая проверка snapshot на commit `235329a` через `readDiagramModulesProgressSnapshot` показывает:

- `plannedCount: 4`
- `generatedCount: 4`
- `aggregateReady: true`
- все Product Part diagnostics valid

Значит, ключевой дефект находится в lifecycle Core acceptance feedback: Core может построить и поставить в очередь feedback по устаревшему workflow-state snapshot, снятому во время активного Claude turn, а доставить его уже после того, как workspace стал валидным и был закоммичен. Claude затем честно доверяет этому устаревшему feedback и начинает лишние правки.

Codex прошел с первого раза не потому, что Core path принципиально корректен, а потому что конкретная Codex session не попала в это race window: артефакты были записаны и приняты одним компактным циклом без очереди устаревших provider feedback turns.

## Timeline Comparison

### Codex workspace

Git timeline:

| Время | Commit | Событие |
| --- | --- | --- |
| 2026-05-09T08:03:56+02:00 | `d1a694f` | managed workflow baseline |
| 2026-05-09T08:05:22+02:00 | `b2d3f6b` | `docs: update diagram modules artifacts` |
| 2026-05-09T08:05:23+02:00 | `8118757` | managed workspace ledger |

Codex UI session содержит 40 JSONL строк. Агент за один рабочий проход создал:

- `.codeai-hub/codeai-hub-codex-5-3/diagram_modules/product-parts.index.md`
- `.codeai-hub/codeai-hub-codex-5-3/diagram_modules/product-parts/project-manager.md`
- `.codeai-hub/codeai-hub-codex-5-3/diagram_modules/product-parts/vs-code-extension.md`
- `.codeai-hub/codeai-hub-codex-5-3/diagram_modules/product-parts/core-runtime.md`
- `.codeai-hub/codeai-hub-codex-5-3/diagram_modules/product-parts/ai-providers.md`

В Codex UI session нет `Core acceptance check failed`. Stage plan показывает один основной artifact commit `b2d3f6b`, после чего workflow остался на continuation anchor.

### Claude workspace

Первый Claude turn по native session:

| Время UTC | Событие |
| --- | --- |
| 05:55:00 | Claude writes `product-parts.index.md` |
| 05:55:31 | Claude writes `project-manager.md` |
| 05:55:53 | Claude writes `vs-code-extension.md` |
| 05:56:24 | Claude writes `core-runtime.md` |
| 05:56:48 | Claude writes `ai-providers.md` |
| 05:56:59 | Core managed commit `235329a docs: update diagram modules artifacts` |
| 05:57:04 | Claude sends readiness answer |
| 05:57:08 | UI receives Core feedback `Observed valid Product Part artifacts: 0/4` |
| 05:57:09 | Claude native receives same Core feedback |

Ключевой факт: feedback `0/4` пришел после commit `235329a`, а commit `235329a` уже валиден по текущему Core validator.

Дальше Claude session повторяет один и тот же паттерн:

| Feedback | Observed valid artifacts | Смысл |
| --- | --- | --- |
| 05:57:08/09 | `0/4` | Core считает отсутствующими все Product Parts |
| 05:59:49/51 | `1/4` | Core уже видит `project-manager` |
| 06:01:04/06 | `2/4` | Core уже видит `project-manager`, `vs-code-extension` |
| 06:03:01/06 | `3/4` | Core уже видит `project-manager`, `vs-code-extension`, `core-runtime` |

Git timeline Claude workspace:

| Время | Commit | Событие |
| --- | --- | --- |
| 2026-05-09T07:53:53+02:00 | `b3713ba` | managed workflow baseline |
| 2026-05-09T07:56:59+02:00 | `235329a` | first full Diagram Modules artifact commit |
| 2026-05-09T07:57:00+02:00 | `cb3aee1` | managed workspace ledger |
| 2026-05-09T07:58:35+02:00 | `975c588` | redundant `project-manager` update |
| 2026-05-09T07:59:00+02:00 | `3a3aff0` | redundant `vs-code-extension` update |
| 2026-05-09T07:59:31+02:00 | `ce108d1` | redundant `core-runtime` update |
| 2026-05-09T07:59:49+02:00 | `f640ce6` | redundant `ai-providers` update |
| 2026-05-09T08:01:02+02:00 | `84d015c` | redundant multi-file update |
| 2026-05-09T08:02:44+02:00 | `677abcf` | redundant `core-runtime` update |
| 2026-05-09T08:06:47+02:00 | `4a032a6` | redundant `ai-providers` update |

Claude stage plan отражает эту деградацию: вместо одного artifact commit, как у Codex, он содержит цепочку дополнительных task/commit items, порожденных повторными Core feedback turns.

## Artifact Validation

Текущие workspace state для Codex и Claude валидны: `readDiagramModulesProgressSnapshot` видит `4/4` Product Part artifacts и `aggregateReady: true`.

Историческая проверка commit `235329a` в Claude workspace также валидна:

- `project-manager`: valid
- `vs-code-extension`: valid
- `core-runtime`: valid
- `ai-providers`: valid

Следовательно, первое Core rejection message `0/4` не описывало фактическое состояние workspace на момент доставки сообщения агенту. Это stale feedback.

В Claude workspace после финального состояния отсутствует `module-map.flow.json`, в то время как в Codex workspace он есть. Это вторичный симптом: из-за цепочки ложных rejection turns workflow не дошел до нормального downstream/finalization path или был остановлен до стабильного acceptance progression.

## Core Lifecycle Analysis

### Где рождается stale feedback

В `workflow-state-service.ts` Core читает несколько workflow snapshots параллельно, включая `readDiagramModulesProgressSnapshot`, затем вызывает `commitManagedDocumentationStageIfReady`, а после этого может вызвать `sendDiagramModulesFeedback`.

Предыдущий freshness fix в `workflow-state-managed-documentation-commit.ts` полезен, но он закрывает только часть проблемы: commit helper действительно перечитывает progress перед commit и после commit. Однако feedback candidate все еще может быть сформирован или поставлен в очередь из workflow-state poll, который произошел во время активного provider turn, когда Claude успел записать только часть файлов.

### Почему это сильнее проявляется у Claude

Claude provider работает через очередь turns:

- `Claude_Module/src/messaging/message-processor.ts` ставит входящие turns в очередь.
- Core feedback, отправленный через `gateway.handleMessage`, может ждать завершения текущего Claude turn.
- Пока feedback ждет в очереди, workspace уже меняется: Claude дописывает файлы, Core делает managed commit, ledger обновляется.
- Когда feedback наконец доставляется, он уже устарел, но выглядит для Claude как актуальная команда Core.

Codex в этом тесте не попал в такой сценарий: его artifact generation был достаточно компактным, и Core не успел доставить ложную серию feedback turns между partial file states.

### Input lock symptom

`SessionRequestHandler.markFeedbackTurnStarted` сейчас просто emits `state: "running"`. Но исходный provider turn позже может emit `turn_completed`, и UI получает `idle`, хотя Core feedback turn уже pending или queued.

Это объясняет наблюдение пользователя: input может разблокироваться, while reasoning/next turn work still continues. Источник проблемы не только UI; это отсутствие отдельного lifecycle state для pending Core feedback, который должен переживать обычный provider `turn_completed`.

### Feedback message quality

Текущий feedback уже стал информативнее: он показывает stage, rule, observed count, planned Product Parts, next invalid Product Part и конкретные paths. Но в stale сценарии эта информативность вводит агента в заблуждение, потому что сообщение не содержит:

- snapshot timestamp;
- snapshot Git HEAD;
- фактический current HEAD на момент доставки;
- отметку, что feedback был построен while provider turn was still active;
- проверку, что validation result все еще актуален прямо перед отправкой queued feedback.

Пока нет freshness guard, даже хорошее diagnostic message превращается в ложную инструкцию.

## Provider Prompt Analysis

Step prompt для Codex и Claude в Diagram Modules существенно одинаковый по контракту. Оба провайдера получают:

- `diagram-modules-prompt.md`
- `diagram-modules-field-reference.md`
- `product-part-template.md`
- `product-parts-index-template.md`

Шаблоны действительно были переданы, поэтому primary failure не в том, что Claude не получил формат.

Разница есть в base/system prompt providers:

- Claude system prompt (`claude-workflow-system-prompt.ts`) короче и более общий.
- Codex instruction profile (`codex-workflow-instruction-profile.ts`) жестче задает workflow discipline, visible progress updates, artifact-first behavior, source discipline и правила редактирования.
- Claude system prompt просит не раскрывать private reasoning, но provider path при этом включает partial/thinking stream, который UI затем показывает как отдельные карточки.

Это не первопричина Core rejection, но это усиливает ущерб:

- Claude доверяет stale Core feedback и начинает строить гипотезы о несуществующих проблемах.
- Claude пишет слишком много reasoning/progress noise.
- Из partial stream появляются короткие отдельные плашки вроде `.`, `ceptance.`, `Ференс.`.

## Root Cause Ranking

1. **P0: Core stale acceptance feedback.** Feedback может быть основан на partial snapshot, снятом во время активного Claude turn, и доставлен после валидного managed commit.
2. **P0: Нет устойчивого lock state для pending Core feedback.** UI может получить `idle` от завершенного provider turn, пока queued Core feedback/next reasoning уже существует.
3. **P1: Feedback не содержит freshness metadata и не revalidates before delivery.** Агент не может отличить актуальную validation failure от устаревшей.
4. **P1: Claude partial/thinking stream слишком сырой для UI.** Отсюда односимвольные и фрагментарные карточки.
5. **P2: Claude system prompt слабее Codex prompt.** Его нужно усилить, но prompt-only fix не устранит race в Core.

## Recommended Fix Focus

Исправление нужно начинать с Core lifecycle, а не с попытки "лучше объяснить Claude формат".

Рекомендуемый порядок:

1. Перенести Diagram Modules acceptance feedback на post-turn boundary: после provider `turn_completed` Core должен заново читать progress, Git status и current HEAD, а не использовать старый snapshot из workflow-state poll.
2. Добавить freshness guard прямо перед `sendManagedStageFeedback`: если current progress уже `aggregateReady`, если generated count вырос, если HEAD изменился или managed commit уже сделан, suppress stale feedback.
3. Разделить semantic invalid feedback и dirty/pending commit gate:
   - если artifacts semantic-valid, но Core commit pending, агенту нужно говорить wait/do nothing;
   - если artifacts invalid, feedback должен строиться только из свежего snapshot.
4. Ввести явный session state для `core_feedback_pending` или эквивалентный lock token, который не снимается обычным provider `turn_completed`.
5. После Core fix отдельно почистить Claude provider:
   - coalesce/фильтровать `thinking_live` fragments перед UI;
   - не показывать односимвольные partial blocks как отдельные messages;
   - усилить Claude system prompt до уровня Codex workflow discipline, особенно по language compliance, visible progress и недоверию к stale diagnostics при наличии свежего managed commit.

## Conclusion

Claude действительно ведет себя хуже Codex в этой сессии, но основной источник отказов не формат артефактов Claude. Первый полный Claude artifact commit был валиден. Повторные ошибки породил Core lifecycle: stale acceptance feedback из partial snapshots был доставлен агенту как актуальная команда. Поэтому главный фикс должен быть Core-first: fresh post-turn validation, suppression stale feedback, корректный pending feedback lock. После этого имеет смысл дорабатывать Claude prompt и stream rendering.
