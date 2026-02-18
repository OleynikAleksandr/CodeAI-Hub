# Session 087 — Release 1.1.637: reviewer-template.md (bundle + path)

**Date:** 2026-02-18 18:27 (CET)
**Branch:** main
**Version:** 1.1.637

---

# 1. Work Done in This Session

## Work summary
- Core/Templates: добавлен bundled template `reviewer-template.md`, чтобы TemplateSync устанавливал его в `~/.codeai-hub/templates/description/reviewer-template.md`.
- Core/Workflow runtime: при старте reviewer-сессии добавляется `Reviewer template (absolute): ...` (если файл существует), чтобы агент не искал шаблон “вслепую”.
- Обновлены release артефакты до `1.1.637` и собран VSIX.
- Зафиксирован баг `BUG-2026-02-18-06` в `doc/BugRegistry.md`.

## Builds / Artifacts
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.637.vsix`
- Tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.637.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `e6db4e57 fix(templates): bundle reviewer-template and pass path`
- `1827a8d9 feat(release): v1.1.637 - reviewer template sync`
- `b3f9b35d docs(bug-registry): reviewer template prompt+sync fix`
- `9d847146 docs(sessions): add Session086 report`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session087.md` (THIS REPORT)

## Manual verification plan (deferred)
- Тестирование перенесено на следующую сессию.
- Проверить: старт reviewer-сессии больше не вызывает у агента “template not found”; в первой инструкции есть явный absolute path к шаблону.
