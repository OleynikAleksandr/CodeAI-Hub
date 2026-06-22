# Application Skeleton: repair loop and soft foundation validation

## Статус
- Дата: 2026-06-19
- Scope: ARCHIVED accepted planning source; closed by release `1.2.549`
- Подход: ponytail, минимальный diff без продуктовой специализации

## Наблюдение
Во время теста свежего релиза на шаге Application Skeleton оркестратор несколько раз отклонил артефакт агента с диагностикой `missing_foundation_field: repoShape`.

Конкретный тестовый продукт используется только как evidence. Исправление не должно упоминать и не должно предполагать тип продукта, UI, платформу, стек или домен пользовательского приложения.

## Причина
Валидация Application Skeleton Foundation Draft требует top-level `repoShape` как непустую строку. Агент сформировал `repoShape` как структурированное описание repository shape. Для качества следующего шага это поле является описательным: materialization и дальнейшие quality gates опираются на actionable foundation данные вроде `packageManager`, `sourceRoot`, `plannedPaths`, install command, scripts, config files и entrypoints.

Отдельная проблема: в repair dispatch для draft Application Skeleton номер попытки всегда передается как `1`, поэтому существующий лимит repair attempts не достигается для draft loop. Механизм user review после лимита уже есть, но не получает правильный attempt number на этом пути.

## Решение
1. Перевести `repoShape` из hard blocker для foundation draft в soft/descriptive поле: оно не должно останавливать workflow, если остальные actionable foundation поля присутствуют.
2. Исправить подсчет номера попытки для draft Application Skeleton repair tasks, чтобы после трех неудачных repair попыток Core открыл user review gate вместо бесконечного продолжения agent loop.
3. Обновить каноническую документацию orchestration policy без привязки к типу создаваемого продукта.

## Не делаем
- Не добавляем продуктово-специфичные инструкции в prompt.
- Не расширяем схему `repoShape` новым контрактом, пока это не требуется downstream-кодом.
- Не ослабляем hard blockers для полей, которые реально нужны materialization/build/quality gates.
- Не запускаем release build без отдельного подтверждения пользователя, даже если кодовая часть завершена.

## Acceptance criteria
- Foundation draft с object-valued или отсутствующим `repoShape` не отклоняется только из-за `repoShape`, если actionable foundation поля валидны.
- Остальные hard foundation diagnostics остаются blocking.
- Draft Application Skeleton repair task number определяется из `application-skeleton.phase1.repair.taskN`.
- После превышения лимита repair attempts Core открывает user review с сообщением о лимите вместо следующего repair prompt.
- Изменения покрыты таргетными тестами и сборкой затронутого workspace.
