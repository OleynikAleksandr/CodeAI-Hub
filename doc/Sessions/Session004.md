# Session 039 — Usage Limits Refresh Closeout

**Date:** 2026-04-13 08:43 (CEST)
**Branch:** main
**Version:** 1.1.971
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Восстановлен active scope session usage limits refresh и доведён до полного closeout от initial release `1.1.966` до финального validated release `1.1.971`.
- Закрыт базовый implementation path:
  - `SessionIdBar`, Project Manager и Core переведены на session-scoped refresh request (`sessionId + providerId + providerSessionId`);
  - Core перестал отправлять manual refresh в synthetic provider bucket и начал возвращать `session:stream` в реальный runtime `sessionId`;
  - provider adapters `Claude`, `Codex`, `Gemini` читают usage limits по bound `providerSessionId`.
- После smoke `1.1.966` исправлен stale-data regression:
  - удалён persistent UI fallback cache usage limits;
  - usage limits нормализованы в provider-global scope (`claude:global`, `codex:global`, `gemini:global`);
  - live snapshot path стал единственным источником правды.
- После smoke `1.1.967` исправлен dialog-mode wiring regression:
  - `ProjectManagerDialogSessionView` снова прокидывает `onRefreshUsageLimits` в `SessionView`;
  - dialog-mode вернулся на тот же refresh path, что и runtime-mode.
- Для расследования auto-select сбоя собран diagnostic release `1.1.969`:
  - Project Manager начал слать structured diagnostic events в Core;
  - Core начал писать usage-limits trace в `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`;
  - логи доказали race на первом auto-open dialog step.
- Попытка fix-path в `1.1.970` перевела bootstrap session в `pending` и запретила ранний refresh до `ready`, но smoke показал, что этого недостаточно: placeholder session всё ещё не заменялась реальным runtime session.
- Финальный минимальный fix выпущен в `1.1.971`:
  - из dialog restore adoption убран blocking match по PM-only `sessionKind`;
  - adoption остался привязан только к реальным continuity/runtime признакам (`workspacePath`, `stage`, `runSlug`, provider, `sessionId`/`continuationParentId`/`providerSessionId`);
  - `Session ID + Usage Limits` panel теперь запускает refresh только после того, как PM принял materialized runtime session и `binding.status` стал `ready`.
- Успешный smoke `1.1.971` подтвердил итоговый контракт:
  - при первом открытии workspace с auto-select лимиты снова появляются;
  - одинаковый provider показывает единые limits между workflow sessions;
  - dialog-mode и runtime-mode используют один и тот же live refresh path.
- Завершён documentation closeout:
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md` расширен до подробного module contract с описанием `pending` bootstrap, `ready`-only refresh и причины auto-select race;
  - завершённый `doc/TODO/todo-plan.md` архивирован в `doc/TODO/Archive.zip` как `Archive/todo-plan-phase6-session-usage-limits-refresh.md`;
  - planning-док `doc/SolidWorks-WorkFlow/Plans/SessionUsageLimitsRefresh_Architecture.md` архивирован в `doc/SolidWorks-WorkFlow/Plans/Archive.zip`;
  - `doc/SolidWorks-WorkFlow/Docs_Index.md` очищен от ссылки на закрытый active planning scope;
  - `doc/TODO/todo-plan.md` возвращён в placeholder-состояние для следующего execution cycle.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `66004e872 fix: make usage limits refresh follow active session`
- `a0e5d5adc fix: scope usage limits refresh to runtime sessions`
- `ab7d8f93f test: cover session-scoped usage limits refresh`
- `a9d9523a2 docs: prepare release notes for session-scoped usage limits refresh`
- `8abfb874f chore: bump version via build-all.sh`
- `9e5f8f56f test: pass session id to session id bar test`
- `df46fc32e docs: record session-scoped usage limits release validation`
- `385f1feb9 fix: remove persistent usage limits cache`
- `d72d7c736 fix: make usage limits provider-global`
- `0ce8374f5 test: cover provider-global usage limits`
- `5a87481cc docs: sync provider-global usage limits contract`
- `9d266f8c2 docs: prepare release notes for provider-global usage limits`
- `e2853324a chore: bump version via build-all.sh`
- `d2ed8356f docs: record provider-global usage limits release validation`
- `d8c4e7d2a fix: restore usage limits refresh in dialog session view`
- `5fceae43f docs: prepare release notes for dialog usage limits refresh`
- `1a621246b chore: bump version via build-all.sh`
- `4f8d9d423 docs: record dialog usage limits release validation`
- `e6f9426d6 chore: add project manager usage limits diagnostics`
- `153e9f742 chore: add core usage limits diagnostics`
- `5b35faf22 docs: sync usage limits diagnostics plan`
- `e5407ebf3 docs: prepare release notes for usage limits diagnostics`
- `66b06d8b9 chore: bump version via build-all.sh`
- `a9e3a9da1 docs: record usage limits diagnostics release validation`
- `6aeb42834 fix: defer dialog usage limits refresh until runtime restore`
- `bbe64a6a7 test: cover dialog usage limits runtime restore`
- `12db4195d docs: sync dialog runtime restore usage limits fix`
- `a41da113c docs: prepare release notes for dialog runtime restore fix`
- `36814ee98 chore: bump version via build-all.sh`
- `a00a02eb2 docs: record dialog runtime restore release validation`
- `367782de8 fix: adopt restored dialog sessions without session kind match`
- `e03f4b662 refactor: simplify dialog restore adoption path`
- `024647c33 test: cover dialog restore adoption without session kind`
- `f56ba43ba docs: sync simplified dialog restore adoption fix`
- `09fd7b57a docs: prepare release notes for simplified dialog restore adoption`
- `736255f28 chore: bump version via build-all.sh`
- `b92719970 docs: record simplified dialog restore release validation`
- `523fb5097 docs: expand session id usage bar module contract`
- `b1dc39413 docs(archive): close session usage limits execution cycle`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- Если новый scope затронет session panels Project Manager, сначала использовать factual/module docs из `doc/SolidWorks-WorkFlow/Modules/Session_UI/` как карту текущего поведения.
