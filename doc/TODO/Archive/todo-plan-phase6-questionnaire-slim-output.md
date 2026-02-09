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

1. [DONE] Архитектурный документ под анкетирование (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Questionnaire_UI_Architecture.md`; expected: согласованный документ с путями/контрактами/UX; commit: `docs(orchestrator): add questionnaire ui architecture`) (date: 2026-01-04)
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

7. [DONE] Обновить системную архитектуру и версии (scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected: версии/Release 1.1.381) (commit: `docs(orchestrator): refresh system architecture 1.1.381`) (date: 2026-01-04)
8. [DONE] Git Commit: `docs(orchestrator): refresh system architecture 1.1.381` (hash: 4b966be) (date: 2026-01-04)

9. [DONE] Подготовить релиз 1.1.381 (scope: версии/манифесты/locks; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`) (commit: `chore(release): prepare 1.1.381`) (date: 2026-01-04)
10. [DONE] Git Commit: `chore(release): prepare 1.1.381` (hash: c9ed8f1) (date: 2026-01-04)

## Phase 3 — Codex thread_id Startup Lock (owner: Oleksandr, updated: 2026-01-05)

### Stream: Startup lock на первый turn (Codex)

1. [DONE] Архитектурный документ: Startup lock для получения «своего» thread_id (scope: `doc/SolidWorks-Flow/System/Codex_ThreadId_StartupLock_Architecture.md`; expected: описана стратегия global mutex на первый `thread.runStreamed` до получения `thread_id`, инварианты и сценарии retry) (commit: `docs(codex): add startup lock thread binding architecture`) (date: 2026-01-05)
2. [DONE] Git Commit: `docs(codex): add startup lock thread binding architecture` (hash: b25e33c) (date: 2026-01-05)

3. [DONE] Реализовать global startup lock для Codex до первого `thread.started` (scope: `packages/Codex_Module/src/messaging/codex-startup-lock.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected: первый turn сериализован между сессиями Codex, thread_id фиксируется при первом `thread.started`, далее без lock) (commit: `fix(codex): serialize first turn until thread id bound`) (date: 2026-01-05)
4. [DONE] Git Commit: `fix(codex): serialize first turn until thread id bound` (hash: f79feed) (date: 2026-01-05)

5. [DONE] Верификация: гейты + таргетная сборка Codex module (scope: `doc/TODO/todo-plan.md`; expected: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/codex-module`) (commit: `docs: verify codex startup lock`) (date: 2026-01-05)
6. [DONE] Git Commit: `docs: verify codex startup lock` (hash: 2970faa) (date: 2026-01-05)

---

## Phase 4 — Questionnaire submit + pre-read auto-attach (owner: Oleksandr, updated: 2026-01-05)

### Stream: Архитектура и план

