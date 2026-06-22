# Bug Registry

Накопительный реестр багов и фиксов (чтобы уменьшать регрессии и не «чинить одно — ломая другое»).

## Правила ведения
- **Required reading перед любым UI/оркестрационным фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Порядок записей всегда `newest-first`:** новый баг добавляется в начало индекса и в начало подробных карточек, а не в конец файла.
- **Индекс и карточка обновляются синхронно:** нельзя добавить или закрыть баг только в одной части реестра.
- **Добавляем запись сразу** при обнаружении бага (Status: `OPEN`).
- **Любой фикс** обновляет запись: `Root cause`, `Fix`, `Commits`, `Release`, `Guards`.
- Для багов на стыке Core/PM/UI обязательны **guards** (минимум: тест или воспроизводимый smoke‑чек).

## Индекс

| ID | Status | Area | Симптом (кратко) | Fixed in |
|---:|:------:|------|------------------|----------|
| BUG-2026-06-22-01 | OPEN | PM/Core/Standalone Chats | удаление workflow steps удаляет standalone workspace chat sessions, хотя chat-сессии должны жить отдельно от workflow tree | TBD |
| BUG-2026-06-18-01 | FIXED | PM/UI/Description | заполненная анкета затирается пустым template при старте PM, когда чтение анкеты падает с ошибкой (не 404) | 1.2.547 |
| BUG-2026-05-03-01 | FIXED | Codex Runtime | reopened Codex session gets `Provider codexCli unavailable`; `codex-cli 0.128.0` rejects `mcp_servers.*.enabled=false` startup overrides with `invalid transport` | 1.2.131 |
| BUG-2026-04-27-02 | DEFERRED | Codex Runtime/UI | `gpt-5.3-codex-spark` runs after 1.2.96 but still shows no reasoning bubbles even after provider-home summary materialization | TBD |
| BUG-2026-04-27-01 | FIXED | Codex Runtime/Translation | `gpt-5.3-codex-spark` падает с `unsupported_parameter` по `reasoning.summary` при выборе модели в Settings Codex; translation runtime also had explicit summary config risk | 1.2.96 |
| BUG-2026-04-23-01 | FIXED | PM/Diagram Modules/Launcher | закрытие detached Digital Models popup закрывает весь Project Manager; popup также наследует full-width geometry main окна | 1.2.56 |
| BUG-2026-04-22-08 | FIXED | PM/Settings/Localization/CEF | выбор `UI Translation Engine` в standalone PM на macOS 26.x роняет launcher с `NSApplication unrecognized selector` | 1.2.55 |
| BUG-2026-04-22-07 | FIXED | PM/Settings/UI | закрытие окна Settings закрывает и Project Manager; popup lifecycle ломает PM-owned settings flow | 1.2.54 |
| BUG-2026-04-22-06 | FIXED | PM/Settings/Recovery | в General tab пропал `Restart Core`, хотя PM обязан сохранять recovery UX | 1.2.54 |
| BUG-2026-04-22-05 | FIXED | PM/Settings/Localization | provider-only save показывает `Synchronizing localization`, хотя strict localization sync реально не запускался | 1.2.54 |
| BUG-2026-04-22-04 | FIXED | Launcher/CEF/macOS | paste (Cmd+V) и SuperWhisper не работают в input PM; Dock right-click Quit / Cmd+Q не закрывает launcher | 1.2.49 (rollback) |
| BUG-2026-04-22-03 | FIXED | Claude/Core/UI | pre-turn usage limits не появляются на первом cold-open workspace/step и догоняются только после повторного открытия шага | 1.2.47 |
| BUG-2026-04-22-02 | FIXED | Codex/Core/UI | pre-turn usage limits показывают проценты, но теряют `Resets ...` на cold-open после Core restart | 1.2.47 |
| BUG-2026-04-22-01 | FIXED | Launcher/CEF/macOS | standalone Project Manager падает на красной window-close кнопке c `NSApplication unrecognized selector` | 1.2.52 (CanClose short-circuit via [NSApp terminate:]; 1.2.50/1.2.51 exception-pipeline mitigations failed; CEF upgrade still tracked as deferred follow-up) |
| BUG-2026-04-19-03 | OPEN | UI/Markdown | ordinary assistant nested lists раздуваются пустыми вертикальными блоками, хотя raw markdown уже компактный | TBD |
| BUG-2026-04-19-02 | OPEN | Core/UI/Translation | section titles в session messages теряют paragraph boundary и прилипают к предыдущему абзацу (`...data.**Clarifying ...**`) | TBD |
| BUG-2026-04-19-01 | OPEN | Translation/Core/UI | translated overlays теряют пробелы на границе latin/cyrillic (`parallelдля`, `вродеpwd`, `lsилиsed`) | TBD |
| BUG-2026-04-18-06 | FIXED | PM/Core | multi-workspace PM создаёт repeated refresh/bootstrap/polling churn и деградирует отзывчивость системы | 1.2.19 |
| BUG-2026-04-18-05 | FIXED | Codex Runtime | final assistant answer дублируется через rollout pair `final_answer` + `task_complete` | 1.2.19 |
| BUG-2026-04-18-04 | FIXED | PM/UI/Codex | после `Stop` + fast resend в dialog UI временно дублируется user bubble | 1.2.19 |
| BUG-2026-04-18-03 | FIXED | Claude Runtime | Claude final answer может оставлять orphan suffix assistant bubble (`ell.`) после нормального завершения turn | 1.2.19 |
| BUG-2026-04-18-02 | OPEN | Claude/UI/Translation | Claude pre-tool live text попадает в assistant bubble вместо `Thinking` и обходит перевод | TBD |
| BUG-2026-04-18-01 | FIXED | Claude/Core/PM | Claude turn завершён, но session залипает в `Agent is resuming...` из-за post-turn `/context` probe failure | 1.2.16 |
| BUG-2026-04-16-01 | FIXED | Localization/Core/Claude | Haiku слишком медленно переводит runtime bundles и дублирует/обрезает reasoning translation | 1.1.990 |
| BUG-2026-03-29-01 | OPEN | Core/UI/Gemini | Session Stop semantics shutdown-ит Core вместо остановки turn; stalled Gemini turn оставляет dialog locked | TBD |
| BUG-2026-03-25-01 | FIXED | Core/Gemini/PM | Provider error → binding lost → UI deadlock → Core crash → workspace vanishes | 1.1.804 |
| BUG-2026-03-20-01 | FIXED | Codex/Core/PM | reopen/recovery цикл держит `diagram_modules` dialog в вечном `Agent is working...` после restart Core / PM | 1.1.753 |
| BUG-2026-03-14-01 | FIXED | Codex Runtime | saved `gpt-5.4` default model пересиливается stale `CODEX_DEFAULT_MODEL=gpt-5.3-codex` | 1.1.726 |
| BUG-2026-03-13-01 | FIXED | Codex Runtime | `Debug/Raw`: raw provider log полный, но unified-session/dialog JSONL пуст от агента | 1.1.722 |
| BUG-2026-03-05-03 | FIXED | PM/UI | Первое открытие Workspace: dialog history не подтягивается до повторного клика по stage | 1.1.711 |
| BUG-2026-03-05-02 | FIXED | PM/UI | Workflow navigation desync: Toolbar step не совпадает с Tree/session/artifact | 1.1.709 |
| BUG-2026-03-05-01 | FIXED | Core/PM | dialog-mode: token usage остаётся `0 tokens / 100%` после resume (continuity) | 1.1.708 |
| BUG-2026-03-01-01 | FIXED | UI + Core Continuity | Description runtime: в input показан `Retry` вместо `Play/Stop`; threshold-trigger continuity (80%) не срабатывает | 1.1.704 |
| BUG-2026-02-24-04 | FIXED | Session UI | reviewer: Stop→message→Play resets task timer total | 1.1.669 |
| BUG-2026-02-24-03 | FIXED | PM/UI | ↻ Restart attempt создаёт новую сессию, но PM остаётся на старой («resuming…») | 1.1.668 |
| BUG-2026-02-24-02 | FIXED | Launcher/CEF | Standalone PM (CEF): crash on ↻ Restart attempt confirm | 1.1.665 |
| BUG-2026-02-24-01 | FIXED | PM/UI + Core Runtime | one-shot `description`: завис mid-turn → нет аварийного recovery без рестарта Core | 1.1.664 |
| BUG-2026-02-22-01 | FIXED | PM/UI + Core Runtime | После cold start: Reviewer dialog в `codeai-hub-claude` показывает вечный lock `Agent is working...` при завершённой сессии | 1.1.646 |
| BUG-2026-02-21-01 | FIXED | Session UI | После падения/рестарта Core в середине turn: force-unlock + повторный submit не отправлял queued message в resume-сессию | 1.1.644 |
| BUG-2026-02-20-01 | FIXED | Claude/Auth | В чистом `~/.codeai-hub` Claude остаётся НЕДОСТУПЕН: provider-home auth bootstrap не поднимает авторизацию | 1.1.644 |
| BUG-2026-02-19-02 | FIXED | Core/Codex | Codex: двойной rollover / два разделителя сессии при триггере контекстного окна | 1.1.641 |
| BUG-2026-02-19-01 | FIXED | Extension/UI | UI не загружается: `ERR_FILE_NOT_FOUND` для `~/.codeai-hub/packages/ui/*/current/*` после установки релиза | 1.1.640 |
| BUG-2026-02-18-07 | FIXED | Session UI | При смене/привязке workflow-сессии не показывается wait-copy “resuming…”, остаётся “Agent is working…” | 1.1.639 |
| BUG-2026-02-18-06 | FIXED | Core/Templates | Reviewer prompt упоминает `reviewer-template.md`, но файл/путь не доступен → агент тратит время на поиск | 1.1.637 |
| BUG-2026-02-18-05 | FIXED | PM/UI | Dialog Reviewer: input остаётся locked до workspace switch / reload (гонка snapshot vs hydration) | 1.1.635 |
| BUG-2026-02-18-04 | FIXED | Core/UI | Reviewer input не разблокируется после turn completion | TBD |
| BUG-2026-02-18-03 | FIXED | Claude/Auth | macOS диалог "Keychain Not Found" при запуске VSCode (cosmetic, не блокирует) | 1.1.644 |
| BUG-2026-02-18-02 | FIXED | Claude/Auth | auth probe "nested session" когда VSCode запущен из Claude Code CLI терминала | TBD |
| BUG-2026-02-18-01 | FIXED | Session UI | workflow-сессия открывается с unlocked input до первого snapshot от Core | 1.1.629 |
| BUG-2026-02-17-06 | FIXED | Core/Provider | Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working | 1.1.646 |
| BUG-2026-02-17-05 | FIXED | PM/UI | после Core restart агент отвечает, но input остаётся разблокированным во время turn | 1.1.646 |
| BUG-2026-02-17-04 | FIXED | PM/UI | input остаётся заблокированным после Claude 401 (нет recovery UI) | 1.1.646 |
| BUG-2026-02-17-03 | FIXED | PM/UI | token usage не обновляется после turn completion (до смены workspace) | 1.1.626 |
| BUG-2026-02-17-02 | FIXED | PM/UI | description→reviewer: reviewer auto-started but not auto-focused in live UI | 1.1.625 |
| BUG-2026-02-17-01 | FIXED | PM/UI | пустой EmptyState без спиннера при создании сессии ("Create your first session…") | 1.1.622 |
| BUG-2026-02-16-04 | FIXED | PM/UI | workflow `description`: медленно открывается Session UI после Send | 1.1.616 |
| BUG-2026-02-16-03 | FIXED | UI | one‑shot `description` collector: input свободен до первых сообщений | 1.1.615 |
| BUG-2026-02-16-02 | FIXED | PM/UI | one‑shot `description`: wait‑copy показывает `resuming` вместо `working` | 1.1.614 |
| BUG-2026-02-16-01 | FIXED | Core/PM | one‑shot `description`: input «unlock gap»/возможность второго запроса | 1.1.613 |

---
## BUG-2026-06-22-01 — PM/Core/Standalone Chats: workflow deletion removes standalone chat sessions

**Status:** OPEN

**Symptom:**
- При удалении workflow steps / очистке workflow из Project Manager удаляются standalone workspace chat sessions.
- Standalone chats создаются через Chat surface и не должны зависеть от жизненного цикла Documentation Tree / workflow steps.
- Ожидаемое поведение: удаление любых workflow steps не удаляет standalone chat history, metadata, live bindings и возможность открыть чат из Chat list.

**Root cause:** TBD

**Fix:** TBD

**Guards:** TBD; минимум нужен regression/smoke, который удаляет workflow steps и проверяет, что standalone chat list/history остаются доступны.

**Commits:** TBD

**Release:** TBD

---
## BUG-2026-06-18-01 — PM/UI/Description: заполненная анкета затирается template при старте PM на read-error

**Status:** FIXED

**Symptom:**
- Начиная с некоторого релиза, при старте Project Manager в открываемом workspace заполненная анкета (`questionnaire.md`) затирается пустым шаблоном.
- Раньше PM не трогал уже заполненную анкету.

**Root cause:**
- `DescriptionQuestionnaireService.load` (`src/client/project-manager/services/description-questionnaire-service.ts`) при старте читает анкету через `readWorkspaceFile`, который возвращает `status`: `ok` | `missing` | `error`.
- Запись template была защищена условием `if (!existingContent)`, где `existingContent = status === "ok" ? content : null`. Это делает `existingContent` равным `null` И при `missing` (файла нет), И при `error` (чтение упало).
- Если при старте чтение анкеты падает с `error` (тайминг старта / Core-endpoint ещё не готов), клиент ошибочно считает анкету отсутствующей и пишет пустой template поверх заполненной → потеря данных.
- Коммит `065c9aa94` не виноват: он наоборот ужесточил guard (`!existingContent || rendered !== existing` → `!existingContent`). Корень — что `error` не отличается от `missing`.

**Fix:**
- Введена чистая функция `shouldSeedQuestionnaire(status)`, возвращающая `true` ТОЛЬКО при `status === "missing"` (явный 404).
- Запись template теперь происходит только при `missing`; при `error` файл не трогается, заполненная анкета сохраняется.

**Guards:**
- Unit-тест `shouldSeedQuestionnaire` (`missing` → true, `error`/`ok` → false).
- Integration-тест: при read-`error` write-endpoint не вызывается (анкета не затирается).

**Commits:** `fix(pm): keep questionnaire when read fails`

**Release:** 1.2.547

## BUG-2026-05-03-01 — Codex app-server startup fails on CLI 0.128 MCP config schema

**Status:** FIXED

**Symptom:**
- В релизе `1.2.130` reopened Codex workflow session принимает user message, но вместо provider turn UI пишет `System: Provider codexCli unavailable`.
- Core recovery loop каждую минуту повторяет provider init и снова получает `Provider initialization failed`.

