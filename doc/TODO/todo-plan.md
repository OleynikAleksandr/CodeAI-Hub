# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`.
- **Commit**: После зелёных гейтов — Git Commit с релевантным описанием и апдейт `todo-plan.md`.
- **Принцип**: никаких моков в тестах. Тесты должны работать с реальными объектами/данными.
- **doc/TODO/todo-plan.md** обновлять после каждой подзадачи.

---

## Phase 1 — Удаление stale dist-артефактов (owner: Oleksandr, updated: 2026-03-30)

Scope: 3 тестовых файла компилировались из source, который был удалён в Session 196 (knip cleanup). Скомпилированные .js остались в dist/ и node --test их подхватывает. Нужно удалить stale артефакты и добавить `.gitignore` или clean-скрипт чтобы это не повторялось.

### Stream: Clean stale dist artifacts
1. [TODO] Удалить stale compiled test artifacts: `packages/core/dist/workflow/diagram-dsl/facade-map-parser.test.*`, `packages/Codex_Module/dist/logging/session-logger.test.*`, `packages/Claude_Module/dist/messaging/message-processor.turn-marker.test.*`. Прогнать `npm run build` для каждого пакета и убедиться, что stale файлы не пересоздаются. Scope: dist/ cleanup (не source). Expected commit: `fix(tests): remove stale compiled test artifacts from dist`
2. [TODO] Git Commit: `fix(tests): remove stale compiled test artifacts from dist` (hash: TBD)

## Phase 2 — Fix production bug: computeDiagramRevision (owner: Oleksandr, updated: 2026-03-30)

Root cause: `computeDiagramRevision` в `markdown-dsl-shared.ts` использует `Function('return typeof require === "function" ? require : null;')()` для получения crypto. Под `node --test` runner `Function()` возвращает `null`, и хеш всегда `"00000000"`. Нужно заменить на прямой `import("node:crypto")` или статический import.

### Stream: Fix crypto resolution in computeDiagramRevision
3. [TODO] Заменить `Function()` hack в `computeDiagramRevision` на прямой `import` crypto. Scope: `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`. Expected commit: `fix: use static crypto import in computeDiagramRevision`
4. [TODO] Git Commit: `fix: use static crypto import in computeDiagramRevision` (hash: TBD)

## Phase 3 — Синхронизация тестов с текущим кодом (owner: Oleksandr, updated: 2026-03-30)

5 тестов проверяют устаревшие строки/паттерны. Нужно обновить assertions под текущий код. Без моков — тесты должны работать с реальными данными.

### Stream 3A: idea-contract-service.diagram-stages.test.ts
5. [TODO] Обновить expected-снипет: `"This staged file should materialize exactly one Product Part"` → актуальный текст из шаблона `product-part-template`. Scope: `idea-contract-service.diagram-stages.test.ts`. Expected commit: `fix(tests): sync diagram stages contract snippet with current template`
6. [TODO] Git Commit: `fix(tests): sync diagram stages contract snippet with current template` (hash: TBD)

### Stream 3B: workflow-state-service.test.ts
7. [TODO] Тест "keeps invalid status" ожидает `"invalid"` для 1 сценария, но валидатор пропускает `scenarioCount >= 1`. Синхронизировать тест: либо убрать сценарий из fixture (чтобы count=0 → invalid), либо обновить expected status. Scope: `workflow-state-service.test.ts`. Expected commit: `fix(tests): align workflow-state cold start test with validator threshold`
8. [TODO] Git Commit: `fix(tests): align workflow-state cold start test with validator threshold` (hash: TBD)

### Stream 3C: remote-bridge/index.test.ts
9. [TODO] Тест "binds workflow watcher" читает source `remote-bridge-message-router.ts`, но логика session:create вынесена в `remote-bridge-session-create-router.ts`. Обновить SOURCE_PATH и проверяемые строки. Scope: `index.test.ts`. Expected commit: `fix(tests): point workflow watcher test at session-create-router source`
10. [TODO] Git Commit: `fix(tests): point workflow watcher test at session-create-router source` (hash: TBD)

### Stream 3D: template-sync-service.test.ts
11. [TODO] Обновить `POLYGON_TEMPLATE_CONTENT_CHECKS` снипеты для `diagram-modules-field-reference.md` под текущий контент bundled-шаблона. Scope: `template-sync-service.test.ts`. Expected commit: `fix(tests): sync template content checks with current bundled templates`
12. [TODO] Git Commit: `fix(tests): sync template content checks with current bundled templates` (hash: TBD)

### Stream 3E: session-request-handler SOURCE_PATH
13. [TODO] Заменить `process.cwd()` на `__dirname`-based path resolution в `SOURCE_PATH` (test-helpers), чтобы тест работал из любого cwd. Scope: `session-request-handler.test-helpers.ts`. Expected commit: `fix(tests): use __dirname for SOURCE_PATH resolution`
14. [TODO] Git Commit: `fix(tests): use __dirname for SOURCE_PATH resolution` (hash: TBD)

## Phase 4 — Claude turn-marker test (owner: Oleksandr, updated: 2026-03-30)

SDKMessageProcessor.turn-marker.test.ts удалён из source, но dist-артефакт ещё может упасть. Если stale cleanup в Phase 1 его убрал — подтвердить. Если нужна turn-marker логика — реализовать без моков.

### Stream: Verify turn-marker coverage
15. [TODO] После Phase 1-3 прогнать полный тест-suite (core + Claude + Codex + Gemini). Подтвердить 0 failures. Scope: verification only. Expected commit: (no commit if clean)
16. [TODO] Git Commit: session report (hash: TBD)
