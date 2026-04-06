# Description Step — Single Agent Final Artifact (Contract / SSOT)

## Scope

Этот документ описывает канонический контракт шага Workflow `description`:
- какие шаблоны и артефакты участвуют;
- как работает pre-submit/post-submit UX;
- как ведёт себя Description Agent;
- какие инварианты обязательны для корректного перехода к `virtual_simulation`.

Цель шага: получить `Final_Description.md`, который пользователь может читать и обсуждать, и который даёт следующему агенту (`Virtual Simulation`) достаточную стартовую базу.

---

## 1) Runtime templates (SSOT)

Каноничные bundled-шаблоны шага `Description`:

1. `.codeai-hub/templates/description/questionnaire-template.md`
   - Назначение: анкета pre-submit.
2. `.codeai-hub/templates/description/description-template.md`
   - Назначение: bundled runtime/reference copy of Description Help; этот файл больше не является прямым PM-render source.
3. `.codeai-hub/templates/description/description-collector-prompt.md`
   - Назначение: системные инструкции Description Agent (file-first).

Ключевая фиксация: `description-template.md` в текущей конфигурации — это runtime/reference help asset, а не каркас `Final_Description.md`.

---

## 2) Target flow (v2)

Шаг `description` работает как единая resume-сессия после submit.

1. Пользователь редактирует `questionnaire.md` (pre-submit).
2. Пользователь нажимает `Submit questionnaire`.
3. PM запускает runtime-сессию Description Agent.
4. Агент читает `questionnaire.md` (+ pre-read файлы, если есть).
5. Агент **сразу** формирует первый черновик `Final_Description.md` в файле.
6. Агент и пользователь итеративно уточняют документ до явного утверждения.

Встроенный auto-reviewer в шаге `Description` отсутствует.

---

## 3) Artifacts (SSOT)

- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

### Legacy artifacts (compat only)

- `.codeai-hub/<workspaceSlug>/description/description.md` (включая `runs/*`) может существовать в старых workspace.
- В новой модели legacy draft не является upstream-источником истины и не должен просачиваться в product-visible PM/UI labels.

---

## 4) Description Agent behavior contract

### 4.1 File-first принцип

- Агент не начинает интервью до появления файла `Final_Description.md`.
- Даже при короткой анкете агент создаёт скелет/черновик `Final_Description.md` и только после этого задаёт вопросы.

### 4.2 Итеративный цикл

На каждой итерации:
1. Полная перезапись `Final_Description.md` с актуальными правками.
2. Краткий отчёт в чате о том, что изменилось.
3. До 3 критичных вопросов, которые реально улучшают документ.

### 4.3 Ограничения

- Не выдумывать факты.
- Если данных не хватает: явное допущение или вопрос.
- Не превращать шаг Description в техническую спецификацию.
- Язык: русский (чат + артефакт).

### 4.4 Что обязательно должно быть в `Final_Description.md`

Минимальный набор для старта `Virtual Simulation` не с нуля:
- проблема/ценность;
- целевые пользователи;
- отдельный сценарный блок с понятным заголовком уровня `## Ключевые пользовательские сценарии` или близким по смыслу;
- ключевые сценарии в количестве, достаточном для покрытия продукта, внутри этого отдельного блока (актор/цель → действие → ожидаемый результат → критерий успеха);
- ограничения/допущения;
- `out of scope`;
- ключевые сущности/термины (3–10, короткие определения);
- открытые вопросы для следующих шагов.

### 4.5 Definition of Done

Шаг считается готовым, когда:
- пользователь явно подтвердил документ (`ОК/утверждаю/approve`),
- `Final_Description.md` существует и содержит минимум из п. 4.4,
- ключевые пользовательские flows из анкеты и подтверждённого диалога не потеряны и отражены в отдельном сценарном блоке как явные сценарии или как явно помеченные допущения.

---

## 5) PM/UI contract (Description)

### 5.1 Pre-submit

- Runtime-сессии нет.
- Левая панель (`Sessions`) показывает Description Help.
- Правая панель (`Artifacts`) показывает `questionnaire.md`.

### 5.2 Post-submit

- Создаётся runtime-сессия Description.
- Левая панель возвращается к Session UI.
- Правая панель поддерживает переключатель `Artifacts/Help`:
  - `Artifacts` — артефакты стадии,
  - `Help` — локальный PM help surface с тем же смысловым contract, что и pre-submit Description Help; рендер не зависит от runtime/template-sync.

### 5.3 UI copy invariants

- Не упоминать `description.md` как целевой артефакт.
- Не упоминать auto-reviewer как часть шага `Description`.
- Не показывать пользователю legacy label `description.md`; даже compat `draftPath` отображается как `Final_Description.md`.
- Не использовать `Idea` / `Idea Collector` как product-visible label, Help copy, provider-picker copy или имя текущего шага.
- Не описывать ручной recovery/restart flow как поддерживаемую возможность продукта.

---

## 6) Invariants (must-not-break)

1. `Final_Description.md` — единственный upstream SSOT для `virtual_simulation`.
2. Description-сессия после submit — `resume_in_place`.
3. Нет скрытого auto-start reviewer при записи description-артефактов.
4. Любое изменение `Final_Description.md` должно помечать downstream шаги как `OUTDATED`.
5. Late-write legacy `description.md` не должен понижать/ломать статус при наличии актуального `Final_Description.md`.

---

## 7) Compatibility + migration baseline

- Legacy workspace с `description.md` должны оставаться читаемыми.
- Runtime/watcher/gating обязаны опираться на `Final_Description.md` как канон; внутренний compat-слой для legacy draft допустим только как non-SSOT fallback.
- Downstream prompts и path contracts используют только `Final_Description.md`.
- Остаточные `idea-*` имена допустимы только как internal compat/helper aliases или как disabled legacy remnants вне active PM flow; такие имена не должны считаться source of truth для текущего workflow.

---

## 8) Related SSOT

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (legacy filename, compat)
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
