# Session 075 — Fix idea paths and auto-run model labels

**Date:** 2026-01-09 18:10 (CET)
**Branch:** main
**Version:** 1.1.396

---

# 1. Work Done in This Session

## Work summary
- Исправлены пути анкеты/артефактов Idea Collector: теперь строятся из контекста сессии (`initiativeSlug`/`runSlug`), без дефолтов `full-development-flow/001-default`.
- Auto-run нормализует label модели (`default` → `sonnet` для Claude, `gpt-5.2-codex` для Codex).
- Обновлены архитектурные документы под это поведение.
- Пересобран webview fallback bundle (`media/react-chat.js`).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `e0d87954 fix(flow): resolve idea paths from session context`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/Initiatives_Runs_UI_Entry_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session075.md` (THIS REPORT)

## Plans for next session
- Перепроверить поведение Idea Collector на реальной сессии (инициатива + Idea + Codex/Claude) и убедиться, что пути и runSlug корректны.
