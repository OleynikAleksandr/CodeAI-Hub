# Test/Support Warning-Zone Cleanup Architecture

**Status:** Draft for execution
**Date:** 2026-03-31
**Owner:** Oleksandr + Codex

## 1. Context

После закрытия production warning-zone wave и релиза `1.1.851` в warning-zone остались только test/support файлы:

- `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — `400` строк
- `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts` — `411` строк
- `packages/Gemini_Module/src/session/gemini-session-manager.test.ts` — `495` строк

Эти файлы не являются production runtime root-ами, но продолжают:

- засорять architecture warning-zone;
- ухудшать читаемость regression coverage;
- делать следующие behavioral fixes дороже и рискованнее;
- провоцировать новые ad-hoc additions в уже перегруженные test/support roots.

Новая волна должна быть узкой: только behavior-preserving decomposition test/support surface без смешивания с product fixes.

## 2. Scope

В scope этой волны входят только:

1. `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`
2. `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts`
3. `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
4. release-bearing closeout после успешной verification

Явно вне scope:

- production runtime changes;
- новые product features;
- behavioral changes в `WorkspaceRuntimeFacade`, `SessionRequestHandler`, `GeminiSessionManager`;
- расширение allowlist или изменение architecture gate policy.

## 3. Design Principles

- decomposition должна быть strictly behavior-preserving;
- каждый root режется по responsibility seams, а не по случайным диапазонам строк;
- внешний import surface тестов остаётся предсказуемым;
- каждый stream закрывает один test/support cluster;
- release stream идёт только после зелёной targeted verification по всем трём cluster-ам.

## 4. Target Seams

### 4.1. `workspace-runtime-facade.test.ts`

Текущий root смешивает два разных test intent-а:

- snapshot selection / debounce / priority flush coverage;
- continuity lock / resume / stale-session normalization coverage.

Целевая форма:

- root `workspace-runtime-facade.test.ts` остаётся базовым façade-level regression entrypoint;
- continuity/resume-oriented scenarios уходят в отдельный sibling test file;
- shared local helpers (`wait`, `workspaceA`, `workspaceB`, `createSessionKey`) либо остаются в root при минимальной дубликации, либо выносятся только если это не создаёт второй giant helper.

### 4.2. `session-request-handler.test-helpers.ts`

Текущий helper-root смешивает:

- harness/bootstrap construction;
- event counters and stream assertions;
- continuity/lock utility actions;
- source invariant inspection helpers.

Целевая форма:

- root helper остаётся тонкой aggregation surface или harness-focused entrypoint;
- event counter helpers уходят в отдельный helper;
- continuity/bootstrap utilities уходят в отдельный helper;
- source invariant checks остаются в самом маленьком файле, где они логически принадлежат.

### 4.3. `gemini-session-manager.test.ts`

Текущий root смешивает как минимум три behavioral blocks:

- baseline session alias / recoverable stalled turn coverage;
- post-tool nested watchdog / delayed final answer coverage;
- translated thinking / terminal dedup and post-tool terminal completion coverage.

Целевая форма:

- root file перестаёт быть единственной точкой для всех Gemini session regressions;
- post-tool continuation scenarios уходят в sibling test file;
- baseline and thin façade invariants остаются в root;
- существующий `gemini-session-manager.test-helpers.ts` продолжает быть общим helper surface без расширения в giant support root.

## 5. Verification Contract

После закрытия structural streams должны пройти targeted checks:

- `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`
- `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade-continuity.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
- `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.post-tool.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/gemini-module`

Если фактические имена новых sibling test files в ходе реализации изменятся, verification section в `todo-plan.md` должна быть синхронно обновлена до коммита.

## 6. Release Closure

Эта волна считается завершённой только если после structural verification выполнены:

1. обновление release-facing docs под новый patch release;
2. `./scripts/build-all.sh`;
3. `./scripts/build-release.sh --use-current-version`;
4. фиксация артефактов и session handoff.

Релиз нужен не ради новых product features, а как test release для проверки чистой test/support cleanup wave на реальной сборке.

## 7. Expected Outcome

После закрытия волны:

- в warning-zone больше не остаётся текущих test/support root files;
- regression coverage становится cluster-oriented и проще для follow-up fixes;
- release `1.1.852+` подтверждает, что cleanup test/support surface не ломает сборку и packaging contract;
- следующий scope можно будет выбирать уже отдельно: либо новый production debt, либо targeted behavior fix, без зависшего хвоста из giant test files.
