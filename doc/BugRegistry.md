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
| BUG-2026-02-17-04 | FIXED | PM/UI | input остаётся заблокированным после Claude 401 (нет recovery UI) | 1.1.646 |
| BUG-2026-02-17-05 | FIXED | PM/UI | после Core restart агент отвечает, но input остаётся разблокированным во время turn | 1.1.646 |
| BUG-2026-02-17-06 | FIXED | Core/Provider | Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working | 1.1.646 |
| BUG-2026-02-18-01 | FIXED | Session UI | workflow-сессия открывается с unlocked input до первого snapshot от Core | 1.1.629 |
| BUG-2026-02-18-02 | FIXED | Claude/Auth | auth probe "nested session" когда VSCode запущен из Claude Code CLI терминала | TBD |
| BUG-2026-02-18-03 | FIXED | Claude/Auth | macOS диалог "Keychain Not Found" при запуске VSCode (cosmetic, не блокирует) | 1.1.644 |
| BUG-2026-02-18-04 | FIXED | Core/UI | Reviewer input не разблокируется после turn completion | TBD |
| BUG-2026-02-18-05 | FIXED | PM/UI | Dialog Reviewer: input остаётся locked до workspace switch / reload (гонка snapshot vs hydration) | 1.1.635 |
| BUG-2026-02-18-06 | FIXED | Core/Templates | Reviewer prompt упоминает `reviewer-template.md`, но файл/путь не доступен → агент тратит время на поиск | 1.1.637 |
| BUG-2026-02-18-07 | FIXED | Session UI | При смене/привязке workflow-сессии не показывается wait-copy “resuming…”, остаётся “Agent is working…” | 1.1.639 |
| BUG-2026-02-19-01 | FIXED | Extension/UI | UI не загружается: `ERR_FILE_NOT_FOUND` для `~/.codeai-hub/packages/ui/*/current/*` после установки релиза | 1.1.640 |
| BUG-2026-02-19-02 | FIXED | Core/Codex | Codex: двойной rollover / два разделителя сессии при триггере контекстного окна | 1.1.641 |
| BUG-2026-02-20-01 | FIXED | Claude/Auth | В чистом `~/.codeai-hub` Claude остаётся НЕДОСТУПЕН: provider-home auth bootstrap не поднимает авторизацию | 1.1.644 |
| BUG-2026-02-21-01 | FIXED | Session UI | После падения/рестарта Core в середине turn: force-unlock + повторный submit не отправлял queued message в resume-сессию | 1.1.644 |
| BUG-2026-02-22-01 | FIXED | PM/UI + Core Runtime | После cold start: Reviewer dialog в `codeai-hub-claude` показывает вечный lock `Agent is working...` при завершённой сессии | 1.1.646 |
| BUG-2026-02-24-01 | FIXED | PM/UI + Core Runtime | one-shot `description`: завис mid-turn → нет аварийного recovery без рестарта Core | 1.1.664 |
| BUG-2026-02-24-02 | FIXED | Launcher/CEF | Standalone PM (CEF): crash on ↻ Restart attempt confirm | 1.1.665 |
| BUG-2026-02-24-03 | FIXED | PM/UI | ↻ Restart attempt создаёт новую сессию, но PM остаётся на старой («resuming…») | 1.1.668 |
| BUG-2026-02-24-04 | FIXED | Session UI | reviewer: Stop→message→Play resets task timer total | 1.1.669 |
| BUG-2026-03-01-01 | FIXED | UI + Core Continuity | Description runtime: в input показан `Retry` вместо `Play/Stop`; threshold-trigger continuity (80%) не срабатывает | 1.1.704 |
| BUG-2026-03-05-01 | FIXED | Core/PM | dialog-mode: token usage остаётся `0 tokens / 100%` после resume (continuity) | 1.1.708 |
| BUG-2026-03-05-02 | FIXED | PM/UI | Workflow navigation desync: Toolbar step не совпадает с Tree/session/artifact | 1.1.709 |
| BUG-2026-03-05-03 | FIXED | PM/UI | Первое открытие Workspace: dialog history не подтягивается до повторного клика по stage | TBD |

---

## BUG-2026-03-05-02 — PM/UI: Workflow navigation desync (Toolbar ↔ Tree ↔ Session/Artifact)

**Status:** FIXED

