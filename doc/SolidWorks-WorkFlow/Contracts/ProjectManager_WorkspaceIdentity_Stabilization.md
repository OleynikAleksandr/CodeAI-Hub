# Project Manager Workspace Identity Stabilization — MVP Contract (SSOT)

## Назначение
Зафиксировать упрощённый MVP-контракт, который стабилизирует Project Manager и workflow runtime до завершения первых 4 шагов:
- `description`
- `virtual_simulation`
- `diagram_modules`
- `diagram_facades`

Документ утверждает сознательное продуктовое ограничение:
- provider и model выбираются один раз на workspace;
- mid-workflow switching provider/model не поддерживается;
- попытки смены provider/model внутри уже начатого workspace игнорируются;
- отдельная архитектура dynamic switching будет спроектирована позже, вне текущего MVP.

## Проблема, которую решаем сейчас

Текущий runtime пытается уважать поздние изменения глобальных Settings и provider-specific model defaults уже после старта workspace. На практике это приводит к трём классам сбоев:

1. **Workspace identity churn**
- session restore и continuity начинают жить на разных identity (`dialogId`, `sessionId`, `providerSessionId`);
- для Codex special-case resume может создавать новый native thread вместо продолжения старого.

2. **Description metadata drift**
- PM строит состояние шага `description` не только по реальным markdown-файлам, но и по промежуточной metadata;
- при гонках или частичной перезаписи metadata UI временно "забывает" про существующие `questionnaire.md` и `Final_Description.md`.

3. **PM split-brain**
- левое дерево и main area могут опираться на разные snapshot'ы `workflow-state`;
- UI показывает несогласованные комбинации: "пустой workspace", живая сессия, открытая анкета, отсутствующий artifact node.

## Утверждённое MVP-решение

### 1. Workspace Execution Profile Lock

Для каждого workflow workspace вводится единый immutable execution profile.

Execution profile создаётся один раз в момент первого `Description submit` и далее становится SSOT для:
- `providerId`
- `modelId`

В MVP execution profile **не** поддерживает:
- смену provider после lock;
- смену model после lock;
- разные provider/model для разных шагов одного workspace;
- автоматическую model migration при resume существующего provider thread.

### 2. Filesystem-backed Description Recovery

Description branch не имеет права зависеть только от промежуточной metadata.

Если в workspace существуют канонические файлы:
- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

Core обязан уметь восстановить их в `workflow-state` даже если metadata:
- отсутствует;
- частично заполнена;
- была повреждена гонкой записи;
- не содержит путей к артефактам.

### 3. Shared Workflow State in PM

PM обязан использовать единый shared-source snapshot `workflow-state` для:
- Workflow Tree;
- Main Area;
- auto-select / stage sync.

Отдельные polling-контура с независимыми snapshot'ами для этих зон в MVP запрещены.

## Канонический контракт Execution Profile

### Storage

Execution profile хранится под workspace slug:
- `.codeai-hub/<workspaceSlug>/runtime/execution-profile.json`

### Минимальная схема

```json
{
  "version": 1,
  "workspaceSlug": "<slug>",
  "workspacePath": "<absolute path>",
  "lockedAt": "<ISO timestamp>",
  "lockedFromStage": "description",
  "providerId": "codexCli | claudeCodeCli | geminiCli",
  "modelId": "<provider model id>"
}
```

### Creation law

- Если execution profile ещё не существует, первый `Description submit` обязан создать его до запуска provider session.
- `providerId` приходит из user choice в submit UX.
- `modelId` резолвится Core из текущих Settings для выбранного provider **только в этот один момент lock**.
- После успешного сохранения profile все дальнейшие workflow session creation/resume обязаны опираться только на него.

### Immutability law

- После lock глобальные Settings не имеют права менять provider/model для уже начатого workspace.
- Изменение глобальных Settings влияет только на будущие workspace, у которых execution profile ещё не создан.
- Любая попытка запустить workflow session с provider/model, отличным от locked profile, должна быть отвергнута или проигнорирована Core в пользу locked profile.

### Resume law

