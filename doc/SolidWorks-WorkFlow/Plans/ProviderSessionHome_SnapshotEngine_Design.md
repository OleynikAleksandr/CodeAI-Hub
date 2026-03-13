# Provider Session Home Snapshot Engine — Implementation Design (DRAFT)

**Status:** Draft (needs approval)
**Owner:** Core Orchestrator
**Date:** 2026-03-13
**Current mainline status:** not implemented; current baseline still uses provider-scoped homes

---

## 0) Scope

Этот документ описывает реализацию модуля snapshot/recovery для provider-home при модели **1 Session Node = 1 provider HOME**.

Важно: это draft-дизайн для отдельного трека. На текущем `main` ещё нет `packages/core/src/provider-session-home/`, а provider runtime продолжает работать через provider-level homes (`~/.codeai-hub/providers/<providerId>/home`).

Канон (высокоуровневый planning-док):
- `doc/SolidWorks-WorkFlow/Plans/ProviderSessionHome_IsolationAndRecovery.md`

---

## 1) Problem

У провайдеров есть глобальные артефакты в HOME, которые смешивают состояние разных сессий и воркспейсов.
Примеры (наблюдаемое поведение):
- Claude: shared `~/.claude/todos/`.
- Codex: shared `~/.codex/sqlite/codex-dev.db` (1 DB на все).

Следствие: partial restore "только сломанной сессии" в общем HOME небезопасен. Единственный гарантированный путь изоляции и recovery: отдельный HOME на Session Node.

---

## 2) Design Goals

- **Isolation:** никакие две Session Node не пишут в один HOME.
- **Deterministic recovery:** `resume-first` и только потом restore `last-known-good` snapshot этой же session-home.
- **Atomicity:** checkpoint/restore выполняются атомарно (staging + rename).
- **Rolling window:** хранить ровно 2 точки восстановления: `last_good` и `previous_good`.
- **Portability:** backend snapshot выбирается реализацией (FS/Git) без изменения внешнего кода.

---

## 3) Non-goals

- Не делаем selective backup внутренностей provider HOME (никаких allowlist на подпапки провайдера).
- Не делаем автоматический watchdog-retry (только manual/explicit recovery orchestration).

---

## 4) Storage Layout

### 4.1 Session HOME (provider state)

`sessionHomePath` (на каждый Session Node):
- `~/.codeai-hub/providers/<providerId>/sessions/<workspaceSlug>/<sessionNodeSlug>--<sessionNodeId>/home`

`sessionNodeSlug`:
- читаемая часть, derived от user-visible названия узла (пример: `Description Claude` -> `description-claude`).

`sessionNodeId`:
- стабильный идентификатор логической Session Node (должен переживать continuity rollover).
- рекомендуемый кандидат: `dialogId` (или `rootSessionId`), а не текущий runtime `sessionId`.

### 4.2 Snapshot storage

`snapshotRootPath` (рядом с HOME):
- `~/.codeai-hub/providers/<providerId>/sessions/<workspaceSlug>/<sessionNodeSlug>--<sessionNodeId>/snapshots/`

Содержимое:
- `last_good/` (directory snapshot)
- `previous_good/` (directory snapshot)
- `staging/` (temp)
- `manifest.json` (метаданные, backend, timestamp, sizes)

### 4.3 Dialog history (UI SSOT)

`dialogHistoryPath` (unified-session JSONL, SSOT для UI и восстановления после restart):
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`

Важно: `dialogHistoryPath` не заменяет snapshot provider-home. Это параллельный SSOT для UI-транскрипта.

---

## 5) Core Module Boundary (closed module)

Новый закрытый модуль в Core:
- `packages/core/src/provider-session-home/`

Единственная точка входа:
- `packages/core/src/provider-session-home/provider-session-home-facade.ts`

Внутренние классы (примерная структура):
- `ProviderSessionHomeFacade` (public API)
- `ProviderSessionHomePathBuilder`
- `ProviderSessionHomeLock`
- `SessionHomeSnapshotEngine` (interface)
- `FilesystemSnapshotEngine` (default)
- `GitSnapshotEngine` (optional)
- `SnapshotManifestStore`
- `CredentialBridge` (symlink/copy-once rules; без копирования секретов в snapshot по умолчанию)

---

## 6) Facade Contract (API)

Facade должен предоставлять:
- `resolveSessionHome()` -> пути (`sessionHomePath`, `snapshotRootPath`) и env binding для провайдера
- `ensureInitialized()` -> create dirs + credential bridge (idempotent)
- `checkpointSuccess()` -> создать/обновить `last_good` + rotation to `previous_good`
- `restoreLastGood()` -> restore `last_good`, fallback `previous_good`

---

## 7) Integration Points (Core)

- Session create/resume: до вызова provider adapter Core обязан получить `sessionHomePath` и пробросить его как env (`CODEX_HOME`, `HOME`, `GEMINI_CLI_HOME`).
- Turn lifecycle: после `completed_success` вызывается `checkpointSuccess()`.
- Recovery: при `completed_failed`/hang (manual retry) вызывается `restoreLastGood()` и controlled replay.

---

## 8) Snapshot Backends

### 8.1 Filesystem snapshot (default)

Требования:
- атомарный результат (staging + rename)
- rolling окно из 2 точек
- хранение должно быть фактически инкрементальным (link/reflink/dedup где возможно)

### 8.2 Git-backed snapshot (optional)

Правила:
- отдельный локальный git-repo на Session Node
- commit только на `completed_success`
- хранить только `last_good` + `previous_good` (2 refs)
- запрещены remote
- после ротации чистить историю (reflog expire + gc/prune)

---

## 9) Locks & Idempotency

- Любая операция checkpoint/restore выполняется под per-session lock.
- `ensureInitialized()` и `checkpointSuccess()` должны быть идемпотентными.
- Restore делается через staging и atomic swap, чтобы исключить half-state.

---

## 10) Open Questions (needs decisions)

- Точный источник `sessionNodeId`: `dialogId` vs отдельный стабильный nodeKey из Workflow Tree.
- Где хранить общую базу auth провайдера и как делать `CredentialBridge` без копирования секретов в snapshots.
- Поведение при continuity rollover: сохраняем один HOME на весь Session Node (expected) или создаем новый (нежелательно).
