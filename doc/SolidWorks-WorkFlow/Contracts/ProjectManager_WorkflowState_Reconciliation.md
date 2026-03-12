# Project Manager Workflow State Reconciliation — Post-Release Repair Contract (SSOT)

## Назначение
Зафиксировать post-release repair contract после smoke-test `v1.1.717`, где workflow runtime продолжает создавать артефакты, но Project Manager показывает несогласованную картину:
- дерево шагов не показывает завершение;
- session pane может оставаться на старом шаге;
- artifact pane и dialog pane расходятся;
- reopen workspace восстанавливает не тот stage/session, который ожидает пользователь.

Документ касается только MVP-стабилизации первых шагов:
- `description`
- `virtual_simulation`
- `diagram_modules`
- `diagram_facades`

## Подтверждённые факты

Проблема подтверждена на реальных workspace:
- Claude: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude/.codeai-hub/codeai-hub-claude`
- Codex 5.4: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`

Подтверждённые симптомы:
- на диске появляются `questionnaire.md`, `Final_Description.md` и `virtual-simulation.md`;
- workflow gating уже допускает переход к следующему шагу;
- live Core API отдаёт `description`, `continuity`, `executionProfile` и `gating`;
- PM при этом не показывает надёжно stage completion и может держать stale dialog intent;
- после запуска `Virtual Simulation` справа может открыться `virtual-simulation.md`, а session pane остаться на `Description`.

## Корневые причины

### 1. Stage projection в PM остаётся частично событийно-зависимым

`workflow-state` уже восстанавливает `description` branch по filesystem-backed правилам, но stage status и stage completion до сих пор опираются на watcher-memory projection.

Подтверждённые последствия:
- после restart или неполной последовательности watcher events шаг может иметь артефакт и continuity, но не иметь корректного `completed` status;
- UI знает, что артефакт есть, но stage badge и reopen logic остаются в промежуточном состоянии.

### 2. `workflow.stage.completed` фактически не существует как runtime-сигнал

В текущем runtime есть тип события `workflow.stage.completed`, но production path его не эмитит.

Подтверждённые последствия:
- `description` и `virtual_simulation` не переходят в `completed` через runtime lifecycle;
- PM не может честно показать completed badge только по текущему event pipeline.

### 3. Internal metadata leakage попадает в workflow artifacts

После атомарной записи `description-step.json` watcher видит временные файлы вида:
- `description-step.json.tmp-<pid>-<timestamp>`

Они попадают в `state.stages.description.artifacts`, хотя это внутренние metadata-файлы.

Подтверждённые последствия:
- user-facing stage projection загрязняется internal paths;
- sidebar/state logic получает ложные artifact updates.

### 4. `lastActive` обновляется только для `description`

Сейчас runtime двигает `lastActive` для артефактов `description`, но не делает этого для `virtual_simulation` и следующих шагов.

Подтверждённые последствия:
- reopen workspace и stage restore остаются смещены к `Description`;
- более поздний шаг может реально существовать, но не стать каноническим target для UI.

### 5. Session pane восстанавливает stale dialog intent

`ProjectManagerSessionView` хранит последний `pm:dialog:open` intent в `localStorage` и при reopen workspace безусловно восстанавливает его.

Подтверждённые последствия:
- reopen может открыть старый `Description` dialog, даже если пользователь уже перешёл к `Virtual Simulation`;
- persisted dialog intent конкурирует с живым `workflow-state`.

### 6. Stage-to-panel sync edge-triggered, а не state-reactive

Текущий sync панели реагирует на `pm:stage:activated`, но не делает повторную синхронизацию, если session/artifact выбранного stage появились позже.

Подтверждённые последствия:
- пользователь может активировать `Virtual Simulation`, пока session chain ещё не записан;
- artifact pane потом показывает новый файл, а dialog pane остаётся на старом `Description` session.

### 7. Drift между validator и реальным `virtual-simulation.md`

Validator и UI сейчас ждут минимум 2 сценария в формате `## Сценарий N`, но реальный артефакт `virtual-simulation.md`, созданный агентом на проблемном workspace, использует `### Сценарий N`.

Подтверждённые последствия:
- live Core API уже помечает `virtual_simulation` как `invalid`, хотя документ существует и читается пользователем;
- шаг не может стабильно стать `completed` даже при наличии артефакта.

## Утверждённый repair contract

### 1. PM должен получать reconciled stage projection