**Symptom:**
- После кликов в левом workflow tree (`stage`/`session`/`artifact`) подсветка в Toolbar могла оставаться на другом шаге.
- Правая панель показывала header/режимы не для текущего шага (например, `Description` при открытом `virtual-simulation.md`).

**Root cause (confirmed):**
- В UI не было единого stage SSOT: `activeTool` в `MainArea` обновлялся отдельно от tree/auto-select маршрутов.
- В stage route использовалась stage-specific ветка `skipSession` (Virtual Simulation), из-за чего часть переходов не открывала согласованную dialog-session.

**Fix:**
- Введён и задокументирован SSOT навигации `activeStage` (`ProjectManager_WorkflowNavigation_SSOT.md`).
- Все route (Toolbar, tree stage/session/artifact, auto-select) приведены к событию `pm:stage:activated`.
- `MainArea` слушает stage-активацию и синхронизирует Toolbar highlight.
- Убран `skipSession`; stage activation теперь унифицированно синхронизирует artifact/session.
- Правый header унифицирован для всех stage (`<Step Name> + Artifacts/Help`), добавлены help-panels для VS/Diagrams.
- Добавлен guard-тест на регрессию рассинхрона.

**Commits:**
- `70af1927 fix(pm): sync toolbar stage with navigation events`
- `e2d07b04 refactor(pm): route tree stage clicks through navigation event`
- `1e5a5394 fix(pm): sync tree artifact/session clicks with active stage`
- `0333ac19 fix(pm): sync auto-select stage with toolbar`
- `cdb2d066 fix(pm): unify stage activation semantics`
- `31493aa4 feat(pm): add stage artifact header toggle`
- `206df0f0 fix(pm): apply artifacts/help mode across stages`
- `b781eaac feat(pm): add workflow step help panels`
- `f58e258b test(pm): guard workflow navigation sync`
- `37d799fa chore(release): build-all v1.1.709`

**Release:** `1.1.709`

**Guards:**
- `node --test --import tsx src/client/project-manager/components/layout/workflow-navigation.test.ts`

## BUG-2026-03-05-03 — PM/UI: first-open dialog hydration race (history from JSONL missing until extra click)

**Status:** FIXED

**Symptom:**
- При первом открытии Workspace в PM могла открыться workflow session с пустой лентой (`No messages yet`) даже когда у dialog уже есть история в JSONL.
- Повторный клик по stage/session в левом дереве форсировал повторный route, после чего история появлялась.

**Root cause (confirmed):**
- В `dialog:list:result` history запрашивалась сразу после `setSession(nextSession)`, но `dialog:history:result` мог прийти раньше, чем `sessionRef` обновлялся из React state/effect.
- Из-за этого первый history payload отбрасывался проверкой `if (!currentSession) return`, и initial hydration зависела от дополнительного пользовательского действия.

**Fix:**
- `use-project-manager-dialog-core-events.ts`: session identity теперь фиксируется синхронно (`sessionRef.current = nextSession`) до первого `requestDialogHistory`.
- `use-project-manager-dialog-session-controller.ts`: `sessionRef` очищается при смене intent/workspace и синхронизируется при rollover-created session.
- Добавлен guard-тест на порядок `bind sessionRef -> request history`.
- Контракт `Dialogs_And_Continuity_Routing.md` обновлён: cold-open history должен идти последовательной цепочкой без потери первого payload.

**Commits:**
- `0b33084b docs(pm): document first-open dialog hydration contract`
- `092e73e4 fix(pm): prevent first-open dialog history race`
- `e5e6daf9 test(pm): guard first-open dialog history hydration`

**Release:** `TBD` (после `1.1.709`)

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`

## BUG-2026-03-05-01 — Session UI: dialog-mode token usage остаётся `0 tokens / 100%` после resume (continuity)

**Status:** FIXED

**Symptom:**
- При одновременной работе в разных workspace (например, Claude vs Codex), в Codex‑сессии UI может показывать `0 tokens (100%)`, хотя фактический usage уже известен.
- В `.codeai-hub/<workspaceSlug>/continuity/.../chain.json` при этом есть корректный `tokenUsage`.

**Root cause (confirmed):**
- Core гидрировал token usage из continuity при `session:binding`, но событие `session:stream` не содержало `providerSessionId`/`threadId`.
- В dialog‑mode Project Manager может не иметь snapshot по `payload.sessionId` (runtime session id), поэтому `updateSnapshotsWithTokenUsage` требует идентификатор провайдера (`threadId`/`providerSessionId`) для fallback‑обновления. Без него token usage оставался на default `0 / 200_000`.

**Fix:**
- Core: при эмите continuity token usage (на `session:binding`) добавлен `providerSessionId` в payload, чтобы PM мог восстановить token usage через fallback‑маршрутизацию.

**Commits:**
- `0564920b fix(core): include providerSessionId in continuity token usage`

**Release:** `1.1.708`

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts`