**Evidence:**
- Screenshot `2026-05-03 08:36 CEST`: `Virtual Simulation Codex`, model `Gpt 5.3 Codex Spark`, user sends next turn, UI receives `Provider codexCli unavailable`.
- Core log: `[codex] codex app-server stderr: error loading default config after config error: invalid transport in mcp_servers.codex`, followed by `codex app-server exited with code 1`.
- Local repro with `codex-cli 0.128.0`:
  `CODEX_HOME=~/.codeai-hub/providers/codex/home codex app-server -c mcp_servers.codex.enabled=false -c mcp_servers.playwright.enabled=false` fails with the same `invalid transport`.
- Managed provider-home `config.toml` is clean (`model_reasoning_summary = "none"`), so the failure comes from CodeAI Hub startup args, not from persisted user config.

**Root cause:**
- CodeAI Hub `1.2.130` passes legacy app-server startup overrides `-c mcp_servers.codex.enabled=false` and `-c mcp_servers.playwright.enabled=false`.
- `codex-cli 0.128.0` validates `mcp_servers.<name>` config as requiring a valid `transport`; setting only `enabled=false` now creates an invalid partial MCP server entry before app-server initialize.

**Fix:**
- Removed the legacy `-c mcp_servers.codex.enabled=false` and `-c mcp_servers.playwright.enabled=false` overrides from the Codex app-server startup profile.
- Kept the verified feature disables for `multi_agent`, `browser_use`, `in_app_browser`, `computer_use`, `image_generation`, `plugins`, `apps`, and `tool_search`.
- Updated Codex invocation SSOT to mark standalone `mcp_servers.<name>.enabled=false` as an invalid contract for `codex-cli 0.128.0`.

**Commits:**
- `2b48db841 fix: start codex app-server with 0.128 config schema`

**Release:** `1.2.131`

**Guards:**
- `npx tsx --test packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- Direct built-process smoke: `CodexAppServerProcess.start()` reaches `codex-process-start-ok` with `codex-cli 0.128.0`

---
## BUG-2026-04-27-02 — Codex Runtime/UI: Spark runs but visible reasoning is absent

**Status:** DEFERRED

**Symptom:**
- After release `1.2.96`, selecting `gpt-5.3-codex-spark` in Settings Codex no longer fails with `unsupported_parameter`.
- The Description turn runs, creates the artifact, and ordinary progress commentary appears.
- No visible reasoning/thinking bubbles appear in the dialog even though Codex reasoning is enabled and reasoning effort can be selected.

**Evidence:**
- Spark provider-home rollout records `turn_context.model = "gpt-5.3-codex-spark"` and `turn_context.effort = "xhigh"`.
- The same rollout records `turn_context.summary = "none"`.
- The same turn has `reasoning_output_tokens` in token usage, so the model did perform hidden reasoning.
- `~/.codeai-hub/providers/codex/home/models_cache.json` says Spark has `supports_reasoning_summaries: true` and `default_reasoning_summary: "none"`.

**Root cause:**
- Release `1.2.96` correctly removed the unsupported per-turn `turn/start.summary` field for Spark.
- Without another config-level override, Spark falls back to its model default readable summary mode: `none`.
- Therefore Spark reasoning tokens exist, but the App Server has no readable summary text to emit into CodeAI Hub's thinking-bubble path.

**Mitigation in 1.2.97:**
- Keep Spark `turn/start.summary` omitted to avoid the provider 400 error.
- Before App Server startup, materialize provider-home `model_reasoning_summary = "auto"` for Spark-compatible visible reasoning when the shared Codex reasoning toggle is enabled.
- Write `model_reasoning_summary = "none"` when the shared Codex reasoning toggle is disabled.
- Preserve the existing explicit `turn/start.summary = "detailed" | "none"` behavior for non-Spark Codex models.

**Post-release retest:**
- User retest of `1.2.97` confirmed Spark still does not show visible reasoning summaries.
- The compatibility mitigation remains useful because Spark turns run without the `unsupported_parameter` hard failure, but readable Spark summaries are treated as a provider-side limitation for now.

**Commits:**
- `647c441df docs: plan codex spark summary config fix`
- `31d1159b7 fix: enable spark reasoning summary via provider config`
- `b20adf514 docs: document spark summary config path`

**Guards:**
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `node --test packages/Codex_AppServer_Module/dist/app-server/process/codex-provider-home-config.test.js packages/Codex_AppServer_Module/dist/app-server/codex-app-server-facade.test.js packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`
- Regression coverage confirms Spark omits `turn/start.summary`, provider-home `config.toml` materializes `model_reasoning_summary = "auto" | "none"`, and non-Spark `gpt-5.5` still receives `summary: "detailed"`.

**Release:**
- `1.2.97` mitigated the config path but did not restore visible Spark summaries.

---
## BUG-2026-04-27-01 — Codex Runtime/Translation: `gpt-5.3-codex-spark` rejects `reasoning.summary`

**Status:** FIXED

**Symptom:**
- Пользователь выбирает `gpt-5.3-codex-spark` в Settings -> Codex.
- Turn не стартует как нормальный агентский ответ и завершается системной ошибкой:
  `Provider turn failed: unsupported_parameter: Unsupported parameter: 'reasoning.summary' is not supported with the 'gpt-5.3-codex-spark' model.`
- В `~/.codeai-hub/providers/codex/home/models_cache.json` у Spark при этом указано `supports_reasoning_summaries: true` и `default_reasoning_summary: "none"`, поэтому баг относится не к отсутствию любой summary capability, а к конкретному явному request/config параметру, который CodeAI Hub отправлял.

**Root cause hypothesis (confirmed in code):**
- Codex App Server send path безусловно добавляет `summary: "detailed" | "none"` в каждый `turn/start`.
- Для остальных текущих Codex-моделей это является live reasoning-summary control.
- `gpt-5.3-codex-spark` отвергает явный provider-native `reasoning.summary` в App Server path; даже отключающее значение должно быть не `summary: "none"`, а полное отсутствие turn-level параметра.
- Localization/reasoning translation uses `codex exec`, not App Server, but its temporary `config.toml` also wrote explicit `model_reasoning_summary = "none"`. Since Spark already defaults summary to `none`, the safer translation behavior is also to omit the explicit summary config for Spark.

**Fix:**
- Normal Codex App Server runtime omits `turn/start.summary` for `gpt-5.3-codex-spark`.
- Native request capture omits `turn/start.summary` for `gpt-5.3-codex-spark`.
- Codex translation runtime omits `model_reasoning_summary` in temporary `config.toml` for `gpt-5.3-codex-spark`, while preserving `model_reasoning_summary = "none"` for other Codex translation models.

**Commits:**
- `8d4ff9c24 fix: omit codex summary for spark`
- `b17ebd7c8 test: cover codex spark summary omission`
- `923e5983f fix: omit codex translation summary for spark`

**Guards:**
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-facade.test.js packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`
- `npm run build --workspace @codeai-hub/translation`
- `node --test packages/translation/dist/codex-translation-runtime-home-facade.test.js`

**Release:**
- `1.2.96`

---
## BUG-2026-04-23-01 — PM/Diagram Modules/Launcher: closing detached Digital Models popup closes the whole Project Manager

**Status:** FIXED

**Symptom:**
- В `Diagram Modules` пользователь может открыть граф в отдельном detached CEF popup окне через `Detach`.
- Закрытие этого detached окна завершает весь standalone Project Manager, хотя popup должен быть локальной вспомогательной surface.
- Дополнительно detached окно открывается с геометрией main PM окна по горизонтали, вместо более узкого popup-sized presentation.

**Root cause hypothesis (confirmed in code):**
- После релиза `1.2.52` `LauncherWindowDelegate::CanClose(...)` на macOS стал role-agnostic: и main window, и popup windows маршрутизировались в `RequestNativeApplicationTermination()`.
- Это было правильным fix-path для main PM window, но неверным для detachable auxiliary popup, который не должен владеть whole-app shutdown.
- macOS popup также проходил через тот же restore/persist path, что и main window (`WindowStatePersistence` + `WindowStateTracker`), поэтому наследовал full-width autosave frame Project Manager.

**Fix (1.2.56):**
- `LauncherWindowDelegate` теперь различает main и popup windows. На macOS только main Project Manager window сохраняет `1.2.52` short-circuit в `RequestNativeApplicationTermination()`, а popup window закрывается локально.
- Detached popup перестал читать и писать main-window autosave state: launcher больше не вызывает restore/tracking/persist path для popup browsers.
- PM detach action теперь добавляет explicit popup-sized open hint (`width=1180,height=820`), чтобы popup стартовал в более узком artifact-oriented формате.

**Commits:**
- `aa13048ff fix(launcher): keep detached diagram popup local`
- `eb78180f8 fix(pm): tune detached diagram popup geometry`

**Guards:**
- `npm run build:project-manager`
- Smoke: `Diagram Modules -> Detach` открывает popup отдельным окном и его закрытие не завершает main PM window.
- Smoke: detached popup стартует уже не на full-width main PM frame, а в popup-sized geometry.
- Smoke: закрытие главного PM окна по-прежнему идёт по существующему `1.2.52` shutdown path.
- User retest after release build confirmed: detached popup closes locally, main PM remains alive, and popup sizing now matches expectations.

**Release:**
- `1.2.56`

---
## BUG-2026-04-22-08 — PM/Settings/Localization/CEF: selecting `UI Translation Engine` crashes standalone PM on macOS 26.x

**Status:** FIXED

**Symptom:**
- В релизе `1.2.54` попытка открыть или изменить `Settings -> Localization -> UI Translation Engine` в standalone Project Manager завершает процесс `CodeAIHubLauncher`.
- macOS crash report фиксирует `NSInvalidArgumentException` / `-[NSApplication %s]: unrecognized selector sent to instance ...`.
- Пользователь подтвердил, что provider-only settings больше не запускают localization sync, а crash остаётся привязан именно к translation-engine selector interaction.

**Confirmed evidence:**
- `~/Library/Logs/DiagnosticReports/CodeAIHubLauncher-2026-04-22-181851.ips` показывает main-thread crash внутри Chromium / AppKit popup path, без наших settings save/localization handler frames.
- Shared `TranslationEngineSelector` в `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx` всё ещё использует native `<select>`.
- Рядом лежащий `LocalizationLanguageCombobox` уже реализован как custom DOM listbox и не уходит в AppKit-native select/popup path.

**Root cause hypothesis (confirmed at trigger level):**
- Crash относится не к Core-side localization persistence, а к standalone CEF/macOS native popup path для HTML `<select>`.
- На macOS 26.x Chromium 141 внутри CEF по-прежнему имеет known incompatibility family вокруг `NSApplication unrecognized selector`; 1.2.52 закрыл только window-close teardown branch, но не native `<select>` popup branch.
- Пока translation-engine controls рендерятся как native `<select>`, standalone PM остаётся уязвимым к этому AppKit/CEF crash trigger.

**Fix (1.2.55):**
- Shared `TranslationEngineSelector` больше не использует native `<select>` и переведён на DOM-owned button/listbox selector с keyboard navigation.
- Fix накрывает оба translation-engine controls сразу: `UI Translation Engine` и `Reasoning Translation Engine`.
- Crash trigger убран на presentation layer: standalone PM больше не заходит в AppKit-native popup path при выборе translation engine.

**Commits:**
- `bbdbc2b1e fix(settings): replace native translation engine select`

**Guards:**
- `npm run build:webview`
- `npm run build:project-manager`
- Smoke: в standalone PM открытие `UI Translation Engine` и `Reasoning Translation Engine` больше не вызывает system crash dialog.

**Release:**
- `1.2.55`

---
## BUG-2026-04-22-07 — PM/Settings/UI: closing Settings also closes Project Manager

**Status:** FIXED

**Symptom:**
- В релизе `1.2.53` Settings открываются в отдельном popup-окне из Project Manager.
- Закрытие окна Settings одновременно закрывает и Project Manager window, хотя это должен быть независимый PM-owned surface.
- Дефект подтверждён пользователем при первом regression-pass после релиза `1.2.53`.

**Root cause hypothesis (confirmed at architecture level):**
- Текущий PM settings flow завязан на detached popup path (`window.open(...)`) и отдельный route `?mode=detached-settings`.
- Такой split-window lifecycle создаёт хрупкую связку между главным PM window и Settings window: focus, close и host ownership больше не живут в одном React/runtime контуре.
- Пока Settings остаются popup-сценарием, подобные lifecycle-регрессии будут повторяться.

**Fix (1.2.54):**
- Detached settings route и popup opener полностью удалены из Project Manager.
- `Open Settings` теперь переводит правую панель PM в in-shell settings mode вместо открытия отдельного окна.
- `Close Settings` возвращает прежний right-panel context, не затрагивая lifecycle главного PM окна.

**Commits:**
- `cc98d7713 feat(pm): host settings inside main area`
- `179eaaf2e chore(pm): remove detached settings window`

**Guards:**
- Smoke: `Open Settings` открывает settings внутри правой зоны PM, а закрытие settings не закрывает Project Manager.
- Smoke: после закрытия settings PM возвращает предыдущий panel context (`artifact` / `help`).

**Release:**
- `1.2.54`

## BUG-2026-04-22-06 — PM/Settings/Recovery: General tab lost `Restart Core`

**Status:** FIXED

**Symptom:**
- После релиза `1.2.53` в PM Settings -> General исчез user-facing control `Restart Core`.
- Это ломает recovery UX для provider auth/quota/runtime проблем, который по SSOT обязан оставаться доступным из Project Manager.

**Root cause hypothesis (confirmed in code):**
- PM settings state сейчас жёстко объявляет `supportsCoreRestart: false`, а shared `SettingsView` по этому флагу уходит в урезанный General path без `Core Controls`.
- В результате миграция ownership в PM сохранила сам Settings surface, но потеряла recovery control, который раньше жил в shared GeneralSettings contract.

**Fix (1.2.54):**
- PM settings state снова экспонирует реальный `Restart Core` transport и synthetic core-control lifecycle для Project Manager.
- Shared `SettingsView` перестал скрывать `Core Controls` в PM-mode, поэтому `Restart Core` снова виден в `General`.
- Standalone launcher получил узкий restart primitive и bridge `codeai://core-restart`, чтобы PM recovery UX работал не только в VS Code-host.

**Commits:**
- `a05fa9c61 feat(pm): add core restart transport`
- `123125555 fix(pm): restore restart core in settings`
- `8f69ae002 feat(launcher): add core restart primitive`
- `f15310b91 feat(launcher): wire restart bridge`

**Guards:**
- Smoke: PM `Settings -> General` снова показывает `Core Controls` и кнопку `Restart Core`.
- Smoke: в standalone launcher restart request идёт через host bridge, а PM получает lifecycle phases `stopping -> starting -> ready`.

**Release:**
- `1.2.54`

## BUG-2026-04-22-05 — PM/Settings/Localization: provider-only save shows fake localization sync overlay

**Status:** FIXED

