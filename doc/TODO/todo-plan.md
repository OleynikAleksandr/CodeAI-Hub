# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файла**.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates** после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, затем таргетная сборка.
- **Commit** — только после зелёных гейтов.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session010.md` ← **КРИТИЧНО: содержит детали бага**

---

## Phase 61 — Add Gemini to Idea Collector provider picker (owner: Oleksandr, updated: 2026-01-19)

### Stream: Provider picker — add Gemini support
1. [DONE] Feat(project-manager): добавить `geminiCli` в `IDEA_PROVIDER_IDS` и обновить текст диалога
2. [DONE] Git Commit: `feat(project-manager): add gemini to idea collector providers` (hash: e90243bb)

### Stream: Fix Gemini message delivery — **IN PROGRESS** (updated: 2026-01-19)
**ПРОБЛЕМА**: При отправке анкеты через Gemini, первое сообщение (промпт) не попадает в сессию. Сессия открывается пустой.

1. [DONE] Debug: добавить логирование в `session-request-handler.ts:handleMessage()` — проверить что sessionId, binding, adapter присутствуют; scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
2. [DONE] Git Commit: `debug(core): add message handling diagnostics` (hash: 1c8a5137)
3. [DONE] Debug: сравнить sessionId между Core и Gemini — возможно promoteSessionId меняет ID, а Core использует старый; scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`
4. [DONE] Git Commit: `fix(gemini): resolve session id alias mismatches` (hash: 4ac8464d)
5. [DONE] Fix(core): включить auto-run для `geminiCli` (modelLabel), чтобы `runSlug` не был пустой и клиент отправлял первый промпт; scope: `packages/core/src/remote-bridge/handlers/auto-run-service.ts`
6. [DONE] Git Commit: `fix(core): enable gemini auto-run model label` (hash: 656324eb)
7. [DONE] Fix(core+gemini): нормализовать `workspacePath` при `session:create` (не принимать `process.cwd()` core app как workspace) + расширить allowlist Gemini CLI для чтения `~/.codeai-hub/templates` и `~/.codeai-hub/codeai-hub`; scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`
8. [DONE] Git Commit: `fix(gemini): allow reading hub templates and questionnaire` (hash: 8143072e)
9. [DONE] Fix(gemini): запускать Gemini CLI в YOLO режиме (shell/write/edit tools) + нормализовать `workspacePath` (не принимать core runtime dir); scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
10. [DONE] Git Commit: `fix(gemini): enable yolo tools and correct workspace` (hash: 8272e2c8)
11. [DONE] Fix(core): для auto-run `geminiCli` брать default model из `~/.codeai-hub/settings/settings.json`, чтобы runSlug соответствовал актуальному Gemini Default model; scope: `packages/core/src/remote-bridge/handlers/auto-run-service.ts`
12. [DONE] Git Commit: `fix(core): resolve gemini model label from settings` (hash: d8d71199)
13. [TODO] Test(manual): отправка анкеты через Gemini — убедиться что `read_file` по questionnaire/template проходит без ошибки workspace allowlist и доступен `write_file`
14. [TODO] Git Commit: `docs: verify gemini idea collector integration` (hash: TBD)

---

## Анализ проблемы (для контекста)

### Ключевые файлы
| Файл | Описание |
|------|----------|
| `idea-collector-submit-service.ts:278` | `api.sendSessionMessage(session.id, promptPack.content)` |
| `session-request-handler.ts:551-561` | Поиск binding и adapter по sessionId |
| `session-request-handler.ts:580-584` | `adapter.sendMessage(binding.providerSessionId, content)` |
| `gemini-session-manager.ts:348-363` | `promoteSessionId()` меняет ключ в sessions map |
| `gemini-session-manager.ts:634-651` | `requireSession()` ищет сессию по ID |

### Гипотеза
Gemini CLI возвращает свой `providerSessionId` при создании сессии. `promoteSessionId()` удаляет сессию из map под старым UUID и добавляет под новым ID. Но где-то в цепочке используется старый ID.

### Что проверить
```bash
# 1. В handleMessage: какой sessionId приходит?
# 2. В binding: какой providerSessionId хранится?
# 3. В Gemini sessions map: под каким ключом сессия?
```

---

## Phase 62 — Questionnaire Curator (auto-merge Q/A into questionnaire) (owner: Oleksandr, updated: 2026-01-19)

### Stream: Design — Curator architecture
1. [DONE] Doc: описать архитектуру “Questionnaire Curator” (источник данных: transcript; цель: append-only updates в `questionnaire.md`; идемпотентность; триггеры `approve/OK`); scope: `doc/Project_Docs/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`; commit message: `docs: add questionnaire curator architecture`
2. [DONE] Git Commit: `docs: add questionnaire curator architecture` (hash: cc44daae)

### Stream: Core — capture per-run transcript
1. [TODO] Feat(core): сохранять transcript текущего run (role+content+timestamp) в `.codeai-hub/<workspaceSlug>/<stage>/runs/<runSlug>/transcript.jsonl` (или `.md`) при завершении run; scope: `packages/core/src/unified-session/storage.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit message: `feat(core): persist run transcript for curator`
2. [TODO] Git Commit: `feat(core): persist run transcript for curator` (hash: TBD)

### Stream: Curator — apply transcript to questionnaire
1. [TODO] Feat(core+agents): добавить “curator” прогон после `approve/OK` (читает transcript + текущую анкету и дописывает в конец `questionnaire.md` секцию `Clarifications log`); scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/questionnaire-curator-service.ts`, `packages/agents/description-agent/assets/questionnaire-curator.md`; commit message: `feat(curator): append clarifications to questionnaire`
2. [TODO] Git Commit: `feat(curator): append clarifications to questionnaire` (hash: TBD)

### Stream: Manual verification
1. [TODO] Test(manual): 2 последовательных run для `description` → убедиться что второй run видит дополненную анкету (Q/A + notes) и задаёт меньше повторных вопросов; scope: n/a; commit message: `docs: verify questionnaire curator`
2. [TODO] Git Commit: `docs: verify questionnaire curator` (hash: TBD)
