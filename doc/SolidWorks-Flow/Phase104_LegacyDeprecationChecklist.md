# Phase 104 Legacy Deprecation Checklist

**Date:** 2026-02-08
**Scope:** вывод из активного использования legacy handshake `workspace:scope:set/ack` после внедрения Phase 105 (`workspace:select` + `workspace:snapshot`).

## 1. Core legacy markers

- [x] `packages/core/src/remote-bridge/handlers/websocket-session-scope.ts`
  - `shouldDeliverEventForScope` помечен как `@deprecated`.
  - `recordSessionWorkspaceSnapshot` помечен как `@deprecated`.
- [x] `packages/core/src/remote-bridge/handlers/websocket-manager.ts`
  - `setWorkspaceScope()` помечен как `@deprecated`.

## 2. PM protocol migration gates

- [ ] PM больше не отправляет `workspace:scope:set` ни в одном runtime-пути.
- [ ] Все переключения workspace и resync идут через `workspace:select` / `workspace:snapshot:request`.
- [ ] Resume/create flow блокируются до `workspace:select:ack(status=applied)`.

## 3. Remove plan (после закрытия gate-ов)

1. Удалить `workspace:scope:set/ack` из PM message contracts.
2. Удалить legacy handler из `packages/core/src/remote-bridge/index.ts`.
3. Удалить legacy scope parser/ack glue и старые тесты после перевода на `workspace:select` тесты.

## 4. Verification command

```bash
grep -RIn "workspace:scope:set" src/client/project-manager packages/core/src/remote-bridge
```

Ожидаемый финальный результат перед Release Stream 16:
- В `src/client/project-manager/**` не осталось runtime-вызовов `workspace:scope:set`.
- В `packages/core/src/remote-bridge/**` legacy path остаётся только как временно помеченный deprecated до финального удаления.