**Symptom:**
- В PM Settings изменение provider-only параметра (подтверждённый кейс: Claude thinking effort) показывает overlay `Synchronizing localization`.
- Пользовательский вывод выглядит так, будто запускается strict localization rebuild, хотя provider-only save не должен блокировать PM и новые sessions.

**Root cause hypothesis (confirmed in code):**
- Core-side selective sync classifier в `settings-persistence-service.ts` для provider-only save возвращает `syncMode: "best_effort"`, то есть реальный strict localization sync здесь не стартует.
- Но shared `SettingsView` показывает localization overlay по общему флагу `saving`, а не по фактическому `settings:localization-sync-status`.
- Следовательно, UI перепутал `saving settings` и `strict localization sync`, из-за чего пользователь получает ложный blocking message.

**Fix (1.2.54):**
- Shared settings state contract теперь получает фактический `settings:localization-sync-status` и для VS Code-host, и для PM host.
- Overlay `Synchronizing localization` больше не привязан к общему флагу `saving` и показывается только когда реальный localization sync действительно `busy`.
- Provider-only saves остаются обычным settings save flow без ложного blocking overlay.

**Commits:**
- `b413fd7f1 feat(settings): expose localization sync status`
- `75135ca08 fix(settings): gate localization overlay by sync status`

**Guards:**
- Smoke: изменение provider-only настроек (например `Claude Thinking`) не показывает `Synchronizing localization`.
- Smoke: strict localization changes продолжают показывать blocking overlay только на реальном sync busy-state.

**Release:**
- `1.2.54`

## BUG-2026-04-22-04 — Launcher/CEF/macOS: paste, SuperWhisper and Quit break after 1.2.46 bootstrap refactor

**Status:** FIXED (via rollback in 1.2.49)

**Final resolution (1.2.49):**
- Полный rollback CEF bootstrap refactor. Удалены `codeai_hub_application_mac.{h,mm}`, `app_main_mac.mm` восстановлен в состоянии коммита `70ac9a6ac` (predecessor of `de7c5ad37`), соответствующие entries убраны из `CMakeLists.txt`. Launcher снова использует plain `[NSApplication sharedApplication]` bootstrap из 1.2.45 baseline.
- User-confirmed гипотеза: narrow fix 1.2.48 (Edit menu removal + standard `terminate:` path) был теоретически разумен, но не попал в реальный paste-breaker. Root cause сидит внутри самого `CodeAIHubApplication : NSApplication <CefAppProtocol>` shell'а (коммит `de7c5ad37`), а не в cosmetic surfaces вокруг него. Точная механика остаётся не до конца установленной — отложено до нового investigation scope по `BUG-2026-04-22-01`.
- Rollback commit: `8557b598b revert(launcher-mac): drop CefAppProtocol shell and restore plain NSApplication bootstrap`.

**Original 1.2.48 narrow fix (superseded, kept for history):**

**Symptom:**
- В standalone Project Manager (CEF launcher) Cmd+V в input поле не вставляет текст из буфера.
- SuperWhisper (синтетический Cmd+V через CGEvent) не попадает в input.
- Dock right-click → Quit не закрывает launcher при первом клике; повторные клики игнорируются. Cmd+Q из собственного app-menu ведёт себя так же.
- Cmd+C / Cmd+X / Cmd+A также не срабатывают в PM input.

**Regression origin:** Session084 / release 1.2.46 (CEF macOS Bootstrap Hardening, коммиты `de7c5ad37`, `b6b0cf3d1`).

**Root cause:**
- Перевод NSApp на `CodeAIHubApplication : NSApplication <CefAppProtocol>` убрал CEF-swizzle для `-[NSApplication sendEvent:]`. Наш `[super sendEvent:event]` прогоняет NSKeyDown через `[[NSApp mainMenu] performKeyEquivalent:]`. Edit menu с Cut/Copy/Paste/SelectAll и `target:nil` перехватывает Cmd+X/C/V/A по responder chain; CEF web view не отвечает на `paste:` / `cut:` / `copy:` / `selectAll:` Cocoa-selectors, поэтому key event "съедается" и не доходит до Chromium как NSKeyDown.
- Override `-[CodeAIHubApplication terminate:]` перенаправлял quit в `CodeAIHubAppDelegate.tryToTerminateApplication:` → `handler->CloseAllBrowsers(false)` (non-force). Если `TryCloseBrowser()` возвращал false (любой in-flight close check), quit молча зависал; второй клик проглатывался через `handler->IsClosing() == true` без `CefQuitMessageLoop()`.

**Fix (1.2.48):**
- Убран override `-[CodeAIHubApplication terminate:]` и метод `tryToTerminateApplication:`. Quit идёт стандартным AppKit маршрутом `terminate:` → `applicationShouldTerminate:`, delegate force-close-ит browsers через `CloseAllBrowsers(true)` и возвращает `NSTerminateCancel`; `LauncherHandler::OnBeforeClose` драйвит `CefQuitMessageLoop()` после последнего browser'а.
- Edit menu (Cut/Copy/Paste/SelectAll) удалён из `CreateApplicationMenu`. Chromium внутри CEF обрабатывает clipboard shortcuts на уровне render process. В application-menu остаётся только `Quit %@`.

**Commits:**
- `a97c5e9c5 fix(launcher-mac): route terminate through applicationShouldTerminate`
- `a6dd758b2 fix(launcher-mac): drop edit menu to unblock clipboard shortcuts`

**Release:** `1.2.48`.

**Guards:**
- SystemArchitecture §3 Invariant 33: permanent acceptance matrix для CEF releases — Cmd+V/C/X/A + SuperWhisper + Dock right-click Quit + Cmd+Q + window-close без crash + dock reopen.
- Launcher_CEF.md macOS Bootstrap Lifecycle Boundary: override `terminate:` запрещён; Edit menu items запрещены.

---
## BUG-2026-04-22-03 — Claude/Core/UI: first cold-open usage refresh does not materialize before repeated reopen

**Status:** FIXED

**Symptom:**
- После Core restart и открытия старого Claude dialog/workspace pre-turn usage limits не появляются на первом cold-open.
- Если перейти на другой шаг и вернуться, лимиты и `Resets ...` начинают отображаться.

**Confirmed evidence:**
- `dialog_opened` refresh request действительно отправляется из PM и принимается Core.
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts` делает `refreshUsageLimits()` как fire-and-forget async branch.
- `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-refresh.ts` считает refresh завершённым сразу после `await adapter.refreshUsageLimits(...)`, хотя для Claude usable payload прилетает позже через HTTP probe.
- После первого позднего успешного refresh provider-global cache уже warmed, поэтому повторное открытие шага мгновенно показывает replay.

**Root cause (confirmed):**
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts` делал `refreshUsageLimits()` как fire-and-forget: `dialog_opened` refresh завершался в Core раньше, чем HTTP probe фактически возвращал usable payload.
- PM `updateSnapshotsWithUsageLimits()` обновлял только direct source session. Если поздний provider-scoped payload приходил уже после того, как placeholder/bootstrap session id был заменён restored runtime session id, событие кэшировалось, но не применялось к открытому snapshot. Поэтому пользователь видел лимиты только после повторного открытия шага, когда происходил seed из provider cache.

**Fix (1.2.47):**
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts`: `refreshUsageLimits()` теперь truly awaitable и резолвится только после завершения `readStreamPayload(force: true)` и возможного broadcast.
- `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`: тот же awaitable contract применён и к Codex, чтобы Core lifecycle одинаково трактовал completion semantics всех account-scoped refresh adapter'ов.
- `src/client/project-manager/components/sessions/usage-limits-stream.ts`: provider-scoped late payload теперь fan-out'ится по provider family даже если исходный `payload.sessionId` уже отсутствует в локальных snapshots из-за restore-swap.

**Commits:**
- `884f7b1eb fix: harden pre-turn usage limits cold-open refresh`

**Guards:**
- `packages/Claude_Module/src/provider/claude-provider-adapter.test.ts`
- `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.test.ts`
- `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`

**Release:**
- `1.2.47`

## BUG-2026-04-22-02 — Codex/Core/UI: cold-open usage limits lose reset timestamps

**Status:** FIXED

**Symptom:**
- После Core restart и открытия старого Codex dialog/workspace `Session` / `Weekly` проценты уже отображаются, но `Resets ...` в скобках отсутствуют.

**Confirmed evidence:**
- `account/rateLimits/read` response в `~/.codeai-hub/logs/codex/sdk-codex-app-server-2026-04-22T07-07-38-146Z-9bf5b9b1-c9b7-4ec0-a50a-9aa8577d1b65.jsonl` содержит `resetsAt` как число.
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` normalizes `snapshot.primary.resetsAt` / `snapshot.secondary.resetsAt` через `asString(...)`, поэтому numeric payload отбрасывается как `null`.

**Root cause (confirmed):**
- Это не lifecycle issue, а payload normalization bug: Codex app-server возвращает `resetsAt` numeric-typed, а router принимал только string-typed value и срезал reset timestamps до `null`.

**Fix (1.2.47):**
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-usage-limits.ts`: новый helper нормализует numeric и digit-string `resetsAt` в ISO timestamp перед построением совместимого usage payload.
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`: usage-limits routing делегирован в новый helper; reset timestamps сохраняются на cold-open path, а сам router остаётся ниже 500-line architecture limit.

**Commits:**
- `884f7b1eb fix: harden pre-turn usage limits cold-open refresh`

**Guards:**
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`

**Release:**
- `1.2.47`

## BUG-2026-04-22-01 — Launcher/CEF/macOS: standalone Project Manager crashes on quit/close with plain `NSApplication`

**Status:** FIXED (CanClose short-circuit in 1.2.52 after 1.2.50/1.2.51 exception-pipeline mitigations failed; CEF/Chromium upgrade still tracked as deferred root-cause follow-up)

**User retest confirmation (2026-04-22):** пользователь протестировал `codeai-hub-1.2.52.vsix` — клик по красной NSWindow close кнопке закрывает launcher clean, без "quit unexpectedly" dialog, ведёт себя как Cmd+Q. Регрессий нет, релиз готов к публикации на GitHub.

**Current resolution (1.2.52 — CanClose short-circuit):**
- User retest 1.2.51 подтвердил что swizzle один не помог — crash dialog всё равно появлялся при клике на красную close кнопку. На macOS 26 exception apparently достигает `+[NSApplication _crashOnException:]` не только через `-reportException:`, либо Chromium 141 teardown шлёт её ещё раньше, мимо swizzle.
- Pivot: **не ловить** exception, а **не запускать** проблемный Chromium teardown callback вообще. Cmd+Q / Dock Quit работают чисто потому что идут через `-[NSApplication terminate:]` → `-[NSApplication stop:]`, и обходят тот самый buggy Chromium path.
- Изменение в `packages/cef-launcher/src/launcher_app.cc` `LauncherWindowDelegate::CanClose`: на macOS (`#if defined(__APPLE__)`) вместо `browser->GetHost()->TryCloseBrowser()` вызывается cross-platform helper `codeai::launcher::RequestNativeApplicationTermination()` + `return false`. Helper declared в `packages/cef-launcher/src/launcher_handler.h` (namespace `codeai::launcher`), implemented в `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` через `[NSApp terminate:nil]`. Красная close кнопка теперь идёт по тому же pathway что Cmd+Q / Dock Quit — `terminate:` → `stop:` → orderly AppKit unwind → `main()` returns → `CefShutdown()`. Buggy Chromium teardown callback не запускается, exception физически не кидается, `_crashOnException:` не вызывается, crash dialog не появляется.
- Commit: `9fbd2dfaf fix(launcher-mac): short-circuit CanClose to [NSApp terminate:] bypassing buggy Chromium teardown`.
- Windows/Linux branch (`#else`) оставлен без изменений — existing `TryCloseBrowser` flow.
- 1.2.51 `-[NSApplication reportException:]` swizzle в `app_main_mac.mm` **оставлен** как belts-and-suspenders safety net. Overhead нулевой, matching pattern узкий. Будет удалён вместе с CEF upgrade.
- Proper root-cause fix (CEF/Chromium upgrade до версии с macOS 26 semantics) всё ещё deferred как отдельный scope, но urgency снижена: primary fix 1.2.52 устраняет observable crash независимо от upgrade.

**Superseded attempts (kept for history):**

**1.2.51 — reportException: swizzle (failed in user retest):**
- User retest 1.2.49 уточнил trigger: crash детерминирован только на красной NSWindow close кнопке (path `LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()` → Chromium async browser-teardown). **Не** воспроизводится на Cmd+Q / Dock Quit (path `-[NSApplication stop:]` обходит buggy Chromium teardown callback).
- Root cause — Chromium 141 (`141.0.10+chromium-141.0.7390.123` shipped inside our CEF binary) отправляет AppKit-private selector, который больше не существует или изменил signature на macOS 26.3.1. Exception arguments: `["NSApplication", "%s", "0x13800190d80"]` — literal `"%s"` format specifier означает `objc_msgSend` called с NULL/corrupted `SEL`. Чистая Chromium ↔ macOS 26 incompat.
- **1.2.50 mitigation (failed, rolled back в 1.2.51):** `NSSetUncaughtExceptionHandler()` в `main()` до `CefExecuteProcess`. User retest 1.2.50 подтвердил что handler не сработал. Две причины: (1) AppKit на `-[NSApplication finishLaunching]` переустанавливает свой `NSApplicationUncaughtExceptionHandler` поверх нашего (мы ставили до `finishLaunching` — AppKit перезаписал); (2) `+[NSApplication _crashOnException:]` — private Apple path, который обходит стандартную uncaught-handler chain на macOS 26 regardless что зарегистрировано через `NSSetUncaughtExceptionHandler`. Standard ObjC uncaught chain — не тот уровень.
- **1.2.51 mitigation (active):** Objective-C method swizzle на `-[NSApplication reportException:]` через category `NSApplication (CodeAIHubReportExceptionSuppression)` в `app_main_mac.mm`. `+load`-method делает `method_exchangeImplementations(reportException:, codeai_reportException:)`. Objective-C runtime вызывает `+load` во время dyld image load — до `main()` и до любой AppKit/CEF init. AppKit не может undo swap. После exchange вызов AppKit'ом `-reportException:` dispatch'ится в наш `codeai_reportException:`. Matching filter тот же: `NSInvalidArgumentException` + reason содержит `unrecognized selector sent to instance` + reason содержит `NSApplication` → log в stderr `CodeAIHubLauncher: suppressed NSApplication unrecognized selector via reportException: swizzle: ...` + return. Non-matching → forward в original IMP через `[self codeai_reportException:exception]` (swizzle trampoline). Exception не доходит до `+[NSApplication _crashOnException:]`, Chromium teardown продолжается (`OnBeforeClose` → `CefQuitMessageLoop()` → `main()` returns → `CefShutdown()`), процесс exits cleanly.
- Dead 1.2.50 `NSSetUncaughtExceptionHandler` код удалён в том же commit'е.
- Commit: `77149ac34 fix(launcher-mac): swizzle -[NSApplication reportException:] to suppress CEF/macOS 26 crash`.

