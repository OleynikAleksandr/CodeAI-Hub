# SolidWorks Flow — Continuity Report Contracts (Doc Nodes vs Code Nodes)

**Status:** Draft
**Updated:** 2026-02-03
**Owner:** Oleksandr + Codex

---

## 1) Purpose

Continuity‑отчёт — это единственный артефакт, который обеспечивает бесшовное продолжение работы **внутри одного узла** при rollover на новый provider segment.

Отчёт не предназначен для чтения “всеми будущими агентами” и не должен загрязнять канонические документы (например, `Final_Description.md`).

---

## 2) Global Rules (обязательные)

1. **Никакой переписки:** нельзя вставлять историю чата/лог диалога.
2. **Никаких больших вставок артефактов:** нельзя копировать внутрь отчёта содержимое `Final_Description.md`, исходники кода, большие диффы и т.д.
3. **Только ссылки/пути + минимальные буллеты.**
4. **Лимит размера (строго):** отчёт должен быть коротким. Рекомендуемый лимит: не более ~200 строк или “примерно 1 страница”.
5. **Отчёт пишется агентом:** Core только присылает инструкцию и ждёт файл watcher’ом.
6. **Атомарная запись:** `report.tmp.md` → `rename` → финальный `report.md`.

---

## 3) Doc Node Contract (пример: Final Description / Reviewer)

### 3.1 Когда используется
Когда активный агент ведёт обсуждение документа (например, `Final_Description.md`), и важная часть контекста может существовать только “в диалоге” (вопросы агента, ожидаемые ответы), но не должна попадать в сам документ.

### 3.2 Required sections

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

### 3.3 Notes
- `Pending From User` — ключевая секция для бесшовности. Если агент задал вопросы или ждёт уточнения, которые не отражены в `Final_Description.md`, он обязан перечислить их кратко.
- Если pending отсутствует — секцию можно оставить пустой (или написать `- None`).

---

## 4) Code Node Contract (план/фазы/стримы/микрозадачи)

### 4.1 Когда используется
Когда узел связан с разработкой кода и продолжение требует восстановления:
- текущей микрозадачи (что делаем прямо сейчас);
- ссылок на архитектуру/спеки;
- статуса гейтов/сборок;
- последнего “известного” состояния репозитория.

### 4.2 Required sections

```md
# Continuity Report — <nodeId> / <role>

## Current Task
- What: <кратко>
- Scope: <файлы/пакеты или ≤3 файла, если это правило узла>
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

### 4.3 Notes
- В `Required Reads` обычно входят: архитектура системы, спецификация/архитектура конкретного модуля, `doc/TODO/todo-plan.md`, отчёт предыдущего агента по модулю (если есть).
- В отчёт нельзя копировать диффы/код. Только ссылки на файлы и краткие инструкции.

---

## 5) Core Instruction (что Core присылает агенту)

Core отправляет агенту короткий prompt, который содержит:
- тип отчёта (doc node / code node);
- обязательный шаблон;
- путь сохранения (включая требование атомарной записи);
- жёсткий запрет на переписку и большие вставки.

В новой сессии Core отправляет:
- стандартный узло‑специфичный стартовый prompt;
- коротко: “прочти последний отчёт по пути `<path>` и продолжай”.
- первый assistant bootstrap answer считается служебным unlock-gate (до него input остаётся locked в old/new segment).

## 6) Prompt Templates (IDs / placeholders / storage)

### 6.1 Default path

- `templatesDir` (default): `~/.codeai-hub/templates/`

### 6.2 Template IDs (MVP)

- `flow/continuity/create-report-doc.md`
- `flow/continuity/create-report-code.md`
- `flow/continuity/resume.md`

### 6.3 Required placeholders

- `{{nodeId}}`
- `{{role}}`
- `{{reportPath}}`
- `{{canonicalArtifactPath}}` (doc-node only)

### 6.4 Storage rule

- Пользователь может переопределять шаблоны, просто положив файл по пути:
  - `<templatesDir>/<templateId>`
- Если файла нет — используется встроенный шаблон.

### 6.5 Hard requirements inside templates

- Требование атомарной записи: писать в `*.tmp.md`, затем `rename` → финальный `*.md`.
- Запрет на вставку переписки и больших вставок артефактов.
