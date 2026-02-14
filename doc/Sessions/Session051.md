# Session 051 — PM Dialog Mode + Continuity Rollover Fix + Releases 1.1.595/1.1.596

**Date:** 2026-02-14 17:45 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.596

---

# 1. Контекст и проблема

Цель работ: сделать "бесконечные" сессии агентных диалогов в Project Manager стабильными и предсказуемыми.

Симптомы до рефакторинга:
- После перезапуска Core (при живом PM) клики по `Reviewer Codex`/`Description` в дереве не открывали диалог, вкладка становилась пустой ("No messages yet") или ничего не происходило.
- После перехода на dialog-first режим был найден дополнительный баг: после **continuity rollover** `dialog:send` мог вернуть `Failed to resume dialog session`.

Архитектурный источник правды (обязателен к просмотру при продолжении):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

# 2. Решение (вкратце)

## 2.1. Dialog-first режим в PM
- Показать диалог: PM открывает вкладку по `dialogId` и восстанавливает историю через Core `dialog:list` + `dialog:history`.
- Отправлять/получать live: PM отправляет через `dialog:send` и принимает live `dialog:message`, мерджит с дедупликацией.

## 2.2. Fix: resume после continuity rollover
- Причина бага: Core валидировал `providerSessionId` через unified-session файл `~/.codeai-hub/sessions/.../<providerId>/<providerSessionId>.jsonl`, но unified history пинится на `dialogId`, поэтому валидатор ложно отбрасывал resume.
- Исправление: убрать эту валидацию и оборачивать `resumeSession/createSession` в `try/catch`.

---

# 3. Work Done in This Session

## Work summary
- Phase 170-171: реализован PM dialog mode (history replay + send + live).
- Phase 172: собран patch релиз `1.1.595` (VSIX + tarballs).
- Phase 173: исправлен баг `Failed to resume dialog session` после continuity rollover.
- Phase 174: собран patch релиз `1.1.596` (VSIX + tarballs).

## Артефакты релизов
- VSIX 1.1.595:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.595.vsix`
- VSIX 1.1.596:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.596.vsix`
- Tarballs 1.1.596:
  - `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.596.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.596.tar.bz2`

## Git commits (важные)
- `c8b24fd7 feat(pm): restore dialogs via dialog history after core restart`
- `83b773a2 feat(pm): send via dialogId`
- `7ac94d51 feat(pm): live dialog stream by dialogId`
- `529788cd fix(core): resume dialog session after continuity rollover`
- `cf362b4e chore(release): build-all for next patch` (1.1.596)
- `22685b2b docs(todo): record patch release build (1.1.596)`
- `a13c5014 docs(todo): finalize patch release record (1.1.596)`

---

# 4. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase173.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase174.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
5. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session051.md`

## Plans for next session
- Повторно прогнать тесты в UI на rollover:
  - дождаться триггера контекстного окна,
  - убедиться, что после смены providerSessionId отправка через `dialog:send` продолжает работать,
  - проверить, что история остаётся единой (ui transcript pinned к dialogId).