**Proper fix (deferred):**
- Upgrade CEF binary до версии с Chromium 142+ или 143+, которая понимает macOS 26 selector semantics. Большой scope — download/rebuild CEF framework, проверка API совместимости, риск других регрессий. Требует отдельного execution cycle.
- Пока proper fix не выпущен, 1.2.51 swizzle остаётся в силе. Если Apple patch сменит internal path и exception уйдёт мимо `reportException:` — swizzle перестанет покрывать и нужен будет CEF upgrade или другой attack vector (например, короткозамыкание `LauncherWindowDelegate::CanClose` чтобы вообще не идти через Chromium async teardown).

**Rollback context (1.2.46 → 1.2.48 → 1.2.49):**
- Изначальный fix из 1.2.46 (custom `CodeAIHubApplication : NSApplication <CefAppProtocol>` + `CodeAIHubAppDelegate`) сломал clipboard shortcuts в standalone Project Manager: Cmd+V, Cmd+C/X/A и SuperWhisper не доходили до Chromium как NSKeyDown. Narrow fix 1.2.48 (удаление Edit menu, стандартный `terminate:` path) не попал в реальный root cause.
- Полный rollback CEF bootstrap refactor (коммиты `de7c5ad37`, `b6b0cf3d1`, `a97c5e9c5`, `a6dd758b2`) выпущен в 1.2.49. Launcher снова использует plain `[NSApplication sharedApplication]` bootstrap из 1.2.45 baseline. Paste / SuperWhisper восстановлены. Crash вернулся как known issue — и теперь mitigated в 1.2.50.
- Guardrail: любая новая попытка shutdown hardening обязана до merge пройти полный acceptance matrix clipboard + quit + red close button + reopen (см. SystemArchitecture Invariant 32) и не может опираться на CefAppProtocol subclass без подтверждения, что Cmd+V продолжает работать в Chromium.
- Историческая карточка 1.2.46 fix-описания ниже сохранена для контекста.

**Historical details (1.2.46 fix, rolled back):**



**Symptom:**
- После закрытия standalone Project Manager на macOS периодически появляется system crash dialog `CodeAI Hub Project Manager quit unexpectedly`.
- Падает именно `CodeAIHubLauncher`, а не Core и не PM UI bundle.

**Confirmed evidence:**
- Crash report: `/Users/oleksandroliinyk/Library/Logs/DiagnosticReports/CodeAIHubLauncher-2026-04-22-091633.ips`
- Exception: `NSInvalidArgumentException`
- Reason: `-[NSApplication %s]: unrecognized selector sent to instance ...`
- Main thread stack проходит через `AppKit -> Chromium Embedded Framework -> CodeAIHubLauncher main`.

**Root cause (confirmed):**
- Текущий `packages/cef-launcher/src/platform/mac/app_main_mac.mm` поднимает обычный `NSApplication`, вручную создаёт минимальное меню и сразу уходит в `CefRunMessageLoop()`.
- Официальный CEF mac sample использует custom `NSApplication <CefAppProtocol>`, `sendEvent:` с `CefScopedSendingEvent`, override `terminate:` и delegate-driven shutdown/reopen hooks.
- Наш bootstrap отстаёт от требуемого CEF/macOS lifecycle contract; на quit path Chromium/CEF получает `NSApplication`, у которого отсутствует ожидаемый selector/behavior seam.

**Fix (implemented):**
- Добавлены `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h` и `.mm` с `CodeAIHubApplication : NSApplication <CefAppProtocol>` и `CodeAIHubAppDelegate`.
- `CodeAIHubApplication` теперь оборачивает `sendEvent:` в `CefScopedSendingEvent` и override-ит `terminate:` так, чтобы quit path шёл через delegate вместо direct Cocoa terminate.
- `app_main_mac.mm` больше не держит inline menu/bootstrap logic: он создаёт `CodeAIHubApplication` до `CefExecuteProcess`, после `CefInitialize` привязывает `CodeAIHubAppDelegate`, а shutdown возвращается к canonical chain `CloseAllBrowsers(false)` -> `CefQuitMessageLoop()` -> `CefShutdown()`.
- `LauncherHandler::ShowMainWindow()` reused для dock reopen path, secure restorable state вынесен на delegate-level seam.

**Commits:**
- `de7c5ad37 feat: add CEF-compatible mac application shell`
- `b6b0cf3d1 fix: align mac launcher bootstrap with CEF sample`
- `402ed621d docs: sync CEF mac bootstrap contract`

**Release:**
- `1.2.46`

**Guards delivered:**
- `./scripts/build-cef-launcher.sh --force --launcher-version 1.2.45`

**Planning source:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_BootstrapHardening_Architecture.md`

## BUG-2026-04-21-06 — Пустой / фейково-нулевой usage_limits виджет у Claude и Codex до первого turn'а

**Status:** RESOLVED (release `1.2.44`, hotfix к `1.2.43`)

**Symptom (user-visible):**
- Релизы `1.2.41`–`1.2.43`. После Core restart пользователь открывает PM, проходит по reopened dialog'ам у Claude / Codex — виджет usage_limits либо пустой, либо показывает `Session 0% / Weekly 0%` вместо актуальных цифр типа `Session 23% (Resets Apr 21 at 11pm) / Weekly 43% (Resets Apr 23 at 11pm)`. Gemini работает.
- После первого успешного turn'а в любом dialog'е того же провайдера виджет наполняется корректно и во всех остальных dialog'ах тоже. Проблема ровно в cold-cache окне между Core open и первым turn'ом.

**Root cause:**
- Кэш usage_limits уже account-scoped (`providerScopeKey = {providerId}:global`) — один успешный probe наполняет payload для всех sessions провайдера.
- НО `SessionRequestHandler.handleRefreshUsageLimits` дёргал `adapter.refreshUsageLimits` **на каждом `binding_ready` trigger**, и их прилетает по одному на каждый reopened dialog после Core restart. Первый refresh гонится против paper-binding hydration (`1.2.39` materializer оставляет resume ленивым) → `ClaudeLiveHeadersReader` probe или `CodexAppServerFacade.refreshUsageLimits` RPC возвращают null payload → broadcast не происходит, cache остаётся пустым. Субсеквентные refresh'и повторяют ту же гонку и дают либо null, либо fake 0% payload.
- Post-rebind refresh из `1.2.43` покрывает только stale-binding retry — если пользователь НЕ отправил сообщение, session не hydrated, refresh никогда не случается в успешном контексте.

**Fix (1.2.44):**
- `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-warmup.ts`: новый `UsageLimitsWarmupTracker: Set<providerId>` + diagnostic log helpers. `shouldSkipDispatch` на `binding_ready` triggers возвращает true если провайдер уже warmed; остальные triggers (`turn_completed`, `reconnect`, `manual`, `provider_session_rebound`, `dialog_opened`, `session_opened`) проходят.
- `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-refresh.ts`: вынесенный из handler'а helper `handleRefreshUsageLimitsFlow` — replay cached payload if available, dedup `binding_ready`, dispatch один раз per provider per Core process, broadcast normalized events.
- `SessionRequestHandler.handleRefreshUsageLimits` теперь тонкий delegate в `handleRefreshUsageLimitsFlow`.

**Commits:**
- `d9e7114a4 feat: limit usage-limits refresh to one warmup probe per provider`

**Guards:**
- Test `session-request-handler.usage-limits.test.ts` (новый случай): cold-cache failed warmup — второй `binding_ready` для другого session того же провайдера НЕ должен dispatch повторно; `turn_completed` после warmup-марки всё равно проходит через dispatch.
- SSOT: `SystemArchitecture.md` §3 Invariant 1 расширен single-probe warmup policy.

**Release:** `1.2.44`

## BUG-2026-04-21-05 — Codex "Provider codexCli unavailable" после закрытия первой сессии + пустой usage_limits виджет у Claude и Codex

**Status:** RESOLVED (release `1.2.43`, hotfix к `1.2.42`)

**Symptom (user-visible):**
- Релиз `1.2.42`. Codex работал сразу после Core boot, но после штатного `closeSession` (при `sessions.size === 0` app-server child process останавливается) provider-recovery scheduler каждую минуту пытается перезапустить app-server и получает `spawn codex ENOENT`. PM на send показывает `System: Provider codexCli unavailable`.
- На том же релизе usage_limits виджет в PM остаётся пустым для Claude и Codex после Core restart, хотя `core.log` показывает `Usage limits refresh request received` + `Usage limits refresh dispatched to adapter` на `lifecycleTrigger: "binding_ready"`. Gemini работает нормально.

**Root cause (двойной):**
1. `CodexAppServerProcess.startInternal` делает `spawn("codex", ...)` с inherited `process.env`. У VS Code extension host на macOS GUI-application PATH не содержит `~/.npm-global/bin` (где пользователь установил codex), даже если shell PATH его содержит. Первый spawn на старте Core мог работать case-by-case; после graceful process.stop новые spawn попытки падают ENOENT. write EPIPE всплывает дальше при попытке отправить init handshake в мёртвый stdin.
2. PM emit'ит usage_limits refresh `binding_ready` ровно один раз на логическую session. После `1.2.39` materializer paper-binding с `providerSessionStatus: "ready"` попадает в dispatch до того, как `adapter.resumeSession` отработал handshake. Для Claude `ClaudeLiveHeadersReader` HTTP probe может гонять с hydration; для Codex app-server может ещё не быть handshake'ан. Первый refresh возвращает null или broadcast'ит в невидимый канал — и больше не триггерится, потому что binding flag остаётся `ready` после stale-binding retry из `1.2.42`. Gemini не страдает потому что `startManagedSession` делает proactive refresh внутри.

**Fix (1.2.43):**
- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`: curated `CODEX_PATH_CANDIDATES` (`~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` на POSIX; `%APPDATA%\npm` на Windows) + `buildAugmentedPath()` — inherited PATH остаётся primary lookup, candidates только приписываются если отсутствуют. Передаётся в `env.PATH` spawn'у вместе с `CODEX_HOME`.
- `packages/core/src/remote-bridge/handlers/session-request-handler-post-rebind-usage-limits.ts`: новый helper `triggerPostRebindUsageLimitsRefresh({adapter, broadcaster, logger, providerId, providerSessionId, session, sessionId})` — best-effort вызов `adapter.refreshUsageLimits` через тот же `normalizeUsageLimitsStreamEvent` путь, что и regular refresh. Adapter без `refreshUsageLimits` — no-op; synchronous exception — warn-лог.
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`: после успешного `providerSend.dispatch` в `retryAfterStaleBinding` вызывается `triggerPostRebindUsageLimitsRefresh(...)` для свеже-hydrated binding.

**Commits:**
- `d26868644 fix: resolve codex binary via augmented PATH in app-server spawn`
- `d70c31761 feat: trigger usage limits refresh after stale-binding rebind`
- `ef9d6897e test: cover post-rebind usage limits refresh trigger`

**Guards:**
- Test `session-request-handler-post-rebind-usage-limits.test.ts`: 4 контрактных случая (adapter без refreshUsageLimits, exact single invocation, фильтрация не-usage событий через normalizer, swallow synchronous errors с warn-логом).
- SSOT: `SystemArchitecture.md` §3 Invariant 1 расширен post-rebind usage_limits refresh requirement + Codex PATH augmentation note.

**Release:** `1.2.43`

---

## BUG-2026-04-21-04 — Первый user message в reopened Claude dialog тихо пропадает после Core restart

**Status:** RESOLVED (release `1.2.42`)

**Symptom (user-visible):**
- Workspace `CodeAI-Hub claude`, stage `diagram_modules`, release `1.2.41`, 2026-04-21 14:27 CEST.
- Пользователь открывает PM, переходит в reopened dialog на `diagram_modules`, пишет сообщение, жмёт Send.
- Input panel **не блокируется** "Agents is working…" (1.2.39 fix работает на bootstrap, но не в send path).
- В UI нет ни turn running indicator, ни error toast.
- Сообщение не появляется в сессионном JSONL, Claude не отвечает.
- Повторный Send воспроизводит ту же картину. Session JSONL не меняется.
- `Stop` кнопка пропала (input уже unlocked), workaround через invalidate+rebind через UI недоступен.

**Root cause split:**
1. 1.2.39 `materializeContinuityEntries` при cold-start создаёт paper-binding с `providerSessionStatus: "ready"` без вызова `adapter.resumeSession` — это сознательная оптимизация, чтобы не платить за resume всех reopened dialog'ов при старте Core.
2. `SessionRequestHandlerMessageDispatch.dispatchUserMessage` видит `ready` и идёт напрямую в `adapter.sendMessage(providerSessionId)`, минуя resume-шаг.
3. Для Claude: `ClaudeSDKManager.sendMessage` ищет `sessionId` в своей in-memory `sessions` Map, не находит (Map пуст после рестарта процесса Core), бросает generic `Error("Session <id> not found")`. Generic error classifier помечает как `session_binding_recoverable / retryable: true`, но для этого класса ошибок ни один retry path в dispatch не подписан — сообщение молча поглощается.
4. Для Codex: app-server child process умирает вместе с Core (1.2.41 lifecycle), новый app-server не знает старые thread id. Core facade `ensureSessionState` лениво создаёт entry в своём Map без вызова `thread/resume` на app-server, `turn/start` уходит на app-server с unknown threadId → JSON-RPC error с generic message, тот же silent drop.
5. Для Gemini: был закрыт в релизе 1.2.8 через `GeminiSessionStaleBindingError` + one-shot `invalidate + ensureSessionReadyForSend + resend` retry. Claude и Codex этот detector не имели.

**Fix (1.2.42):**
- `packages/Claude_Module/src/provider/claude-session-stale-binding-error.ts`: новый `ClaudeSessionStaleBindingError` с `code: "CLAUDE_SESSION_STALE_BINDING"` и `providerSessionId`.
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`: `sendMessage` бросает `ClaudeSessionStaleBindingError` вместо generic `Error("Session X not found")`.
- `packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.ts`: новый `CodexSessionStaleBindingError` (same shape).
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`: добавлен `handshakedThreadIds` Set, заполняется в `createSession` / `resumeSession`, вычищается в `closeSession`. `sendMessage` проверяет membership до `turn/start` и бросает `CodexSessionStaleBindingError`, если handshake'а с app-server не было.
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`: existing detector обобщён на `ReadonlySet<string>` кодов (GEMINI_/CLAUDE_/CODEX_). Retry-ветка — та же one-shot recovery, что работала для Gemini с 1.2.8.

**Commits:**
- `783deba31 feat: auto-recover claude session binding on stale-send failure`
- `e4e117e6e test: pin claude stale-binding error contract`
- `c65e5172f feat: auto-recover codex session binding on stale-send failure`
- `e588dda80 test: pin codex stale-binding error contract`

