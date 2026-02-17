# Session Continuity — Contract (SSOT)

## Важно (переходный период миграции)

- Контракт будет приведён к новой структуре `doc/SolidWorks-WorkFlow/`.
- Ниже временно включён legacy‑контент “as-is” из старого пути.
- Все новые изменения по continuity фиксируем **в этом файле**.

---

## Legacy content (migrated as-is; will be trimmed)

# Session Continuity (SolidWorks-Flow) — Rollover / Auto-Handoff (Source of Truth)

**Status:** Active
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr + Codex

---

## 0) Scope

Этот документ — **единственный источник правды** для continuity/rollover поведения сессий в FLOW:
- когда и как система принимает решение о rollover по фактическому remaining context window;
- как выглядит UX “бесконечной” сессии в узле Workflow Tree;
- контракт continuity‑отчёта (report) и правил его хранения;
- базовые требования к провайдерам (turn lifecycle + token usage events);
- взаимодействие с lock/unlock контрактом Workspace Runtime.

Связанные каноны:
- Workspace Runtime (lock/unlock, snapshot-first): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Description → Reviewer (узловая специфика): `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`

---

## 1) Problem

Провайдерные threads/sessions имеют ограниченное контекстное окно. В долгоживущих узловых сессиях (например, `Reviewer`, `Spec/Plan/Execute`) при исчерпании бюджета нужно **автоматически**:
- зафиксировать краткий handoff‑контекст;
- открыть новый provider segment;
- восстановить контекст так, чтобы для пользователя это выглядело как продолжение работы **внутри того же узла**.

Нельзя переносить “весь диалог” — это шум и гарантированное сжигание окна.

---

## 2) Terms

- **Node (узел):** единица работы в Workflow Tree (`description`, `virtual_simulation`, `diagram_modules`, …).
- **Role/Agent:** роль внутри узла (например, `Reviewer`).
- **Provider segment:** один реальный provider session/thread (`providerSessionId`) для конкретного `providerId`.
- **Rollover:** переключение на новый provider segment внутри того же узла.
- **Continuity Report:** единственный мост между сегментами (короткий Markdown‑отчёт).

Важно: **Node bootstrap** (переход на другой узел/роль) ≠ Continuity.

---

## 3) Key Decisions

### 3.1 Отчёт пишет агент; Core доставляет его содержимое в resume bootstrap
- Агент **сам** пишет continuity‑отчёт по указанному пути (`reportPath`).
- В новый provider segment агент **не обязан** читать отчёт с диска (bootstrap запрещает команды/инструменты).
- Core:
  - принимает решение о rollover (по token usage);
  - отправляет агенту внутреннюю инструкцию “как составить отчёт + куда сохранить”;
  - watcher’ом ждёт появления финального файла;
  - **читает** финальный отчёт и копирует его в `Flow Node Continuity — Resume` как `reportBody` (с лимитом и явной пометкой truncation);
  - создаёт новый provider segment и отправляет `resume` как первое internal сообщение.

### 3.2 Отчёт — единственный мост
В новый segment не переносится переписка/полная история. Всё критичное для продолжения процесса должно быть кратко зафиксировано в отчёте.

### 3.3 Единый lock/unlock контракт
Lock/unlock вычисляется **только** по `workspace:snapshot` (snapshot-first). `turnState=idle` сам по себе не гарантирует unlock.
Нормативный контракт — в `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`.

### 3.4 Operational freeze: Gemini
- `Description(one-shot) -> Reviewer(resume)` на Gemini подтверждён рабочим в `1.1.538` и остаётся операционно валидированным в `1.1.560`.
- Дальнейшее развитие Gemini continuity/rollover эвристик заморожено до появления надёжного runtime‑контракта remaining context window telemetry.
- В период паузы допустимы только bugfix‑изменения без расширения Gemini‑функционала.

---

## 4) Trigger Policy (Source of Truth = runtime events)

### 4.1 Token usage extraction
Core извлекает `used/limit` из provider событий (поддерживаются разные ключи: `token_count`, `total_tokens`, `prompt_tokens+completion_tokens`, …).

