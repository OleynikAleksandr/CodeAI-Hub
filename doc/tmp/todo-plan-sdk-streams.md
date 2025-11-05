# Development TODO Plan

## Legend
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Phase 1 — SDK Stream Recon (owner: Codex, updated: 2025-11-03)
- [TODO] Claude stream log study — собрать выборку real-time событий, классифицировать типы
- [TODO] Codex stream log study — повторить процедуру для Codex, отметить расхождения
- [TODO] Gemini stream log study — зафиксировать структуру и особенности chunking
- [TODO] Draft unified event matrix — свести результаты в таблицу для проектирования формата
- Commit: — TODO (expected: chore: phase1-sdk-stream-recon - normalized event inventory)

## Phase 2 — Provider wrappers (owner: Codex, updated: 2025-11-03)
- [TODO] Implement Claude wrapper — нормализовать live поток, обеспечить запись JSONL
- [TODO] Implement Codex wrapper — адаптировать под общую схему (учесть tool/instruction блоки)
- [TODO] Implement Gemini wrapper — синхронизировать chunking и подтверждение sessionId
- [TODO] Writer integration smoke-tests — убедиться, что UI и файл получают идентичные события
- Commit: — TODO (expected: feat: phase2-provider-wrappers - unified stream adapters)

## Phase 3 — UI replay & storage (owner: Codex, updated: 2025-11-03)
- [TODO] JSONL reader API — реализовать загрузку/инкрементальный tail в UI
- [TODO] Resume flow wiring — подключить перезапуск UI к новым логам
- [TODO] Storage lifecycle policy — описать и внедрить политику хранения/очистки
- [TODO] End-to-end validation — провести тесты real-time → refresh → resume → multi-session
- Commit: — TODO (expected: feat: phase3-ui-replay - unified session history playback)

## Backlog / Parking Lot
- [TODO] Multi-provider orchestrator design draft
- [TODO] Chat export tooling (pending формат JSONL v1)
