# Bug Registry

Накопительный реестр багов и фиксов (чтобы уменьшать регрессии и не «чинить одно — ломая другое»).

## Правила ведения
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