**Verified:** 2026-03-05 — подтверждено пользователем (Codex больше не показывает `0 tokens / 100%`).

## BUG-2026-03-01-01 — Description runtime: `Retry` вместо `Play/Stop`, и не срабатывает threshold continuity trigger

**Status:** FIXED
**Lifecycle:** запись заведена в реестре до начала кодового фикса; затем обновлена до `FIXED` после валидации и release-сборки `1.1.704`.

**Symptom:**
- В runtime-сессии шага `Description` в правом action input показывается `↻ Retry/Restart attempt`, а не стандартный `Play/Stop` toggle как в `Virtual Simulation`.
- При достижении порога контекстного окна (например, 80%) бесконечная `Description`-сессия не запускает flow-node continuity rollover.

**Root cause (observed):**
- В `Session UI` для `stage=description` безусловно включается `descriptionRestartAttempt`, что принудительно переключает кнопку input на restart-ветку.
- В Core flow-node continuity фильтр закреплён на `runSlug="collector"`, тогда как текущая runtime `Description`-сессия создаётся с `runSlug=null`; из-за mismatch eligibility всегда `false`.

**Fix:**
- Session UI: убрана restart-attempt ветка из input action-кнопки; для runtime сессий используется только стандартный `Play/Stop` toggle.
- Session UI/PM: удалён runtime listener `pm:description:restart-attempt` в `ProjectManagerSessionView`, чтобы не оставалось мёртвого one-shot tail в контуре runtime-сессий.
- Core continuity: фильтр flow-node rollover для `Description` синхронизирован с современной сессией (`runSlug=null`), поэтому threshold-trigger снова проходит eligibility check.
- Добавлены регрессионные тесты:
  - `packages/core/src/flow-node-continuity/flow-node-continuity-facade.test.ts`
  - `src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`

**Commits:**
- `473523a6 fix(ui): restore play-stop action for description runtime`
- `8d1f47f3 fix(core): restore description continuity threshold trigger`
- `9419eb0e test(ui): guard description runtime play-stop action`
- `afccb439 docs(bug): register description resume regressions`

**Release:** `1.1.704`

**Guards:**
- `node --test --import tsx packages/core/src/flow-node-continuity/flow-node-continuity-facade.test.ts`
- `node --test --import tsx src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`

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

## BUG-2026-02-24-01 — one-shot `description`: hang mid-turn has no recovery without Core restart

**Status:** FIXED

**Symptom:** если `Description` завис/упал mid-turn (или live-сессия не создалась после превращения анкеты в `Questionary.md`), пользователь не может безопасно восстановиться: Play/Stop не применим к one-shot/no-resume и рестарт Core недопустим (может снести другие активные сессии).

**Fix (target contract):**
- Добавить **↻ Restart attempt** (с подтверждением) для `Description` в двух местах: Session UI (если сессия есть) + `Questionary.md` header (если сессии нет).
- Реализовать `attemptId` gating: принимать артефакты/сигналы только от текущей попытки; late results от старых попыток игнорировать.

**Commits:**
- `0f11f66a docs(contracts): description restart attempt contract`
- `00fce612 feat(core): gate description by attemptId`
- `19629d9e feat(pm): write description draft to runs`
- `b0735af5 feat(pm): restart description attempt from questionnaire artifact`
- `835aedea feat(ui): restart attempt control for description`
- `f3d2021e feat(pm): restart description attempt from session UI`
- `3e8cd3e0 chore(build): rebuild webview after description restart attempt`
- `a52fde37 fix(pm): typecheck restart attempt providerId`

**Release:** `1.1.664`

---

## BUG-2026-02-24-02 — Standalone PM (CEF): crash on ↻ Restart attempt confirm

**Status:** FIXED

**Symptom:** в Standalone Project Manager (CEF) на macOS при нажатии ↻ Restart attempt (one-shot `Description`) приложение `CodeAIHubLauncher` может падать с macOS crash report (SIGSEGV / EXC_BAD_ACCESS).

