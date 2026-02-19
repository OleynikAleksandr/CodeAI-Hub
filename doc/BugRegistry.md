# Bug Registry

Накопительный реестр багов и фиксов (чтобы уменьшать регрессии и не «чинить одно — ломая другое»).

## Правила ведения
- **Required reading перед любым UI/оркестрационным фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
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
| BUG-2026-02-17-03 | FIXED | PM/UI | token usage не обновляется после turn completion (до смены workspace) | 1.1.626 |
| BUG-2026-02-17-04 | OPEN | PM/UI | input остаётся заблокированным после Claude 401 (нет recovery UI) | TBD |
| BUG-2026-02-17-05 | OPEN | PM/UI | после Core restart агент отвечает, но input остаётся разблокированным во время turn | TBD |
| BUG-2026-02-17-06 | OPEN | Core/Provider | Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working | TBD |
| BUG-2026-02-18-01 | OPEN | Session UI | workflow-сессия открывается с unlocked input до первого snapshot от Core | TBD |
| BUG-2026-02-18-02 | FIXED | Claude/Auth | auth probe "nested session" когда VSCode запущен из Claude Code CLI терминала | TBD |
| BUG-2026-02-18-03 | OPEN | Claude/Auth | macOS диалог "Keychain Not Found" при запуске VSCode (cosmetic, не блокирует) | TBD |
| BUG-2026-02-18-04 | FIXED | Core/UI | Reviewer input не разблокируется после turn completion | TBD |
| BUG-2026-02-18-05 | FIXED | PM/UI | Dialog Reviewer: input остаётся locked до workspace switch / reload (гонка snapshot vs hydration) | 1.1.635 |
| BUG-2026-02-18-06 | FIXED | Core/Templates | Reviewer prompt упоминает `reviewer-template.md`, но файл/путь не доступен → агент тратит время на поиск | 1.1.637 |
| BUG-2026-02-18-07 | FIXED | Session UI | При смене/привязке workflow-сессии не показывается wait-copy “resuming…”, остаётся “Agent is working…” | 1.1.639 |
| BUG-2026-02-19-01 | FIXED | Extension/UI | UI не загружается: `ERR_FILE_NOT_FOUND` для `~/.codeai-hub/packages/ui/*/current/*` после установки релиза | 1.1.640 |
| BUG-2026-02-19-02 | FIXED | Core/Codex | Codex: двойной rollover / два разделителя сессии при триггере контекстного окна | 1.1.641 |

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
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` (раздел «Реальный пример: спиннер загрузки UI Сессии»)

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
- Workflow node contract: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`.
- Dialog routing SSOT: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`.

**Logs to confirm:** `~/.codeai-hub/logs/` (PM + core bridge events around `description complete` and `reviewer created`).

---

## BUG-2026-02-17-03 — Session UI: token usage не обновляется после turn completion (до смены workspace)

**Status:** FIXED

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

**Release:** `1.1.626`

**Verified:** 2026-02-17 — подтверждено пользователем (token usage обновляется без смены workspace)

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts`

---

## BUG-2026-02-17-04 — PM/UI: input остаётся заблокированным после Claude 401 (нет recovery UI)

**Status:** OPEN

**Symptom:** при ошибке Claude `401 authentication_error` UI показывает ошибку, но поле ввода остаётся в состоянии `Agent is working… Please wait.` (input locked). Пользователь не может повторить отправку/продолжить без ручных действий.

**Expected:** UI переходит в recoverable состояние: input unlocked (или явный режим retry), показан понятный recovery hint и действия.

**Workaround (current):** выполнить login в provider-home и перезапустить Core, затем повторить сообщение.

**Fix (planned):**
- Добавить recovery действия прямо в Project Manager: `Restart Core` + `Retry/Reconnect`.
- При `Core unavailable` не оставлять UI в бесконечном `working` без возможности восстановиться.

**Release:** TBD

---

## BUG-2026-02-17-05 — PM/UI: после Core restart агент отвечает, но input остаётся разблокированным во время turn

**Status:** OPEN

**Symptom:** после recovery (restart Core) и повторной отправки сообщения агент начинает отвечать, но input остаётся разблокированным (можно отправлять новые сообщения), хотя turn явно выполняется.

**Expected:** input должен быть locked на весь период выполнения turn (`turn_state=running`) и разблокироваться только после `turn_completed`/явного fail.

