# Gemini CLI Module Integration Guide

**Status:** Active (CommonJS bridge)

**Last Updated:** 2025-11-29

**Maintainer:** Codex / CodeAI Hub Core Team

---

## 1. Purpose
This document captures the requirements and integration notes for adding Google Gemini CLI support to CodeAI Hub. It complements the Claude and Codex module guides and serves as the architectural reference for the upcoming `Gemini_Module` package.

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
- **Managed install:** `packages/Gemini_Module/src/installer/gemini-installer.ts` теперь подготавливает только `@google/gemini-cli-core`, складывая его в `dist/vendor/node_modules/@google/…` внутри установленного модуля (`~/.codeai-hub/providers/gemini/<version>`). Сам CLI (`@google/gemini-cli`) пользователь устанавливает глобально (например, `npm install -g @google/gemini-cli`); во время инициализации `cli-bridge` сканирует PATH, npm prefix (включая `.npm-global`) и стандартные каталоги, чтобы определить расположение и версию инструмента. Во время скачивания/установки `GeminiInstaller` отправляет `reporter.progress` (в том числе с флагом `firstRun`), чтобы UI показывал конкретный шаг.
- **Runtime updates (v1.1.320):** Метод `GeminiInstaller.updateToLatest()` позволяет обновлять Gemini CLI и CLI Core во время работы расширения. Он запрашивает latest версию из npm registry, скачивает tarballs обоих пакетов и распаковывает их в vendor директорию. CLI также устанавливается глобально в `~/.npm-global/` для удобства использования команды `gemini login`. Settings UI вызывает этот метод через `ProviderVersionService.updateGeminiAll()`.
- **Runtime requirements:** Node.js ≥ 20.0.0 (используется bundled runtime ядра), macOS/Linux/Windows поддерживаются CLI.
- **Version pinning:** manifest `codeaiHub` внутри `package.json` модуля (1.1.300) фиксирует версии `geminiCliVersion` и `geminiCliCoreVersion` (0.16.0). Контрольные суммы проверяются при скачивании.
- **Settings telemetry (1.1.300+)**: ProviderVersionService читает `assets/providers/gemini/manifest.json` внутри VSIX и сравнивает его с локальным `~/.codeai-hub/providers/gemini/<version>/dist/vendor/node_modules/@google/gemini-cli-core/package.json`. Поэтому необходимо поддерживать синхронные значения версий и гарантировать наличие `package.json` в vendor-каталоге, иначе карточка Gemini в Settings UI будет показывать `Not detected`.
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
- ✅ **Installer** — подготавливает `@google/gemini-cli-core` в vendor, удаляет устаревшие копии CLI и генерирует `cli-bridge.json` с контрольной информацией (ожидаемая версия инструмента, фактическая версия core и путь найденного `gemini`). Emit'ит `reporter.progress`, чтобы RemoteBridge мог транслировать стадии «загрузка», «подготовка зависимостей», «готово».
- ✅ **Runtime Updater (v1.1.320)** — метод `updateToLatest()` позволяет обновлять оба пакета (CLI и Core) из Settings UI без перезапуска расширения. Скачивает tarballs из npm registry, распаковывает в vendor, устанавливает CLI глобально.
- ✅ **CLI Bridge (`src/runtime/cli-bridge.ts`)** — использует динамический `import()` через `Function("return import(specifier);")`, конвертирует пути в file URL и загружает ESM-модули CLI/Core без `require()` (устранён `ERR_REQUIRE_ESM`).
- ✅ **Session Manager** — работает поверх официального CLI Core (`contentGenerator`, `toolScheduler` и т.д.), управляет потоками, журналирует события, очищает окружение от конфликтующих `GOOGLE_*` переменных.
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

## 12. Change Log
- **2025-11-29:** Released v1.1.320 — implemented `updateToLatest()` method for runtime CLI/Core updates. Settings UI now displays both Gemini CLI and CLI Core versions with a single Update button. CLI is installed globally to `~/.npm-global/` for user convenience.
- **2025-10-28:** Released v0.1.3 — session manager now restarts CLI transparently, hydrates the real session id from logs/chat files, and keeps subscribers alive across restarts; core manifest обновлён на `codeai-hub-core-darwin-arm64-0.2.10`.
- **2025-10-28:** Rebuilt the module as v0.1.2, updated core manifests (core v0.2.9) and Gemini installer logs to warn on missing credentials instead of aborting startup.
- **2025-10-28:** Implemented installer/session/message/provider adapters, added graceful downgrade path when CLI is absent, and exposed Gemini in the provider picker UI.
- **2025-10-27:** Initial draft outlining CLI usage, integration hooks, and TODOs.
