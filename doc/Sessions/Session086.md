# Session 086 — Reviewer: reviewer-template.md (bundle + path)

**Date:** 2026-02-18 18:26 (CET)
**Branch:** main
**Version:** 1.1.637

---

# 1. Work Done in This Session

## Work summary
- Исправили UX/SSOT в reviewer-сессиях: `reviewer-template.md` теперь реально доступен агенту (ставится через TemplateSync) и Core передаёт явный absolute path в стартовой инструкции.
- Собран unified build + VSIX релиз `codeai-hub-1.1.637.vsix`, tarball’ы скопированы в `doc/tmp/releases/`.
- Баг зафиксирован в `doc/BugRegistry.md` как `BUG-2026-02-18-06`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `e6db4e57 fix(templates): bundle reviewer-template and pass path`
- `1827a8d9 feat(release): v1.1.637 - reviewer template sync`
- `b3f9b35d docs(bug-registry): reviewer template prompt+sync fix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session086.md` (THIS REPORT)

## Verification (manual)
- Убедиться, что шаблон установлен: `~/.codeai-hub/templates/description/reviewer-template.md`.
- Запустить Reviewer (description) → в первой инструкции должна быть строка `Reviewer template (absolute): ...` и агент не должен писать “reviewer-template.md not found”.

## Release artefacts
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.637.vsix`
- Tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.637.tar.bz2`