**Root cause (most likely):**
- Использование native JS dialogs (`window.confirm`) в CEF UI контуре.

**Fix:**
- Убраны `window.confirm` из Project Manager UI.
- Подтверждение реализовано как 2‑шаговый UX: 1‑й клик “arm” на 4s, 2‑й клик подтверждает и запускает новую попытку.

**Commits:**
- `94abfd82 fix(pm/ui): avoid native confirm for description restart`
- `50daf9f4 chore(ui): rebuild ui bundles v1.1.665`

**Release:** `1.1.665`

**Guards (smoke):**
- Standalone PM → one-shot `Description` → клик ↻ (arm) → второй клик → restart attempt; приложение не падает.
- `questionnaire.md` header ↻: аналогично.

---

## BUG-2026-02-24-03 — PM/UI: ↻ Restart attempt creates a new session, but PM stays on the old one

**Status:** FIXED

**Symptom:**
- После ↻ Restart attempt (one-shot `Description`) новая сессия создаётся и появляется в дереве.
- Но в Project Manager продолжает висеть старая оборванная сессия; в input остаётся wait‑copy вида “Agent is resuming your session…”.
- Если кликнуть на новую сессию в дереве — открывается корректная новая сессия.

**Root cause:**
- ↻ Restart attempt создавал новую `description` session, но PM оставался в **Dialog Session View**, “приклеенном” к старому `providerSessionId` (intent).
- `resolveDialogMatch()` при наличии `providerSessionId` выбирает **точное совпадение**, поэтому даже при появлении новой попытки UI продолжал показывать старую сессию.

**Fix (target):**
- После ↻ Restart attempt (и из Session UI, и из `questionnaire.md` header) диспатчится `pm:dialog:open` с `providerSessionId: null`, чтобы Dialog View выбрал **последний (latest)** dialog по stage/provider и автоматически показал новую попытку.

**Guards (smoke):**
- Standalone PM → Description one-shot → сымитировать Core stop/start mid-turn → ↻ Restart attempt → новая сессия автоматически открывается без кликов в дереве.

**Commits:**
- `3ec74197 fix(pm/ui): auto-focus description session after restart attempt`

**Release:** `1.1.668`

---

## BUG-2026-02-24-04 — Session UI: reviewer Stop/Play resets task timer total

**Status:** FIXED

**Symptom:**
- In a reviewer (resume-capable) agent session: click Stop mid-turn, enter additional context, then click Play/Send.
- The `total` task timer resets (starts from `0`) instead of preserving accumulated total and accounting the interrupted turn delta.

**Expected:**
- When Stop is pressed, the elapsed time of the interrupted busy segment must be accounted into `taskTimer.totalSeconds`.
- After the next Play/Send starts a new turn, `taskTimer.totalSeconds` must be monotonic (no reset).

**Root cause:**
- `Stop` in Session UI shuts down the Core process (via supervisor + `/api/v1/shutdown`).
- Task timers were kept in Core memory only, so after Core restart the timer map was empty and `totalSeconds` fell back to `0`.
- The running busy segment was not committed into `totalSeconds` on shutdown, so the interrupted turn delta was lost.

**Fix:**
- Core: persist per-workspace per-node task timer totals to `~/.codeai-hub/state/task-timers.json` on shutdown.
- Core: on shutdown, commit the current running segment (`now - runningSinceMs`) into `totalSeconds` when it is accumulative, then clear `runningSinceMs`.
- Core: seed task timers from persisted totals when a workspace is selected (so the first snapshot after restart already contains the restored total).
- Added a regression test for Stop→Play flow.

**Commits:**
- `a203d3f0 fix(core): preserve task timer total on stop`
- `5fe2f19f test: prevent task timer total reset on stop/play`

**Release:** `1.1.669`

**Guards (smoke):**
- Reviewer session → start a turn → wait 5s → Stop → add message → Play → total >= 5s and continues to grow after future turns.
- `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`

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
- UX copy alignment (2026-02-26): EmptyState теперь явно объясняет questionnaire-first старт (`Artifacts` справа → `Submit questionnaire` → выбор провайдера), CTA кнопки переведены на EN (`Submit questionnaire`, `Close`).

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

**Status:** FIXED

**Symptom (pre-1.1.646):** при ошибке Claude `401 authentication_error` UI показывал ошибку, но поле ввода могло остаться в состоянии `Agent is working… Please wait.` (input locked). Пользователь не мог повторить отправку/продолжить без ручных действий.

