# Development TODO Plan — Provider Logging Normalization

## Legend
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Phase 1 — Session Log Audit (owner: Codex, updated: 2025-11-02)
- [DONE] Catalog current logging flows для Claude, Codex, Gemini: источники `sessionId`, стартовые команды, шаблоны файлов.
  - Notes: Slash-команды `/context`, `/status`, `/stats` задокументированы; определены точки появления `sessionId` и отличия в потоках логирования.
- [DONE] Сверить CLI/SDK версии (claude, codex, gemini) и зафиксировать требования к обновлению.
- [DONE] Согласовать единый формат файлов (`<provider>-<sessionId>.jsonl`) и процедуру буферизации до реального ID.

## Phase 2 — Session Log Refactor (owner: Codex, updated: 2025-11-02)
- [DONE] Реализовать буферизацию и создание файлов только после получения реального ID во всех модулях.
- [DONE] Подключить потоковые ответы и автоматический `/status` для Codex без утечки служебных сообщений в UI.
  - Notes: `item.updated` транслирует чанки, `/status` выполняется в скрытом режиме и сразу продвигает `sessionId`.
- [DONE] Добавить файловый логгер для Gemini и единообразную обработку `realSessionId`.
- [DONE] Обновить документацию и базу знаний по новому процессу логирования.

## Phase 3 — Release Prep (owner: Codex, updated: 2025-11-02)
- [TODO] Прогнать локальные проверки, обновить версии модулей и собрать артефакты (core/providers/launcher/VSIX) со свежими манифестами.
- [TODO] Подготовить релизные заметки и обновить обязательные артефакты перед финальным отчётом.

## Backlog / Parking Lot
- [TODO] Автоматизировать health-check логов: проверка доступности CLI/SDK и валидности sessionId перед стартом диалога.
- [TODO] Добавить агрегированное представление логов в UI или CLI для быстрой диагностики.
