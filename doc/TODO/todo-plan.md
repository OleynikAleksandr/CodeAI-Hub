# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` (rev4, approved as planning source for Phase 1).
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` (целиком — особенно §3.2 Managed как diagnostic path, §4 Phase 1 scope, §5 Resolved Decisions).
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §33 (Settings ownership invariant — Provider Native Request Capture как one-shot diagnostic surface).
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md` §5 Gating (фиксирует upstream artifact requirement для Virtual Simulation и Diagram Modules — Phase 1 НЕ отменяет этот product contract, только добавляет PM-side diagnostic bypass).
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — микро-задачи ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки конкретная подзадача затрагивает >3 файлов, она разбивается на более мелкие, и список задач в Stream переписывается.
- Gates автоматические через Husky (`./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix` на pre-commit; `npm run check:dup`, `npm run check:links` на pre-push).
- Таргетные сборки выполняем вручную перед закрытием Stream/Phase: `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` (PM-side bundle проверяется отдельно).
- Real-time documentation: SSOT-документы синхронизируются ДО коммита (тот же commit содержит и код, и обновлённую документацию).
- doc/TODO/todo-plan.md обновляется после КАЖДОГО коммита: статус задачи + hash коммита заносится сразу.
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов и коммитами.
- Phase завершается на чистом дереве: `./scripts/build-all.sh` (поднимает версии и вызывает `build-release.sh --use-current-version`) → tarball-ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- Closeout запрещён до явного пользовательского retest'а финального VSIX.

---

## Phase 1 — Workflow gating bypass for capture (PM-side only) (owner: Oleksandr + Codex, updated: 2026-05-01)

**Цель фазы:** устранить блокирующую ошибку `Missing virtual-simulation.md. Complete Virtual Simulation step first.` в Settings → General → Provider Native Request Capture при работе с пустым workspace. Bypass диагностический, ограничен PM-стороной, не отменяет product contract из `Workflow_CLI.md` §5 для обычных workflow turns.

**Архитектурные ограничения (из planning-doc §3.2 и §4 Phase 1):**

- Изменения **только** на PM-стороне (`src/client/project-manager/`).
- Core facade, `buildWorkflowPromptPack`, provider adapters, `workflow-step-start-service.ts`, любые другие guards для обычных user turns — НЕ трогаем.
- На Core boundary флаг `bypassUpstreamGuard` НЕ идёт.
- В provider-visible prompt маркер отсутствия файла НЕ добавляется (см. planning-doc §5.1).
- UI карточки не меняется — кнопки начинают работать на пустом workspace без других визуальных изменений.

### Stream 0 — Planning baseline

1. **[DONE]** Зафиксировать approved planning baseline перед любыми code changes: planning-doc rev4, текущий `todo-plan.md`, а также обновление или явная проверка `Docs_Index.md`, что active planning scope отражён в навигации.
   - **Scope:** до 3 файлов — `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`.
   - **Ожидаемый commit message:** `docs: plan provider native capture bypass`
2. **[DONE]** Git Commit: `docs: plan provider native capture bypass` (hash: `3f98c04dc`)

### Stream 1.1 — Scenario prompt resolver bypass

3. **[DONE]** Добавить параметр `bypassUpstreamGuard?: boolean` в `NativeRequestCaptureScenarioPromptParams` и пробросить его в `resolveScenarioInputPath()`. При `bypassUpstreamGuard === true`: пропустить throws на строках 87-89 (`Missing Final_Description.md`) и 94-99 (`Missing virtual-simulation.md`), вернуть canonical path даже если соответствующее поле workflow state пустое или `gating.blocked.diagram_modules === true`. Поведение по умолчанию (`bypassUpstreamGuard === false | undefined`) сохраняется.
   - **Scope:** 1 файл — `src/client/project-manager/services/native-request-capture-scenario-prompt.ts`.
   - **Ожидаемый commit message:** `feat: add bypassUpstreamGuard to native request capture scenario prompt resolver`