См. реализацию: `packages/core/src/session-continuity/token-usage.ts`.

### 4.2 Threshold = remaining percent (per provider)
Решение о rollover принимается по условию:

- `computeRemainingPercent(usage) <= remainingPercentThreshold`

Где:
- `computeRemainingPercent` возвращает целое число 0..100;
- `remainingPercentThreshold` берётся из live settings (clamp 5..80).

Defaults (если настройка отсутствует):
- Claude: `30`
- Codex: `30`

См. нормализацию settings:
- `src/extension-module/settings/claude-settings.ts`
- `src/extension-module/settings/codex-settings.ts`

---

## 5) Rollover Flow (MVP)

1. Core получает token usage (used/limit) и обновляет snapshot.
2. После завершения turn Core выполняет post-turn arbitration:
   - если threshold не достигнут → `no_rollover_needed`.
   - если threshold достигнут → `rollover_required` и включается continuity lock.
3. Core отправляет агенту internal message: “составь continuity report по шаблону и сохрани по `reportPath`”.
4. Агент пишет отчёт **атомарно**: `report.tmp.md` → `rename` → `report.md`.
5. Core watcher ждёт финальный файл.
6. Core закрывает старый provider segment и создаёт новый.
7. Core стартует новый segment и первым сообщением отправляет:
   - internal resume prompt `Flow Node Continuity — Resume`, который содержит:
     - `reportPath` (для ссылок/диагностики),
     - `reportBody` (копия отчёта, уже вставленная Core),
     - запрет на команды/записи/создание артефактов на bootstrap-turn;
   - узло‑специфичный prompt (обычный старт) уже после bootstrap (или как часть следующего штатного шага, в зависимости от узла).
8. Unlock gate: input остаётся locked до первого bootstrap assistant answer в новом segment (служебный шаг).

---

### 5.1 UI Transcript Contract (Project Manager)

Параллельно с provider continuity, Project Manager должен обеспечивать устойчивое отображение диалога агента:

- **Cold start (после перезапуска Core/PM):** история диалога восстанавливается из unified JSONL (append-only) по `dialogId` (basename JSONL).
  - Формат/путь: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`, где `workspaceKey = sanitize(workspacePath)`.
- **Hot mode (PM активен):** новые сообщения приходят как live stream `dialog:message` по `dialogId`, а статус/usage/lock обновляются через snapshot‑first по runtime session id (`latestSessionId`).
- **Dedupe (обязателен):** UI должен гасить replay/reconnect повторы:
  - по `messageId` (строгая идентичность),
  - и по ключу `role + createdAt + content` (tail dedupe), т.к. некоторые replays могут приходить с новыми id.
- **Continuity chain UI:** когда один узел/роль состоит из нескольких provider segments, UI отображает их как один диалог. Bootstrap system prompt каждого continuation segment (segmentIndex > 0) не должен засорять диалог повторениями.
- **Reconnect (Core restart):** после reconnect PM обязан повторно активировать workspace (`workspace-activate`), иначе runtime session registry остаётся пустым и сессии не открываются.

## 6) Report Storage Layout

Continuity‑отчёты хранятся рядом с артефактами узла и остаются на диске.

Рекомендуемая схема пути:

- `<workspaceRoot>/.codeai-hub/<workspaceSlug>/flow/nodes/<nodeId>/continuity/reports/<ISO_TIMESTAMP>-<role>-<providerId>.md`

Core:
- не создаёт папки заранее;
- не пишет файлы;
- ждёт появление отчёта по объявленному пути и **читает** его для формирования `resume` (не модифицируя содержимое на диске).

---

## 7) Continuity Report Contract

### 7.1 Global rules (mandatory)
1. **Никакой переписки:** нельзя вставлять историю чата.
2. **Никаких больших вставок артефактов:** нельзя копировать `Final_Description.md`, большие diff’ы, исходники.
3. **Только ссылки/пути + минимальные буллеты.**
4. **Отчёт короткий:** ориентир ~200 строк максимум.
5. **Атомарная запись:** `*.tmp.md` → `rename` → `*.md`.

### 7.2 Doc Node report (пример: Reviewer)
Обязательные секции:

```md
# Continuity Report — <nodeId> / Reviewer

