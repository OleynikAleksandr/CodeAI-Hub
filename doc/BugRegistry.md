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