**Root cause (suspected):** рассинхрон активного `sessionId`/snapshot hydration и локального состояния UI после Core restart (история диалога восстановилась, но turn/lock сигналы применяются к другой/неактивной сессии).

**Fix (planned):** optimistic lock на submit (локально) + ресинхронизация lock/active-session mapping после Core restart/rehydration.

**Release:** TBD

---

## BUG-2026-02-17-06 — Core/Provider: Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working

**Status:** OPEN

**Symptom:** Claude возвращает `401 OAuth token has expired`, после чего UI может остаться в `working/blocked` состоянии (turn не завершён корректно для UI).

**Expected:** любой auth/transport failure должен завершать turn: `turn_failed` + rollback `turn_state=idle` + user-facing hint (без вечного `Agent is working…`).

**Fix (planned):** гарантировать корректный failure lifecycle в Core/Claude adapter при `authentication_error`.

**Release:** TBD

---

## BUG-2026-02-18-01 — Session UI: workflow-сессия открывается с unlocked input до первого snapshot
| BUG-2026-02-18-02 | FIXED | Claude/Auth | auth probe "nested session" когда VSCode запущен из Claude Code CLI терминала | TBD |

**Status:** OPEN

**Symptom:** Reviewer-сессия (и потенциально все будущие workflow-узлы документации) открывается
с `connectionState="idle"`. Пользователь может вводить текст до прихода первого workspace snapshot
от Core, хотя Core сразу шлёт первый промпт и turn уже выполняется.

**Expected:** любая workflow-сессия, где первый turn инициируется Core, должна открываться
с `connectionState="running"` (input заблокирован мгновенно).

**Root cause (confirmed):**
- `createInitialSnapshot()` в `helpers.ts` выставляет `connectionState="running"` только для
  `stage="description" && sessionKind="collector"` (фикс BUG-2026-02-16-03).
- Reviewer (`sessionKind="reviewer"`) и все остальные workflow-сессии стартуют с `"idle"`,
  даже если Core немедленно начинает первый turn.

**Fix (planned):**
- В `createInitialSnapshot()`: расширить условие до `stage != null && sessionKind != null`.
- Добавить комментарий: для implementation/planning стадий, где пользователь инициирует
  первый turn, добавлять явное исключение по `session.stage` или `session.runSlug`.
- Обновить тест `helpers.initial-snapshot.test.ts` (reviewer → ожидание `"running"`).

**Release:** TBD (Phase 214)


---

## BUG-2026-02-18-02 — Claude: auth probe fails with "nested session" when VSCode launched from Claude Code CLI terminal

**Status:** FIXED

**Symptom:** После установки нового релиза Claude показывается как НЕДОСТУПЕН.
Ошибка: "Claude provider-home authentication required. Run HOME=...".

**Root cause (confirmed):**
- `getAuthEnvironment()` в `sdk-auth-manager.ts` делает `...process.env` — распространяет ВСЕ
  переменные окружения родительского процесса, включая `CLAUDECODE`.
- Если VSCode открыт из терминала где запущен Claude Code CLI, `CLAUDECODE` env var
  попадает в Core → в auth probe.
- Claude Code CLI видит `CLAUDECODE` → отказывает с ошибкой: 
  "Claude Code cannot be launched inside another Claude Code session."
- Auth probe падает → пользователь видит "НЕДОСТУПЕН".

**Fix:**
- В `getAuthEnvironment()` добавлен destructuring `CLAUDECODE: _claudeCode` — убирает переменную
  из окружения probe так же, как уже убирался `ANTHROPIC_API_KEY`.
- Комментарий в коде объясняет причину обоих исключений.

**Commits:**
- `3ffdf560 fix(claude): strip CLAUDECODE from auth env to prevent nested session error`

**Release:** TBD (следующий релиз после тестирования)

**Guards (smoke):**
- Открыть VSCode из терминала с активным Claude Code CLI → Claude должен быть ДОСТУПЕН.


---

## BUG-2026-02-18-03 — macOS диалог "Keychain Not Found" при запуске VSCode (cosmetic)

**Status:** OPEN

**Severity:** Cosmetic — не блокирует работу, Claude работает корректно.

**Symptom:** При запуске VSCode (или после рестарта Core) появляется системный macOS диалог:
> "Keychain Not Found. A keychain cannot be found to store 'oleksandroliinyk.'"
> Кнопки: Cancel / Reset To Defaults.
Правильное действие пользователя — нажать **Cancel**. После этого Claude работает нормально.