## Canonical Artifact
- <path>: `Final_Description.md`

## References To Read (only if needed)
- <path>: <1 строка “зачем это читать”>

## Pending From User
- <вопрос/ожидание 1>
- <вопрос/ожидание 2>
```

### 7.3 Code Node report (пример: Spec/Plan/Execute)

```md
# Continuity Report — <nodeId> / <role>

## Current Task
- What: <кратко>
- Scope: <файлы/пакеты>
- Acceptance: <критерии>

## Required Reads (ordered)
1. <path>: <зачем>
2. <path>: <зачем>

## Repo Context
- Branch: <name>
- Base commit (if known): <hash>
- Last relevant commits:
  - <hash>: <message>

## Gates / Builds (last known)
- `./scripts/check-architecture.sh`: <OK/FAIL/NOT RUN>
- `npx ultracite check`: <OK/FAIL/NOT RUN>
- `npx ts-prune`: <OK/FAIL/NOT RUN>
- `npx jscpd ...`: <OK/FAIL/NOT RUN>
- `npm run check:links`: <OK/FAIL/NOT RUN>
- Target build: <команда>: <OK/FAIL/NOT RUN>

## Open Issues / Risks
- <кратко>

## Next Step
- <следующее действие на 1 шаг>
```

---

## 8) Templates (IDs / placeholders)

Default templates directory:
- `~/.codeai-hub/templates/`

Template IDs (MVP):
- `flow/continuity/create-report-doc.md`
- `flow/continuity/create-report-code.md`
- `flow/continuity/resume.md`

Placeholders:
- `{{nodeId}}`
- `{{role}}`
- `{{reportPath}}`
- `{{reportBody}}` (копия отчёта, подготовленная Core; может быть truncated)
- `{{canonicalArtifactPath}}` (doc-node only)

Fallback rule:
- если пользовательский файл шаблона отсутствует, Core использует bundled template с тем же `templateId`.

---

## 9) Unified Session History (source-of-truth для UI)

История диалога в UI читается **не из провайдерных логов**, а из unified-session JSONL:

- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`

Где:
- `providerSessionId` — provider-native id (используется для resume и для привязки provider events).
- `dialogId` — **стабильный** id логического диалога агента для UI-истории (не меняется при rollover/resume и переживает рестарты Core).

Важно (с 1.1.585):
- Нельзя использовать `providerSessionId` как имя файла истории для long-lived агентов: это приводит к распаду истории на сегменты и потере склейки после рестарта Core.
- Для всех **следующих агентов** и flow-ноды/шагов, где есть длительный диалог, Core обязан выделять `dialogId` и писать unified-session в один накопительный JSONL.
  - уточнение (Phase 158): **1 агент = 1 JSONL**. Если в рамках одного stage есть разные агенты (например `description: collector` и `description: reviewer`), у них обязаны быть **разные** `dialogId` (и, соответственно, разные файлы истории).

Критичный инвариант: `workspaceKey` должен быть **пер‑сессионным**, иначе в multi-workspace режиме после рестарта Core диалог может “пропасть” (история окажется в другом bucket’е).

Референс реализации:
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (register + bind)
- `packages/core/src/unified-session/storage.ts` (workspaceKey, promote, fallback)
- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts` (`dialog:history`)

Anti‑regression правила:
1. `providerId` должен быть стабильной строкой (участвует в пути).
2. `dialogId` является именем файла истории.
3. `dialogId` не должен меняться при rollover/resume; `providerSessionId` может меняться.
4. Нельзя привязывать history к “текущему” workspace Core; только к `session.workspacePath`.
5. Backfill (миграция): для legacy истории без per-agent `dialogId` (например смешанный файл `.../<baseSessionId>.jsonl`) Core выполняет best-effort migrate: при первом запуске агента промоутит/rename `.../<baseSessionId>.jsonl` в `.../<baseSessionId>__<agentKind>.jsonl` (например `__collector` или `__reviewer`).
