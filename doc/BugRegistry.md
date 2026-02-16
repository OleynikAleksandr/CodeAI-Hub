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
| BUG-2026-02-16-02 | OPEN | PM/UI | one‑shot `description`: wait‑copy показывает `resuming` вместо `working` | — |

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

**Status:** OPEN

**Symptom:** в one‑shot `description` сессии во время работы агента вместо `Agent is working… Please wait.` показывается `Agent is resuming your session… Please wait.`

**Expected:** `Agent is working… Please wait.` (copy `resuming` уместен только для меж‑сессионного rollover/resume).

**Notes / hypothesis:** `no_resume` input‑lock не должен превращать «работу агента» в UI‑состояние `resuming`.
