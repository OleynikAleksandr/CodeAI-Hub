# Session 048 — Core restart: исчезающие сессии в PM (workspacePath normalization)

**Date:** 2026-02-14 12:48 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.594

---

# 1. Work Done in This Session

## Work summary
- [DONE] Зафиксирована причина: строгая проверка `workspacePath` vs `workspaceRoot` в Core обнуляла session refs при эквивалентных путях (`/path/ws` vs `/path/ws/`), из-за чего PM после рестарта Core терял сессии/диалог.
- [DONE] Core: нормализовано сравнение workspace paths + добавлен тест (включая fallback для legacy snapshot с не-абсолютным `workspacePath`).
- [DONE] Docs: обновлён контракт/описание нормализации workspacePath в `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md` (универсально для всех провайдеров и следующих агентов).
- [DONE] Собран новый patch релиз `1.1.594` (VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.594.vsix`; tarballs: `doc/tmp/releases/*1.1.594*.tar.bz2`, `~/.codeai-hub/releases/*1.1.594*.tar.bz2`).

## Key diagnosis (root cause)
- Core хранит snapshot `.codeai-hub/<workspaceSlug>/description/description-step.json` с полем `workspacePath`.
- При чтении snapshot в `workflow-state` выполнялась строгая проверка совпадения `workspacePath` и `workspaceRoot` из запроса.
- Если запрос приходил с `workspacePath` со слэшем на конце (или иной эквивалентной формой пути), сравнение строк не совпадало, Core очищал session refs как “stale/cross-workspace leak”, и PM не мог восстановить сессию.

## Git commits
- `03047fc7 docs(todo): archive Phase160 plan; start Phase161 (core restart sessions)`
- `e3f40dc9 docs(session): add Session048 (core restart sessions missing)`
- `d6f0b59c fix(core): normalize workspacePath for workflow-state snapshot`
- `6d903150 docs(todo): record core workspacePath normalization fix`
- `d4c134e2 docs(core): document workspacePath normalization for session restore`
- `fd17c870 docs(todo): record docs sync for workspacePath normalization`
- `98c48432 chore(release): build-all for next patch`
- `93f74b39 docs(todo): record patch release build`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session048.md` (THIS REPORT)

## Plans for next session
- Протестировать в UI: закрыть PM, перезапустить Core, открыть PM (пусть PM стартует Core), кликнуть `Reviewer Codex` и убедиться, что сессия появляется и диалог восстанавливается из кумулятивного JSONL.
- Если где-то ещё остаётся “нет сессии после рестарта”: собрать `workflow-state` с `workspacePath` (с/без `/`) и проверить, что `description.reviewerSession/sessionKind` больше не обнуляются.