**Guards:**
- Test `packages/Claude_Module/src/provider/claude-session-stale-binding-error.test.ts`: error contract (code, providerSessionId, message, name, Error prototype).
- Test `packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.test.ts`: симметричный contract.
- SSOT: `SystemArchitecture.md` §3 Invariant 1 расширен — `ready` paper-binding НЕ означает "provider-модуль hydrated", adapter обязан throw'ить typed stale-binding error, generic `Error` недопустим.

**Release:** `1.2.42`

---

## BUG-2026-04-21-03 — Diagram Modules Artifacts panel: auto-fit сваливается в floor при включённом `width: max-content`

**Status:** RESOLVED (release `1.2.41`, hotfix к `1.2.40`)

**Symptom (user-visible):**
- После установки `1.2.40` на workspace с двумя кластерами внутри Product Part диаграмма на Artifacts panel уходит вправо даже при `Cmd+Ctrl+0` (100% user-zoom, auto-fit применён) и при `Cmd+scroll → 25%` user-zoom.
- Первый cluster (`Workflow And Artifact Ui`) растягивается на всю "longest unwrappable" ширину своего purpose-текста; второй cluster не виден целиком даже на 25%.
- Sidebar Development Tree в 1.2.40 рендерится корректно — этот hotfix касается только Artifacts panel auto-fit.

**Root cause:**
- В `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` релиз `1.2.40` ввёл `width: "max-content"` + `minWidth: "100%"` на inner composition div, считая это необходимым для `scrollWidth` measurement.
- Реально `width: max-content` разрешает любому child-элементу тянуть свой longest-line size: русская проза в `purposePanelStyle`, title в auto-колонке `productPartHeaderStyle: "auto minmax(240px, 1fr)"`, и все `1fr` column tracks в `repeat(${columns}, 1fr)` расползаются в unwrappable single lines.
- Natural width становится тысячами пикселей, `min(1, container.clientWidth / naturalWidth)` попадает в floor `0.25` сразу, но при userZoom ≥ 0.25 composition всё ещё шире viewport.
- `scrollWidth` на обычно-сайзнутом grid (`width: auto` = 100%) и без того возвращает overflow-inclusive natural width: когда ProductPart min-content exceeds grid track width, grid cells overflow, и scrollWidth = max(clientWidth, rightmost-child.right). Intrinsic-sizing keyword был лишним и вреден.

**Fix (1.2.41):**
- Убраны `width: "max-content"` и `minWidth: "100%"` из inner div `DiagramEditorFacade`. Auto-fit продолжает работать на естественном grid sizing.
- Source-level regression assertion в `diagram-editor-facade.test.tsx` инвертирован на `max-content === false`, чтобы keyword не вернулся.

**Commits:**
- `6f4f18e0d docs: open auto-fit natural-width hotfix scope`
- `745d05b16 fix: restore natural grid sizing for diagram auto-fit composition`

**Guards:**
- Regression assertion: source facade не должен содержать `max-content`.
- SSOT: `SystemArchitecture.md` §6.4 запись про "без intrinsic-sizing keyword'ов на composition-container'е".

**Release:** `1.2.41`

---

## BUG-2026-04-21-02 — Development Tree sidebar показывает фантомные standalone modules на `diagram_modules` артефактах

**Status:** RESOLVED (release `1.2.40`)

**Symptom (user-visible):**
- На workspace с корректным `product-parts/<part-id>.md` (2 кластера с модулями + 1 настоящий standalone `cef-launcher`) Development Tree в левом sidebar Project Manager показывал до 5 "standalone" модулей под `project-manager` product part вместо одного.
- Canvas на правой Artifacts panel рендерил композицию корректно.
- Любая манипуляция в sidebar (expand/collapse кластера) детерминированно перещёлкивала структуру между правильным и искажённым отображением — пользователь наблюдал нестабильный рендер.

**Root cause split на два независимых дефекта в `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`:**
1. `NEXT_SECTION_RE` (module-level `/g`-regex) потреблялся через прямой `NEXT_SECTION_RE.exec(body.slice(1))` в `clampSectionBody`. Global regex singleton сохраняет `lastIndex` между вызовами внутри long-lived Core процесса; повторные `exec()`-вызовы на одном и том же body чередовали hit/null/hit/null. Когда exec возвращал null, `clampSectionBody` отдавал body целиком без клампа.
2. `MODULE_ROW_RE` был nonstrict: non-greedy `(.+?)\s*\|\s*$` съедал 2-ю, 3-ю и 4-ю колонки в одной группе, поэтому 4-колоночные Simple Relations rows (`| \`from-id\` | \`to-id\` | type | label |`) матчились и `from-id` попадал как standalone module id. Когда clamp слетал из-за (1), Simple Relations уходил в standalone-скан.

Precedent-фикс `BUG-2026-03-<...>` (релиз 1.2.37) ограничил standalone body следующим `##`-заголовком, но реализовал это через `NEXT_SECTION_RE.exec(...)` — отсюда регрессия нестабильности.

**Fix (1.2.40):**
- Все `/g`-regex теперь потребляются через `.matchAll()` (iterator не использует shared lastIndex) или factory-функции, возвращающие свежий regex-инстанс на каждый вызов.
- `clampSectionBody` переведён на `str.search(NEXT_SECTION_SEARCH_RE)` с non-global regex — `.search` lastIndex не использует.
- `MODULE_ROW_RE` ужесточён до строго 2-column: `[^|\n]+` во второй колонке + якорь `\|[ \t]*$`, так что 4-колоночные Simple Relations rows физически не матчатся даже если clamp когда-либо опять соскользнёт.

**Commits:**
- `c1ede86b0 fix: stabilize development tree parser against regex lastIndex drift`
- `3661b315d test: cover development tree parser idempotency and relations leak guard`
- `63fdac691 docs: record development tree parser lastIndex safety invariant`

**Guards:**
- Test `development-tree-snapshot.test.ts`: 10-run идемпотентность на одном артефакте (lastIndex drift guard), artifact с cluster-module в `From` Simple Relations row не выдаёт фантомных standalone.
- SSOT: `SystemArchitecture.md` §6.4 расширен invariant'ом про regex lastIndex safety и strict 2-column `MODULE_ROW_RE`.

**Release:** `1.2.40`

---

## BUG-2026-04-21-01 — reopened workflow dialog залипает в "Agents is working" после cold-start Core

**Status:** RESOLVED (release `1.2.39`)

**Symptom (user-visible):**
- Workspace имеет несколько workflow sessions на разных stage (`description`, `virtual_simulation`, `diagram_modules`) с закрытыми turn'ами в continuity.
- После cold-start Core / рестарта PM одна из sessions (`description` / `lastActive`) работает нормально, остальные открываются с input заблокированным на `Agents is working, please wait...`.
- Нажатие Stop на заблокированных sessions ни к чему не приводит — UI продолжает быть locked.

**Observed artifacts (forensics, Session 076, 2026-04-21):**
- Workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`. `continuity/index.json` содержит 3+ entries для `description` / `virtual_simulation` / `diagram_modules`. Chain.json каждой — `tokenUsage.updatedAt` проставлен (turn завершён чисто).
- `workflow/state.json`: `lastActive.stage = "description"`.
- Core log (`~/.codeai-hub/logs/core/core.log`) на bootstrap: `pm.dialog.bootstrap.resolved` для description → `hasRuntimeSession: true`, `resolvedRuntimeSessionId` — свежий uuid (runtime session воссоздан auto-select path'ом через `workspace-activate-service`), `Usage limits refresh dispatched to adapter` с `runtimeTurnState: "idle"`.
- Для `virtual_simulation` / `diagram_modules`: `hasRuntimeSession: false`, `restoreRequested: false`. Snapshot не содержит entry для их sessionId.

**Root cause:**
Three-link chain:
1. Core на cold-start материализует runtime session-объект только для `lastActive` stage через `workspace-activate-service.ts`. Для остальных continuity entries runtime session не создаётся.
2. PM `use-project-manager-dialog-core-events.ts` через `shouldSuppressIdleDialogRestoreRefresh` (релиз 1.2.18, Invariant 31) подавляет `createSession` restore-запрос, когда latest workspace snapshot уже пришёл и не содержит runtime session для dialog'а — ошибочно трактует "нет runtime session" как "idle bootstrap ready".
3. Session UI `createInitialSnapshot` в `src/client/ui/src/session/helpers.ts:195-202` для любой workflow session стартует с `connectionState: "running"`. Без обновления из `workspace:snapshot` (которое никогда не придёт для этой sessionId) initial "running" остаётся навечно.

Симметричный симптом для Stop: `SessionRequestHandlerStopAction.handleStop()` начинается с `sessionManager.getSession(sessionId)`; при undefined возвращает `"Session not found"` без эмиссии `turn_state: "idle"`. UI продолжает быть locked.

Это продолжение класса багов, закрытых в релизах `1.1.646` (cold-start idle guard) и ранее. Предыдущие фиксы работали, когда snapshot содержал runtime session; этот случай — когда runtime session вообще отсутствует в snapshot.

**Fix direction:** Core-side runtime session materialization — восстановить симметрию `workspace:snapshot` и continuity index. PM-side изменений нет.

**Fix:**
- `SessionManager.registerSessionWithId` — externally-supplied sessionId, `providerSessionStatus: "ready"`, без adapter call.
- `SessionProviderBindingService.registerRestoredBinding` — paper-binding в `providerSessions` Map без adapter subscription.
- `materializeContinuityEntries` (new helper) — для каждой `ContinuityIndexEntry` с полной связкой (`latestSessionId + providerId + providerSessionId`) создаёт stub через обе функции + `WorkspaceRuntimeFacade.notifySessionCreated` с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`.
- `RemoteBridgeDialogCommandRouter.handleDialogList` — вызывает materializer после `dialogListService.listDialogs()` перед отправкой `dialog:list:result`.
- Idempotent: повторные `dialog:list` не пересоздают session.
- Provider `thread/resume` остаётся ленивым, происходит на первом user message через existing `resolveProviderSessionId` path.

**Commits:**
- `6dafa1523 feat: add externally-id-preserving session registration to session manager`
- `1c917a5eb feat: register restored provider binding without adapter turn`
- `58ac6bb33 feat: materialize runtime sessions on dialog list`
- `7787c4a4c test: cover continuity materializer happy path and idempotency`
- `bda2f58cc test: cover stop path preconditions for materialized continuity session`
- `896f0075e docs: record runtime session materialization invariant`

**Guards:**
- Test `session-continuity-materializer.test.ts`: materializer happy path (stub registration + workspace runtime hydration), idempotency при повторных `dialog:list`, skip для incomplete entries, stop preconditions (`sessionManager.getSession` + `providerSessions.get` non-null после materialize).
- SSOT: `SessionInputLock_SSOT_StateMachine.md` §3.3, `SessionUI_Behavior.md` §4.4, `CoreOrchestrator.md` §3 (runtime session materialization bullet), `SystemArchitecture.md` §3 Invariant 1 (расширенный snapshot-first lock contract).

**Release:** `1.2.39`

---

## BUG-2026-04-19-03 — UI/Markdown: ordinary assistant nested lists inflate vertical spacing

**Status:** OPEN

**Symptom:**
- В обычных assistant replies nested markdown list может визуально разъезжаться на пустые блоки между подпунктами и перед возвратом к следующему пункту верхнего уровня.
- Пользовательский кейс: блок про `проектные артефакты` и `артефакты всего приложения` в обычном ответе агента содержит большие пустые интервалы, хотя source message компактный.

**Confirmed evidence:**
- Screenshot from user test session: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-19 at 18.01.30.png`
- Unified session JSONL:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-faafc9fd-6a00-4624-a337-7e6c7e06045c-description.jsonl`
  - message `msg_06f9a081edb5b1720169e4fc271df48191a7ce3c0e8008b39f` stores a compact nested list:
    - `- два слоя артефактов ...`
    - `  - проектные артефакты;`
    - `  - артефакты всего приложения.`
- Значит, inflated spacing появляется уже после persistence, на markdown/render layer.

**Root cause hypothesis (confirmed at integration level):**
- Ordinary assistant source markdown уже корректен, поэтому upstream content normalization здесь не нужна.
- Session dialog markdown renderer/CSS сейчас слишком агрессивно сохраняет structural whitespace внутри `li`, из-за чего indentation/newline nodes nested list layout превращаются в видимые пустые интервалы.
- Следовательно, фикс должен жить в UI markdown render/CSS contract, а не в provider/core message rewriting.

**Accepted fix direction (2026-04-19):**
- Чинить nested list spacing в session markdown renderer/CSS.
- Collapse structural whitespace внутри nested `ul/ol/li`, не меняя raw stored message content.
- После реализации баг остаётся `OPEN` до пользовательской проверки нового релиза; только затем запись переводится в `FIXED` и дополняется release/commit/guard данными.

**Fix implemented (awaiting user verification):**
- `session-view.css` больше не применяет `white-space: pre-wrap` к самому `li`; `pre-wrap` оставлен только на `p`, а nested list blocks внутри `li` получили небольшой controlled top margin.
- Это collapse-ит structural whitespace markdown-дерева на render layer, не переписывая raw assistant message content.

**Commits delivered (pending release verification):**
- `f8f3feff1 fix(ui): collapse nested markdown list spacing`

**Guards delivered (pending release verification):**
- `npm run build:webview`

## BUG-2026-04-19-02 — Core/UI/Translation: session message section titles lose paragraph boundaries

**Status:** OPEN

**Symptom:**
- В session messages markdown-like section titles вида `**Clarifying ...**` местами прилипают к предыдущему предложению, вместо начала нового абзаца.
- Пользовательский эффект хорошо виден на длинных Codex reasoning blocks, но по уточнению пользователя тот же дефект воспроизводится и в обычных assistant replies.
- Типовой observed fragment: `... storage for local project data.**Clarifying Project Manager term**`

**Confirmed evidence:**
- Screenshot from user test session: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-19 at 17.53.31.png`
- Unified session JSONL:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-faafc9fd-6a00-4624-a337-7e6c7e06045c-description.jsonl`
  - message `rs_06f9a081edb5b1720169e4fa45100081918ce074aada82c1e2::live::f707618a-97e0-4c69-b818-3c71e4ce7d40` persisted exactly as `...data.**Clarifying Project Manager term**`
  - message `rs_06f9a081edb5b1720169e4fa45100081918ce074aada82c1e2::live::dc3f3794-c7f1-4932-a07d-26df41fe87b1` persisted as `...client.**Planning propagation scenarios**`
- App-server transport log:
  - `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-app-server-2026-04-19T15-40-59-874Z-d670bf64-519e-4a69-9189-d809db0e5e5f.jsonl`
  - new summary parts arrive as separate blocks, for example `**Clarifying Project Manager term**\n\nI` and `**Planning propagation scenarios**\n\nI'm`

