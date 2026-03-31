# Session 140 — Diagram Modules Retest Blockers After Release 1.1.770

**Date:** 2026-03-23 14:51 CET
**Branch:** main
**Version:** 1.1.770

---

# 1. Work Done in This Session

## Work summary
- После release `1.1.770` пользовательский retest `Diagram Modules` нашёл новый follow-up scope уже вне prompt surface: после создания `product-parts.index.md` React Flow остаётся пустым, hidden continuation не стартует, а user-facing surface всё ещё показывает legacy copy старой `module-inventory` архитектуры.
- Дополнительно по live feedback исправлен compose header для diagram stages без нового релиза: `diagram_modules` и `diagram_facades` больше не начинают prompt строкой `Собери артефакт на основе анкеты и шаблона.`; вместо этого compose opener стал stage-specific и привязан к реальным input artifacts.
- По коду подтверждён единый root cause для пустого canvas и сорванного continuation: и progressive loader, и workflow progress snapshot всё ещё парсят old-style index format `### Product Part: <id>`, тогда как реальный agent-written `product-parts.index.md` использует numbered `Canonical order` list. Из-за этого UI видит zero planned parts, а orchestration остаётся на `substep: index`.
- Отдельно подтверждены legacy user-surface tails:
  - `DiagramModulesPanel` всё ещё подсовывает `artifactFileName="module-inventory.md"` и старый intro text;
  - `stage-artifact-mode.ts` всё ещё открывает `Source` через `module-inventory.md` и старый pending message;
  - `diagram-editor-shell.tsx` показывает generic empty-canvas copy, не соответствующую staged index-first flow.
- Для следующей сессии оформлен новый planning baseline по этим blocker-ам и добавлен `Phase 47` в `todo-plan.md`.

## Verification
- `sed -n '1,220p' '/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/product-parts.index.md'`
- `sed -n '1,320p' src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `sed -n '1,260p' packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
- `sed -n '1,220p' src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`
- `sed -n '1,220p' src/client/project-manager/components/layout/stage-artifact-mode.ts`
- `sed -n '1,220p' src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`
- `npx tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`
- `git status --short --branch`

## Notes
- Compose-header fix уже закоммичен, но новый release специально не собирался по прямому указанию пользователя.
- Поэтому установленный VSIX `1.1.770` ещё не содержит compose-header cleanup, а только кодовая ветка `main`.
- Главный вывод этой сессии: текущие live blockers больше не про prompt wording, а про mismatch между реальным index format и внутренними runtime/UI парсерами staged `Diagram Modules`.

## Git commits
- `3236a549 fix(diagram-workflow): remove legacy template header from diagram stages`
- `a5c359b9 docs(plan): sync compose header cleanup hash`
- `3bce6491 docs(plan): capture diagram modules retest blockers after 1.1.770`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Retest_Blockers_After_1_1_770_Architecture.md`
9. `doc/Sessions/Archive/Session139.md`
10. `doc/Sessions/Archive/Session140.md` (THIS REPORT)

## First sanity check
- Подтвердить, что дерево чистое после handoff commit-а и версия репозитория остаётся `1.1.770`.
- Ещё раз открыть реальный `product-parts.index.md`, который записал агент, и помнить, что он использует numbered `Canonical order`, а не `### Product Part: ...` blocks.
- Не собирать новый release до тех пор, пока не закрыты parser mismatch и legacy user-surface tails.

## Plans for next session
- Сначала починить tolerant parsing index format в progressive loader и workflow progress snapshot.
- Затем вычистить `Diagram Modules` preamble / Source / empty-state copy из старой inventory-first архитектуры.
- После этого повторить live retest на текущей `1.1.770`-line и только потом решать вопрос следующего release.
