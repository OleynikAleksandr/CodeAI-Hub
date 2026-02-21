# Provider Session Home Isolation & Recovery — Contract (SSOT)

## Назначение
Зафиксировать обязательный runtime-контракт для бесконечного жизненного цикла узла сессии в дереве разработки: каждая сессия должна быть возобновляема в том же provider-thread без пересборки контекста в новой сессии.

## Ключевое решение
- **Scope HOME = одна логическая сессия (Session Node)**.
- Промежуточный этап `HOME per workspace` не применяется.
- Recovery выполняется в приоритете через native resume, затем через restore `last-known-good` snapshot этой же session-home.

## Placement `sessionHomePath` (обязательный layout)
- `sessionHomePath` создается **внутри директории выбранного провайдера**:
  - `~/.codeai-hub/providers/claude/sessions/...`
  - `~/.codeai-hub/providers/codex/sessions/...`
  - `~/.codeai-hub/providers/gemini/sessions/...`
- Core не создает HOME для всех провайдеров заранее; создается только HOME провайдера, назначенного текущему Session Node.
- Рекомендуемый path шаблон:
  - `~/.codeai-hub/providers/<providerId>/sessions/<workspaceSlug>/<agentNodeSlug>--<dialogId>/home`
- `agentNodeSlug` формируется из user-visible имени узла/агента (пример: `Reviewer Claude` -> `reviewer-claude`), чтобы путь оставался читаемым.
- Для стабильности и уникальности suffix `--<dialogId>` обязателен даже при одинаковых именах узлов.
- `dialogId` должен быть стабильным ключом UI-истории и Session Node (переживает continuity rollover).

## Канонические сущности
- `dialogId` — логический диалог UI/дерева.
- `sessionId` — runtime id Core для активного узла.
- `providerSessionId` — native thread/session id провайдера (resume key).
- `sessionHomePath` — изолированный home-каталог текущей сессии.
- `turnJournalPath` — durable-журнал turn-состояний и replay payload.
- `dialogHistoryPath` — SSOT истории диалога для UI: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl` (восстановление UI после restart Core/PM).
- `snapshotPath` — путь к `last-known-good` snapshot `sessionHomePath` (обновляется после `completed_success`).

## Глобальное хранилище сессий Core (`~/.codeai-hub/sessions`)
- Текущая плоская/слабо-изолированная модель должна быть заменена на workspace/session-изолированную.
- Минимальное требование: структура и индексы в `~/.codeai-hub/sessions` не должны допускать коллизий между параллельными диалогами разных workspace.
- `~/.codeai-hub/sessions` хранит unified-session историю диалогов (`dialogHistoryPath`) и является SSOT для UI (cold start + восстановление после restart Core/PM).
- Реальные provider HOME размещаются в `~/.codeai-hub/providers/<providerId>/sessions/...` и не смешиваются между Session Node.
- Для каждого Session Node должна существовать явная и стабильная связь:
  - `dialogId` ↔ `sessionId` ↔ `providerSessionId` ↔ `sessionHomePath` ↔ `turnJournalPath`.
- Детальный layout и миграция фиксируются отдельным архитектурным документом до начала реализации orchestration-фазы.

## Инварианты
- Один Session Node пишет только в свой `sessionHomePath`.
- Кросс-сессионные restore/rollback запрещены.
- Перед отправкой turn фиксируется replay payload (`queued`).
- После фактической отправки turn переходит в `sent`.
- Завершение turn (`completed_success`/`completed_failed`) фиксируется явно; после restart dangling `sent` обязателен к обработке.
- **Новый user turn запрещен, пока предыдущий turn не завершен как `completed_success`.**
- Если turn завершился `completed_failed` (или завис), Core обязан запустить recovery (resume/restore/replay policy), а input остается locked до консистентного исхода.
- Любой restore должен быть idempotent и воспроизводим.

## Recovery policy (канон)
1. `resume-first`: попытка возобновить native provider session по `providerSessionId`.
2. Если turn неуспешен/завис или resume не восстановил консистентность turn-state — restore последнего валидного snapshot для **этого** `sessionHomePath`.
3. После restore — повторный resume и controlled replay последнего `sent` turn.
4. Если replay подтвержден как дубликат и не нужен — turn закрывается как `completed_success` без повторной отправки.

## Требования к snapshot (session-home)
- Snapshot scope по умолчанию покрывает весь `sessionHomePath` (без ручного парсинга внутренних подпапок провайдера).
- Исключаются только кэш/временные артефакты, не влияющие на resume (по allowlist/denylist, версионируемой в Core).
- Snapshot ведется как `last-known-good` состояние **после каждого `completed_success` turn** (rolling replace/atomic swap).
- До первого успешного turn должен существовать bootstrap snapshot (база сессии), используемый для restore при раннем fail.
- Снятие snapshot — атомарно (staging + rename).

## Snapshot implementation options (non-SSOT, допускаются оба)
### A) Filesystem snapshot (default)
- Rolling окно: `last_good` + `previous_good` (две точки restore на случай повреждения).
- Инкрементальность достигается через link/reflink/дедуп (реализация зависит от FS/OS).

### B) Git-backed snapshot (optional)
- На каждый Session Node отдельный git-repo (локальный), без remote.
- Commit выполняется только на `completed_success`; хранить только 2 commit-а: `last_good` + `previous_good`.
- После ротации обязательно чистить историю (`reflog expire` + `gc/prune`) чтобы не накапливать скрытые старые состояния.
- Restore выполняется как checkout/restore `sessionHomePath` к выбранному commit-у под lock (atomic swap предпочтительнее).

## Provider binding (обязательные env/entry points)
- **Codex:** `CODEX_HOME=<sessionHomePath>`.
- **Claude:** `HOME=<sessionHomePath>` и provider-home разрешение через `CODEAI_CLAUDE_HOME`.
- **Gemini:** `GEMINI_CLI_HOME=<sessionHomePath>` (поддерживается upstream; интеграция в Core обязательна).

## Auth/credentials policy
- Секреты не дублируются бесконтрольно между session-home.
- Допускаются symlink/copy-once стратегии из базового auth-store провайдера.
- Копирование секретов в snapshot-архивы регулируется отдельной security-policy.

## Ограничения
- Массовый full-copy provider HOME на каждый turn запрещен.
- Snapshot должен быть инкрементальным по факту хранения (link/reflink/dedup или git objects), без разрастания chain копий.

## Наблюдаемость и аудит
- Обязательный telemetry trail: `turnJournal`, `snapshot manifest`, `resume attempt log`, `restore reason`.
- Каждый recovery шаг должен иметь machine-readable причину и outcome.

## Связанные контракты
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