**Root cause hypothesis (confirmed at integration level):**
- Observed Codex app-server reasoning arrives in multiple summary parts, but current runtime/display path can lose paragraph boundary between adjacent blocks when the next part starts with a standalone bold section title.
- Shared Core/UI path does not have a generic formatting guard that repairs these block boundaries before persisting/broadcasting assistant/thinking content or projecting translated overlays.
- Значит, даже если provider transport already sends structured blocks, user-facing session bubble всё равно может получить glued markdown.

**Accepted fix direction (2026-04-19):**
- Добавить shared text-format normalizer, который восстанавливает paragraph boundary вокруг standalone bold section titles в обычных текстовых сегментах.
- Применить его не только к translation outputs, но и к Core-side assistant/thinking display content, чтобы guard работал для всех providers, а не только для текущего Codex case.
- Protected code spans не должны затрагиваться.
- После реализации баг остаётся `OPEN` до пользовательской проверки нового релиза; только затем запись переводится в `FIXED` и дополняется release/commit/guard данными.

**Fix implemented (awaiting user verification):**
- Shared text-format normalizer теперь восстанавливает paragraph boundary вокруг section-like standalone bold titles.
- Core path применяет его к translated overlays, live thinking и обычным assistant messages до persist/broadcast, поэтому одинаковый guard действует и на reasoning bubbles, и на обычные ответы агента.

**Commits delivered (pending release verification):**
- `a507b396c fix: normalize thinking display formatting`
- `ac1e9d1db fix: broaden session message formatting normalization`
- `2b0adf0e0 test: cover thinking display formatting`

**Guards delivered (pending release verification):**
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts packages/core/src/session-translation/session-message-localization-projector.test.ts`
- `npm run build --workspace @codeai-hub/core`

## BUG-2026-04-19-01 — Translation/Core/UI: translated overlays lose spacing on latin/cyrillic boundaries

**Status:** OPEN

**Symptom:**
- После перевода reasoning/help/live overlays в `ru` часть mixed-script фрагментов приходит без пробелов между английскими терминами и русскими словами.
- Типовые пользовательские примеры: `parallelдля`, `вродеpwd`, `lsилиsed`.
- Дефект носит shared характер: источник перевода может отличаться, но итоговый текст проходит через общий translation/runtime path и отображается в UI одинаково.

**Observed scope:**
- Пользователь подтвердил дефект на reasoning overlays в релизе `1.2.23`.
- По архитектуре риск затрагивает все provider translation overlays, потому что post-translation normalization сейчас централизованно не вставляет пробелы на границе `latin <-> cyrillic`.

**Root cause hypothesis (confirmed at integration level):**
- Shared translation path возвращает `translatedText` почти как отдал движок перевода, без дополнительного пост-процессинга mixed-script границ.
- Когда переводчик склеивает английский token и соседнее русское слово, текущий pipeline не нормализует такие последовательности перед записью в session/UI surfaces.
- Наивный regex по всей строке опасен, потому что может испортить inline code, fenced code blocks, markdown-sensitive spans, URL/path-like фрагменты и идентификаторы.

**Accepted fix direction (2026-04-19):**
- Чинить дефект централизованно в `packages/translation`, а не в отдельных provider modules и не в UI.
- Добавить shared post-processor для обычных текстовых сегментов, который вставляет пробелы на обеих границах:
  - `latin -> cyrillic`
  - `cyrillic -> latin`
- Protected spans (`inline code`, fenced code blocks и другие code-sensitive сегменты) не должны модифицироваться этим нормализатором.
- После реализации баг остаётся `OPEN` до пользовательской проверки нового релиза; только затем запись переводится в `FIXED` и дополняется release/commit/guard данными.

**Fix implemented (awaiting user verification):**
- В `packages/translation` добавлен shared helper `translation-text-format-normalizer`, который сегментирует текст на `protected` и `normal` spans и вставляет пробелы на границах `latin <-> cyrillic` только в обычных текстовых сегментах.
- `TranslationFacade` теперь прогоняет через этот normalizer все translated outputs до возврата результата в Core/UI path.

**Commits delivered (pending release verification):**
- `9b8bdd9af fix: normalize translation text formatting`
- `1e360a8d6 test: cover translation text formatting`

**Guards delivered (pending release verification):**
- `node --test --import tsx packages/translation/src/translation-facade.test.ts`
- `npm run build --workspace @codeai-hub/translation`

## BUG-2026-04-18-06 — PM/Core: multi-workspace background churn repeatedly refreshes idle sessions and degrades responsiveness

**Status:** OPEN

**Symptom:**
- При нескольких одновременно открытых workspace/dialog session Project Manager и Core создают достаточно тяжёлый background churn, чтобы начать заметно тормозить macOS/Finder.
- Повторные bootstrap/history/list/usage refresh происходят даже по уже completed idle sessions.

**Confirmed evidence:**
- Core log: `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`
  - `activeClients` поднимался до `3`;
  - `pm.refreshUsageLimits.requested`: `24`;
  - `pm.dialog.bootstrap.resolved`: `13`;
  - повторялись одни и те же runtime session id.
- Current UI ownership:
  - `src/client/ui/src/session/session-id-bar.tsx` инициирует `onRefreshUsageLimits(...)` на mount при `binding.status === "ready"`;
  - dialog controller path повторно запускает `dialog:list` / `dialog:history` / bootstrap flows.

**Root cause (confirmed):**
- Ownership refresh перевёрнут: usage telemetry инициируется UI mount lifecycle, а не session/provider lifecycle.
- Idle dialogs и hidden workspace panels продолжают создавать rereads/polling loops вместо жёсткого event-driven contract.

**Accepted fix direction (2026-04-18):**
- Перевести `usageLimits` и `tokenUsage` на event-driven ownership (`session open/bootstrap`, `turn_completed`, reconnect/replay).
- Убрать mount-driven automatic usage refresh и подавить idle dialog/bootstrap churn.
- Сделать workflow/artifact polling visibility-aware для multi-workspace use case.

**Implementation state (2026-04-18):**
- Session UI surfaces больше не владеют automatic usage refresh на mount/remount; они работают как display-only consumers streamed/cached telemetry.
- PM dialog restore path подавляет self-refresh churn, когда workspace snapshot уже доказывает, что dialog idle и не имеет live runtime segment.
- Workflow, workflow-events, artifact и diagram polling стали visibility-aware для background/hidden clients.
- Core reopen/reconnect path стал replay-first для `usageLimits`: cached snapshot replay-ится сразу, bootstrap refresh выполняется не более одного раза на ready-binding lifecycle, а idle session не ходит в provider refresh без явного lifecycle trigger.
- Provider turn-completion paths теперь доставляют usage telemetry в `turn_completed` flow, а не зависят от UI-owned refresh.

**Commits delivered:**
- `d642f51e1 refactor(pm): remove mount-driven usage refresh ownership`
- `0ba4b9eee fix(pm): repair usage refresh refactor typecheck`
- `c845a5c24 test(pm): guard display-only usage ownership`
- `537837d91 fix(pm): suppress idle dialog refresh churn`
- `2cd698b57 fix(pm): throttle workflow polling for background clients`
- `2cfb18b9a fix(pm): throttle background artifact polling`
- `0c538fe70 fix(core): make usage telemetry replay-first on reopen`
- `b2f58abb4 fix(providers): deliver usage telemetry on turn completion`

**Guards delivered so far:**
- `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`
- `src/client/project-manager/components/sessions/token-usage-stream.test.ts`
- `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`
- `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.test.ts`

**Planning source:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_MultiWorkspace_Performance_And_EventDriven_UsageRefresh_1.2.19.md`

## BUG-2026-04-18-05 — Codex Runtime: final assistant answer is emitted twice by rollout terminal pair

**Status:** OPEN

**Symptom:**
- Финальный assistant answer Codex отображается дважды и duplicate сохраняется после workspace switch и повторной hydration.
- Duplicate попадает в unified session truth, а не живёт только в live UI state.

**Confirmed evidence:**
- Screenshot: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-18 at 12.10.34.png`
- Unified session JSONL содержит два одинаковых финальных assistant message: lines `51` и `52`.
- Native rollout JSONL: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/04/18/rollout-2026-04-18T11-43-20-019d9ff9-2b0b-7651-8d8c-22945eb1e235.jsonl`
  - `agent_message phase="final_answer"` at line `99`;
  - `task_complete last_agent_message=...` с тем же текстом at line `102`.

**Root cause (confirmed):**
- `codex-rollout-live-sync.ts` допускает second terminal emit, когда `final_answer` semantic duplicate не содержит `turn_id`, а fallback dedupe опирается только на `turnId`.
- В observed production case `final_answer` emits assistant text, но не mark-ит final turn, после чего `task_complete` проходит как fallback и материализует тот же ответ повторно.

**Accepted fix direction (2026-04-18):**
- Зафиксировать single terminal assistant emission across rollout events.
- Dedupe должен работать даже без `turn_id`, опираясь на normalized terminal payload identity, а `task_complete.last_agent_message` должен оставаться fallback-only path.

**Implementation state (2026-04-18):**
- `codex-rollout-event-parser.ts` теперь строит стабильный terminal payload fingerprint для final assistant content.
- `codex-rollout-live-sync.ts` запоминает `final_answer` как authoritative terminal emission и suppress-ит equivalent `task_complete` в bounded terminal window даже в observed case без `turn_id`, при этом fallback-only `task_complete` path сохранён.

**Commits delivered:**
- `b243c09a9 fix(codex): dedupe rollout final answer emission`
- `2cd5130a5 test(codex): guard rollout final answer dedupe`

**Guards delivered:**
- `packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts`
- `packages/Codex_Module/src/rollout/codex-rollout-live-sync.test.ts`
- `packages/Codex_Module/src/messaging/message-processor.replay.test.ts`

**Planning source:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Dialog_Duplication_StopResend_And_FinalAnswer_1.2.19.md`

## BUG-2026-04-18-04 — PM/UI/Codex: after `Stop` + fast resend transient duplicate user bubble appears in dialog

**Status:** FIXED

**Symptom:**
- После `Stop` и немедленного повторного `send` второе пользовательское сообщение временно видно в dialog panel дважды.
- После workspace switch / full rebuild duplicate исчезает, значит persisted truth остаётся корректной.

**Confirmed evidence:**
- Screenshot: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-18 at 12.00.48.png`
- Unified session JSONL: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-cce9d786-f8f6-430d-b276-39e341cda0e3-description.jsonl`
  - line `19`: первое user message;
  - line `20`: одно canonical follow-up message;
  - второго persisted экземпляра follow-up message нет.

**Root cause (confirmed):**
- PM send path добавляет optimistic user bubble с synthetic `id`/`createdAt`.
- Tail `dialog:history` merge затем append-ит canonical copy поверх optimistic one, потому что current dedupe не умеет reconcile optimistic и canonical сообщения при одинаковом content и разном `(id, createdAt)`.

**Accepted fix direction (2026-04-18):**
- Ввести optimistic-to-canonical reconciliation на границе `dialog:send:ack` / tail history merge.
- Stop/resend path не должен оставлять видимые optimistic duplicates и не должен зависеть от workspace reload для самоисцеления.

**Implementation state (2026-04-18):**
- `session-message-dedupe.ts` теперь ищет recent `optimistic-*` user placeholder по `role=user`, `content` и bounded time window, а затем заменяет его первым canonical history message вместо append второго bubble.
- Tail replay по-прежнему идёт через dedupe-layer, а full-history rebuild остаётся canonical-only и не возрождает optimistic placeholders после workspace switch/reload.

**Commits delivered:**
- `8d95ac49c fix(pm): reconcile optimistic stop-resend user messages`
- `34cd74baf test(pm): guard optimistic stop-resend reconciliation`

**Guards delivered:**
- `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`

**Planning source:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Dialog_Duplication_StopResend_And_FinalAnswer_1.2.19.md`

## BUG-2026-04-18-03 — Claude Runtime: final live text finalization can emit orphan suffix after completed answer

**Status:** FIXED

**Symptom:**
- После уже завершённого корректного Claude final answer unified session может получить отдельную лишнюю assistant bubble, например `ell.`.
- Native Claude session и SDK trace остаются чистыми, значит corruption появляется только в CodeAI Hub post-SDK routing/finalization path.

**Confirmed evidence:**
- Unified session JSONL: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/claudeCodeCli/claude-15c2c78b-f135-44fe-870a-a6f537108383-description.jsonl`
  - line `58`: корректный финальный ответ;
  - line `59`: отдельный stray suffix `ell.`
- SDK trace: `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-882b9a4c-5093-483c-9074-ea401dc5b9f4.jsonl` — duplicate suffix отсутствует.
- Native Claude session: `/Users/oleksandroliinyk/.codeai-hub/providers/claude/home/.claude/projects/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/882b9a4c-5093-483c-9074-ea401dc5b9f4.jsonl` — duplicate suffix отсутствует.
- Наблюдавшийся event order: `assistant(full text) -> content_block_stop -> message_delta(end_turn) -> message_stop`.

**Root cause (confirmed):**
- Claude live text path и regular assistant flush до сих пор допускают dual finalization одного и того же text block.
- Current dedupe опирается на emitted length вместо canonical accumulated text ownership, поэтому stale suffix может пережить reconcile и быть выпущен вторым ordinary assistant path.

**Accepted fix direction (2026-04-18):**
- Ввести single-owner finalization для каждого Claude text block.
- Сверять final state по canonical accumulated text, а не только по emitted length.
- Блокировать любой второй ordinary assistant flush после canonical finalization блока.

**Implementation state (2026-04-18):**
- `claude-text-live-buffer.ts` теперь держит per-session canonical `finalizedText`, поэтому поздний `content_block_stop` больше не может выпустить второй tail после того, как assembled assistant text уже стал owner terminal materialization.
- `claude-stream-event-router.ts` очищает stale pending assistant state после live finalization и рассматривает assembled snapshots с тем же `messageId` как canonical replacement, а не append-path.

**Commits delivered:**
- `336cfadfc fix(claude): make final live text finalization order-safe`
- `0633a9ea5 test(claude): guard order-safe live text finalization`

**Guards delivered:**
- `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`

**Planning source:**
- `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LiveText_OrderSafe_Finalization_1.2.19.md`

## BUG-2026-04-18-02 — Claude/UI/Translation: pre-tool live text must not surface as assistant bubble

**Status:** FIXED

**Symptom:**
- Во время Claude workflow-turn в локализованной (`ru`) сессии между двумя `Claude · Thinking` bubble появляется отдельный английский assistant/live fragment, например: `I've read the Final_Description.md... Let me create the directory and the first draft of the document.`
- Этот fragment выглядит как обычный ответ агента, хотя по смыслу является pre-tool progress text перед `tool_use`.
- После этого fragment не попадает в thinking translation path и остаётся на английском.