**Root cause (reframed / confirmed):** на ошибках/рестартах `workspace:snapshot` мог уже быть `turnState="idle"` + `continuityLockActive=false`, но PM/UI удерживал блокировку из-за локального guard’а (зависимость от отсутствующего `continuityLockReason`). Это тот же класс проблемы, что и `BUG-2026-02-22-01`.

**Fix (implemented):**
- PM/UI: если snapshot явно сообщает `turnState="idle"` и `continuityLockActive=false`, ввод разблокируется даже когда `continuityLockReason` отсутствует.
- Core: для `resume_in_place` idle‑сессий snapshot нормализуется и всегда содержит явный unlock‑reason (`no_rollover_needed`) — defence‑in‑depth.

**Note:** отдельные “Recovery actions” (`Restart Core`, `Retry/Reconnect`) остаются UX‑улучшением; если понадобится — заведём отдельную фичу/баг.

**Commits:** см. `BUG-2026-02-22-01` (те же изменения lock/unlock SSOT).

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — “вечные” блокировки ввода не воспроизводятся (cold start + crash/restart mid‑turn; “Продолжай” продолжает turn).

---

## BUG-2026-02-17-05 — PM/UI: после Core restart агент отвечает, но input остаётся разблокированным во время turn

**Status:** FIXED

**Symptom (pre-1.1.646):** после recovery (restart Core) и повторной отправки сообщения агент начинал отвечать, но input мог остаться разблокированным (можно отправлять новые сообщения), хотя turn явно выполнялся.

**Fix (covered):** закрыто как часть работ по SSOT lock/unlock и crash/restart continuity (см. `BUG-2026-02-22-01`).

**Commits:** см. `BUG-2026-02-22-01`.

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — после Core restart mid‑turn ввод ведёт себя корректно (нет состояния “unlocked во время running”; “Продолжай” продолжает turn).

---

## BUG-2026-02-17-06 — Core/Provider: Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working

**Status:** FIXED

**Symptom (pre-1.1.646):** при Claude `401` UI мог залипать в `working/blocked` (turn выглядел “не завершённым” для UI).

**Root cause (reframed):** проблема проявлялась как “не завершённый turn”, но на практике ключевой блокер был в PM/UI: удержание lock при корректном server snapshot `idle/unlocked` из-за локального guard’а (см. `BUG-2026-02-22-01`).

**Fix (implemented):** закрыто в рамках SSOT lock/unlock исправлений (см. `BUG-2026-02-22-01`).

**Commits:** см. `BUG-2026-02-22-01`.

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — после ошибок/рестартов UI не остаётся в вечном `working/blocked`.

---

## BUG-2026-02-18-01 — Session UI: workflow-сессия открывается с unlocked input до первого snapshot
**Status:** FIXED

**Symptom (pre-1.1.629):** workflow‑сессия могла открываться с `connectionState="idle"`, поэтому пользователь мог вводить текст до прихода первого workspace snapshot, хотя Core уже инициировал первый turn.

**Expected:** любая workflow-сессия, где первый turn инициируется Core, должна открываться
с `connectionState="running"` (input заблокирован мгновенно).

**Root cause (confirmed):** `createInitialSnapshot()` не отличал workflow‑сессии от обычных сессий и мог выбирать `connectionState="idle"` по умолчанию, до прихода первого snapshot.

**Fix (implemented):**
- `createInitialSnapshot()`: все workflow‑сессии (`stage != null && sessionKind != null`) открываются как `connectionState="running"`.
- Добавлены регрессионные тесты (collector + reviewer + non‑workflow).

**Commits:**
- `63ab37d1 fix(ui): lock all workflow sessions immediately on open`
- `262fd87e chore(build): verify webview after workflow session lock fix`
- `cb7b33cc feat(release): v1.1.629 - lock workflow sessions immediately`

**Release:** `1.1.629`

**Guards:**
- `node --test --import tsx src/client/ui/src/session/helpers.initial-snapshot.test.ts`

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

**Status:** FIXED

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

**Fix:**
- macOS: bridge Keychain storage into provider-home by creating `~/.codeai-hub/providers/claude/home/Library/Keychains` as a symlink to the real `~/Library/Keychains` (best-effort).

**Commits:**
- `d345e8b6 fix: claude provider-home auth on macOS`

