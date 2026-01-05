# Архитектура: pre-read auto-attach для анкеты Idea Collector

**Статус:** Draft
**Дата:** 2026-01-05
**Версия:** 0.1

## Контекст и проблема
1) Первый submit анкеты отправлял **два** сообщения подряд (prompt + инструкция), что приводило к гонке: провайдер отвечал до auto-attach анкеты.
2) Документы из секции 0 (`pre_read_documents`) **не прикрепляются**, потому что auto-attach сканирует только текст сообщения, а не содержимое анкеты.
3) Лимит 60 KB на файл недостаточен для реальных архитектурных документов.

## Цели
- Один submit анкеты = **один** provider turn.
- Документы из `pre_read_documents` прикрепляются **детерминированно** без дополнительных триггеров.
- Повышенные лимиты auto-attach + общий бюджет размера сообщений.

## Не цели
- Изменение формата анкеты или логики сохранения анкеты.
- Изменение контрактов provider SDK.

## Решение (overview)
### UI
- `beginQuestionnaireReview()` формирует **одно** сообщение: `prompt + "\n\n" + submissionMessage`.
- Одно обращение `sendChatMessage(...)` сохраняет существующий schema output.

### Core
- На этапе `SessionRequestHandler.handleMessage()`:
  1) Детектируется путь к `questionnaire.md` в сообщении.
  2) Если найден — читается анкета, извлекаются пути из `pre_read_documents`.
  3) Pre-read документы прикрепляются **перед** анкетой/сообщением.
  4) Дальше выполняется обычный auto-attach (по триггерам).

### Лимиты
- `maxBytes` на файл увеличен (например, 300 KB).
- Введён общий бюджет (`totalBudgetBytes`) на суммарный размер прикреплённых файлов.
- `/workspace-file` и UI `/read` используют тот же повышенный лимит (с серверным cap).

## Компоненты и контракты
### `idea-questionnaire-path-detector.ts`
- `detectQuestionnairePath(message: string): string | null`
- Ищет путь к `questionnaire.md` (приоритет: `.codeai-hub/full-development-flow/initiatives/.../idea/questionnaire.md`).

### `idea-questionnaire-pre-read-extractor.ts`
- `extractPreReadPathsFromQuestionnaire(markdown: string): readonly string[]`
- Парсит блок `<!-- field:pre_read_documents -->` и возвращает относительные пути.

### `idea-questionnaire-pre-read-attacher.ts`
- `attachPreReadDocuments(workspaceRoot, questionnairePath, options)`
- Читает анкету, извлекает пути, прикрепляет файлы с учётом `maxFiles`, `maxBytes`, `totalBudgetBytes`.

### `workspace-auto-attach-reader.ts`
- Добавлен общий бюджет для суммарного размера вложений.

## Поток обработки сообщений
1. `detectQuestionnairePath(message)`
2. `attachPreReadDocuments(...)` → `contentPrefix`
3. `autoAttachWorkspaceFiles(...)` → `content`
4. `finalContent = contentPrefix + "\n" + content`
5. `adapter.sendMessage(finalContent, turnOptions)`

## Ошибки и поведение по умолчанию
- Если анкета не найдена/не читается — pre-read attach пропускается.
- Если `pre_read_documents` пуст — pre-read attach не выполняется.
- Если файл запрещён/не текстовый/слишком большой — пропускается.

## Наблюдаемость
- Логируется список прикреплённых pre-read файлов.
- Auto-attach лог остаётся прежним.

## Проверка
- Один `user_message` при submit анкеты.
- В provider message присутствуют pre-read файлы и анкета.
- Лимиты > 60 KB применены, а общий бюджет ограничивает суммарный размер.
