# Bug Registry

Накопительный реестр багов и фиксов (чтобы уменьшать регрессии и не «чинить одно — ломая другое»).

## Правила ведения
- **Required reading перед любым UI/оркестрационным фиксом:** `doc/SolidWorks-Flow/Workflow/FacadeClassDiagram_DesignAndMaintenance.md`
- **Добавляем запись сразу** при обнаружении бага (Status: `OPEN`).
- **Любой фикс** обновляет запись: `Root cause`, `Fix`, `Commits`, `Release`, `Guards`.
- Для багов на стыке Core/PM/UI обязательны **guards** (минимум: тест или воспроизводимый smoke‑чек).

## Индекс

| ID | Status | Area | Симптом (кратко) | Fixed in |
|---:|:------:|------|------------------|----------|
| BUG-2026-02-16-01 | FIXED | Core/PM | one‑shot `description`: input «unlock gap»/возможность второго запроса | 1.1.613 |
| BUG-2026-02-16-02 | FIXED | PM/UI | one‑shot `description`: wait‑copy показывает `resuming` вместо `working` | 1.1.614 |
| BUG-2026-02-16-03 | FIXED | UI | one‑shot `description` collector: input свободен до первых сообщений | 1.1.615 |
| BUG-2026-02-16-04 | FIXED | PM/UI | workflow `description`: медленно открывается Session UI после Send | 1.1.616 |
| BUG-2026-02-17-01 | FIXED | PM/UI | пустой EmptyState без спиннера при создании сессии ("Create your first session…") | 1.1.622 |
| BUG-2026-02-17-02 | FIXED | PM/UI | description→reviewer: reviewer auto-started but not auto-focused in live UI | 1.1.625 |
| BUG-2026-02-17-03 | OPEN | PM/UI | token usage не обновляется после turn completion (до смены workspace) | TBD |

---

## BUG-2026-02-16-01 — one‑shot `description`: input «unlock gap» / возможность второго запроса

**Status:** FIXED

**Symptom:** поле ввода в one‑shot `description` сессии могло кратко разблокироваться и позволить второй запрос.

**Root cause:**
- Core не прокидывал в `workspace:snapshot` поля `resumeMode`/`terminalLockReason` (PM/UI не знали, что сессия `no_resume`).
- Для `no_resume` был порядок событий с коротким окном: сначала `turn_state=idle`, затем выставлялся terminal lock.

**Fix:**
- Core: `workspace:snapshot` реально включает `resumeMode`/`finalTurnCompleted`/`terminalLockReason`.
- Core: для `no_resume` terminal lock ставится до `turn_state=idle`.
- PM: при `resumeMode=no_resume` input остаётся заблокированным весь lifecycle.

**Commits:**
- `47256544 fix(pm/core): keep no-resume sessions locked`
- `6941ed70 feat(release): v1.1.613 - lock no-resume sessions`

