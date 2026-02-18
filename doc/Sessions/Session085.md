# Session 085 — Claude: корректный подсчёт remaining% контекстного окна

**Date:** 2026-02-18 17:08 (CET)
**Branch:** main
**Version:** 1.1.636

---

# 1. Work Done in This Session

## Work summary
- Убрали неверный fallback подсчёта “контекстных токенов” Claude из `modelUsage` (включая `cache_read`/`cache_creation`) — эти числа больше не используются для continuity/rollover.
- Реализовали чтение реального snapshot `/context` через provider JSONL tail (`<providerSessionId>.jsonl`) после сервисного `/context` probe.
- Добавили guard-тест: `SDKMessageProcessor` не должен формировать `tokenUsage` из `modelUsage`.
- Собран unified build + VSIX релиз `codeai-hub-1.1.636.vsix`, tarball’ы скопированы в `doc/tmp/releases/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `3fda33cd fix(claude): read context usage from provider jsonl`
- `bd8c3685 feat(release): v1.1.636 - claude context usage`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session085.md` (THIS REPORT)

## Notes / Verification
- Проверить в PM (Claude Reviewer continuity): tokenDebugSummary должен совпадать с `/context` из provider JSONL (например `Tokens: 59.1k / 200k (30%)` ⇒ ~70% remaining).
- Rollover должен срабатывать только при реальном достижении порога remaining% из settings.
- Артефакты релиза:
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.636.vsix`
  - Tarballs: `doc/tmp/releases/*-1.1.636.tar.bz2`