**Confirmed evidence:**
- Unified session JSONL: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/claudeCodeCli/claude-9f32ecf5-7bc3-4581-b8fa-acc3996e72c2-virtual-simulation.jsonl`
  - thinking immediately before leak: lines `64`
  - leaked assistant/live fragment: lines `65-66`
  - next thinking bubble: line `67`
- Native Claude project JSONL: `/Users/oleksandroliinyk/.codeai-hub/providers/claude/home/.claude/projects/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/34711f5f-291d-493d-9a76-3fa9f935c797.jsonl`
  - corresponding Claude message `msg_01QQVEMqcnPsHDkLP43EW3ds` contains a `thinking` block and then a `text` block before `tool_use`, but the leaked fragment is not a final user-facing answer.
- SDK trace: `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-34711f5f-291d-493d-9a76-3fa9f935c797.jsonl`
  - `content_block_start` thinking + assistant thinking payload: lines `69-71`
  - `content_block_start` text + assistant text payload with leaked English fragment: lines `73-74`
  - immediate `content_block_start` tool_use follows right after: line `76`

**Root cause (confirmed):**
- Claude live `text_delta` path in `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts` emits visible assistant/live fragments immediately via `emitClaudeAssistantLiveText(...)` before the router knows whether the message will resolve to `end_turn` or `tool_use`.
- Legacy Claude `tool_use_preamble` handling in `packages/Claude_Module/src/messaging/claude-stream-event-router.ts` can already reclassify queued same-message text as `thinking`, but only when the text stayed on the pending path.
- Once live text has already materialized as assistant/live, that older `tool_use_preamble` branch is bypassed, so the fragment survives as an assistant bubble and also skips the thinking translation overlay.
- Core overlay translation is intentionally restricted to `thinking` display messages, so leaked assistant/live preambles do not get localized afterward.

**Accepted fix direction (2026-04-18):**
- Claude text that belongs to a message resolving to `tool_use` must not surface as a visible assistant/live bubble.
- Pre-tool text must resolve through the `thinking` path so it inherits the same rendering and translation contract as other `Claude · Thinking` content.
- End-turn assistant text must remain on the normal assistant path; the fix must not globally convert all Claude text into thinking.
- Minimum regression guards:
  - localized Claude pre-tool text must not appear as assistant/live in a `tool_use` turn;
  - the same content must instead surface as `thinking`;
  - ordinary Claude `end_turn` assistant text must stay assistant text.

## BUG-2026-04-18-01 — Claude/Core/PM: post-turn `/context` probe failure leaves session stuck in false `resuming`

**Status:** FIXED

**Symptom:**
- Claude отдаёт полный финальный ответ пользователю, но input остаётся заблокированным с copy `Agent is resuming your session… Please wait.`
- В UI это выглядит как resume/continuity stuck, хотя фактического `restoreRequested` нет.
- Повторные `refreshUsageLimits` происходят уже после завершённого turn-а.

**Confirmed evidence:**
- Native Claude project JSONL: `/Users/oleksandroliinyk/.codeai-hub/providers/claude/home/.claude/projects/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/99d69c3e-eeab-4534-a80c-f02d0de14c99.jsonl` — normal final assistant reply with `end_turn`.
- SDK log: `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-99d69c3e-eeab-4534-a80c-f02d0de14c99.jsonl` — `sdk:result subtype=success`, `terminal_reason=completed`.
- Unified session JSONL: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/claudeCodeCli/claude-5598fd12-aab0-4364-8370-d9b39b820c75-description.jsonl` — full final live response persisted.
- Core log: `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log` — immediately after completion, `[claude] Claude /context token read failed ... ERR_UNKNOWN_FILE_EXTENSION ".exe"`, then PM bootstrap/usage refresh continues with `restoreRequested: false`.

**Root cause (confirmed):**
- `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts` on Unix runs the Claude `/context` probe via `node <executablePath> ...`.
- In the current install layout `~/.npm-global/bin/claude` resolves to the native Claude binary bundle (`claude.exe` inside the package), not a JS entrypoint, so `node` fails with `ERR_UNKNOWN_FILE_EXTENSION`.
- Claude turn completion itself succeeds, but post-turn token usage synchronization fails, and Core leaves the session in `context_check_pending` without reaching a final unlock decision.

**Cross-provider assessment:**
- **Codex:** same immediate bug not confirmed. It does not use the same Unix `node <native binary>` `/context` probe path; usage for continuity arbitration comes from turn/runtime events.
- **Gemini:** same immediate bug not confirmed. It emits `token_usage` during/at the end of the turn and does not rely on the Claude-specific probe path.
- **Systemic risk remains:** the shared post-turn continuity arbitration can still stall for any provider if an eligible flow-node session reaches `turn_completed` without a usable usage snapshot and without an explicit provider signal that the snapshot is unavailable. This risk is architectural and should be covered by the fix.

**Accepted fix direction (2026-04-18):**
- Fix Claude Unix probe runner selection so `/context` executes the native binary directly when appropriate.
- Add an explicit provider-side completion signal that post-turn token usage is unavailable when the probe fails.
- Teach Core continuity arbitration to resolve `no_rollover` on that explicit signal instead of waiting forever in `context_check_pending`.

**Fix (implemented):**
- `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts` now distinguishes Unix native Claude bundles from JS entrypoints: native executables run directly, while `process.execPath` is used only for real `.js/.cjs/.mjs` entrypoints.
- `packages/Claude_Module/src/messaging/claude-token-usage-sync.ts`, `claude-usage-sync.ts`, and `claude-message-finish-handler.ts` now propagate explicit `postTurnTokenUsageUnavailable: true` in `turn_completed` when a completed Claude turn cannot produce a trailing `/context` usage snapshot.
- `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts` now resolves `context_check_pending` to `no_rollover` only on that explicit provider signal, keeping the existing invariant that missing usage by itself is not enough.

**Commits:**
- `9f06e5e35 fix(claude): run context usage probe with native binary on unix`
- `ba50e58c5 fix(claude): mark post-turn token usage as unavailable on probe failure`
- `e90615eb2 fix(core): unlock continuity when provider marks post-turn usage unavailable`
- `e89f63eb6 docs: document Claude post-turn usage unavailable continuity contract`
- `769844013 chore: bump version to 1.2.16 for Claude continuity fix release`

**Release:**
- `1.2.16`
- VSIX built: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.16.vsix`

**Guards delivered:**
- `node --test --import tsx packages/Claude_Module/src/sdk/claude-context-usage-probe.test.ts`
- `node --test --import tsx --test-name-pattern "explicit post-turn usage unavailable|delayed no-rollover on the production token-usage path" packages/core/src/remote-bridge/handlers/session-request-handler.rollover.test.ts`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/core`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

**Retest result (2026-04-18):**
- Пользователь подтвердил, что на релизе `1.2.16` первый turn проходит корректно у всех трёх провайдеров, без stuck-state и без ложного `Agent is resuming...`.
- Баг закрыт как `FIXED`; дальнейшее наблюдение переносится в новый scope только если регрессия проявится на более поздних turn'ах.

## BUG-2026-04-16-01 — Localization/Core/Claude: Haiku translation path sends under-specified prompts and duplicates reasoning work

**Status:** FIXED

**Symptom:**
- При выборе `Anthropic Claude · Haiku 4.5` интерфейсы, help и подсказки синхронизировались заметно дольше ожидаемого, хотя bundle materialization уже шёл whole-batch без chunking.
- Длинные reasoning/thinking блоки переводились частично: короткий фрагмент появлялся на `ru`, а остальная часть оставалась на английском.
- Translation-sidecar JSONL содержал отдельные посторонние английские ответы вместо прямого перевода исходного текста.

**Root cause (confirmed):**
- Локализационный путь уже не использовал chunk planner: `LocalizationMaterializer` отправлял один marker-preserving `localization_bundle` batch с `chunkingMode: "disabled"`, поэтому основной latency regression был не в дроблении.
- `ClaudeHaikuTranslationService` передавал `request.text` как bare user prompt. На длинных help/reasoning payloads Haiku периодически интерпретировал исходный текст как обычный запрос, а не как translation-only task.
- Translation runtime сохранял `persistSession: true`, но query `cwd` указывал на provider-home вместо dedicated `translation-runtime-haiku`, поэтому native Claude JSONL писались в общий provider bucket и затрудняли диагностику translation-only path.
- `SessionTranslationFacade` обрабатывал live reasoning и rollout replay как независимые задания; одинаковый `sourceHash` уходил в очередь дважды, а single-worker dispatcher удваивал задержку.

**Fix:**
- `ClaudeHaikuTranslationService` теперь оборачивает каждый запрос в явный translate-only prompt (`Translate the source text... Return only the translation... Source text:`) и дублирует marker-preservation rule для `localization_bundle`.
- Translation query runtime переведён на dedicated project cwd `translation-runtime-haiku`, при этом auth/bootstrap по-прежнему поднимаются из provider-home.
- `SessionTranslationFacade` добавил in-flight dedupe по `engineId + targetLanguage + sourceHash`, поэтому повторный reasoning block reuse-ит уже идущий Haiku перевод вместо нового provider call.

**Commits:**
- `7ec2d0a48 fix: harden haiku translation runtime`

**Release:** `1.1.990`

**Guards required:**
- Regression test на translate-only prompt для обычного Haiku перевода.
- Regression test на marker-safe prompt rules для `localization_bundle`.
- Regression test на in-flight dedupe reasoning translation по одинаковому `sourceHash`.
- Таргетные сборки `@codeai-hub/claude-module` и `@codeai-hub/core`.

**Guards delivered:**
- `node --test packages/Claude_Module/dist/translation/claude-haiku-translation-service.test.js`
- `node --test packages/core/dist/session-translation/session-translation-facade.test.js`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/core`

## BUG-2026-03-29-01 — Core/UI/Gemini: Session Stop must cancel turn, not shutdown independent Core

**Status:** FIXED

**Symptom:**
- Во время Gemini one-shot turn сессия может зависнуть после системного события `model_info`: пользовательский input остаётся в `Agent is working... Please wait.`, а новых `assistant` / `turn_completed` событий не приходит.
- Текущий Session UI контракт трактует `Stop` как остановку всего Core runtime, а не текущего turn / текущей provider session.
- Для независимого Core это неверно: проблема внутри одного dialog turn не должна останавливать весь runtime и ломать остальные сессии/workspace state.

**Confirmed evidence:**
- `~/.codeai-hub/logs/gemini/sdk-gemini-a213fe63-64f7-4f8a-bbcc-1fe82c583b28.jsonl`: второй тестовый turn доходит только до `model_info` и не даёт ни `finished`, ни `error`.
- `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-1ddc259b-2f91-4ba8-b6c8-c7dcb25e141e-description.jsonl`: история заканчивается пользовательским сообщением `Еще один точно такой же тест.` без нового ответа агента.
- `~/.codeai-hub/logs/core/core.log`: вместо provider-side crash trace есть явный `Shutdown request received via API`, то есть Core уходит по shutdown-path, а не по собственному fatal exception.

**Accepted product decision (2026-03-29):**
- `Stop` в Session UI означает только остановку текущего turn или аварийный force-unlock stuck session.
- `Stop` никогда не должен останавливать Core runtime.
- Logical session должна сохраняться; если после stop/resume underlying provider transcript испорчен, следующий send в MVP может создать fresh provider session и перебиндить её к той же logical session.
- Очистка "мусора" в старом provider transcript / raw JSONL не входит в MVP этого фикса.
- До начала кодового фикса SSOT-контракт `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md` должен быть синхронизирован с этой семантикой.

**Required fix direction:**
- синхронизировать продуктовый/SSOT контракт `Stop` до transport и runtime изменений;
- заменить `Stop => /api/v1/shutdown` на session-scoped stop command;
- реализовать Core-side stop/rebind path без остановки runtime;
- добавить recoverable stalled-turn handling для Gemini, чтобы зависший turn переводился в unlock/retryable path, а не в бесконечный `working`.

## BUG-2026-03-25-01 — Core/Gemini/PM: Provider error cascade → binding lost → UI deadlock → Core crash → workspace vanishes

**Status:** OPEN

**Symptom:**
Gemini сессия (description step) получает server-side ошибку от Google (`No capacity available for model gemini-3.1-pro-preview`). После этого развивается каскад из 5 проблем, каждая критичнее предыдущей:

1. **Сообщения пользователя молча проглатываются** — UI позволяет ввести и отправить текст, но он не доходит до провайдера.
2. **UI навечно заблокирован** — после рестарта Core отображается "Agent is working, please wait" без возможности разблокировки.
3. **Core crash при нажатии Stop** — процесс Core прекращается, launcher фиксирует `core is unreachable`.
4. **Workspace исчезает из PM** — сессия, анкета, description — всё пропадает из интерфейса.
5. **Нет self-recovery** — launcher не рестартит Core автоматически, PM не восстанавливает данные.

**Reproduction scenario:**
1. Открыть Gemini workspace в PM, выбрать `gemini-3.1-pro-preview`
2. Запустить description session
3. Дождаться server-side ошибки (capacity/rate-limit) от Google — обычно 3-5 минут
4. Попробовать отправить сообщение → молча дропается
5. Рестарт Core через Settings → "Agent is working" навечно
6. Нажать Stop → Core crash → workspace пропадает

**Root cause analysis (from logs):**

### Фаза 1: Provider runtime failure detected (18:49:14)
```
core.log: "Provider runtime failure detected", providerId: "geminiCli"
core.log: error: "No capacity available for model gemini-3.1-pro-preview on the server"
```
Core ловит ошибку из `GeminiSessionManager.sendMessage()` → `throw error` пробрасывается через `GeminiProviderAdapter.sendMessage()` → `SessionRequestHandler.handleMessage()` → Core помечает `providerSessionStatus = "failed"` и **удаляет provider binding**.

### Фаза 2: Сообщение пользователя дропается (18:50:14)
```
core.log: "Session message received", sessionId: "3ab639e7...", contentLength: 10
core.log: "Resolved session for incoming message", providerSessionStatus: "failed"
core.log: "Provider binding or adapter missing for session", hasBinding: false, hasAdapter: false
core.log: "Known provider session bindings", knownSessionIds: []
```
Core получает user message, видит `providerSessionStatus: "failed"`, binding отсутствует → **сообщение проглочено без обратной связи** (ни error event в UI, ни повторная попытка).

### Фаза 3: Core restart → UI deadlock (18:52)
Пользователь рестартит Core через Settings.
```
gemini-jsonl: session_start (resume), model_info: "gemini-3.1-pro-preview"
```
Gemini SDK resume-ит сессию (session_start + model_info), но:
- `turn_completed` для прерванного turn **никогда не был отправлен** (ошибка произошла mid-turn)
- UI помнит что turn в прогрессе → "Agent is working, please wait" навечно
- Поле ввода заблокировано, стоп-кнопка видна

### Фаза 4: Stop → Core crash (19:52)
Пользователь нажимает Stop.
```
launcher.log: "Core monitoring detected core is unreachable on 127.0.0.1:8080"
```
Core прекращает работу (crash или unhandled state). Причина не ясна из логов — core.log последняя запись `Core orchestrator stopped` (18:52), после рестарта Core не писал в core.log (вероятно logger не инициализировался).

### Фаза 5: PM потеряла workspace
PM теряет WebSocket-соединение с Core → workspace/session/questionnaire исчезают из интерфейса. Данные на диске сохранены, но PM не может показать их без Core.

**Affected files (where the issues originate):**
- `packages/core/` — `SessionRequestHandler`, `provider-registry/` — binding lifecycle, runtime failure handling
- `packages/core/` — `RemoteBridge` — WebSocket message routing, error propagation to UI
- `packages/Gemini_Module/src/session/gemini-session-manager.ts` — `sendMessage()` throw path
- `src/client/project-manager/` — session UI lock/unlock state machine

**Hypothesis for fix (not verified):**

1. **Provider error ≠ Provider death**: Core не должен удалять binding при transient server errors (capacity, rate-limit, timeout). Binding удаление оправдано только при auth failure или module crash. Для transient errors: emit `turn_failed` event → UI разблокируется → пользователь может retry.

2. **Guaranteed `turn_completed`**: если turn начался (`turn_started` отправлен в UI), он **обязан** завершиться — либо `turn_completed`, либо `turn_failed`. Это инвариант, который сейчас нарушается при provider throw + Core restart. Варианты:
   - `finally` блок в Core `SessionRequestHandler.handleMessage()` который гарантирует `turn_completed/turn_failed`
   - При Core restart: проверить все sessions с `turn_in_progress` и отправить `turn_failed` + unlock

3. **Graceful error propagation**: когда сообщение пользователя не может быть доставлено (binding missing) — Core **обязан** отправить error event в UI вместо тихого дропа. Пользователь должен видеть: "Сессия потеряна, создайте новую" (или auto-recovery).

4. **Core crash resilience**: Stop-кнопка не должна крашить Core. Вероятно `abort()` на Gemini session вызывает unhandled rejection или state corruption в SDK. Нужен try-catch wrapper вокруг abort path.

5. **Launcher auto-restart**: при crash Core launcher должен рестартить процесс автоматически (сейчас логирует warning но не действует).

**Priority:** CRITICAL — каскад делает Gemini провайдер непригодным для production use при любом server-side error.

**Discovered:** Session 158, 2026-03-25. Triggered by `gemini-cli-core@0.35.0` + `gemini-3.1-pro-preview` capacity limits.

---

## BUG-2026-03-20-01 — Codex/Core/PM: reopen/recovery loop keeps `diagram_modules` stuck in perpetual working

**Status:** FIXED

**Symptom:**
- После restart `Project Manager` / `Core` reopened `diagram_modules` dialog мог застревать в `Agent is working… Please wait.` даже когда предыдущий turn уже завершился вопросами к пользователю.
- Пользовательские ответы уходили в queue, а PM повторно и повторно пытался восстановить тот же stale `providerSessionId`.
- Сценарий особенно стабильно воспроизводился до появления `module-inventory.md`, когда шаг сильнее зависел от continuity/dialog recovery, чем от downstream artifact state.

**Root cause (confirmed):**
- PM при cold-open вызывал `createSession(old providerSessionId)`, если не видел runtime session для continuity entry.
- `Codex_Module` для `gpt-5.4` имел unconditional special-case: при `resumeSession()` он пропускал обычный resume и silently стартовал fresh thread.
- Core не нормализовал freshly rebound runtime binding в continuity/index до следующего outbound turn, поэтому dialog recovery продолжал ссылаться на старый `providerSessionId`.
- В результате reopen path превращался в цикл `PM restore -> fresh thread substitution -> stale continuity -> PM restore`.

**Fix:**
- `Codex_Module`: убран unconditional `gpt-5.4 => fresh thread on resume`; ordinary reopen/recovery снова резюмирует исходный thread id.
- Core: `session-request-handler` теперь immediately tracks freshly bound provider session in continuity right after session registration/binding.
- PM: dialog cold-open bootstrap теперь deduplicates runtime restore requests per continuity entry и не спамит repeated `createSession(...)` для того же stale dialog binding.

**Commits:**
- `63b66804 fix(codex): restore gpt54 resume semantics`
- `a812549d fix(core): normalize resumed codex continuity state`
- `04cb574a fix(pm): stop stale codex dialog reopen retries`
- `d257ab65 docs(recovery): record codex resume loop fix`
- `9e872284 chore(release): build codex resume recovery release`
- `40332e59 fix(pm): narrow dialog bootstrap provider typing`

**Release:** `1.1.753`

**Guards required:**
- Regression test на `Codex_Module.resumeSession()` для `gpt-5.4`, который подтверждает reuse existing thread id.
- Regression guard на eager continuity tracking для freshly bound runtime session.
- Regression guard на PM restore dedupe / snapshot bootstrap path для repeated cold-open dialog:list recovery.
- Таргетные сборки `@codeai-hub/codex-module`, `@codeai-hub/core`, `build:project-manager`.

**Guards delivered:**
- `node --test --import tsx packages/Codex_Module/src/sdk/codex-sdk-manager.test.ts`
- `npm run build --workspace=@codeai-hub/codex-module`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `node --test --import tsx src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `npm run build:project-manager`