**Release:** `1.1.613`

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/session-stream.test.ts`
- `node --test --import tsx src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts`

---

## BUG-2026-02-16-02 — one‑shot `description`: wait‑copy показывает `resuming` вместо `working`

**Status:** FIXED

**Symptom:** в one‑shot `description` сессии во время работы агента вместо `Agent is working… Please wait.` показывается `Agent is resuming your session… Please wait.`

**Root cause:**
- PM сводил `no_resume` input‑lock к `connectionState=blocked`, из‑за чего Session UI трактовал это как “resuming”.
- Session UI дополнительно принудительно передавал `connectionState=blocked` в InputPanel при любом lock, теряя сигнал “агент реально работает”.

**Fix:**
- PM: `connectionState=running` всегда отражает `turnState=running` (даже когда input locked); `blocked` применяется только для `turnState=idle + lock`.
- Session UI: InputPanel получает реальный `connectionState` для wait‑copy (а очередь/submit остаётся заблокированной через отдельный `queueConnectionState`).
- InputPanel: `running` приоритетнее lock‑copy; для terminal one‑shot показывается read‑only copy.

**Commits:**
- `39d13e8d fix(pm/ui): correct wait copy for one-shot sessions`

**Release:** `1.1.614`

**Guards:**
- `node --test --import tsx src/client/ui/src/session/input-panel.test.tsx`
- `node --test --import tsx src/client/project-manager/components/sessions/session-stream.test.ts`

---

## BUG-2026-02-16-03 — one‑shot `description` collector: input свободен до первых сообщений

**Status:** FIXED

**Symptom:** после `Send` анкеты и появления UI сессии поле ввода оставалось разблокированным до первых сообщений/снапшота от агента.

**Root cause:**
- Session UI создавал initial snapshot через `createInitialSnapshot()` с `connectionState="idle"`, поэтому InputPanel до первого `workspace:snapshot` считал сессию idle и позволял ввод.

**Fix:**
- Session UI: для `stage="description" + sessionKind="collector"` initial snapshot сразу выставляет `connectionState="running"`.
- Добавлен regression‑тест на `createInitialSnapshot`.

**Commits:**
- `bc066638 fix(ui): lock description collector immediately`

**Release:** `1.1.615`

**Verified:** 2026-02-16 — подтверждено в релизе `1.1.615` (Claude, Codex)

**Guards:**
- `node --test --import tsx src/client/ui/src/session/helpers.initial-snapshot.test.ts`

---

## BUG-2026-02-16-04 — workflow `description`: медленно открывается Session UI после Send

**Status:** FIXED

**Symptom:** после нажатия `Отправить анкету` и выбора провайдера UI сессии открывался заметно позже (ожидание до завершения вспомогательных шагов), из‑за чего казалось, что отправка «зависла».

**Root cause:**
- `IdeaCollectorSubmitService.submitQuestionnaire()` ждал загрузки workflow‑контракта и сборки prompt‑pack перед тем, как уведомить UI об `id` созданной сессии.
- `DescriptionQuestionnairePanel` открывал сессию только после завершения `submitQuestionnaire()`.

**Fix:**
- `IdeaCollectorSubmitService`: добавлен `onSessionCreated`, вызывается сразу после `session:created`.
- `DescriptionQuestionnairePanel`: передаёт `onIdeaSessionCreated` в `onSessionCreated`, поэтому сессия открывается сразу.
- Загрузка контракта запускается параллельно (`contractPromise`), ошибки после создания сессии пробрасываются в сессию через system‑notice.

**Commits:**
- `c7554efa fix(pm): open description session immediately`

**Release:** `1.1.616`

**Guards:**
- `node --test --import tsx src/client/project-manager/services/idea-collector-submit-service.open-fast.test.ts`

---

## BUG-2026-02-17-01 — EmptyState: нет спиннера на месте `Create your first session…` при создании сессии

**Status:** FIXED

**Symptom:** после `Send` анкеты (workflow `description`) в левой зоне (где должен появиться UI сессии) продолжала висеть карточка `Create your first session…` без каких-либо признаков активности до момента гидратации Session UI.

**Root cause:**
- Владелец состояния этой карточки — `EmptyState`, который показывается только при `sessions.length === 0` в `SessionView`.
- Попытки показать «pending» в другом месте/по другому сигналу не меняли факт `sessions.length === 0`, поэтому UI оставался на той же карточке и визуально выглядел «зависшим».

**Fix:**
- Добавлен отдельный флаг `emptyStatePending` в `SessionView` и прокинут в `EmptyState pending`.
- `EmptyState` при `pending=true` рисует спиннер + статус создания сессии (вместо текста `Create your first session…`).
- Источник `emptyStatePending` связан с workflow‑действием `Send` анкеты (PM‑контур) и действует именно в момент, когда `sessions.length === 0`.

**Docs / Reference:**
- `doc/SolidWorks-Flow/Workflow/FacadeClassDiagram_DesignAndMaintenance.md` (раздел «Реальный пример: спиннер загрузки UI Сессии»)

**Release:** `1.1.622` (локальный релиз для проверки)

**Verified:** 2026-02-17 — подтверждено пользователем

**Guards (smoke чек):**
- Workflow `Description` → нажать `Send` анкету → слева мгновенно появляется спиннер на месте `Create your first session…` → исчезает после загрузки UI сессии.

---

## BUG-2026-02-17-02 — description→reviewer: reviewer auto-started but not auto-focused (live)

**Status:** FIXED

**Symptom:** после завершения one-shot `Description` (создан `description.md`) Core автоматически запускает `Reviewer` (сессия видна в дереве), но Project Manager не переключает активную сессию: в области Session UI остаётся `Description` до ручного клика по `Reviewer` в дереве.

**Observed behavior:**
- Если перезагрузить Project Manager или сменить workspace и вернуться — `Reviewer` появляется/фокусируется (работает cold-start auto-select).
- В live‑режиме после auto-start reviewer — фокуса нет.

**Root cause (confirmed): нет live-триггера “как клик по Reviewer в дереве”**
- После `Send` анкеты Session UI открывается в runtime-режиме (по `preferredSessionId`) и остаётся на terminal `Description`.
- Когда Core авто‑стартует `Reviewer`, он появляется в workflow tree (через workflow-state), но Project Manager **не диспатчит** намерение открытия reviewer-диалога.
- Единственный гарантированный путь “показать Reviewer вместо Description” — это событие `pm:dialog:open`, которое сейчас эмитится **только** при ручном клике по узлу `Reviewer …` в дереве.
- Это подтверждается наблюдением: клик по `Reviewer` мгновенно переключает Session UI, без ожидания дополнительных runtime‑событий.

**Fix:**
- В `useMainAreaWorkflowState` (poll workflow-state) добавлен live handoff триггер: как только `description.sessionKind === "reviewer"` и активный инструмент — `Description`, PM автоматически диспатчит `pm:dialog:open` с intent reviewer (stage=`description`, `sessionKind=reviewer`, `runSlug=reviewer`).
- Guard: дедуп по `providerSessionId` (dispatch 1 раз на reviewer-сессию), чтобы не спамить событие каждые 3 секунды polling’а.

**Commits:**
- `3e5438b4 fix(pm): auto-focus reviewer after description completes` (attempt; insufficient alone)
- `e3202ab2 fix(pm): resolve reviewer session during live handoff`
- `5efbd970 fix(pm): auto-open reviewer dialog on handoff`

**Release:** `1.1.625`

**Verified:** 2026-02-17 — подтверждено пользователем (Codex, Claude)

**Where to look (SSOT):**
- Selection owner: Project Manager runtime session view / dialog selection.
- Workflow node contract: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`.
- Dialog routing SSOT: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`.

**Logs to confirm:** `~/.codeai-hub/logs/` (PM + core bridge events around `description complete` and `reviewer created`).

---

## BUG-2026-02-17-03 — Session UI: token usage не обновляется после turn completion (до смены workspace)

**Status:** OPEN

**Symptom:** в активной сессии (особенно `Reviewer` в dialog-mode) индикатор `Tokens: …` иногда не обновляется после завершения turn (после последнего ответа агента). После смены workspace и возврата цифры появляются/обновляются.

**Root cause (confirmed):**
- `session:stream` события с `token_usage` могут приходить до того, как PM успеет создать snapshot для `sessionId` (hydration dialog history + snapshot init).
- Текущий обработчик `updateSnapshotsWithTokenUsage` обновлял token usage **только** если snapshot уже существует по `payload.sessionId`, иначе событие тихо игнорировалось.

**Fix:**
- `updateSnapshotsWithTokenUsage` теперь:
  - всегда пытается извлечь `tokenUsage` + `providerSessionId` из события;
  - пишет last-known token usage в cache по `providerSessionId` даже если snapshot ещё не создан;
  - если snapshot по `payload.sessionId` отсутствует — делает fallback update snapshot по совпадающему `binding.providerSessionId` (чтобы UI обновлялся без смены workspace).

**Commits:**
- `29c1ddea fix(pm): sync token usage after turns`
- `5edb563d feat(release): v1.1.626 - token usage sync`

**Test Release:** `1.1.626` (pending user verification)

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts`
