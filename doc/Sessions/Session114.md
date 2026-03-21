# Session 114 — Greenfield Description And Virtual Simulation Accepted

**Date:** 2026-03-21 12:33 (CET)
**Branch:** main
**Version:** 1.1.755

---

# 1. Work Done in This Session

## Work summary

- Выполнен manual greenfield regression для стадии `Description` на локальном релизе `1.1.755` в mirrored workspace `CodeAI-Hub codex 5.4`.
- Заполненная анкета была пересобрана под честный тест новых инструкций:
  - убраны лишние внутренние термины и названия стадий из user-facing ответов;
  - затем по ходу диалога были явно добавлены только те product facts, которые уже точно известны и критично меняют архитектурную картину.
- По итогу нескольких итераций agent drift был вручную остановлен и исправлен в следующих местах:
  - ложная `VS Code-first` интерпретация продукта;
  - слишком широкая роль `VS Code extension shell` вместо узкого MVP baseline;
  - искусственный comparison-centered сценарий со встроенным сравнением нескольких провайдеров;
  - выпадение `Diagram Facades` из stage-oriented workflow списка.
- Принят текущий `Final_Description.md` как достаточно сильная база для следующего шага.
- На accepted baseline стадии `Description` зафиксировано:
  - `Standalone Project Manager` — основной shell и `desktop app`;
  - `Local Core Runtime` — самостоятельная верхнеуровневая часть продукта;
  - `VS Code extension shell` — только distribution / installer / launcher / minimal Settings surface для MVP;
  - `controlled returns`, статусы артефактов и downstream invalidation являются частью архитектурного baseline;
  - встроенное сравнение нескольких провайдеров не входит в baseline MVP.
- Стадия `Description` считается пройденной; следующий активный шаг для regression session — `Virtual Simulation`.
- Выполнен manual greenfield regression для стадии `Virtual Simulation` на том же mirrored workspace с опорой на принятый `Final_Description.md`.
- По итогу итераций `Virtual Simulation` также принят как достаточно сильная база для дальнейшего движения в diagram stages.
- На accepted baseline стадии `Virtual Simulation` зафиксировано:
  - `Standalone Project Manager` имеет полноценный самостоятельный launch path после установки;
  - provider settings разведены по уровням: installation-level доступность/авторизация и project-level выбор рабочего провайдера;
  - один экземпляр `Standalone Project Manager` умеет работать с несколькими проектами/workspace;
  - исполняющая логика и project sessions живут в `Local Core Runtime`, а `Project Manager` остаётся shell для диалогов, навигации и артефактов;
  - `Virtual Simulation` не вернулся к `VS Code-first` framing и не свалился обратно в comparison-centered provider architecture.
- Стадии `Description` и `Virtual Simulation` считаются пройденными; следующий активный шаг для regression session — `Diagram Modules`.
- Зафиксирован практический вывод по анкете:
  - либо сразу писать в questionnaire уже известные ключевые product facts;
  - либо не намекать на них вообще и дать агенту их вытащить вопросами;
  - промежуточный вариант с частично неверной архитектурной рамкой заметно удлиняет диалог.

## Git commits
- No git commits in this session. Работа была exploratory/manual: regression testing, анализ agent outputs и уточнение mirrored workspace artifacts вне основного git-tracked product tree.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session113.md`
6. `doc/Sessions/Session114.md` (THIS REPORT)

> Дополнительно открыть accepted greenfield baseline:
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/questionnaire.md`
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md`
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/virtual_simulation/virtual-simulation.md`

## Plans for next session
- Начать стадию `Diagram Modules` на том же mirrored workspace, используя принятые `Final_Description.md` и `virtual-simulation.md` как baseline.
- Проверить, удерживает ли следующий агент уже принятый shell/core split:
  - `Standalone Project Manager` как primary shell;
  - `Local Core Runtime` как самостоятельный runtime;
  - `VS Code extension shell` как узкий MVP companion surface.
- Следить, чтобы в `Diagram Modules` не вернулись:
  - `VS Code-first` framing;
  - comparison-centered provider scenarios;
  - ложное смешение stage-oriented workflow blocks с окончательной product decomposition.
- После `Diagram Modules` продолжить greenfield regression через `Diagram Facades`.
