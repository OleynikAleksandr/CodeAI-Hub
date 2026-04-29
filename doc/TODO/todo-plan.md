# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionStatus_FourChipSplit_Architecture.md`
- **Approved prototype:** `doc/tmp/prototypes/session-input-status-split.html`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (invariant 14 — effective model identity SSOT; invariant 16 — localization approved dictionaries; invariant 22 — localization blocking UI)
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — некоторое количество подзадач.
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что подзадача затрагивает больше 3 файлов — задача разбивается на более мелкие.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон только для диагностики.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run typecheck:webview`, `npm run build:webview`. Затронутые рабочие пространства проверяются точечно.
- **Commit:** после зеленых гейтов. Сразу обновляем `todo-plan.md` (статус, дата, hash).
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления `SessionStatusPanel.md` и/или `UI_Bundles.md` **ДО** коммита, чтобы изменения попали в один Git Commit вместе с кодом.
- **Phase завершается** на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.

## Phase 1 — Session Status 4-Chip Split (owner: agent, updated: 2026-04-29)

### Stream 1.0: Scope opening

1. [DONE] Зафиксировать утверждённый planning-doc и активный execution scope: `doc/SolidWorks-WorkFlow/Plans/SessionStatus_FourChipSplit_Architecture.md` + переписанный `doc/TODO/todo-plan.md` под Phase 1.
   - scope: 2 файла (`SessionStatus_FourChipSplit_Architecture.md`, `todo-plan.md`).
   - commit message: `docs: open four-chip status split scope`.
2. [DONE] Git Commit: `docs: open four-chip status split scope` (hash: `e67f9bd03`).

### Stream 1.1: Localization

1. [DONE] Добавить ключ `session.status.model_label = "Model"` в approved dict `assets/localization/source/en/messages_for_the_user.json` и в legacy mirror `assets/localization/source/en/system_feedback.json` (оба обязаны оставаться в синхроне до завершения transition).
   - scope: 2 файла (`messages_for_the_user.json`, `system_feedback.json`).
   - commit message: `feat(localization): add session.status.model_label key`.
2. [DONE] Git Commit: `feat(localization): add session.status.model_label key` (hash: `473f7a4e9`).

### Stream 1.2: Status row CSS

1. [DONE] В canonical session styles SSOT (`media/session-view.css`) добавлен блок `.session-status-row`, `.session-status-chip`, `.session-status-chip--label`, `.session-status-chip--limits`, `.session-status-button`, `.session-status-button--{claude,codex,gemini}` плюс `.session-status__debug-strip` для опционального tokenDebugSummary. Цвета — из existing `session-tab--*` / `session-banner--*` set. Default text grey `#b0b0b0`, active white `#ffffff`. Размеры: chips 1–3 `flex: 0 0 auto`, chip 4 `flex: 1 1 0; min-width: 0`. Внешняя ширина ряда фиксирована родителем (`width: 100%`).
   - scope: 1 файл (`media/session-view.css`).
   - actual scope note: путь оказался `media/session-view.css`, а не `packages/ui/project-manager/styles.css`, потому что live session styles SSOT исторически живёт под `media/` (см. `.session-panel`, `.session-id-bar`, `.session-status__*` блоки в этом же файле).
   - commit message: `feat(session-ui): add four-chip status row styles`.
2. [DONE] Git Commit: `feat(session-ui): add four-chip status row styles` (hash: `ebf026751`).

### Stream 1.3: StatusPanel rewrite

1. [DONE] Переписан `src/client/ui/src/session/status-panel.tsx`: рендерим 4 chip-ряд из `models[0]`. Удалены legacy single-line render и `Core Supervisor: starting…` fallback (component возвращает `null` при `connectionStatus !== "ready"` или отсутствии `models[0]`). Удалены неиспользуемый `formatModelSummary`, `STATUS_SEPARATOR`, `describeConnectionStatus`. Reasoning chip скрывается при `model.reasoning` отсутствующем/пустом. Provider class берётся из `models[0].providerId` (`session-status-button--{claude,codex,gemini}`). Локализуем `session.status.model_label` через `useLocalization()`. `tokenDebugSummary` сохранён как опциональный muted-strip ниже ряда.
   - scope: 1 файл (`src/client/ui/src/session/status-panel.tsx`).
   - commit message: `feat(session-ui): split status panel into four chips`.
2. [DONE] Git Commit: `feat(session-ui): split status panel into four chips` (hash: TBD — будет проставлен в коммите Stream 1.4).

### Stream 1.4: Tests

1. [TODO] Обновить (или создать) `src/client/ui/src/session/status-panel.test.tsx`: assertions — рендерит 4 chip ряд для каждого провайдера (применяется правильный `session-status-button--{provider}` класс), reasoning chip скрывается при `undefined`, токен-чип показывает `used (remaining%)`, component возвращает `null` при `connectionStatus !== "ready"` или `models` пусто.
   - scope: 1 файл (`src/client/ui/src/session/status-panel.test.tsx`).
   - commit message: `test(session-ui): cover four-chip status panel`.
2. [TODO] Git Commit: `test(session-ui): cover four-chip status panel` (hash: TBD).

### Stream 1.5: SSOT docs sync

1. [TODO] Обновить `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` (новая структура — 4 chip, источники данных по chip, provider tint contract, `null` при not-ready), плюс короткий ref-update в `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, если там упоминался single-line вариант.
   - scope: до 2 файлов (`SessionStatusPanel.md`, опционально `UI_Bundles.md`).
   - commit message: `docs(session-ui): document four-chip status panel`.
2. [TODO] Git Commit: `docs(session-ui): document four-chip status panel` (hash: TBD).

### Stream 1.6: Verification

1. [TODO] Прогнать `npm run typecheck:webview` и `npm run build:webview`. При зелёных гейтах — записать в этот файл результат прогонов и закрыть Phase 1 как `DONE`.
   - scope: только проверка, без изменений в коде; если что-то падает — открыть отдельную микрозадачу/коммит на фикс.
   - commit message (если нужен фикс): `chore(session-ui): verify four-chip status panel build`.
2. [TODO] Git Commit (опционально, если был фикс): `chore(session-ui): verify four-chip status panel build` (hash: TBD).

## После Phase 1

- Если пользователь утвердит — отдельной фазой собираем релиз (`./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`), готовим Session report (Type A или B в зависимости от того, остаётся ли активный scope).
- Click-handlers для кнопок (выбор модели / reasoning), provider-collapse surface и right-edge per-session percent rotation — отдельные циклы, не входят в этот scope.
