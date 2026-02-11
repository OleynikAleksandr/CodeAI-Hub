# Gemini CLI Module Integration Guide

**Status:** Active (CommonJS bridge)

**Last Updated:** 2026-02-11

**Maintainer:** Codex / CodeAI Hub Core Team

---

## 0. Operational Status Note (2026-02-11)

- В `1.1.538` подтверждён рабочий path: `Description (one-shot)` + `Reviewer (resume)` на Gemini; статус повторно подтверждён как операционно стабильный в `1.1.560`.
- Фаза активного развития Gemini временно приостановлена.
- Причина: пока нет надёжного runtime-контракта чтения и контроля фактического остатка контекстного окна (при номинально большом окне ~1M токенов).
- До снятия паузы допустимы только bugfix-правки без расширения Gemini-функционала.

---

## 1. Purpose
This document captures the requirements and integration notes for adding Google Gemini CLI support to CodeAI Hub. It complements the Claude and Codex module guides and serves as the architectural reference for the upcoming `Gemini_Module` package.

Validated in release `1.1.444` (runtime installs + provider registry wiring are stable; exact CLI versions remain user-managed via global npm + optional auto-update).

---

## 2. References & Official Resources
- Gemini CLI repository — <https://github.com/google-gemini/gemini-cli>
- Gemini CLI product docs — <https://geminicli.com/docs/>
- Tools API reference — <https://geminicli.com/docs/core/tools-api/>
- Gemini model catalog (Gemini API) — <https://ai.google.dev/gemini-api/docs>
- OAuth consent & scopes overview — <https://developers.google.com/identity/protocols/oauth2>
- Local credentials setup — <https://geminicli.com/docs/get-started/authentication/>

Additional references to monitor:
- Vertex AI release notes — <https://cloud.google.com/vertex-ai/docs/release-notes>
- Google AI Studio docs — <https://ai.google.dev/gemini-api/docs>

---

## 3. Installation & Environment
- **Managed install:** `packages/Gemini_Module/src/installer/gemini-installer.ts` устанавливает `@google/gemini-cli` и `@google/gemini-cli-core` только глобально (npm prefix, по умолчанию `~/.npm-global`). Vendor-каталог внутри `~/.codeai-hub/providers/gemini/<version>` больше не используется. Во время инициализации `cli-bridge` резолвит глобальный prefix (PATH + `module.globalPaths` + `.npm-global`) и подхватывает ESM-модули из `lib/node_modules/@google`. Во время установки `GeminiInstaller` отправляет `reporter.progress` (в том числе с флагом `firstRun`), чтобы UI показывал конкретный шаг.
- **Runtime updates (v1.1.326):** при каждом старте ядра Auto Update Service проверяет свежие версии (по настройкам автообновления) и вызывает `GeminiInstaller.updateToLatest()` для глобального обновления CLI/Core. Settings UI по‑прежнему может запускать обновление вручную через `ProviderVersionService.updateGeminiAll()`.
- **Runtime requirements:** Node.js ≥ 20.0.0 (используется bundled runtime ядра), macOS/Linux/Windows поддерживаются CLI.
- **Version policy:** фиксированной версии нет — используются глобально установленные пакеты. Если registry недоступен или автообновление выключено, остаётся текущая версия из глобального npm.
- **Runtime compatibility policy (Phase 117):** `cli-bridge` обязан поддерживать и legacy layout (`nonInteractiveToolExecutor`, ветка `0.17.x`), и новый layout без legacy executor (ветка `0.27.x`) через scheduler fallback backend.
- **Settings telemetry (1.1.326+)**: ProviderVersionService читает установленные версии напрямую из глобального npm prefix (через `npm list -g` и `npm view`) и больше не зависит от vendor-кэша внутри `.codeai-hub`.
- **Credential store:** `~/.gemini/`
  - `credentials.json` — OAuth токены (refresh/access).
  - `config.json` — project metadata и выбранные расширения.
  - `settings.json` — модель по умолчанию, настройки sandbox/tools.
- **CLI availability:** health-check и инициализация провайдера проверяют, что глобальный CLI доступен и соответствует минимальной версии; при отсутствии — возвращается статус `missing/auth_required` с инструкциями для пользователя.

---