4. **[DONE]** Git Commit: `feat: add bypassUpstreamGuard to native request capture scenario prompt resolver` (hash: `aa5add88c`)
5. **[DONE]** Юнит-тест на новый bypass-путь: для пустого workflow state с `bypassUpstreamGuard: true` ни VS, ни DM сценарии не throw'ятся, возвращают canonical paths (`Final_Description.md`, `virtual-simulation.md` или `product-parts.index.md` в зависимости от substep). Без флага старое поведение сохраняется (тест на throws).
   - **Scope:** 1 файл — новый `src/client/project-manager/services/native-request-capture-scenario-prompt.test.ts`.
   - **Ожидаемый commit message:** `test: cover bypassUpstreamGuard path in scenario prompt resolver`
6. **[DONE]** Git Commit: `test: cover bypassUpstreamGuard path in scenario prompt resolver` (hash: `147397be4`)

### Stream 1.2 — Runner unconditional bypass

7. **[DONE]** В `ProjectManagerNativeRequestCaptureRunner` (`native-request-capture-runner.ts:51`) вызов `buildNativeRequestCaptureScenarioPrompt(...)` всегда передаёт `bypassUpstreamGuard: true`. Это **единственное место**, где флаг ставится в `true` — capture по определению является диагностическим режимом. Никаких UI-toggle, никаких user-facing настроек этого флага.
   - **Scope:** 1 файл — `src/client/project-manager/components/settings/native-request-capture-runner.ts`.
   - **Ожидаемый commit message:** `feat: capture runner always bypasses upstream artifact guard`
8. **[TODO]** Git Commit: `feat: capture runner always bypasses upstream artifact guard` (hash: TBD)
9. **[TODO]** Юнит-тест на runner: на пустом workspace вызов capture для VS и DM сценариев не падает на upstream guard, доходит до `api.captureNativeRequest()` с непустым `scenarioPrompt` и canonical `scenarioInputPath`. Translation и Description пути не задеваются.
   - **Scope:** 1 файл — новый `src/client/project-manager/components/settings/native-request-capture-runner.test.ts`.
   - **Ожидаемый commit message:** `test: cover capture runner bypass behavior on empty workspace`
10. **[TODO]** Git Commit: `test: cover capture runner bypass behavior on empty workspace` (hash: TBD)

### Stream 1.3 — SSOT documentation update

11. **[TODO]** Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §33 (Settings ownership invariant) — добавить уточнение: "PM-side capture runner всегда передаёт `bypassUpstreamGuard: true` в `buildNativeRequestCaptureScenarioPrompt()`, чтобы диагностическая capture-кнопка работала на пустом workspace без upstream артефактов; product contract из `Workflow_CLI.md` §5 (upstream artifact requirement для обычных workflow turns) этим не отменяется и применяется только к настоящим workflow turns через `workflow-step-start-service.ts`". Параллельно проверить, не требует ли §4 (`Где искать правду в коде`) обновления списка PM-side capture файлов.
   - **Scope:** 1 файл — `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
   - **Ожидаемый commit message:** `docs: native request capture skips upstream guard in diagnostic mode`
12. **[TODO]** Git Commit: `docs: native request capture skips upstream guard in diagnostic mode` (hash: TBD)

### Stream: Release Build

13. **[TODO]** Manual verify перед релизом: запустить `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`; затем открыть расширение в empty workspace (без `.codeai-hub/<slug>/` артефактов), Settings → General → Provider Native Request Capture, выбрать сценарий `Diagram Modules` + Codex GPT-5.3-Codex и нажать `Capture Codex Native Request`. Раньше падало с `Missing virtual-simulation.md`. Должно успешно создать пару `.jsonl` + `.md` артефактов в `~/.codeai-hub/logs/native-request-capture/`. Аналогично проверить сценарий `Virtual Simulation`. Translation и Description — smoke-проверка, что не сломались.
    - **Scope:** commands/runtime only — `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`, manual VSIX/dev-run verification.
    - **Ожидаемый commit message:** нет — verification-only, файловых изменений быть не должно.
14. **[TODO]** Git Commit: `n/a — verification-only, no file changes` (hash: n/a)
15. **[TODO]** README/CHANGELOG обновить под предстоящую версию (текущая `1.2.122` + 1 = `1.2.123`): в `README.md` секция "Current Release", в `CHANGELOG.md` новый раздел `## [1.2.123]` с описанием Phase 1 фикса. Это коммит ДО `build-all.sh`.
    - **Scope:** 2 файла — `README.md`, `CHANGELOG.md`.
    - **Ожидаемый commit message:** `docs: prepare release 1.2.123`
