# Project Manager — Workflow Navigation SSOT

**Status:** Active SSOT  
**Updated:** 2026-04-06
**Owner:** Oleksandr + Codex

---

## 1) Проблема

Навигация в Project Manager шла разными путями:
- Toolbar;
- левое дерево (stage/session/artifact);
- auto-select после смены workspace.

Из-за этого подсветка шага, открытая dialog-сессия, выбранный артефакт и header правой панели могли расходиться.

## 2) Единый термин

`activeStage` — единственный source of truth для шага workflow в UI.

Допустимые значения:
- `description`
- `virtual_simulation`
- `diagram_modules`
- `foundation_envelope`

## 3) Источники активации stage

Любое из событий ниже обязано приводить к установке `activeStage`:
- клик по Toolbar;
- клик по stage-узлу в дереве;
- клик по artifact/session узлу в дереве;
- auto-select canonical startup stage при смене workspace.

Cold-start restore rule:
- startup restore для Session panel не имеет права читать отдельный browser-local stage/dialog truth;
- при открытии workspace `activeStage` обязан восстанавливаться только из canonical `workflow-state.lastActive` для текущего workspace;
- continuity участвует только как history/session layer для уже выбранного `activeStage`, а не как отдельный startup stage selector;
- любые browser-local кэши допустимы только как ephemeral UI cache и не могут определять `dialogIntent`, `activeStage` или startup session selection.

Канонический route:
1. Сначала читаем `activeStage` из canonical workspace truth (`workflow-state.lastActive`).
2. Затем строим stage-scoped artifact/session payload через один shared router.
3. Затем синхронизируем правую/левую панели.
4. Затем (если есть) открываем соответствующую dialog-session.

## 4) Контракт синхронизации

`activeStage` обязан детерминировать:
- `dialogIntent.stage` (если открывается session);
- `selectedArtifact` (если артефакт существует);
- `headerMode` правой панели (step-specific: `artifacts`/`help` или `artifacts`/`source`/`help`);
- заголовок правой панели (`<Step Name>` + соответствующий stage toggle).

### 4.1 Матрица `activeStage → UI`

| activeStage | Toolbar highlight | Right header title | Right header toggle | Session route |
|---|---|---|---|---|
| `description` | `Description` | `Description` | `Artifacts/Help` | `stage=description` |
| `virtual_simulation` | `VIRTUAL SIMULATION` | `Virtual Simulation` | `Artifacts/Help` | `stage=virtual_simulation` |
| `diagram_modules` | `Diagram Modules` | `Diagram Modules` | `Artifacts/Help` | `stage=diagram_modules` |
| `foundation_envelope` | `Foundation Envelope` | `Foundation Envelope` | `Artifacts/Help` | `stage=foundation_envelope` |

Для `Diagram Modules` правая панель использует `Artifacts/Help` (Source mode был удалён):
- `Artifacts` открывает визуальный Module Graph, построенный из staged product-part файлов;
- `Help` — guidance panel.

## 5) Инварианты

1. Нельзя открывать session/artifact в stage `X`, оставляя Toolbar на stage `Y`.
2. Нельзя рендерить header правой панели по старому stage после маршрутизации на новый.
3. Если route идёт через `pm:dialog:open` для workflow-stage, активный stage должен быть установлен до/в момент route.
4. Для stage-узла не допускается stage-specific поведение вида `skipSession`, если это ломает консистентность с другими route.
5. Session panel startup restore обязан брать источник истины из того же workflow-state/continuity route, что и Toolbar/Tree auto-select; отдельный browser-local startup router запрещён.
6. Startup auto-select и обычный stage click обязаны использовать один и тот же stage-to-artifact/session resolver; нельзя держать отдельную cold-start версию маршрутизации.

## 6) Особый случай Description pre-submit

До `Submit questionnaire` runtime session отсутствует — это не отменяет `activeStage=description`.

Инвариант pre-submit:
- слева показывается Description Help;
- справа редактируется `questionnaire.md`;
- header правой панели остаётся в формате `Description + Artifacts/Help`.

## 7) Критерии приёмки

1. Любой клик в Toolbar/Tree/auto-select приводит к одному и тому же stage-состоянию UI.
2. Header правой панели всегда соответствует текущему stage.
3. Для всех stage доступен `Help`; для `Diagram Modules` доступен `Artifacts/Help` (Source mode был удалён).
4. Переходы между stage не оставляют «залипших» артефактов/сессий предыдущего шага.

## 8) Связанные документы

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