## 4. Authentication
- The CLI authenticates via OAuth (Google account) and does **not require** manual API keys when used against the consumer Gemini subscription (Google One AI Premium / Gemini Advanced).
- `gemini` automatically opens a browser window on first run (`gemini login` equivalent). Tokens persist in `~/.gemini/credentials.json` until revoked. Use `gemini logout` to invalidate tokens.
- No Cloud Billing is necessary for CLI usage; the CLI targets the consumer endpoints, not Vertex AI. For Vertex AI projects, Billing **must** be enabled, but that is outside of the scope of this module.
- The installer should verify:
  1. `~/.gemini/credentials.json` exists.
  2. `gemini --version` runs without prompting for auth (exit code 0).
  3. Optional: `gemini -p "ping"` returns a response.

---

## 5. Core Commands & Patterns
| Scenario | Command | Notes |
| --- | --- | --- |
| Interactive REPL (default) | `gemini` | Starts TUI/REPL session. Accepts `/exit`, `/undo`, `/context`, etc. |
| JSON output (interactive) | `gemini -o json` | All responses written to `stdout` as JSON; suitable for piping. |
| One-shot request | `gemini -o json -p "<prompt>"` | Returns single JSON response; good for health checks. |
| Stdin-driven session | `printf "Question\n/exit\n" \| gemini -o json` | Minimal simulation of interactive flow without TUI. |
| Model selection | `gemini -m gemini-2.5-flash` | Supported IDs: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-pro-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`, etc. |
| Settings override | `gemini --config <path>` (future) | CLI roadmap includes custom config files; monitor release notes. |
| Tools/Extensions | configured in `~/.gemini/settings.json` | Use Tools API to enable/disable automatic tool calls. |

Important flags:
- `-m`, `--model` — selects model before session start.
- `-o`, `--output-format` — either `text` (default) or `json`.
- `-p`, `--prompt` — one-shot prompt (DEPRECATED; prefer positional args or stdin).
- `-i`, `--prompt-interactive` — seed prompt then continue interactively (still implies interactive mode).

> Streaming note: CLI currently prints the full JSON payload once the model responds. Streaming chunk support is tracked in the GitHub repo (issue #314) and should be re-evaluated once released.

---

## 6. File System & Workspace Integration
- Default workspace root: current working directory. CLI can include files via autocompletion or command palette.
- For CodeAI Hub we will not rely on CLI’s file editing commands; instead, we parse raw responses and handle edits ourselves, similar to Claude/Codex integrations.
- Large language model stats (token usage, tool usage) are emitted inside the JSON `stats` object — we can surface them in telemetry or UI status.

---

## 7. Implementation Status
- ✅ **Installer** — обеспечивает глобальную установку `@google/gemini-cli` и `@google/gemini-cli-core` в npm prefix, валидирует доступность бинаря `gemini` и загружает `cli-bridge` напрямую из глобального `node_modules`. Эмитит `reporter.progress`, чтобы RemoteBridge показывал стадии «загрузка», «подготовка зависимостей», «готово». В post-update/self-check классифицирует module compatibility ошибки отдельно от auth.
- ✅ **Runtime Updater (v1.1.326)** — `updateToLatest()` обновляет оба пакета через `npm install -g` и используется автообновлением при старте ядра или вручную из Settings UI.
- ✅ **CLI Bridge (`src/runtime/cli-bridge.ts`)** — использует динамический `import()` через `Function("return import(specifier);")`, конвертирует пути в file URL и загружает ESM-модули CLI/Core без `require()` (устранён `ERR_REQUIRE_ESM`). Для tool execution реализован backend selection: legacy `nonInteractiveToolExecutor` либо `scheduler_fallback` при новом layout CLI Core.
- ✅ **Session Manager** — работает поверх официального CLI Core (`contentGenerator`, `toolScheduler` и т.д.), управляет потоками, журналирует события, очищает окружение от конфликтующих `GOOGLE_*` переменных. Tool execution вынесен в совместимый фасад `GeminiToolExecutorFacade`.
- ✅ **Provider Adapter** — интегрирован с `ProviderRegistry`, отправляет события, обрабатывает подписчиков, транслирует системные сообщения (инициализация, ошибки аутентификации).
- ✅ **UI Integration** — provider picker отображает статус Gemini; при ошибке инициализации модуль переводится в `inactive`, ядро продолжает работу.
- 🚧 **Расширенный логгер/health-check** — основная аутентификация по-прежнему вручена CLI (`gemini login`), сбор логов и health-check до запуска ядра в планах.

---

## 8. Tooling & Extensions
- Gemini CLI supports MCP servers and custom extensions. Reference: <https://geminicli.com/docs/core/tools-api/>.
- Out of scope for MVP, but future integration may:
  - Register CodeAI Hub-specific tools (filesystem, calc, web search).
  - Enable sandbox execution (CLI flag `--sandbox`).
  - Leverage `--approval-mode` to control auto-approval (values: `default`, `auto_edit`, `yolo`).

---

## 9. Testing Checklist
- `which gemini` resolves binary.
- `gemini --version` outputs expected version.
- `printf "ping\n/exit\n" | gemini -o json` completes with code 0.
- Multiple sessions run concurrently without leaking descriptors.
- Installer handles missing CLI gracefully (adapter downgraded to `inactive`, core keeps running).
- Session manager recovers if CLI crashes or auth expires; RemoteBridge broadcasts system message with exit reason.
- Manual validation that CLI works for macOS (arm64/x64) and Linux (x64). Windows support will require additional QA.

---

## 10. Security & Privacy Notes
- OAuth tokens in `~/.gemini/credentials.json` must remain on user machine. Do not upload, log, or collect them.
- Respect Google’s Terms of Service when invoking CLI programmatically.
- Provide a documented method to logout (`gemini logout`) from within CodeAI Hub UI.
- Highlight that user data may be transmitted to Google; align with existing privacy statement.

---

## 11. Open Questions / Follow-ups
- Streaming support status (watch gemini-cli GitHub issues #314, #287).
- Programmatic model discovery — currently manual; track any updates to CLI `models` command.
- Sandbox availability for consumer accounts (CLI flag exists but may require special access).
- Determine if we need fallback to API key flow (AI Studio) for environments without CLI.

---

---

## Appendix A — Runtime Compatibility (Phase 117)

Этот раздел объединяет ранее отдельный документ `Gemini_CLI_Runtime_Compatibility_Architecture.md` в основной гайд модуля, чтобы не дробить источник правды.

## 1. Проблема

В релизе `1.1.535` Gemini provider может переходить в состояние `UNAVAILABLE` до шага аутентификации.

Симптом:
- `ERR_MODULE_NOT_FOUND` при загрузке `nonInteractiveToolExecutor.js` из `@google/gemini-cli-core`.

Корневая причина:
- runtime bridge в `packages/Gemini_Module/src/runtime/cli-bridge.ts` жёстко ожидает legacy модуль:
  - `dist/src/core/nonInteractiveToolExecutor.js` или `dist/core/nonInteractiveToolExecutor.js`.
- в `@google/gemini-cli-core@0.27.x` этот entrypoint удалён; актуальный backend переехал в `dist/src/scheduler/tool-executor.js` (и используется через `coreToolScheduler`).

Следствие:
- провайдер не инициализируется, хотя `gemini login` и credentials могут быть валидными.

---

## 2. Цели и инварианты

1. Инициализация Gemini provider должна работать для двух веток API:
   - legacy: `@google/gemini-cli-core` 0.17.x;
   - current: `@google/gemini-cli-core` 0.27.x.
2. Контракт выполнения tool-call внутри `GeminiSessionManager` должен быть единым и не зависеть от layout внутренних модулей CLI Core.
3. Ошибки должны быть разделены по категориям:
   - `auth/login` проблемы;
   - `runtime module compatibility` проблемы.
4. Автообновление не должно ломать рабочий provider без явной диагностики и fallback.

---

## 3. Матрица совместимости

| Компонент | 0.17.x | 0.27.x |
|---|---|---|
| `coreToolScheduler` | есть | есть |
| `nonInteractiveToolExecutor` | есть | нет |
| `scheduler/tool-executor` | нет | есть (используется как backend внутри scheduler path) |
| `turn` | есть | есть |
| `thoughtUtils` | есть | есть |

Вывод:
- Нельзя полагаться только на `nonInteractiveToolExecutor`.
- Нужен совместимый фасад исполнения tool-call с runtime detection backend.

---

## 4. Архитектурное решение

### 4.1 Runtime loader (cli-bridge)

`packages/Gemini_Module/src/runtime/cli-bridge.ts`:
- сохраняет загрузку обязательных модулей (`config`, `settings`, `extension`, `coreToolScheduler`, `turn`, `thoughtUtils`);
- для tool execution использует multi-path стратегию:
  1. попытка legacy backend (`nonInteractiveToolExecutor`);
  2. fallback на scheduler backend через `coreToolScheduler` (без hard dependency на legacy module entrypoint).

В metadata bridge добавляется диагностическое поле backend (например, `legacy_non_interactive` / `scheduler_fallback`).

### 4.2 Фасад исполнения tool-call

Добавляется микро-класс фасад (новый файл):
- `GeminiToolExecutorFacade`.

Контракт:
- `execute(config, request, signal): Promise<CompletedToolCall>`.

Реализация:
- если доступен legacy `executeToolCall` — используем его;
- иначе выполняем через scheduler backend (сбор `CompletedToolCall` в совместимом формате).

`GeminiSessionManager` вызывает только фасад и не знает о конкретном backend.

### 4.3 Installer/Provider safety

`GeminiInstaller` и `GeminiProviderAdapter`:
- перед финальной инициализацией провайдера выполняют bridge self-check;
- при module-compatibility ошибке возвращают отдельный reason (не смешивая с `auth_required`);
- автообновление не фиксируется как успешное, если post-update bridge load падает.

---

## 5. Изменяемые модули

- `packages/Gemini_Module/src/runtime/cli-bridge.ts`
- `packages/Gemini_Module/src/runtime/cli-types.ts`
- `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts` (new)
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/installer/gemini-installer.ts`
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`

Ограничения:
- без изменений стабильных потоков Phase 115/116 (Core continuity lock contract не трогаем).

---

## 6. Тестирование

### 6.1 Unit/Regression

1. loader fallback test: при отсутствии `nonInteractiveToolExecutor` выбирается scheduler backend.
2. facade test: единый `execute` возвращает корректный `CompletedToolCall` для legacy и fallback backend.
3. installer/provider test: compatibility error классифицируется отдельно от auth error.

### 6.2 Targeted runtime smoke

1. Инициализация Gemini provider в установленном окружении.
2. Отправка анкеты (description flow) через Gemini без `UNAVAILABLE`.
3. Базовый tool-call цикл без падения в module-loader.

---

## 7. Гейты и релиз

Обязательные гейты после каждой микрозадачи:
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
- `npm run check:links`
- таргетные сборки:
  - `npm run build --workspace @codeai-hub/gemini-module`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build:webview`
  - `npm run build:project-manager`
  - `npm run typecheck:webview`

