# Пример Git-конвейера: Daemon Agent Loop

**Сценарий:** Пользователь создает новый файл `src/UserModule.ts` с ошибками форматирования и неиспользуемым импортом.

---

## 1. Инициация (User Action)
1.  Пользователь создает файл `src/UserModule.ts`.
2.  Содержимое:
    ```typescript
    import { unused } from './utils';
    const x = 10
    export function hello() { console.log('hi') }
    ```
3.  Пользователь сохраняет файл.
4.  **Git Status**: `src/UserModule.ts` (Untracked/Modified).
5.  **Git Diff HEAD**: Показывает наличие изменений.

---

## 2. Обнаружение (Watcher)
1.  Скрипт `watcher.py` (работает в фоне) делает опрос `git diff --name-only HEAD`.
2.  Видит: `src/UserModule.ts`.
3.  Формирует команду запуска агента:
    **Вариант A (Codex):**
    ```bash
    codex exec \
      --cwd .codeai/quality-agent \
      "Check and fix ../../src/UserModule.ts according to QUALITY_PROTOCOL.md"
    ```
    **Вариант B (Claude):**
    ```bash
    cd .codeai/quality-agent && \
    claude -p \
      "Check and fix ../../src/UserModule.ts according to QUALITY_PROTOCOL.md" \
      --dangerously-skip-permissions
    ```

---

## 3. Агентный Цикл (Agentic Loop)

Агент запускается в изолированной папке `.codeai/quality-agent/`.

### Шаг 3.1: Анализ
*   Агент читает `QUALITY_PROTOCOL.md`.
*   Понимает задачу: "Проверить, Исправить, Закоммитить".

### Шаг 3.2: Проверка (Check)
*   Агент выполняет: `npx ultracite check ../../src/UserModule.ts`.
*   **Результат**: Ошибки (Missing semicolon, Unused import, console.log warning).

### Шаг 3.3: Исправление (Fix)
*   Агент выполняет: `npx ultracite fix ../../src/UserModule.ts`.
*   Инструмент чинит форматирование (точки с запятой).
*   Агент видит, что `unused import` остался (Ultracite может не удалить его автоматически, если это не настроено).
*   Агент **сам** редактирует файл: удаляет строку импорта.

### Шаг 3.4: Верификация (Verify)
*   Агент снова выполняет: `npx ultracite check ../../src/UserModule.ts`.
*   **Результат**: Успех (Exit code 0).

### Шаг 3.5: Фиксация (Commit)
*   Агент выполняет:
    ```bash
    git add ../../src/UserModule.ts
    git commit -m "fix(quality): cleanup UserModule.ts"
    ```

---

## 4. Результат
1.  Файл `src/UserModule.ts` закоммичен в ветку.
2.  `git diff HEAD` теперь пуст.
3.  Watcher видит пустой diff и ждет новых изменений.
4.  Пользователь видит в VS Code, что файл "позеленел" (стал чистым) и закоммичен.

---

## 5. Обработка сбоев (Failure Scenario)

Если бы в файле была грубая логическая ошибка (например, вызов несуществующей функции), которую Агент не смог исправить:

1.  Агент пробует исправить -> Проверка падает.
2.  Агент пробует другой способ -> Проверка падает.
3.  Агент сдается.
4.  Агент создает файл `doc/TODO/quality_tasks/UserModule_fix.md` с описанием проблемы.
5.  Агент завершает работу без коммита.
6.  Файл остается в `git diff HEAD` (грязным).
7.  Watcher помечает этот файл как "Failed/Ignored" (чтобы не запускать агента бесконечно), пока файл снова не изменится (по timestamp).