`workflow-state` read API обязан возвращать не только raw watcher-memory snapshot, а нормализованный stage projection, собранный из:
1. runtime watcher state;
2. continuity chains;
3. filesystem-backed user artifacts;
4. step-specific validation.

Read-side reconciliation становится обязательной правдой для PM.

### 2. Completed state не должен зависеть только от несуществующего event

Для MVP repair completed state выводится из нормализованного stage projection:
- `description` считается минимум `completed`, если существует `Final_Description.md` и stage не помечен invalid/outdated;
- `virtual_simulation` считается минимум `completed`, если существует валидный `virtual-simulation.md`;
- `diagram_*` steps следуют тому же правилу: user-facing artifact + valid contract => completed.

Event `workflow.stage.completed` может быть добавлен позже, но PM не должен зависеть только от него.

### 3. Internal metadata must never be user-facing artifacts

Следующие файлы запрещены в user-facing workflow artifacts:
- `description-step.json`
- `description-step.json.tmp-*`
- любые аналогичные internal metadata snapshots и temp write files

Watcher/runtime фильтрация обязана убирать их до попадания в stage projection.

### 4. `lastActive` должен быть cross-stage и user-facing

`lastActive` обязан обновляться по последнему user-facing artifact/successful stage transition для всех workflow steps, а не только для `description`.

`lastActive` не имеет права оставаться на `questionnaire.md`, если workspace уже продвинулся до `Final_Description.md` или `virtual-simulation.md`.

### 5. Persisted dialog intent is advisory, not authoritative

`localStorage`-восстановление dialog intent допустимо только как hint.

На reopen workspace PM обязан сверять persisted dialog intent с:
- текущим active stage;
- reconciled `workflow-state`;
- `lastActive`;
- наличием реально существующей runtime/dialog binding.

Если persisted intent указывает на более старый или нерелевантный stage, PM обязан его отбросить.

### 6. Stage sync must react to state changes

Если пользователь уже активировал stage, а session/artifact этого stage появились позже, PM обязан досинхронизировать:
- artifact pane;
- dialog pane;
- active stage/session selection.

Один только edge-trigger `pm:stage:activated` для этого недостаточен.

### 7. Shared workflow-state must stay hot around submit

После `Submit questionnaire` PM не имеет права ждать редкий slow-poll, чтобы увидеть:
- `session:created`;
- description session binding;
- запись `Final_Description.md`.

Для repair window утверждается следующий контракт:
- shared `workflow-state` store должен оставаться в fast cadence, пока snapshot недавно менялся;
- submit-driven UI может явно invalidate/refresh shared snapshot;
- PM не должен насильно переоткрывать `questionnaire.md` после успешного старта Description session, если workflow-state уже может продвинуть UI дальше.

### 8. Validator compatibility law for `virtual-simulation.md`

Во время repair window validator и UI обязаны принимать оба формата scenario heading:
- `## Сценарий N`
- `### Сценарий N`

Цель repair window:
- убрать ложный `invalid` для уже сгенерированных live artifacts;
- затем отдельно решить, хотим ли мы снова сузить канон до одного heading level.

## Модульные последствия

### Core
- `workflow-state-service` должен собирать reconciled stage projection на read path.
- `workflow-runtime` должен обновлять `lastActive` для поздних шагов и не пропускать internal temp artifacts в user-facing state.
- step validators должны участвовать в read-side normalization, а не только в локальной проверке отдельного файла.

### PM
- tree/main area/session pane обязаны опираться на один reconciled snapshot stage state.
- shared `workflow-state` store обязан иметь fast refresh window вокруг submit/start событий, а не деградировать сразу в slow poll.
- persisted dialog restore обязан стать stage-aware.
- stage panel sync обязан стать reactive к позднему появлению continuity/artifact для уже выбранного шага.

## Acceptance criteria

- `Description` и `Virtual Simulation` больше не выглядят пустыми, если канонические артефакты уже существуют на диске.
- stage rows получают корректный status без зависимости только от `workflow.stage.completed`.
- internal metadata/temp files не попадают в user-facing workflow artifacts.
- после `Submit questionnaire` PM быстро видит session binding и не держит левую панель на `Description Help` только из-за stale snapshot.
- reopen workspace не открывает stale `Description` dialog поверх более позднего активного шага.
- если пользователь уже выбрал `Virtual Simulation`, появление его continuity/session позже не оставляет dialog pane на `Description`.
- `virtual-simulation.md`, сгенерированный текущим runtime prompt, не получает ложный `invalid` только из-за `### Сценарий N`.
