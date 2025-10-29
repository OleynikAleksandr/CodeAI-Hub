# План разработки — Миграция Gemini Module на ESM

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Gemini Module ESM Migration (owner: Codex, updated: 2025-10-29)
**Цель:** Перевести `packages/Gemini_Module` на ESM и прямую работу с `@google/gemini-cli-core`, сохранив интерфейсы для ядра и UI без изменений для других провайдеров.

- [DONE] Шаг 1: Уточнить объём миграции — зафиксировать переход на ESM, список зависимостей (`@google/gemini-cli-core`, вспомогательные пакеты), оценить текущие CJS-ограничения и обновить архитектурные документы рисками.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Подготовить короткое резюме для `doc/Architecture/Architecture.md` и `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` до старта разработки.
  - Commit: f717d20 — docs: outline gemini esm migration scope
- [DONE] Шаг 2: Перевести конфигурацию пакета на ESM — обновить `package.json` (`type: "module"`, exports), пересобрать `tsconfig.json`, настроить сборку (`dist/esm`), добавить зависимости на CLI core.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Убедиться, что импорты в ядре корректно подхватывают новые entrypoints.
  - Commit: (pending)
- [IN_PROGRESS] Шаг 3: Переписать провайдер на `loadSettings`/`loadCliConfig` — реализовать ESM-слой сессий, адаптер стриминга и mock extension manager для интеграции с `GeminiClient`.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Сохранить контракты событий для RemoteBridge и описать обработку ошибок.
  - Commit: (pending)
- [TODO] Шаг 4: Обновить инсталлятор и сборочные скрипты — адаптировать `build-gemini-module.sh`, манифесты провайдера и упаковку архивов, чтобы включать ESM-бандл и необходимые `node_modules` в `~/.codeai-hub/providers/gemini/<version>/`.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Проверить стратегию повышения версии и исключить VSIX из архива модуля.
  - Commit: (pending)
- [TODO] Шаг 5: Интеграция и тесты в ядре/UI — подключить новый провайдер в оркестраторе, убедиться в стриминге ответов в UI, провести e2e-сессию с OAuth и зафиксировать метрики.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Задокументировать результаты в `SystemArchitecture`/`Architecture` и Telemetry checklist.
  - Commit: (pending)
- [TODO] Шаг 6: Подготовка к релизу — финализировать документацию, обновить манифесты и версии, пересобрать архив Gemini Module и VSIX, подготовить отчёт сессии.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Notes: Соблюсти правила версионирования (module + core + VSIX) и зафиксировать результаты в `doc/Sessions/`.
  - Commit: (pending)

## Backlog / Parking Lot
- [TODO] Мониторить поддержку стриминга в `@google/gemini-cli-core` для последующих обновлений.
- [TODO] Оценить fallback для сред без OAuth (API ключ / Vertex AI режим).
- [TODO] Запланировать проверку упаковки под Windows после завершения основной миграции.