16. **[TODO]** Git Commit: `docs: prepare release 1.2.123` (hash: TBD)
17. **[TODO]** Запустить `./scripts/build-all.sh` из корня. Скрипт поднимет версии, пересоберёт пакеты и manifest'ы, соберёт tarball'ы в `~/.codeai-hub/releases` и `doc/tmp/releases/`. Если что-то упало — исправить и перезапустить **только** `build-all.sh`.
    - **Scope:** version/package/release manifest files + generated release tarball copies touched by `build-all.sh` (не редактировать версии вручную).
    - **Ожидаемый commit message:** `chore: bump release manifests to 1.2.123`
18. **[TODO]** Git Commit: `chore: bump release manifests to 1.2.123` (hash: TBD)
19. **[TODO]** Запустить `./scripts/build-release.sh --use-current-version`. Подтвердить успешное появление `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Забрать `codeai-hub-1.2.123.vsix` из корня + tarball'ы из `~/.codeai-hub/releases` в `doc/tmp/releases/`, если они обновились после финальной упаковки.
    - **Scope:** release artifact/manifests touched by `build-release.sh` and artifact copy verification.
    - **Ожидаемый commit message:** `chore: refresh release artifact manifests 1.2.123`
20. **[TODO]** Git Commit: `chore: refresh release artifact manifests 1.2.123` (hash: TBD; если `git status` чистый после `build-release.sh`, зафиксировать в этом пункте `n/a — no file changes after build-release`)
21. **[TODO]** Обновить текущий `doc/Sessions/SessionXXX.md` как Type B / `ACTIVE`: release build выполнен, VSIX `1.2.123` передан на пользовательское визуальное тестирование, closeout ожидает acceptance.
    - **Scope:** 1 файл — текущий session report.
    - **Ожидаемый commit message:** нет — session report может оставаться единственным незакоммиченным файлом в конце сессии.
22. **[TODO]** Git Commit: `n/a — session report remains uncommitted by lifecycle rule` (hash: n/a)

### Stream: User Visual Acceptance Testing

23. **[TODO]** Передать пользователю VSIX `codeai-hub-1.2.123.vsix` и дождаться явного retest'а на чистом workspace. Acceptance должен подтвердить, что Settings → General → Provider Native Request Capture больше не падает на `Diagram Modules` / `Virtual Simulation` без upstream артефактов и создаёт capture artifacts.
    - **Scope:** user installation/retest only.
    - **Ожидаемый commit message:** нет — closeout запрещён до явного acceptance пользователя.
24. **[TODO]** Git Commit: `n/a — user acceptance gate only` (hash: n/a)

### Stream: Scope Closeout

25. **[TODO]** Только после явного acceptance пользователя закрыть active Phase 1 scope: перенести выполненный `todo-plan.md` в `doc/TODO/Archive/`, обновить `Docs_Index.md`, зафиксировать решение, что `Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` остаётся active/deferred для будущих Phase 2/3/4. Если потребуется физически переносить или редактировать planning-doc, разбить этот пункт перед выполнением на отдельную микро-задачу.
    - **Scope:** до 3 файлов — `doc/TODO/todo-plan.md`, архивная копия в `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`.
    - **Ожидаемый commit message:** `docs: close provider native capture bypass scope`
26. **[TODO]** Git Commit: `docs: close provider native capture bypass scope` (hash: TBD)
27. **[TODO]** Создать/обновить `doc/Sessions/SessionXXX.md` как Type A / `COMPLETED`: указать release `1.2.123`, git commits, результаты сборок, пользовательский acceptance и отсутствие активного execution scope.
    - **Scope:** 1 файл — `doc/Sessions/SessionXXX.md`.
    - **Ожидаемый commit message:** нет — session report остаётся единственным допустимым незакоммиченным файлом финального closeout.
28. **[TODO]** Git Commit: `n/a — final session report remains uncommitted by lifecycle rule` (hash: n/a)
