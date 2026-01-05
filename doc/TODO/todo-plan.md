# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента), например:
    - `npm run build --workspace @codeai-hub/core`
    - `npm run build --workspace @codeai-hub/codex-module`
    - `npm run build:webview`
    - `npm run typecheck:webview`
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт этого файла (дата, статус, хеш).
- Phase завершается на чистом дереве.

---

## Phase 1 — Questionnaire MVP для Idea Collector (owner: Oleksandr, updated: 2026-01-04)

### Stream: Дизайн и bootstrap шаблона (Extension)

1. [DONE] Архитектурный документ под анкетирование (scope: `doc/Project_Docs/IdeaCollector_Questionnaire_UI_Architecture.md`; expected: согласованный документ с путями/контрактами/UX; commit: `docs(orchestrator): add questionnaire ui architecture`) (date: 2026-01-04)
2. [DONE] Git Commit: `docs(orchestrator): add questionnaire ui architecture` (hash: 19d326b) (date: 2026-01-04)

3. [DONE] Заархивировать старый `doc/TODO/todo-plan.md` и завести новый план (scope: `doc/TODO/Archive/todo-plan-phase9-and-e2e-checklist.md`, `doc/TODO/todo-plan.md`; expected: старый план в архиве, новый план отражает Questionnaire MVP) (commit: `docs(todo): archive old plan and start questionnaire mvp plan`) (date: 2026-01-04)
4. [DONE] Git Commit: `docs(todo): archive old plan and start questionnaire mvp plan` (hash: 94027b3) (date: 2026-01-04)

5. [DONE] Добавить bundled шаблон анкеты, соответствующий полям `conversation_state.collected` из schema Idea Collector (scope: `assets/templates/full-development-flow/idea/questionnaire-template.md`; expected: вопросы/секции покрывают все поля schema; commit: `feat(templates): add idea questionnaire template`) (date: 2026-01-04)
6. [DONE] Git Commit: `feat(templates): add idea questionnaire template` (hash: 432d14f) (date: 2026-01-04)

7. [DONE] Установка шаблона анкеты при первом старте расширения (scope: `src/extension-module/templates/idea-questionnaire-template-installer.ts`, `src/extension.ts`; expected: создаётся `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`, если нет/пустой; пользовательские правки не перезаписываются) (commit: `feat(extension): install idea questionnaire template on startup`) (date: 2026-01-04)
8. [DONE] Git Commit: `feat(extension): install idea questionnaire template on startup` (hash: 1b5aabe) (date: 2026-01-04)

### Stream: Контракт и интеграция анкеты (UI ↔ Core)

9. [DONE] Расширить `idea-contract`: добавить `questionnaire.templateMarkdown` (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected: contract возвращает templateMarkdown анкеты, версия контракта учитывает mtime/контент анкеты) (commit: `feat(core): include questionnaire template in idea contract`) (date: 2026-01-04)
10. [DONE] Git Commit: `feat(core): include questionnaire template in idea contract` (hash: 68149fd) (date: 2026-01-04)

11. [DONE] Обновить UI normalizers под новое поле контракта (scope: `src/client/ui/src/core-bridge/normalizers.ts`; expected: безопасная нормализация questionnaire.templateMarkdown + сохранение fallback поведения) (commit: `feat(ui): normalize questionnaire template from core contract`) (date: 2026-01-04)
12. [DONE] Git Commit: `feat(ui): normalize questionnaire template from core contract` (hash: 0ab76d0) (date: 2026-01-04)

13. [DONE] Использовать templateMarkdown в UI-сервисе (scope: `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-collector-artifact.ts`, `media/react-chat.js`; expected: сервис может получать шаблон анкеты из контракта, fallback остаётся) (commit: `feat(ui): use questionnaire template from idea contract`) (date: 2026-01-04)
14. [DONE] Git Commit: `feat(ui): use questionnaire template from idea contract` (hash: f8ee410) (date: 2026-01-04)

### Stream: UI анкеты (VS Code webview)

15. [DONE] Вынести общий слой textarea+dnd из `InputPanel` для переиспользования (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-textarea.tsx`, `src/client/ui/src/session/input-dnd.ts`; expected: `InputPanel` продолжает работать, анкета использует те же dnd-возможности) (commit: `refactor(ui): extract input textarea + dnd logic`) (date: 2026-01-04)
16. [DONE] Git Commit: `refactor(ui): extract input textarea + dnd logic` (hash: 5ef1ed7) (date: 2026-01-04)

17. [DONE] Экран анкеты: рендер вопросов + ответы без внутреннего скролла (scope: `src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx`, `src/client/ui/src/components/idea-questionnaire/question-block.tsx`, `src/client/ui/src/components/idea-questionnaire/styles.ts`; expected: длинная страница, поля авто-grow + ручной min-height drag, одна кнопка отправки в конце) (commit: `feat(ui): add idea questionnaire view`) (date: 2026-01-04)
18. [DONE] Git Commit: `feat(ui): add idea questionnaire view` (hash: e0cfa88) (date: 2026-01-04)

19. [DONE] Добавить endpoint записи workspace файла для анкеты (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected: POST /workspace-file-write пишет контент анкеты в workspace) (commit: `feat(core): add workspace file write endpoint`) (date: 2026-01-04)
20. [DONE] Git Commit: `feat(core): add workspace file write endpoint` (hash: 5428d91) (date: 2026-01-04)

21. [DONE] Создание/восстановление `.codeai-hub/.../idea/questionnaire.md` при старте стадии (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/services/idea-collector-service.ts`; expected: файл создаётся из templateMarkdown, далее редактирование сохраняет в workspace; повторное открытие восстанавливает ответы) (commit: `feat(ui): persist idea questionnaire in workspace`) (date: 2026-01-04)
22. [DONE] Git Commit: `feat(ui): persist idea questionnaire in workspace` (hash: 06aea3a) (date: 2026-01-04)