**Root cause:**
- Auth probe запускает Claude CLI как subprocess VSCode Extension Host с `HOME=~/.codeai-hub/providers/claude/home`.
- Claude читает OAuth токен из системного Keychain (работает) и успешно проходит auth.
- После успешного auth Claude пытается **записать** обновлённый токен обратно в Keychain.
- Subprocess Extension Host не имеет доступа к login keychain macOS для записи в данном контексте.
- macOS Keychain API показывает диалог вместо тихого fail.

**Impact:**
- Появляется один раз при каждом старте Core (не при каждом запросе).
- Сбивает пользователя с толку — выглядит как ошибка, хотя это не так.
- Нажатие "Cancel" — правильное действие; "Reset To Defaults" трогать не нужно.

**Fix (planned):**
Варианты для исследования:
1. Записывать credentials в `~/.codeai-hub/providers/claude/home/.claude/.credentials.json`
   после успешного auth probe — тогда Claude при следующем запуске найдёт файл и не полезет в Keychain за записью.
2. Найти env var Claude CLI который подавляет запись в Keychain (если существует).
3. Сделать `.credentials.json` в provider-home симлинком на `~/.claude/.credentials.json` —
   тогда Claude пишет в нативный home и Keychain dialog не нужен.

**Release:** TBD


## BUG-2026-02-18-04 — Reviewer input не разблокируется после turn completion

**Status:** FIXED

**Severity:** Critical — пользователь не может ответить Reviewer без ручного форс-анлока.

**Symptom:** После того как Reviewer Agent задал свои вопросы (завершил первый turn), поле ввода остаётся заблокированным. Placeholder показывает "Agent is working… Please wait." или "Agent is resuming your session… Please wait." Кнопка замочка позволяла обойти блокировку вручную, но автоматическая разблокировка не происходила.

**Root cause (Core):**
- В `handleFlowNodeContinuityProviderEvent`, когда `turn_completed` событие не содержит token usage (`extractTokenUsage(event) = null`), функция делала ранний `return` без записи `contextDecision`.
- Следствие: `handleTurnCompletedEvent` получал `contextDecision = null` → ранний return → `emitTurnStateEvent("idle")` и `emitResumeInPlaceNoRolloverUnlock` никогда не вызывались.
- Workspace runtime: `turnState` оставался "running", `continuityLockActive = true` (context_check_pending не снят) → UI заблокирован навсегда.

**Root cause (UI):**
- В `applyTurnStateStreamDataToSnapshot`, `turn_state:idle` stream event игнорировался при `connectionState === "blocked"` (строгая защита от ложных unlock при rollover).
- Даже если Core всё-таки посылал `turn_state:idle`, UI не мог разблокироваться через stream path.

**Fix:**
- Core (`session-request-handler.ts`): при `!usage` → вызов `registerPostTurnNoRolloverDecision(sessionId)` вместо пустого return. Fallback: нет данных usage = rollover невозможен = разблокировка.
- UI (`session-stream-snapshot-sync.ts`): смягчение условия — `turn_state:idle` разрешён разблокировать "blocked" если `continuityLock.active !== true` в snapshot.

**Commits:**
- `d449725d fix(core/ui): unlock reviewer input after turn completion`

**Release:** TBD (Phase 215)

**Guards (smoke):**
- Запустить workflow Description → Reviewer → Reviewer задаёт вопросы → input должен автоматически разблокироваться → пользователь вводит ответ → Reviewer продолжает.

---

## BUG-2026-02-18-05 — Dialog Reviewer: input остаётся locked из-за гонки `workspace:snapshot` vs hydration

**Status:** FIXED

**Severity:** High — пользователь видит финальный ответ/ready‑сигнал, но не может продолжить без ручного форс-анлока.

**Symptom:** В dialog‑сессиях (Workflow Tree → Reviewer) поле ввода могло оставаться заблокированным после:
- открытия уже idle‑сессии (последний ответ давно был);
- rollover по контекстному окну (появляется “Новая сессия”, агент пишет `Ready to continue working.`, но input остаётся locked).

Разблокировка иногда происходила только после переключения workspace, перезагрузки Project Manager или спустя время.