1. [DONE] Архитектурный документ pre-read auto-attach (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Questionnaire_PreRead_AutoAttach.md`, `doc/TODO/todo-plan.md`; expected: описаны pipeline, компоненты, лимиты; commit: `docs(orchestrator): add questionnaire pre-read auto-attach architecture`) (date: 2026-01-05)
2. [DONE] Git Commit: `docs(orchestrator): add questionnaire pre-read auto-attach architecture` (hash: 9c79206) (date: 2026-01-05)

### Stream: UI single-turn submit

3. [DONE] Объединить prompt + submit в один turn (scope: `src/client/ui/src/services/idea-collector-service.ts`, `media/react-chat.js`, `doc/TODO/todo-plan.md`; expected: один `sendChatMessage` для анкеты; commit: `fix(ui): send questionnaire submit as single turn`) (date: 2026-01-05)
4. [DONE] Git Commit: `fix(ui): send questionnaire submit as single turn` (hash: 2926971) (date: 2026-01-05)

### Stream: Pre-read auto-attach (Core)

5. [DONE] Детектор пути анкеты (scope: `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`, `doc/TODO/todo-plan.md`; expected: извлечение `questionnaire.md` из сообщения; commit: `feat(core): detect questionnaire path for pre-read attach`) (date: 2026-01-05)
6. [DONE] Git Commit: `feat(core): detect questionnaire path for pre-read attach` (hash: eb4ae40) (date: 2026-01-05)

7. [DONE] Экстрактор `pre_read_documents` (scope: `packages/core/src/remote-bridge/handlers/idea-questionnaire-pre-read-extractor.ts`, `doc/TODO/todo-plan.md`; expected: парсер field-блока; commit: `feat(core): extract pre-read document paths from questionnaire`) (date: 2026-01-05)
8. [DONE] Git Commit: `feat(core): extract pre-read document paths from questionnaire` (hash: 43ad1bf) (date: 2026-01-05)

9. [DONE] Бюджет размера вложений (scope: `packages/core/src/remote-bridge/handlers/workspace-auto-attach-reader.ts`, `doc/TODO/todo-plan.md`; expected: лимит общего размера вложений; commit: `feat(core): add total budget for workspace attachments`) (date: 2026-01-05)
10. [DONE] Git Commit: `feat(core): add total budget for workspace attachments` (hash: bb1bbcb) (date: 2026-01-05)

11. [DONE] Attacher для pre-read документов (scope: `packages/core/src/remote-bridge/handlers/idea-questionnaire-pre-read-attacher.ts`, `doc/TODO/todo-plan.md`; expected: чтение анкеты и attach файлов; commit: `feat(core): attach pre-read questionnaire documents`) (date: 2026-01-05)
12. [DONE] Git Commit: `feat(core): attach pre-read questionnaire documents` (hash: 164178a) (date: 2026-01-05)

13. [DONE] Встройка pre-read attach в pipeline сессии (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workspace-auto-attach.ts`, `doc/TODO/todo-plan.md`; expected: pre-read prefix + обновлённые лимиты auto-attach; commit: `feat(core): prepend pre-read attachments before auto-attach`) (date: 2026-01-05)
14. [DONE] Git Commit: `feat(core): prepend pre-read attachments before auto-attach` (hash: 6cf770b) (date: 2026-01-05)

### Stream: Лимиты /read и auto-attach

15. [DONE] Повысить лимиты чтения /read (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `src/client/ui/src/services/idea-collector-workspace-context.ts`, `doc/TODO/todo-plan.md`; expected: новый DEFAULT_MAX_BYTES; commit: `feat(core): raise workspace read limits for idea collector`) (date: 2026-01-05)
16. [DONE] Git Commit: `feat(core): raise workspace read limits for idea collector` (hash: d185c66) (date: 2026-01-05)

17. [DONE] Обновить webview bundle для /read лимитов (scope: `media/react-chat.js`, `doc/TODO/todo-plan.md`; expected: bundle отражает новый лимит; commit: `chore(webview): refresh bundle for read limits`) (date: 2026-01-05)
18. [DONE] Git Commit: `chore(webview): refresh bundle for read limits` (hash: 3a8019e) (date: 2026-01-05)

### Stream: Документация релиза

19. [DONE] Обновить Architecture + SystemArchitecture (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected: описаны single-turn submit, pre-read auto-attach, лимиты; commit: `docs(orchestrator): document questionnaire pre-read auto-attach`) (date: 2026-01-05)
20. [DONE] Git Commit: `docs(orchestrator): document questionnaire pre-read auto-attach` (hash: bd66733) (date: 2026-01-05)

21. [DONE] Обновить README + CHANGELOG под релиз 1.1.385 (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected: release notes; commit: `docs(release): update 1.1.385 notes`) (date: 2026-01-05)
22. [DONE] Git Commit: `docs(release): update 1.1.385 notes` (hash: 9a09380) (date: 2026-01-05)

---

## Phase 5 — Fix questionnaire auto-attach path extraction (owner: Oleksandr, updated: 2026-01-05)

### Stream: Auto-attach placeholder guard

1. [DONE] Исправить auto-attach: игнорировать шаблонные пути с `<...>` (scope: `packages/core/src/remote-bridge/handlers/workspace-auto-attach-extractor.ts`, `doc/TODO/todo-plan.md`; expected: анкета прикрепляется при prompt+submit; commit: `fix(core): ignore placeholder paths in auto-attach`) (date: 2026-01-05)
2. [DONE] Git Commit: `fix(core): ignore placeholder paths in auto-attach` (hash: f7a1def)