- Resume существующей workflow session обязан сохранять identity уже начатого dialog/continuity chain.
- Resume не имеет права создавать новый provider thread только потому, что в глобальных Settings сейчас выбран другой model default.
- Для Codex special-case вида "если текущий defaultModel = X, не resume, а create new thread" в workflow runtime MVP запрещён.

## Legacy и migration contract

Для уже существующих workspace без execution profile допускается одноразовый bootstrap:

- `providerId` берётся из наиболее авторитетного workflow runtime источника:
  - active runtime session;
  - description session snapshot;
  - continuity index/chain;
  - submit payload, если других источников нет.
- `modelId` для legacy workspace фиксируется из текущего provider default в момент bootstrap.
- bootstrap profile не имеет права форсировать model migration для уже существующего native provider thread; существующий thread продолжается как есть.

Это компромисс только для migration window. Для новых workspace единственный канонический путь — lock на первом `Description submit`.

## PM UX contract

### До lock

- В `description` user может выбрать provider в submit UX.
- Model picker отдельно в PM не показывается; используется provider default из Settings.

### После lock

- PM показывает locked provider/model как read-only metadata workspace.
- Любые provider/model selectors для этого workspace:
  - скрываются;
  - или disabled/read-only;
  - но не должны инициировать альтернативный runtime path.

### UX-invariant

- Открытие существующего workspace означает "продолжить locked workspace identity", а не "пересобрать её из текущих Settings".

## Description artifact contract

### Канонические user-facing artifacts

Только эти файлы являются user-facing truth для шага `description`:
- `questionnaire.md`
- `Final_Description.md`
- `description.md` только как legacy compatibility artifact

### Internal metadata

Внутренние файлы наподобие `description-step.json`:
- не отображаются как workflow artifacts;
- не могут считаться единственным источником существования пользовательских документов;
- используются только как вспомогательный cache/state слой.

### Recovery order

При сборке `workflow-state.description` Core обязан использовать такой порядок:
1. execution profile / runtime session refs;
2. persisted description metadata;
3. проверка канонических файлов на диске;
4. нормализованный branch snapshot для PM.

Если файл есть на диске, PM должен иметь возможность его отобразить независимо от частичных проблем metadata.

## Предлагаемая структура модулей

### Core

- `packages/core/src/workflow/execution-profile/workspace-execution-profile-types.ts`
- `packages/core/src/workflow/execution-profile/workspace-execution-profile-store.ts`
- `packages/core/src/workflow/execution-profile/workspace-execution-profile-facade.ts`

Ответственность:
- хранение и чтение execution profile;
- bootstrap legacy workspace;
- валидация immutable lock;
- единая резолюция provider/model для workflow session creation.

### Description state hardening

- сохранить существующий `DescriptionStepStore`, но сделать его:
  - атомарным;
  - сериализованным по workspace;
  - неспособным silently обнулять artifact paths при read/write гонке.

### PM shared workflow state

- единый hook/store для `workflow-state`;
- tree/main area/stage sync читают один и тот же snapshot;
- fallback logic для `description` не расходится между разными UI зонами.

## Implementation consequences

1. `session-request-handler` и provider routing обязаны сначала резолвить execution profile workspace.
2. `CodexSDKManager.resumeSession()` больше не должен ветвиться по текущему глобальному `defaultModel` для workflow resume path.
3. `workflow-state-service` должен восстанавливать description artifacts по filesystem-backed правилам.
4. PM должен получить shared workflow-state source и read-only presentation locked provider/model.
5. Retry UX, resend/outbox и dynamic switching provider/model сознательно выносятся из текущей фазы.

## Out of scope (deferred)

- смена provider посреди workflow;
- смена model посреди workflow;
- частичный stage-level override provider/model;
- UX "fork workspace on model/provider change";
- rules engine "когда можно и нельзя менять provider/model";
- retry submit UX и resend semantics.

## Acceptance criteria

- reopen существующего workspace не меняет provider/model identity;
- Codex workflow resume не создаёт новый thread только из-за текущего `gpt-5.4` default;
- `Final_Description.md` и `questionnaire.md` не исчезают из PM, если файлы физически существуют;
- дерево слева и main area показывают согласованную картину одного и того же workspace state;
- internal metadata files не отображаются как user-facing workflow artifacts.
