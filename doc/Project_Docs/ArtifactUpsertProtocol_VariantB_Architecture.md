# Artifact Upsert Protocol (Variant B) — Architecture

**Status:** Draft (needs approval)
**Last updated:** 2026-01-13
**Scope:** Workflow-first artifacts in `.codeai-hub/` (workspace layer)

---

## 1) Проблема

Текущая интеграция Idea Collector ↔ UI/Core завязана на семантику `next_action` (например, `finalize`) и на «комплектность» артефактов (часто ожидаем 2 файла сразу: `idea.md` + `virtual-simulation.md`).

Это приводит к системным сбоям даже при корректном поведении агента:
- Агент может отправить **полный обновлённый markdown только одного артефакта** (что рационально и экономно), но система отбрасывает событие, потому что «не хватает второго файла».
- Пути (`*_path`) и «финализации» добавляют лишние поля и условия, которые не помогают Core, но повышают вероятность несовпадения протокола.

Цель: сделать логику предельно простой и детерминированной.

---

## 2) Принцип Variant B

1) **AI агент отвечает structured output только как “artifact upsert”.**
2) **Система пишет на диск сразу**, как только видит structured output с артефактами.
3) **Каждый structured output может содержать любое подмножество артефактов.**
   - Прислал только `virtual-simulation.md` → перезаписываем только его.
   - Прислал оба файла → перезаписываем оба.
4) **Никаких `finalize/revise` как триггера записи.**
5) **Никаких путей от агента.** Пути вычисляет Core из контекста сессии (`initiativeSlug`, `runSlug`, `stage`).

---

## 3) Новый контракт structured output (MVP)

### 3.1 Top-level поля
- `suggested_response` (string) — то, что UI показывает пользователю.
- `artifacts` (array) — список артефактов для upsert.

### 3.2 Artifact item
- `slot` (string, enum) — стабильный ключ слота.
- `markdown` (string) — полный текущий markdown для слота.

**Важно:** `markdown` всегда полный, не patch.

Пример:
```json
{
  "suggested_response": "✅ Обновил virtual-simulation: session:create теперь message",
  "artifacts": [
    {
      "slot": "cluster.idea.virtual-simulation",
      "markdown": "# Virtual Simulation..."
    }
  ]
}
```

---

## 4) Slot → Path: ответственность Core

### 4.1 Источник контекста
Core уже знает:
- `workspaceRoot` (из session)
- `initiativeSlug` / `runSlug` / `stage` (из session context)

### 4.2 Каноничные пути (для stage `idea`, scope `cluster`)
- `cluster.idea.idea` → `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/idea.md`
- `cluster.idea.virtual-simulation` → `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/virtual-simulation.md`

Позже (vNext): аналогично для `module.<slug>.spec`, `cluster.interfaceMap`, и т.д.

---

## 5) Persist semantics

### 5.1 Upsert правила
- Если `artifacts[]` пустой → ничего не пишем.
- Для каждого `artifacts[i]`:
  - вычислить path по slot + session context
  - валидировать path allowlist'ом
  - создать директории при необходимости
  - выполнить atomic write
  - (опционально) backup предыдущей версии

### 5.2 Идемпотентность
- Повторный identical upsert допустим.
- Дедуп по `uuid` можно оставить на уровне провайдера (как сейчас), но даже без него перезапись безопасна.

---

## 6) Поведение UI

- UI не принимает решений «достаточно ли файлов».
- UI отображает `suggested_response`.
- Если пришли `artifacts[]` — UI вызывает Core endpoint “artifact upsert” (или получает подтверждение по событию `artifact:saved`, если upsert выполняется внутри Core на стороне receive).

---

## 7) Миграция

### 7.1 Совместимость
На переходный период Core может поддерживать оба формата:
- legacy: `artifact.idea_markdown`, `artifact.virtual_simulation_markdown`, `*_path`, `next_action`
- new: `artifacts[]: {slot, markdown}`

Приоритет парсинга: `artifacts[]` (new) → legacy fallback.

### 7.2 Удаление legacy
После стабилизации удалить:
- `*_path` из промптов/схем
- `next_action` как часть протокола записи артефактов

---

## 8) Почему это лучше

- Система становится детерминированной: “увидел `artifacts[]` → записал”.
- Частичные правки работают из коробки (как в реальном процессе редактирования).
- Убираем максимум обязанностей с агента: пути, финализации, режимы.
- Снижаем вероятность «тишины» (когда в логе всё есть, но файл не обновился).

---

## 9) Открытые вопросы

1) Где выполнять запись: прямо в Core при получении structured output, или через явный UI → HTTP вызов?
2) Нужно ли хранить историю снапшотов (например, `.../idea/history/<timestamp>.md`), или достаточно backup?
3) Нужно ли ввести `artifactId`/`hash` для экономии перезаписей (опционально)?