## BUG-2026-03-14-01 — Codex Runtime: stale `CODEX_DEFAULT_MODEL` overrides saved Codex settings

**Status:** FIXED

**Symptom:**
- В `Settings -> Codex Default model` пользователь выбирает `gpt-5.4`, и `~/.codeai-hub/settings/settings.json` действительно сохраняет `providers.codex.defaultModel = "gpt-5.4"`.
- При этом свежий provider rollout всё равно пишет `turn_context.payload.model = "gpt-5.3-codex"`.
- Пользовательский эффект: новый Codex turn идёт не на выбранной модели, а на старом coding baseline.

**Affected evidence (confirmed):**
- Saved settings snapshot: `/Users/oleksandroliinyk/.codeai-hub/settings/settings.json`
- Problem rollout: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/14/rollout-2026-03-14T16-31-38-019cecf9-7835-71a2-85f8-e0c16ff1784b.jsonl`
- Matching shell snapshot: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/shell_snapshots/019cecf9-7835-71a2-85f8-e0c16ff1784b.sh`

**Root cause (confirmed):**
- Long-lived host/runtime process сохранил старый `process.env.CODEX_DEFAULT_MODEL=gpt-5.3-codex`.
- И `packages/core/src/config/index.ts`, и `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` брали `CODEX_DEFAULT_MODEL` раньше, чем persisted `settings.json`.
- В результате корректно сохранённый user-facing settings snapshot не мог переопределить stale env, и новый turn стартовал как `gpt-5.3-codex`.

**Fix (implemented):**
- В `packages/core/src/config/index.ts` и `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` приоритет источников изменён:
  1. persisted Codex settings snapshot;
  2. env fallback;
  3. hardcoded/workspace fallback.
- Добавлены regression tests на сценарий `saved settings wins over stale env`.

**Commits:**
- Pending in current working session

**Release:** `1.1.726`

**Guards delivered:**
- `npm run build --workspace=@codeai-hub/core`
- `npm run build --workspace=@codeai-hub/codex-module`
- `node --test packages/core/dist/config/index.test.js`
- `node --test packages/Codex_Module/dist/sdk/codex-sdk-manager.test.js`

## BUG-2026-03-13-01 — Codex Runtime: `Debug/Raw` теряет agent messages после `thread.started` promotion

**Status:** FIXED

**Symptom:**
- В режиме `Settings -> General -> Response Mode = Debug/Raw` native provider rollout содержит полный `commentary` и `final_answer`, то есть `gpt-5.4` реально присылает промежуточные сообщения.
- При этом наш unified-session/dialog JSONL для той же `Description`-сессии содержит только `session-open` и `user`; ни `assistant`, ни `thinking` не записываются.
- Пользовательский эффект: в правой панели диалога агент выглядит полностью "молчаливым", хотя raw provider log и SDK log показывают живой ход работы.

**Affected evidence (confirmed):**
- Raw provider rollout: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/13/rollout-2026-03-13T09-43-33-019ce65d-8182-7bf2-8220-ecd9080ea4a0.jsonl`
- SDK log: `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019ce65d-8182-7bf2-8220-ecd9080ea4a0.jsonl`
- Unified-session JSONL: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-0446deca-91a3-462a-866d-5c356cec5b17-description.jsonl`

**Root cause (confirmed):**
- `Debug/Raw` policy корректно применяется в начале turn и не навязывает `outputSchema`; это подтверждается SDK log (`runOptionsKeys: []`).
- Но `StructuredOutputStreamController` хранит `turnConfig` и in-flight state по временному `sessionId`, а после `thread.started` `CodexMessageProcessor` меняет `session.sessionId` на реальный `threadId`.
- После promotion дальнейшие lookup'и `shouldSuppressCommentary()`, `startTurn()`, `appendChunk()` и `complete()` идут уже по новому `sessionId`, для которого controller не находит сохранённый `passthrough` config и молча падает в `DEFAULT_TURN_CONFIG`.
- Из-за этого:
  - `commentary` снова suppress-ится как internal;
  - `final_answer` пытается пройти через structured JSON parsing, но `gpt-5.4` в `Debug/Raw` присылает обычный текст, поэтому `assistantText` остаётся пустым и `assistant` event не эмитится.

**Boundaries / non-causes:**
- Это не баг провайдера: raw rollout и SDK log уже содержат нужные `agent_message`.
- Это не проблема unified-session storage: в целевой JSONL физически не появляется ни одного `assistant`, значит потеря происходит раньше, в Codex runtime.
- Это не повод трогать PM/UI routing, continuity или core persistence: дефект локализован в session-promotion/structured-output state path внутри Codex runtime.

**Fix direction (approved for implementation):**
- Сохранить response-mode config и in-flight structured-output state при `temp session id -> real thread id` promotion без изменения внешнего протокола.
- Исправление должно быть минимальным и локальным: не менять PM/UI/core binding слой, не расширять feature scope и не добавлять новый runtime protocol.

**Fix (implemented):**
- В `StructuredOutputStreamController` добавлен локальный promotion path, который переносит `turnConfig` и active stream state со временного `sessionId` на реальный `threadId`.
- `CodexMessageProcessor` вызывает этот promotion в момент `thread.started` до дальнейшей обработки turn lifecycle, поэтому `Debug/Raw` и `Hybrid` не деградируют в `DEFAULT_TURN_CONFIG` mid-turn.
- Добавлен узкий regression guard на controller-level сценарий `temp session id -> real thread id` для обоих passthrough режимов (`hybrid`, `debug_raw`).

**Commits:**
- `67da3fb6 fix(codex): preserve response mode across session promotion`
- `7e9d370c test(codex): guard response mode session promotion`
- `142e0958 chore(release): build-all v1.1.722`

**Release:** `1.1.722`

**Guards required:**
- Точечный regression test на сценарий `Debug/Raw`/`Hybrid` с `thread.started` promotion до первого `agent_message`.
- Smoke-check: raw provider rollout содержит commentary, и тот же turn даёт `assistant` сообщения в unified-session/dialog history.

**Guards delivered:**
- `node --test packages/Codex_Module/dist/messaging/structured-output-stream-controller.test.js`
- `npm run build --workspace @codeai-hub/codex-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## BUG-2026-03-05-03 — PM/UI: first-open dialog hydration race (history from JSONL missing until extra click)

**Status:** FIXED

**Symptom:**
- При первом открытии Workspace в PM могла открыться workflow session с пустой лентой (`No messages yet`) даже когда у dialog уже есть история в JSONL.
- Повторный клик по stage/session в левом дереве форсировал повторный route, после чего история появлялась.

**Root cause (confirmed):**
- В `dialog:list:result` history запрашивалась сразу после `setSession(nextSession)`, но `dialog:history:result` мог прийти раньше, чем `sessionRef` обновлялся из React state/effect.
- Из-за этого первый history payload отбрасывался проверкой `if (!currentSession) return`, и initial hydration зависела от дополнительного пользовательского действия.
- В части запусков initial `dialog:history` (`cursor=0`) мог зависать в pending без payload, поэтому UI оставался в `No messages yet` до ручного повторного route из tree.

**Fix:**
- `use-project-manager-dialog-core-events.ts`: session identity теперь фиксируется синхронно (`sessionRef.current = nextSession`) до первого `requestDialogHistory`.
- `use-project-manager-dialog-session-controller.ts`: `sessionRef` очищается при смене intent/workspace и синхронизируется при rollover-created session.
- Добавлен guard-тест на порядок `bind sessionRef -> request history`.
- Контракт `Dialogs_And_Continuity_Routing.md` обновлён: cold-open history должен идти последовательной цепочкой без потери первого payload.

**Commits:**
- `0b33084b docs(pm): document first-open dialog hydration contract`
- `092e73e4 fix(pm): prevent first-open dialog history race`
- `e5e6daf9 test(pm): guard first-open dialog history hydration`
- `f3cfc4ca chore(release): build-all v1.1.710`
- `f19ffd7a docs(pm): define dialog history watchdog retry contract`
- `b8370e93 fix(pm): retry stalled dialog history on workspace open`
- `650e33f9 test(pm): guard dialog history watchdog retry`
- `d9857f83 chore(release): build-all v1.1.711`

**Release:** `1.1.711`

**Guards:**
- `node --test --import tsx src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`

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

## BUG-2026-02-17-06 — Core/Provider: Claude 401 должен завершать turn (turn_failed + turn_state=idle), иначе UI залипает в working

**Status:** FIXED

**Symptom (pre-1.1.646):** при Claude `401` UI мог залипать в `working/blocked` (turn выглядел “не завершённым” для UI).

**Root cause (reframed):** проблема проявлялась как “не завершённый turn”, но на практике ключевой блокер был в PM/UI: удержание lock при корректном server snapshot `idle/unlocked` из-за локального guard’а (см. `BUG-2026-02-22-01`).

**Fix (implemented):** закрыто в рамках SSOT lock/unlock исправлений (см. `BUG-2026-02-22-01`).

**Commits:** см. `BUG-2026-02-22-01`.

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — после ошибок/рестартов UI не остаётся в вечном `working/blocked`.

---

## BUG-2026-02-17-05 — PM/UI: после Core restart агент отвечает, но input остаётся разблокированным во время turn

**Status:** FIXED

**Symptom (pre-1.1.646):** после recovery (restart Core) и повторной отправки сообщения агент начинал отвечать, но input мог остаться разблокированным (можно отправлять новые сообщения), хотя turn явно выполнялся.

**Fix (covered):** закрыто как часть работ по SSOT lock/unlock и crash/restart continuity (см. `BUG-2026-02-22-01`).

**Commits:** см. `BUG-2026-02-22-01`.

**Release:** `1.1.646`

**Verified (manual):** 2026-02-22 — после Core restart mid‑turn ввод ведёт себя корректно (нет состояния “unlocked во время running”; “Продолжай” продолжает turn).

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