**Root cause (PM/UI):**
- Dialog UI создаёт локальный `SessionSnapshot` через `createInitialSnapshot()` с `connectionState="running"` (workflow‑сессии стартуют с core‑submit → input должен быть locked сразу).
- Итоговый lock state является snapshot‑first и приходит через `workspace:snapshot`.
- `workspace:snapshot` мог прийти **раньше**, чем `dialog:list:result` создаст локальный `SessionSnapshot` (или раньше `session:created` при rollover).
- `applyWorkspaceSnapshotToSnapshots()` обновляет только уже существующие `sessionId` в `snapshots`; ранний snapshot для ещё “неизвестного” sessionId игнорируется.
- Если после этого Core не пушит новый snapshot (например, сессия уже `idle` и нет изменений), UI остаётся в `connectionState="running"` → input locked до следующего snapshot.

**Fix:**
- Dialog session controller кэширует последний `workspace:snapshot` и пере‑применяет его при:
  - создании базового snapshot по `dialog:list:result`;
  - создании rollover child по `session:created`.

**Commits:**
- `b0436f04 fix(pm): replay latest workspace snapshot for dialog unlock`
- `c77fa041 feat(release): v1.1.635 - dialog unlock snapshot replay`

**Release:** `1.1.635`

**Guards:**
- Static guard: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- Smoke: открыть Reviewer dialog (idle) → input должен стать unlocked без перезагрузки; довести Reviewer до rollover → после bootstrap (`resume_ready`) input unlock.

**Verified (manual):** 2026-02-18 — подтверждено в PM: idle Reviewer dialog открывается с unlocked input; rollover по контекстному окну разблокирует ввод после bootstrap; переключение между двумя workspace не вызывает “вечный lock”.

---

## BUG-2026-02-18-06 — Reviewer prompt упоминает `reviewer-template.md`, но шаблон не доступен агенту

**Status:** FIXED

**Symptom:** В Reviewer‑сессии агент пишет, что `reviewer-template.md` не найден, и тратит время/контекст на поиск шаблона, хотя это просто опциональный helper.

**Root cause:**
- В system prompt для reviewer есть строка “Шаблон `reviewer-template.md` (если дан путь и файл доступен для чтения)”.
- При этом Core синхронизировал только `reviewer-prompt.md` в `~/.codeai-hub/templates/description/`, но не ставил `reviewer-template.md`.
- В стартовом сообщении reviewer‑сессии Core не передавал явный путь к шаблону → агент пытался “угадывать” расположение.

**Fix:**
- Core/Templates: добавлен bundled‑template `reviewer-template.md` в TemplateSync → устанавливается в `~/.codeai-hub/templates/description/reviewer-template.md`.
- Core/Workflow runtime: при старте reviewer‑сессии добавляется строка с абсолютным путём к шаблону, если файл существует (чтобы агент читал его напрямую).

**Commits:**
- `e6db4e57 fix(templates): bundle reviewer-template and pass path`
- `1827a8d9 feat(release): v1.1.637 - reviewer template sync`

**Release:** `1.1.637`

**Guards (smoke):**
- Убедиться, что файл существует: `~/.codeai-hub/templates/description/reviewer-template.md`.
- Открыть reviewer‑сессию → в первой инструкции должна быть строка `Reviewer template (absolute): ...` и агент не должен писать “template not found”.

**Verified (manual):** 2026-02-18 — подтверждено: при старте reviewer‑сессии агент видит `reviewer-template.md` (перечисляет его среди доступных файлов) и не сообщает “template not found”.

---

## BUG-2026-02-18-07 — При смене сессии не появляется wait-copy “resuming…”

**Status:** FIXED

**Symptom:** Во время смены/привязки workflow-сессии поле ввода остаётся заблокированным, но placeholder не переключается на “Agent is resuming your session… Please wait.” и продолжает показывать “Agent is working… Please wait.” Это визуально выглядит как зависание.

**Observed (manual):**
- Новая сессия и отчёт создаются, но в фазе ожидания продолжает отображаться “working” вместо “resuming”.

**Expected:**
- В фазе смены/привязки сессии (handoff/hydration/binding pending) UI должен показывать `resuming`-copy, а не `working`-copy.

**Root cause (confirmed):**
- В PM snapshot-first маппинге `connectionState` выставляется в `"running"` при `turnState="running"` даже когда continuity-lock уже активен (rollover/report/bootstrap).
- Session UI выбирает wait-copy по `connectionState`, поэтому при `"running"` остаётся “Agent is working…”, хотя по смыслу это уже “resuming/switching”.