23. [DONE] Отправка анкеты в агент: короткое сообщение + путь (auto-attach), переход в окно сессии Idea Collector (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/app-host/session-region.tsx`; expected: анкета не публикуется целиком; agent получает attach; далее уточнения и finalize как сейчас) (commit: `feat(ui): send questionnaire to idea collector and focus session`) (date: 2026-01-04)
24. [DONE] Git Commit: `feat(ui): send questionnaire to idea collector and focus session` (hash: fd75412) (date: 2026-01-04)

### Stream: Верификация MVP

25. [DONE] Обновить webview bundle после изменений анкеты (scope: `media/react-chat.js`; expected: bundle отражает новые UI/сервисы анкеты) (commit: `chore(webview): update bundle`) (date: 2026-01-04)
26. [DONE] Git Commit: `chore(webview): update bundle` (hash: 2a1bf0c) (date: 2026-01-04)

27. [DONE] E2E ручная проверка (scope: нет изменений кода; expected: создать анкету, заполнить, отправить, уточнения, “ОК/утверждаю”, артефакты сохраняются; обновить этот файл статусами и ссылками) (commit: `docs: verify questionnaire mvp flow`) (date: 2026-01-04)
28. [DONE] Git Commit: `docs: verify questionnaire mvp flow` (hash: e351555) (date: 2026-01-04)

## Phase 2 — Idea Prompt Architecture Alignment (owner: Oleksandr, updated: 2026-01-04)

### Stream: Prompt template bootstrap

1. [DONE] Вынести общий installer для bundled templates (scope: `src/extension-module/templates/bundled-template-installer.ts`, `src/extension-module/templates/idea-collector-prompt-installer.ts`, `src/extension-module/templates/idea-questionnaire-template-installer.ts`; expected: общий helper снижает дублирование) (commit: `refactor(templates): share bundled installer`) (date: 2026-01-04)
2. [DONE] Git Commit: `refactor(templates): share bundled installer` (hash: be14b7e) (date: 2026-01-04)

3. [DONE] Добавить bundled prompt + установить при старте расширения (scope: `assets/templates/full-development-flow/idea/idea-collector-prompt.md`, `src/extension.ts`; expected: prompt включает архитектурные принципы на этапе идеи) (commit: `feat(extension): install idea collector prompt template`) (date: 2026-01-04)
4. [DONE] Git Commit: `feat(extension): install idea collector prompt template` (hash: 351ca52) (date: 2026-01-04)

5. [DONE] Обновить релизные документы под prompt-апдейт (scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`; expected: релиз 1.1.381 отражает архитектурные принципы в Idea prompt) (commit: `docs: update idea prompt release notes`) (date: 2026-01-04)
6. [DONE] Git Commit: `docs: update idea prompt release notes` (hash: f607f11) (date: 2026-01-04)

7. [DONE] Обновить системную архитектуру и версии (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected: версии/Release 1.1.381) (commit: `docs(orchestrator): refresh system architecture 1.1.381`) (date: 2026-01-04)
8. [DONE] Git Commit: `docs(orchestrator): refresh system architecture 1.1.381` (hash: 4b966be) (date: 2026-01-04)

9. [DONE] Подготовить релиз 1.1.381 (scope: версии/манифесты/locks; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`) (commit: `chore(release): prepare 1.1.381`) (date: 2026-01-04)
10. [DONE] Git Commit: `chore(release): prepare 1.1.381` (hash: c9ed8f1) (date: 2026-01-04)

## Phase 3 — Codex thread_id Startup Lock (owner: Oleksandr, updated: 2026-01-05)

### Stream: Startup lock на первый turn (Codex)

1. [DONE] Архитектурный документ: Startup lock для получения «своего» thread_id (scope: `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`; expected: описана стратегия global mutex на первый `thread.runStreamed` до получения `thread_id`, инварианты и сценарии retry) (commit: `docs(codex): add startup lock thread binding architecture`) (date: 2026-01-05)
2. [DONE] Git Commit: `docs(codex): add startup lock thread binding architecture` (hash: b25e33c) (date: 2026-01-05)

3. [DONE] Реализовать global startup lock для Codex до первого `thread.started` (scope: `packages/Codex_Module/src/messaging/codex-startup-lock.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected: первый turn сериализован между сессиями Codex, thread_id фиксируется при первом `thread.started`, далее без lock) (commit: `fix(codex): serialize first turn until thread id bound`) (date: 2026-01-05)
4. [DONE] Git Commit: `fix(codex): serialize first turn until thread id bound` (hash: f79feed) (date: 2026-01-05)

5. [DONE] Верификация: гейты + таргетная сборка Codex module (scope: `doc/TODO/todo-plan.md`; expected: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/codex-module`) (commit: `docs: verify codex startup lock`) (date: 2026-01-05)
6. [DONE] Git Commit: `docs: verify codex startup lock` (hash: TBD) (date: 2026-01-05)

---

## Notes

- Каноничные пути артефактов инициативы (как сейчас):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/idea.md`
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/virtual-simulation.md`
- Новый файл анкеты (MVP):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/questionnaire.md`
- Шаблон анкеты (global template):
  - `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`
