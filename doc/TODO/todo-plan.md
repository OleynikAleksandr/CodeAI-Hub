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

### Stream: Fix Gemini message delivery — **IN PROGRESS**
**ПРОБЛЕМА**: При отправке анкеты через Gemini, первое сообщение (промпт) не попадает в сессию. Сессия открывается пустой.

1. [TODO] Debug: добавить логирование в `session-request-handler.ts:handleMessage()` — проверить что sessionId, binding, adapter присутствуют; scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
2. [TODO] Git Commit: `debug(core): add message handling diagnostics` (hash: TBD)
3. [TODO] Debug: сравнить sessionId между Core и Gemini — возможно promoteSessionId меняет ID, а Core использует старый; scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`
4. [TODO] Git Commit: `debug(gemini): trace session id changes` (hash: TBD)
5. [TODO] Fix: исправить root cause после диагностики; scope: TBD
6. [TODO] Git Commit: `fix(gemini): resolve message delivery to session` (hash: TBD)
7. [TODO] Test(manual): проверить что промпт появляется в сессии Gemini
8. [TODO] Git Commit: `docs: verify gemini idea collector integration` (hash: TBD)

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