**Fix:**
- Session UI: при `connectionState="running"` и continuity lock reason из {`context_check_pending`, `threshold_reached`, `report_in_progress`, `resume_bootstrap`} форсировать wait-copy как `resuming` (через `InputPanel` connectionState override).
  - Code: `src/client/ui/src/session/session-view.tsx`.

**Commits:**
- `894de347 fix(ui): show resuming copy during rollover lock`
- `4400c8c0 feat(release): v1.1.639 - session rollover wait-copy`

**Release:** `1.1.639`

**Verified (manual):** 2026-02-19 — подтверждено пользователем в релизе `1.1.640`: во время rollover/switch появляется “Agent is resuming your session… Please wait.” (не залипает на “working”).

**Guards (smoke):**
- Во время rollover/switch (continuity lock active + reason в {`context_check_pending`, `threshold_reached`, `report_in_progress`, `resume_bootstrap`}) placeholder должен быть “resuming…”, даже если `connectionState="running"`.
- Во время нормальной работы агента без continuity‑lock placeholder должен оставаться “working…”.

---

## BUG-2026-02-19-01 — UI bundles распакованы с лишней верхней папкой → `ERR_FILE_NOT_FOUND`

**Status:** FIXED

**Symptom:** после установки релиза VS Code/Launcher не может загрузить UI. Ошибка вида:
`Failed to load URL .../.codeai-hub/packages/ui/project-manager/current/index.html (ERR_FILE_NOT_FOUND)`.

**Root cause (confirmed):**
- `UIBundleInstaller` распаковывал `project-manager-<ver>.tar.bz2` и `vscode-webview-<ver>.tar.bz2` в
  `~/.codeai-hub/packages/ui/<bundleId>/<ver>/` без `--strip-components=1`.
- Архивы содержат верхнюю директорию (`project-manager-<ver>/...`) → `index.html`/`react-chat.js`
  оказывались на уровень глубже, чем ожидает `resolveUIBundlePath()` (`.../current/index.html`).

**Fix:**
- `extractArchiveWithTar`: добавлен опциональный `stripComponents`.
- `UIBundleInstaller`: чистый reinstall в `<bundleId>/<ver>/`, распаковка с `stripComponents: 1`,
  и проверка required-file в `hasRequiredLayouts()` (`index.html`/`react-chat.js`).

**Commits:**
- `5feb54c9 fix(ui): extract ui bundles without nested dir`
- `9bc31775 feat(release): v1.1.640 - fix ui bundle install`

**Release:** `1.1.640`

**Workaround (для 1.1.639):**
- Перепривязать symlink `current` на вложенную папку (`.../1.1.639/project-manager-1.1.639` и `.../1.1.639/vscode-webview-1.1.639`), либо переустановить UI bundles в `~/.codeai-hub/packages/ui/`.

---

## BUG-2026-02-19-02 — Codex: двойной rollover / два разделителя сессии при триггере контекстного окна

**Status:** FIXED

**Symptom:** при пороге rollover (например, 80% remaining) на провайдере Codex вместо одного разделителя сессий появлялись два подряд. В инфо-панели usage отображалось как `#1 (76%) | #2 (94%) | #3 (—)` (вторая смена сессии происходила, хотя remaining был выше порога).

**Root cause:**
- Core использовал тайм-аут ожидания `continuity report` как часть happy-path. Когда Codex писал отчёт дольше, rollover lifecycle становился нестабильным.
- События от “устаревшего” continuity-сегмента (у которого уже создан continuation child) могли повторно инициировать rollover.

**Fix:**
- Убран тайм-аут ожидания `continuity report` и связанные retry/resend в happy-path.
- Добавлен guard: rollover нельзя инициировать из `stale` continuity-сегмента (если у сегмента уже есть continuation-child для того же workflow node).

**Commits:**
- `87f5d0b9 fix(core): prevent duplicate codex continuity rollover`
- `04372a76 feat(release): v1.1.641 - codex rollover stability`

**Release:** `1.1.641`

**Verified (manual):** 2026-02-19 — подтверждено пользователем (Codex: больше нет двойного разделителя; Claude не регресснул).

**Guards:**
- `npm test --workspace @codeai-hub/core`
- `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`

