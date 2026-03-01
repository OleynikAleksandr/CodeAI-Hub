# Project Manager — Description Entry Copy / UX Contract

## 1) Проблема

Legacy copy в Session-регионе вводил пользователя в заблуждение:
- создавал впечатление, что сессию нужно стартовать кнопками тулбара;
- не объяснял pre-submit этап с анкетой.

Текущая модель `Description` начинается с анкеты и Help, а runtime-сессия появляется только после `Submit questionnaire`.

## 2) Цель

Зафиксировать стабильный UX-контракт pre-submit/post-submit для шага `Description`.

## 3) Контракт UX

### 3.1 Pre-submit

- Левая панель (`Sessions`) показывает Description Help.
- Правая панель (`Artifacts`) показывает `questionnaire.md`.
- Основной CTA: `Submit questionnaire`.

### 3.2 Post-submit

- Запускается runtime-сессия Description Agent.
- Левая панель возвращается к Session UI.
- Правая панель показывает переключатель `Artifacts/Help`.

### 3.3 UI copy rules

- Тексты должны быть консистентны с англоязычной UI-терминологией.
- Не допускаются упоминания auto-reviewer как части базового шага Description.

## 4) Затрагиваемые области

- `src/client/ui/src/session/empty-state.tsx`
- `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
- `src/client/ui/src/app-host/session-region-questionnaire-copy.ts` (если копирайт централизован)

## 5) Инварианты

1. Не менять business-логику routing/continuity.
2. Не менять workflow-gating.
3. Менять только UX-copy и связанный режим отображения pre-submit/post-submit.

## 6) Критерии приемки

1. До submit пользователь видит Help + анкету, без runtime Session UI.
2. После submit стартует runtime-сессия, и доступен `Artifacts/Help`.
3. Копирайт не конфликтует с контрактом `DescriptionStep_SingleAgent.md`.

## 7) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