**Release:** `1.1.644`

**Verified (manual):** 2026-02-23 — confirmed by user.


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

---

## BUG-2026-02-20-01 — Claude provider-home bootstrap не авторизует чистый runtime home

**Status:** FIXED

**Symptom:** после установки `1.1.642` в чистом `~/.codeai-hub/` провайдер Claude показывает `НЕДОСТУПЕН` с recovery-hint `HOME=~/.codeai-hub/providers/claude/home claude /login`, несмотря на сообщение bootstrap. Папка `~/.codeai-hub/providers/claude/home` создаётся, но валидная provider-home auth не поднимается автоматически.

**Observed (confirmed):**
- Core логирует `Claude OAuth token bootstrapped for provider-home`, затем `Claude preflight auth probe failed` и ошибку `Claude provider-home authentication required...`.
- Ручной probe в provider-home (`HOME=~/.codeai-hub/providers/claude/home ... -p`) возвращает `Not logged in · Please run /login`.
- Прямая подстановка токена из текущего bootstrap-контура даёт `401 Invalid bearer token`.

**Root cause (confirmed):**
- Текущий bootstrap извлекает OAuth payload, но runtime preflight в provider-home не получает валидный auth-контекст (native lookup внутри изолированного HOME не даёт рабочий token path).
- Передача bootstrap access token в env ранее отключена (из-за регресса со stale token/401), поэтому автоматически “подхватить” логин в чистом provider-home теперь нечем.
- В результате fallback всегда упирается в ручной интерактивный `claude /login` для provider-home.

**Fix:**
- macOS: bridge `~/Library/Keychains` into provider-home before auth probes so Claude CLI can read/refresh Keychain auth under sandboxed `HOME`.
- Improve recovery hint: try `claude /login` first; fall back to `HOME=~/.codeai-hub/providers/claude/home claude /login` only if needed.

**Commits:**
- `d345e8b6 fix: claude provider-home auth on macOS`

**Release:** `1.1.644`

**Verified (manual):** 2026-02-23 — confirmed by user.

---

## BUG-2026-02-21-01 — Session UI: force-unlock не отправлял queued message после рестарта Core в середине turn

**Status:** FIXED

**Symptom:** когда active turn прерывался из-за рестарта/падения Core, input оставался locked. После ручного force-unlock и повторного submit сообщение не уходило в resume-сессию: оставалось в queued-состоянии, а диалог визуально “умирал”.

**Expected:** force-unlock должен позволять немедленно отправить повторное сообщение в активную сессию (resume path), без ожидания перехода `connectionState` в `idle`.

**Root cause (confirmed):**
- Хук `useQueuedSend` отправляет queued message только при `connectionState === "idle"`.
- `SessionView` передавал в `useQueuedSend` `queueConnectionState`, вычисленный из lock/runtime state, даже когда пользователь уже включил `forceUnlocked=true`.
- В результате force-unlock снимал блокировку ввода в UI, но не снимал блокировку для очереди отправки: повторное сообщение не отправлялось.

**Fix:**
- В `SessionView` добавлен `queuedSendConnectionState`: при `forceUnlocked=true` принудительно передаётся `"idle"` в `useQueuedSend`, иначе используется исходный `queueConnectionState`.
- Это позволяет повторному submit после force-unlock отправиться сразу в текущую сессию и продолжить resume-flow.

**Commits:**
- `7b6168e2 fix(ui): send queued message when force-unlocked`
- `fca104e3 chore: bump version to 1.1.644`

**Release:** `1.1.644`

**Verified (manual):** 2026-02-21 — после рестарта Core и ручной разблокировки ввода отправка “Продолжай” корректно продолжает сессию (e2e-проверка в Session096).

**Guards:**
- Manual smoke: запустить turn, перезапустить Core в середине выполнения, нажать force-unlock, отправить повторное сообщение; ожидаемо сообщение уходит в активную resume-сессию.

---

## BUG-2026-02-22-01 — PM/UI + Core Runtime: вечный `Agent is working...` после cold start на завершённом Reviewer dialog

**Status:** FIXED