Релизный финал:
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 8. Решение к утверждению

К реализации предлагается вариант:
- совместимый loader + фасад tool execution + installer self-check,
- затем полный релизный цикл с smoke-валидацией Gemini в установленном provider runtime.


## 12. Change Log
- **2026-02-11:** `1.1.560` — документация синхронизирована с текущей архитектурой; operational freeze сохранён без функциональных изменений Gemini runtime.
- **2026-02-10:** `1.1.545` — документация синхронизирована; operational freeze сохранён без функциональных изменений Gemini runtime.
- **2026-02-09:** `1.1.538` — подтверждён рабочий reviewer resume path для Gemini; дальнейшие Gemini-модификации поставлены на паузу до внедрения надёжной telemetry remaining context window.
- **2026-02-09:** Phase 117 implementation — добавлена runtime compatibility стратегия для `@google/gemini-cli-core` (`legacy_non_interactive` + `scheduler_fallback`), фасад `GeminiToolExecutorFacade`, диагностика module compatibility в installer/provider и regression tests для loader/facade.
- **2025-12-21:** Released v1.1.326 — подтверждена глобальная установка CLI/Core, автообновление при старте и корректная инициализация сервиса обновлений.
- **2025-12-20:** Released v1.1.325 — switched Gemini CLI/Core to global-only installs (no vendor cache) and added startup auto-update checks driven by provider auto-update settings. Settings UI now reads versions from global npm.
- **2025-11-29:** Released v1.1.320 — implemented `updateToLatest()` method for runtime CLI/Core updates. Settings UI now displays both Gemini CLI and CLI Core versions with a single Update button. CLI is installed globally to `~/.npm-global/` for user convenience.
- **2025-10-28:** Released v0.1.3 — session manager now restarts CLI transparently, hydrates the real session id from logs/chat files, and keeps subscribers alive across restarts; core manifest обновлён на `codeai-hub-core-darwin-arm64-0.2.10`.
- **2025-10-28:** Rebuilt the module as v0.1.2, updated core manifests (core v0.2.9) and Gemini installer logs to warn on missing credentials instead of aborting startup.
- **2025-10-28:** Implemented installer/session/message/provider adapters, added graceful downgrade path when CLI is absent, and exposed Gemini in the provider picker UI.
- **2025-10-27:** Initial draft outlining CLI usage, integration hooks, and TODOs.
