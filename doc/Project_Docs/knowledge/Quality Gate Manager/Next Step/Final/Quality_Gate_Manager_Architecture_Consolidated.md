# Quality Gate Manager — Консолидированная архитектура (v2.0)

**Статус:** Утверждено (Daemon Agent + Agentic Loop)
**База:** Git-centric подход + Автономный Агент

---

## 1. Ключевая концепция: Daemon Quality Agent

Мы отказываемся от сложного Оркестратора, который "водит агента за ручку". Вместо этого мы используем **автономность современных CLI-агентов** (Codex/Claude).

### Суть архитектуры:
1.  **Watcher (Наблюдатель)**: Тупой скрипт, который просто следит за Git.
2.  **Agentic Loop (Агентный цикл)**: Умный агент, который сам запускает проверки, чинит код и делает коммит.
3.  **In-Place Sandbox (Песочница на месте)**: Работа с реальными файлами проекта для сохранения контекста (типы, импорты), но с изоляцией инструкций.

---

## 2. Компоненты системы

### 2.1. Watcher Script (Python/Node.js)
Легковесный процесс-демон.
*   **Задача**: Мониторить `git diff HEAD` (новые/измененные файлы).
*   **Триггер**: Как только файл сохранен на диск (появился в diff).
*   **Действие**: Вызывает `codex exec` (или `claude`) с профилем качества.
*   **Режим**: Fire & Forget (или очередь, чтобы не спамить агентами).

### 2.2. Изолированная среда запуска (`.codeai/quality-agent/`)
Специальная директория в корне проекта.
*   Содержит: `QUALITY_PROTOCOL.md` (жесткие инструкции).
*   **НЕ содержит**: `AGENTS.md` (чтобы агент не читал общие правила).
*   **Запуск**: Агент запускается с `cwd = .codeai/quality-agent/`.
*   **Доступ**: Агент работает с файлами через `../../src/`, имея доступ ко всему контексту (`node_modules`, `tsconfig.json`).

### 2.3. Quality Agent (Codex/Claude)
Исполнитель. Получает задачу: *"Приведи в порядок файл ../../src/Foo.ts согласно протоколу"*.
**Его цикл (Agentic Loop):**
1.  `npx ultracite check ../../src/Foo.ts`
2.  Анализ ошибок.
3.  `npx ultracite fix ...` или ручная правка файла.
4.  Повторная проверка (Verify).
5.  Если успех -> `git add ...` && `git commit ...`.
6.  Отчет.

### 2.4. Agent Invocation Strategies (Стратегии запуска)

Watcher должен поддерживать разные CLI-агенты. Вот проверенные команды запуска:

**A. OpenAI Codex CLI (Рекомендуемый)**
Поддерживает флаг `--cwd`, что упрощает изоляцию.
```bash
codex exec \
  --cwd .codeai/quality-agent \
  "Read instructions from QUALITY_PROTOCOL.md. Fix ../../src/TargetFile.ts. Note: Project root is ../../. Follow the protocol strictly."
```

**B. Anthropic Claude CLI**
Требует перехода в папку и флага `-p` (print) для неинтерактивного режима, а также `--dangerously-skip-permissions` для полной автономности.
```bash
cd .codeai/quality-agent && \
claude -p \
  "Read instructions from QUALITY_PROTOCOL.md. Fix ../../src/TargetFile.ts. Note: Project root is ../../. Follow the protocol strictly." \
  --dangerously-skip-permissions
```

---

## 3. Поток данных (Workflow)

1.  **User/Dev Agent**: Пишет код в `src/Feature.ts`. Сохраняет.
2.  **Git**: Видит `src/Feature.ts` как Modified (в `diff HEAD`).
3.  **Watcher**:
    *   Замечает файл.
    *   Запускает: `codex exec --cwd .codeai/quality-agent "Fix ../../src/Feature.ts"`
4.  **Quality Agent**:
    *   Читает `QUALITY_PROTOCOL.md`.
    *   Запускает линтеры.
    *   Видит ошибку (например, unused var).
    *   Правит файл `src/Feature.ts`.
    *   Проверяет снова -> OK.
    *   Делает `git commit -m "fix: quality cleanup"`.
5.  **Git**: Файл `src/Feature.ts` исчезает из `diff HEAD` (становится частью HEAD).
6.  **Watcher**: Видит, что diff пуст. Успокаивается.

---

## 4. Обработка ошибок (Safety Net)

Если Агент не может исправить файл (сложная логическая ошибка):
1.  Агент пытается 2-3 раза (в рамках своей сессии).
2.  Если не вышло -> делает `git checkout ../../src/Feature.ts` (ОТКАТ изменений, если они были деструктивны) ИЛИ оставляет как есть, но создает **Quality Task** (файл-отчет).
3.  Сообщает Watcher-у о провале.

---

## 5. Преимущества подхода

1.  **Полный контекст**: Агент видит весь проект, поэтому работают `ts-prune`, `check-architecture`, проверка типов.
2.  **Изоляция правил**: Запуск из подпапки гарантирует, что агент следует только протоколу качества.
3.  **Простота**: Нет сложного кода оркестрации. Вся логика "подумать и исправить" делегирована самому AI.
4.  **Надежность**: Git выступает единственным источником правды.