**Symptom (repro on 2026-02-22):**
- После перезагрузки компьютера и Core открыть PM и workspace `CodeAI-Hub-claude`.
- Открывается корректная история бесконечной reviewer-сессии (`description/reviewer`, 3 сегмента), но input остаётся locked с copy `Agent is working... Please wait.`.
- Воспроизведение подтверждено скриншотом: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-02-22 at 08.09.42.png`.

**Update (repro on 2026-02-22, release `1.1.645`):**
- После внедрения reconciliation/fallback (см. `Session097`) залипание “working” ушло, но input всё равно остаётся **вечно locked**.
- Copy переключается на: `Agent is resuming your session... Please wait.`.
- Воспроизведение подтверждено скриншотом: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-02-22 at 09.12.35.png`.

**Expected:**
- Для завершённой reviewer-сессии после cold start input должен быть `idle/unlocked` (или явный recoverable state), не `working`.

**Observed artifacts (forensics):**
- Continuity index/chain указывают актуальный dialog + latest segment:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-claude/.codeai-hub/codeai-hub-claude/continuity/index.json`
  - `dialogId`: `claude-437305b1-db1f-4713-8a04-654fa1db86ca-reviewer`
  - `latestSessionId`: `b77388d6-7f89-442a-bc5d-94eab93377f6`
  - `providerSessionId`: `6b4b0d25-24b4-406e-8294-522fa69ae00f`
- Core `/api/v1/status` после cold start показывает другой runtime session id для того же provider session:
  - `id`: `bb059183-205c-4634-b6ff-ca2d78d214f3`
  - `providerSessionId`: `6b4b0d25-24b4-406e-8294-522fa69ae00f`
- Прямой `workspace:snapshot:request` для `workspaceRoot=/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-claude` возвращает только runtime id `bb059183-205c-4634-b6ff-ca2d78d214f3` (и не содержит `b773...`), при этом состояние у runtime id корректное:
  - `turnState: "idle"`, `continuityLockActive: false`, `continuityLockReason: null`.
- UI dialog controller инициализирует snapshot по `latestSessionId` из `dialog:list` через `createInitialSnapshot()` (workflow session => `connectionState="running"`), а обновление по `workspace:snapshot` применяется только по совпадению `sessionId`.

**Root cause (updated / confirmed):**
- Первичная причина “вечного working” была в mismatch `latestSessionId` (dialog-layer) vs runtime `sessionId` (Core). Это исправлялось reconciliation/fallback.
- Текущая причина “вечного resuming” — **вторая точка истины в PM/UI**:
  - `workspace:snapshot` на cold start может корректно сообщать `turnState="idle"` и `continuityLockActive=false`, но при этом `continuityLockReason` отсутствует (`undefined`).
  - В `applyWorkspaceSnapshotToSnapshots()` есть guard: переход из `running/blocked` → `idle` запрещён, если нет “разрешающего” lockReason (`allowIdleUnlock=false`).
  - На cold start `allowIdleUnlock` остаётся `false` → PM принудительно удерживает `connectionState="blocked"` и `continuityLock.active=true`.
  - Итог: UI остаётся locked с copy `Agent is resuming...` бесконечно, несмотря на корректный server snapshot.

См. архитектурный контракт SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.

**Fix direction (implemented):**
1. **PM/UI:** доверять snapshot-истине: если `workspace:snapshot` сообщает `idle + lock=false` и нет bootstrap-transition — разрешать переход в `idle/unlocked` даже когда `continuityLockReason` отсутствует.
2. **Core (минимальный SSOT этап):** гарантировать явный unlock-reason для idle resume‑сессий (например `no_rollover_needed`), чтобы UI не зависел от отсутствующих полей.

**Follow-ups (planned):**
- Целевой SSOT: вынести input lock в явное поле/state machine (см. контракт) и персистить это состояние для корректного восстановления после рестарта.

**Fix:**
- PM: если snapshot явно сообщает `turnState="idle"` и `continuityLockActive=false`, UI снимает блокировку даже если `continuityLockReason` отсутствует.
- Core: для `resume_in_place` idle/unlocked-сессий snapshot нормализуется и всегда содержит явный unlock-reason (`no_rollover_needed`).

**Commits:**
- `a066be90 test(pm): reproduce resuming stuck when lock reason missing`
- `ca728192 fix(pm): unlock input on cold-start idle snapshot`
- `de402c33 fix(core): emit explicit unlock reason for idle sessions`
- `71a20e11 feat(release): v1.1.646 - fix session input unlock on cold start`

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — после cold start reviewer‑диалог открывается в `idle/unlocked`; при рестарте Core в середине turn ввод разблокируется автоматически; сообщение “Продолжай” продолжает прерванный turn.
