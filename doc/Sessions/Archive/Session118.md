# Session 118 — Regression Log For Release 1.1.757

**Date:** 2026-03-22 09:17 (CET)
**Branch:** main
**Version:** 1.1.757

---

# 1. Work Done in This Session

## Work summary
- Инициализирован отдельный rolling session-report для реального regression pass локального релиза `1.1.757`.
- Текущий regression идёт в mirrored empty-workspace, начиная заново с шага `Description`.
- Для существующего продукта CodeAI Hub начато ручное заполнение новой universal анкеты `questionnaire.md` как если бы проект описывался с нуля простыми словами.
- По SSOT-документации `doc/SolidWorks-WorkFlow/` восстановлена верхнеуровневая архитектурная картина продукта и подготовлены формулировки для анкеты:
  - `modules_draft`;
  - `boundaries_draft`;
  - `constraints`;
  - `out_of_scope`;
  - `notes`.
- Зафиксировано важное правило текущего теста: пункт `0. Документы для чтения` намеренно остаётся пустым, потому что мы честно эмулируем старт пустого проекта без внешних документов; всё описание даётся только из головы пользователя.
- Зафиксировано ещё одно решение по анкете: расширенный список сценариев в пункте `6` сохраняется как есть, потому что он лучше помогает агенту увидеть продукт целиком уже на входе.
- Выявлена одна содержательная правка к анкете перед submit: в пункте `5. Кто будет пользоваться продуктом` не стоит называть AI-агентов и provider runtimes «пользователями» в прямом смысле; этот блок нужно переформулировать как сценарий совместной работы человека и AI.
- По итогам первых ответов `Description`-агента и оценки нового `Final_Description.md` открыт отдельный planning scope под следующие prompt/help refinement improvements: smarter artifact rewrite semantics, explicit composite archetype support, mandatory explicit scenarios в `Final_Description.md` и более жёсткая политика релевантного context window.
- На шаге `Virtual Simulation` обнаружен системный regression-contract defect: лимит `2–4` сценария был одновременно зашит в help, prompt, runtime validation, HTTP/router, UI validation copy и SSOT-документацию, из-за чего агент считал число сценариев формальным требованием шага.
- По этому наблюдению выполнен отдельный corrective rollout и собран новый локальный релиз `1.1.758`, в котором жёсткий upper cap снят со всех рабочих surface-слоёв; для `virtual-simulation.md` сохранено только требование наличия явных сценариев и достаточности покрытия продукта.

## Current testing state
- Активный артефакт: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/questionnaire.md`
- Текущий шаг: regression будет перезапущен на релизе `1.1.758` с той же заполненной анкетой.
- Следующее ожидаемое действие: установить/запустить `1.1.758`, снова пройти `Description` и проверить, перестал ли `Virtual Simulation` навязывать агенту фиксированное число сценариев.

## Key architectural answers already prepared for the questionnaire
- Крупные части продукта:
  - `VS Code extension`
  - `Standalone Project Manager`
  - `Local Core Runtime`
  - `AI provider modules`
  - `слой Markdown-шаблонов и артефактов проекта`
- Видимые границы:
  - `VS Code extension` — оболочка распространения и настроек, но не основной UI;
  - `Standalone Project Manager` — основной пользовательский shell;
  - `Local Core Runtime` — отдельное локальное ядро;
  - provider modules — отдельные подключаемые части;
  - workspace artifacts — отдельный file-based source of truth.
- Принципиальные требования из `notes`:
  - продукт должен описываться в логике SolidWorks: обязательные стадии и движение по дереву workflow;
  - архитектура должна быть аддитивной: новая функция / алгоритм / provider добавляются отдельным модулем или кластером без переписывания уже работающих частей.

## Git commits
- `de84b204 docs(plan): start regression prompt refinement scope`
- `68cfc00f docs(session): checkpoint regression 1.1.757 observations`
- `713152ff docs(prompt): remove hard scenario cap from description surfaces`
- `6632ec6b docs(prompt): remove hard scenario cap from virtual simulation surfaces`
- `8a81a2e5 fix(workflow): remove hard virtual simulation scenario cap`
- `a88dd6f6 docs(contract): drop hard scenario cap from virtual simulation`
- `d6519aec docs(prompt): remove hard scenario cap from remaining entry docs`
- `e620f207 chore(release): build prompt refinement package`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Archive/Session117.md`
2. `doc/Sessions/Archive/Session118.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

> Далее: продолжить regression уже на релизе `1.1.758`, начиная заново с той же анкеты, затем перейти к `Submit questionnaire`, `Virtual Simulation` и проверить, что агент больше не зажимается в старый лимит сценариев.

## Plans for next session
- Установить и прогнать локальный релиз `1.1.758` на той же анкете с самого начала.
- Проверить, что `Description` по-прежнему даёт сильный `Final_Description.md`, а `Virtual Simulation` больше не воспринимает фиксированное число сценариев как формальное требование.
- После `Virtual Simulation` продолжить regression chain: `Diagram Modules` → `Diagram Facades`.
- Отдельно наблюдать оставшиеся пункты `Phase 25`, которые ещё не реализованы: smarter artifact rewrite semantics, explicit composite archetype support и tighter stage context scoping.