3. [DONE] Обновить архитектурный документ pre-read attach (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Questionnaire_PreRead_AutoAttach.md`, `doc/TODO/todo-plan.md`; expected: описан guard для шаблонных путей; commit: `docs(orchestrator): clarify auto-attach placeholder guard`) (date: 2026-01-05)
4. [DONE] Git Commit: `docs(orchestrator): clarify auto-attach placeholder guard` (hash: 36a9c89)

### Stream: Release 1.1.386

5. [DONE] Обновить Architecture + SystemArchitecture под hotfix (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected: версия 1.1.386 + запись изменений; commit: `docs(orchestrator): refresh system docs 1.1.386`) (date: 2026-01-05)
6. [DONE] Git Commit: `docs(orchestrator): refresh system docs 1.1.386` (hash: f647261)

7. [DONE] Обновить README + CHANGELOG под релиз 1.1.386 (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected: release notes; commit: `docs(release): update 1.1.386 notes`) (date: 2026-01-05)
8. [DONE] Git Commit: `docs(release): update 1.1.386 notes` (hash: 949bd07)

9. [DONE] Подготовить релиз 1.1.386 (scope: версии/манифесты/locks, `doc/TODO/todo-plan.md`; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit: `chore(release): prepare 1.1.386`) (date: 2026-01-05)
10. [DONE] Git Commit: `chore(release): prepare 1.1.386` (hash: 4e1a7a6)

---

## Phase 6 — Slim structured output for Idea Collector (owner: Oleksandr, updated: 2026-01-05)

### Stream: Архитектура и план

1. [DONE] Утвердить архитектуру slim-контракта (scope: `doc/SolidWorks-Flow/System/IdeaCollector_Slim_Structured_Output.md`, `doc/TODO/todo-plan.md`; expected: статус Approved + план работ; commit: `docs(orchestrator): approve slim structured output plan`) (date: 2026-01-05)
2. [DONE] Git Commit: `docs(orchestrator): approve slim structured output plan` (hash: 97a425b)

### Stream: Slim schema

3. [DONE] Обновить schema + fallback под slim-контракт (scope: `assets/templates/full-development-flow/idea/idea-collector-schema.json`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `doc/TODO/todo-plan.md`; expected: assessment + questions без дублирования анкеты; commit: `feat(orchestrator): slim idea collector schema`) (date: 2026-01-05)
4. [DONE] Git Commit: `feat(orchestrator): slim idea collector schema` (hash: 7830421)

### Stream: Prompt alignment

5. [DONE] Обновить prompt + kickoff prompt (scope: `assets/templates/full-development-flow/idea/idea-collector-prompt.md`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `doc/TODO/todo-plan.md`; expected: вопросы формируются по достаточности данных для Idea/virtual-simulation; commit: `feat(orchestrator): align idea collector prompt`) (date: 2026-01-05)
6. [DONE] Git Commit: `feat(orchestrator): align idea collector prompt` (hash: f1f4fc4)

### Stream: Webview bundle

7. [DONE] Обновить webview bundle (scope: `media/react-chat.js`, `doc/TODO/todo-plan.md`; expected: bundle отражает новый prompt/contract; commit: `chore(webview): refresh bundle for slim contract`) (date: 2026-01-05)
8. [DONE] Git Commit: `chore(webview): refresh bundle for slim contract` (hash: 7b8ab4c)

### Stream: Документация и релиз

9. [DONE] Обновить Architecture + SystemArchitecture (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected: релиз 1.1.387 + описание slim-контракта; commit: `docs(orchestrator): document slim idea collector contract`) (date: 2026-01-05)
10. [DONE] Git Commit: `docs(orchestrator): document slim idea collector contract` (hash: 5d854e7)

11. [DONE] Обновить README + CHANGELOG под релиз 1.1.387 (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected: release notes; commit: `docs(release): update 1.1.387 notes`) (date: 2026-01-05)
12. [DONE] Git Commit: `docs(release): update 1.1.387 notes` (hash: 4389950)

13. [DONE] Подготовить релиз 1.1.387 (scope: версии/манифесты/locks, `doc/TODO/todo-plan.md`; expected: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit: `chore(release): prepare 1.1.387`) (date: 2026-01-05)
14. [DONE] Git Commit: `chore(release): prepare 1.1.387` (hash: 2c87928)

## Notes

- Каноничные пути артефактов инициативы (как сейчас):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/idea.md`
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/virtual-simulation.md`
- Новый файл анкеты (MVP):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/questionnaire.md`
- Шаблон анкеты (global template):
  - `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`
