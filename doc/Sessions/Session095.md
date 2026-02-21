# Session 095 — HOME per Session и Recovery-контракт

**Date:** 2026-02-21 12:51 (CET)
**Branch:** main
**Version:** 1.1.643

---

# 1. Work Done in This Session

## Work summary
- Проведено подробное обсуждение риска потери непрерывности сессий при авариях на стороне пользователя (потеря интернета, перезапуск/падение Core) и ограничений native-retry/native-resume механизмов провайдеров.
- Согласована ключевая архитектурная позиция для дерева разработки с долгоживущими узлами: **делать изоляцию сразу как HOME per session**, без промежуточного этапа HOME per workspace.
- Зафиксированы аргументы против selective-backup внутренностей provider HOME: высокий риск поломок при апдейтах провайдера и неполном покрытии новых артефактов.
- Принят базовый recovery-подход:
  - сначала `resume-first` в ту же provider session;
  - при рассинхронизации — restore snapshot этой же session-home;
  - затем повторный resume и controlled replay последнего turn.
- Уточнен важный открытый блок для следующей сессии: как перестроить глобальное хранилище `~/.codeai-hub/sessions/` под модель изоляции по workspace/session и как связать это с деревом узлов.

## Discussion details (фиксируем договоренности)
- Рассмотренный вариант «полный backup всего provider HOME на каждый turn без изоляции» признан слишком рискованным в multi-workspace сценариях из-за коллизий состояния и сложного rollback при параллельных диалогах.
- Вариант «сначала HOME per workspace, потом миграция на HOME per session» отвергнут как двойная работа и лишняя миграционная сложность.
- Опасение «HOME per session = overengineering» рассмотрено и отклонено:
  - продуктовая модель опирается на долгоживущий Session Node;
  - потеря session continuity ведет к тяжелому fallback (новая сессия + перенос контекста), что сложнее и дороже;
  - изоляция на уровне сессии уменьшает blast radius и упрощает deterministic restore.
- Подтвержден принцип: не разбирать вручную внутренний layout провайдеров для backup-policy; snapshot должен покрывать весь session-home, чтобы апдейты провайдера не ломали recovery-модель.
- Выделен отдельный следующий архитектурный стрим: проектирование новой структуры `~/.codeai-hub/sessions/` (workspace/session-изоляция, индексы, миграция, связь с `providerSessionId`).

## Created/updated docs
- Создан новый контрактный документ (SSOT):
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_IsolationAndRecovery.md`
- Обновлен индекс документации:
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- Коммитов в этой сессии пока не выполнено (изменения подготовлены в рабочем дереве).

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/SolidWorks-WorkFlow/CodeAI-Hub_Manual_Retry_RFC.md`
6. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
7. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
8. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
9. `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_IsolationAndRecovery.md`
10. `doc/Sessions/Session095.md` (THIS REPORT)

## Plans for next session
- Спроектировать целевую структуру для `~/.codeai-hub/sessions/` с изоляцией по workspace и session node (с учетом параллельных диалогов).
- Формализовать mapping между `dialogId`, `sessionId`, `providerSessionId`, `sessionHomePath`, `turnJournalPath`, `snapshotPath`.
- Зафиксировать политику credentials/auth для multi-provider режима (Codex/Claude/Gemini): что symlink, что copy-once, что не попадает в snapshot.
- Досогласовать оркестрацию recovery: детектор зависшего turn, restore/rollback условия, replay правила и идемпотентность.
- После утверждения архитектуры подготовить новый `doc/TODO/todo-plan.md` с микро-задачами (scope ≤3 файлов) и обязательными commit-пунктами после каждой подзадачи.
