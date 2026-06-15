# Periodic Codebase Audit Checklist

## Назначение

Регулярная гигиена кодовой базы: dead code, broken doc links, duplication review. Прогон раз в 3-5 релизов (или когда внутри сессии появилась свободная ёмкость). **Отдельный execution cycle** — не совмещаем с feature scope.

## Когда запускать

- После закрытия фичевой/багфиксной серии, когда rollover в следующий scope ещё не утверждён.
- Если ручной гейт `check:dup` / `check:knip` / `check:links` подозрительно пополз вверх между релизами (sign что долг накапливается).
- Когда в архиве `doc/TODO/Archive/` появляется 3+ подряд `todo-plan-*` без cleanup-цикла.

**Прецеденты:**

- `doc/TODO/Archive/todo-plan-1.2.10-audit-cleanup.md` — первый полноценный audit cycle.
- `doc/TODO/Archive/todo-plan-closeout-audit-automation-cleanup-part1-2026-06-15.md` — audit automation cleanup, accepted in release `1.2.523`.

## Шаг 1. Baseline гейтов

```bash
npm run check:knip
npm run check:links
npm run check:dup
```

Все три должны проходить. Запомни текущий `check:dup` процент — будешь сравнивать.

## Шаг 2. Параллельные audit passes

Две независимые параллельные проверки одного audit-cycle:

1. **Dead-code audit.** Ищет: unused exports которые knip пропускает, orphaned files, stale TODO/FIXME, dead CSS selectors, unused локализационные ключи, dead branches. Отдельное внимание — residue от недавних cleanup-коммитов (удалённые компоненты, feature-flag'ы).

2. **Broken doc links audit.** Ищет: broken markdown ссылки (formatted + backtick mentions), stale references на удалённые артефакты, неверные пути в `Docs_Index.md`, orphaned docs без записи в index.

Формат каждой проверки должен требовать компактный структурированный отчёт с `file:line`, категорией и severity. До ~600 слов.

## Шаг 3. Дубликаты — детальная классификация

```bash
npx jscpd --threshold 0 --silent --reporters json --output /tmp/jscpd-audit src packages --ignore "**/node_modules/**,**/dist/**,**/*.test.ts,**/*.test.tsx"
```

Скриптом или вручную ранжировать top-20 клонов по размеру. **Классификация обязательна** по одной из шести категорий:

- **LEGIT-PROVIDER.** Параллельный scaffolding Claude/Codex/Gemini (installer, session-logger, provider-adapter, session-registry, auth bridge). Extract нарушает модульную изоляцию. Оставляем.
- **LEGIT-BOUNDARY.** Симметричные type-контракты через слой (client ↔ core, extension ↔ client). Намеренная плата за независимость слоёв. Оставляем.
- **LEGIT-SIMILAR-BUT-DIVERGING.** Похожие парсеры/валидаторы разных доменов. Extract сольёт семантику. Оставляем.
- **EXTRACT-EASY.** Чистая utility без контекстных привязок. 1 commit, ≤3 файла. Берём.
- **EXTRACT-COMPLEX.** Extract возможен, но требует интерфейс / DI / >1 файла рефактор. Откладываем в отдельный scope с планом.
- **WITHIN-FILE-BUG.** Клон внутри одного файла (read/write handler pair с одинаковым boilerplate). Локальная фабрика в том же файле.

**Анти-правило:** никогда не рефакторим LEGIT-* категории. Архитектура провайдерной изоляции + boundary mirrors важнее минус-1% jscpd.

## Шаг 4. Локализационные ключи — double-check dynamic usage

Если dead-code agent flagнул unused loc keys, перед deletion всегда прогоняем 3-проход grep:

1. Exact match по полному ключу (`a.b.c`).
2. Parent prefix (`a.b.`) — ловит `t(\`${prefix}.${suffix}\`)`.
3. Last segment (`.c`) — safety net.

Удаляем **только** ключи с нулями во всех трёх проходах ("certainly dead"). Partial hits ("suspicious") оставляем — возможна dynamic ссылка.

Скрипт-референс: см. реализацию в Stream 3 архивного `doc/TODO/Archive/todo-plan-1.2.10-audit-cleanup.md` (278 ключей → 204 alive / 67 suspicious / 7 dead).

## Шаг 5. Отчёт пользователю

Перед любой имплементацией:
1. Сводка всех находок по категориям + severity.
2. Concrete предложение scope'а (Option A / B / C — минимум / средний / максимум).
3. Ожидаемый `check:dup` target.
4. Out-of-scope — что **не** трогаем и почему.

**Пользователь утверждает scope до implementation.** Без утверждения — только audit report.

## Шаг 6. Execution cycle (если одобрено)

Следуем стандартному мастер-процессу из `AGENTS.md`:

1. Planning-doc в `doc/SolidWorks-WorkFlow/Plans/Audit_Cleanup_<version>.md`.
2. `doc/TODO/todo-plan.md` — 10+ streams: release notes, каждое направление отдельным стримом, SSOT promotion + archive, release build.
3. Real-time: после каждого коммита обновляем todo-plan с hash'ом и DONE статусом.
4. Один SSOT invariant ("Acceptable parallel-scaffolding duplication" или аналог) фиксируется в `SystemArchitecture.md` чтобы следующие audit'ы не переигрывали найденные legitimate cases.
5. Session report типа A (Completion Report) после release build.

## Out of scope периодического аудита

- **Strict mode для knip.** Большой отдельный scope (потребует очистки ignore list + добавления entry points для всех тестовых корней). Делаем только когда есть явный запрос.
- **Refactor files в warning zone (400-500 строк).** Architecture gate отслеживает эту метрику отдельно. Разбиение крупных файлов — feature-level решение, не audit-hygiene.
- **Legacy shadowed dicts (`ui_interface`, `user_guidance`, `workflow_terms`, `interactive_templates`, `system_feedback`).** Архитектурно неиспользуемые. Decommission — отдельный large scope.
- **Third-party packages без нашего `src/` (например `spec-creator/dist/*.d.ts`).** Not actionable.

## Track record

- **1.2.10 (2026-04-17):** первый полноценный аудит. 4 направления (A docs+config / B loc keys / C duplication / D process). Итог: 7 loc ключей удалено, 3 extract-рефактора, `check:dup` 2.06% → 1.97%, новый SSOT invariant о acceptable parallel-scaffolding duplication.
- **1.2.523 (2026-06-15):** audit automation cleanup. Итог: runtime dependency security check, duplicate/link/security CI visibility, workspace-wide duplicate regression guard, low-risk dependency patches, stale archive cleanup, provider model/version follow-ups, workspace prompt clarity, stale user-gate cursor fix.

*При следующем аудите добавь свой cycle сюда.*
