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
4. [TODO] Git Commit: `docs(todo): archive old plan and start questionnaire mvp plan` (hash: TBD)

5. [TODO] Добавить bundled шаблон анкеты, соответствующий полям `conversation_state.collected` из schema Idea Collector (scope: `assets/templates/full-development-flow/idea/questionnaire-template.md`; expected: вопросы/секции покрывают все поля schema; commit: `feat(templates): add idea questionnaire template`) (date: TBD)
6. [TODO] Git Commit: `feat(templates): add idea questionnaire template` (hash: TBD)

7. [TODO] Установка шаблона анкеты при первом старте расширения (scope: `src/extension-module/templates/idea-questionnaire-template-installer.ts`, `src/extension.ts`; expected: создаётся `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`, если нет/пустой; пользовательские правки не перезаписываются) (commit: `feat(extension): install idea questionnaire template on startup`) (date: TBD)
8. [TODO] Git Commit: `feat(extension): install idea questionnaire template on startup` (hash: TBD)

### Stream: Контракт и интеграция анкеты (UI ↔ Core)

9. [TODO] Расширить `idea-contract`: добавить `questionnaire.templateMarkdown` (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected: contract возвращает templateMarkdown анкеты, версия контракта учитывает mtime/контент анкеты) (commit: `feat(core): include questionnaire template in idea contract`) (date: TBD)
10. [TODO] Git Commit: `feat(core): include questionnaire template in idea contract` (hash: TBD)

11. [TODO] Обновить UI normalizers под новое поле контракта (scope: `src/client/ui/src/core-bridge/normalizers.ts`; expected: безопасная нормализация questionnaire.templateMarkdown + сохранение fallback поведения) (commit: `feat(ui): normalize questionnaire template from core contract`) (date: TBD)
12. [TODO] Git Commit: `feat(ui): normalize questionnaire template from core contract` (hash: TBD)

13. [TODO] Использовать templateMarkdown в UI-сервисе (scope: `src/client/ui/src/services/idea-collector-service.ts`; expected: сервис может получать шаблон анкеты из контракта, fallback остаётся) (commit: `feat(ui): use questionnaire template from idea contract`) (date: TBD)
14. [TODO] Git Commit: `feat(ui): use questionnaire template from idea contract` (hash: TBD)

### Stream: UI анкеты (VS Code webview)

15. [TODO] Вынести общий слой textarea+dnd из `InputPanel` для переиспользования (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-textarea.tsx`, `src/client/ui/src/session/input-dnd.ts`; expected: `InputPanel` продолжает работать, анкета использует те же dnd-возможности) (commit: `refactor(ui): extract input textarea + dnd logic`) (date: TBD)
16. [TODO] Git Commit: `refactor(ui): extract input textarea + dnd logic` (hash: TBD)

17. [TODO] Экран анкеты: рендер вопросов + ответы без внутреннего скролла (scope: `src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx`, `src/client/ui/src/components/idea-questionnaire/question-block.tsx`, `src/client/ui/src/components/idea-questionnaire/styles.ts`; expected: длинная страница, поля авто-grow + ручной min-height drag, одна кнопка отправки в конце) (commit: `feat(ui): add idea questionnaire view`) (date: TBD)
18. [TODO] Git Commit: `feat(ui): add idea questionnaire view` (hash: TBD)

19. [TODO] Создание/восстановление `.codeai-hub/.../idea/questionnaire.md` при старте стадии (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/services/idea-collector-service.ts`; expected: файл создаётся из templateMarkdown, далее редактирование сохраняет в workspace; повторное открытие восстанавливает ответы) (commit: `feat(ui): persist idea questionnaire in workspace`) (date: TBD)
20. [TODO] Git Commit: `feat(ui): persist idea questionnaire in workspace` (hash: TBD)

21. [TODO] Отправка анкеты в агент: короткое сообщение + путь (auto-attach), переход в окно сессии Idea Collector (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/app-host/session-region.tsx`; expected: анкета не публикуется целиком; agent получает attach; далее уточнения и finalize как сейчас) (commit: `feat(ui): send questionnaire to idea collector and focus session`) (date: TBD)
22. [TODO] Git Commit: `feat(ui): send questionnaire to idea collector and focus session` (hash: TBD)

### Stream: Верификация MVP

23. [TODO] E2E ручная проверка (scope: нет изменений кода; expected: создать анкету, заполнить, отправить, уточнения, “ОК/утверждаю”, артефакты сохраняются; обновить этот файл статусами и ссылками) (commit: `docs: verify questionnaire mvp flow`) (date: TBD)
24. [TODO] Git Commit: `docs: verify questionnaire mvp flow` (hash: TBD)

---

## Notes

- Каноничные пути артефактов инициативы (как сейчас):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/idea.md`
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/virtual-simulation.md`
- Новый файл анкеты (MVP):
  - `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/questionnaire.md`
- Шаблон анкеты (global template):
  - `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`
