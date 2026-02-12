# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 143 — Claude Provider Home Isolation (owner: Oleksandr, updated: 2026-02-12)

**Goal:** запускать Claude Code CLI так, чтобы его сессии/транскрипты не смешивались с пользовательскими терминальными сессиями: `HOME=~/.codeai-hub/providers/claude/home/`.

### Stream: Provider Home Wiring
1. [DONE] Claude: добавить понятие provider-home для Claude (аналогично Codex), и запускать `claude` с `HOME=.../providers/claude/home` (scope: `packages/Claude_Module/*` runner/spawn, provider config; expected commit message: `feat(claude): isolate claude home under provider directory`)
2. [DONE] Git Commit: `feat(claude): isolate claude home under provider directory` (hash: b4080324)
3. [DONE] Claude: использовать provider-home для `projectPath` (чтобы сессии/транскрипты Claude не смешивались) (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/provider/claude-provider-adapter.ts`; expected commit message: `fix(claude): use provider-home for project paths`)
4. [DONE] Git Commit: `fix(claude): use provider-home for project paths` (hash: a93fb122)
5. [DONE] Claude: резолвить cwd по sessionId из provider-home `projects/` (scope: `packages/Claude_Module/src/sdk/claude-context-usage-cwd-resolver.ts`; expected commit message: `fix(claude): resolve cwd from provider-home projects`)
6. [DONE] Git Commit: `fix(claude): resolve cwd from provider-home projects` (hash: 538ba22b)

### Stream: Release Build (Phase 143)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.565`) (scope: manifests; expected commit message: `chore(release): run build-all for phase143`)
2. [DONE] Git Commit: `chore(release): run build-all for v1.1.565` (hash: 9b05bc28)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать VSIX (`codeai-hub-1.1.565.vsix`) (scope: scripts; expected commit message: `chore(release): build vsix for phase143`)
4. [DONE] Git Commit: `docs(todo): mark phase143 build-release done` (hash: 953a49c5)

---

## Phase 144 — Claude Usage Limits via RateLimit Headers (owner: Oleksandr, updated: 2026-02-12)

**Goal:** получать и показывать Claude лимиты (rolling 5h и 7d) в Session UI через ratelimit headers (подход `nsanden/claude-rate-monitor`), без слэш-команды `/usage`.

### Stream: OAuth Token Retrieval (Cross-Platform)
1. [DONE] Claude: реализовать получение OAuth токена без логирования секрета: приоритет `~/.claude/.credentials.json`, далее platform-specific store (macOS Keychain `Claude Code-credentials`, Linux `secret-tool`, Windows Credential Manager), с graceful fallback (scope: `packages/Claude_Module/src/sdk/*` token reader utils; expected commit message: `feat(claude): read claude oauth token cross-platform`)
2. [DONE] Git Commit: `feat(claude): read claude oauth token cross-platform` (hash: 58f2a1dd)

### Stream: Usage Probe + Parsing (Headers)
1. [DONE] Claude: заменить текущий `/usage` reader на probe-запрос к `https://api.anthropic.com/v1/messages` с `anthropic-beta: oauth-2025-04-20` (модель: `claude-haiku-4-5-20251001`, `max_tokens: 1`) и парсинг заголовков `anthropic-ratelimit-unified-5h-*` и `anthropic-ratelimit-unified-7d-*` (scope: `packages/Claude_Module/src/sdk/claude-usage-limits-*.ts`; expected commit message: `feat(claude): usage limits from ratelimit headers probe`)
2. [DONE] Git Commit: `feat(claude): usage limits from ratelimit headers probe` (hash: fb99c2d2)
3. [DONE] Claude: эмитить в стрим ровно тот же формат `usage_limits`, который уже ожидает UI; weekly только "all models", sonnet-only игнорировать (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/sdk/*`; expected commit message: `fix(claude): keep usage_limits stream contract stable`)
4. [DONE] Git Commit: `fix(claude): keep usage_limits stream contract stable` (hash: 31f7ae8c)

### Stream: Session UI Verification
1. [DONE] UI: проверить, что текущий UI pipeline (PM + Session ID Bar) корректно обновляется от новых `usage_limits` данных, без изменений формата (scope: `src/client/project-manager/components/sessions/*`, `src/client/ui/src/session/session-id-bar.tsx`; expected commit message: `test(ui): verify usage limits render with header-based probe`)
2. [DONE] Git Commit: `test(ui): verify usage limits render with header-based probe` (hash: 328fc2b9)

### Stream: Release Build (Phase 144)
1. [TODO] Выполнить `./scripts/build-all.sh` (версия: TBD) (scope: manifests; expected commit message: `chore(release): run build-all for phase144`)
2. [TODO] Git Commit: `chore(release): run build-all for phase144` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и собрать VSIX (scope: scripts; expected commit message: `chore(release): build vsix for phase144`)
4. [TODO] Git Commit: `chore(release): build vsix for phase144` (hash: TBD)

---

## Phase 145 — Provider Auth Symlinks (Claude + Codex) + Release (owner: Oleksandr, updated: 2026-02-12)

**Goal:** изолировать provider-home для сессий, но не ломать терминальные сессии и не дублировать auth state: использовать симлинки на “родные” auth файлы там, где это возможно.

### Stream: Claude Auth State Link
1. [DONE] Claude: вместо копирования/создания отдельного auth state в provider-home, сделать link стратегии для `~/.claude.json` (на macOS/Linux: symlink provider-home `.claude.json` -> реальный `$HOME/.claude.json`; на Windows: fallback на copy) и проверить что `claude -p --resume ... /context` видит сессии, созданные CodeAI Hub (scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts` + при необходимости новый micro-helper в `packages/Claude_Module/src/sdk/*`; expected commit message: `fix(claude): link auth state into provider-home`).
2. [DONE] Git Commit: `fix(claude): link auth state into provider-home` (hash: e74cd8b4)

### Stream: Codex Auth/Config Links
1. [DONE] Codex: заменить миграцию `auth.json`/`config.toml` из `~/.codex` на symlink стратегию (на macOS/Linux: symlink `~/.codeai-hub/providers/codex/home/{auth.json,config.toml}` -> `~/.codex/{auth.json,config.toml}`; на Windows: fallback на copy) (scope: `packages/Codex_Module/src/auth/sdk-auth-manager.ts`; expected commit message: `fix(codex): link auth/config into provider-home`).
2. [DONE] Git Commit: `fix(codex): link auth/config into provider-home` (hash: bcea57b6)

### Stream: Release Build (Phase 145)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.566`) (scope: manifests; expected commit message: `chore(release): run build-all for phase145`)
2. [DONE] Git Commit: `chore(release): run build-all for v1.1.566` (hash: 77e7bedb)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать VSIX `codeai-hub-1.1.566.vsix` (scope: scripts; expected commit message: `chore(release): build vsix for phase145`)
4. [DONE] Git Commit: `chore(release): build vsix for phase145` (hash: fe02a134)

---

## Phase 146 — Claude Provider-Home OAuth Bootstrap + Release (owner: Oleksandr, updated: 2026-02-12)

**Goal:** убрать `Not logged in · Please run /login` в provider-home с автоматическим bootstrap авторизации до запуска первой Claude сессии (Анкеты), сохранив независимость обычного терминального `HOME`.

### Stream: Claude OAuth Env Bootstrap (Core Gate Before First Session)
1. [DONE] Claude: добавить в auth layer автоматическое получение OAuth access token и проброс `CLAUDE_CODE_OAUTH_TOKEN` в runtime env Claude-процессов (`HOME=~/.codeai-hub/providers/claude/home`), с безопасным fallback без логирования секрета (scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `fix(claude): inject oauth token for provider-home sessions`).
2. [DONE] Git Commit: `fix(claude): inject oauth token for provider-home sessions` (hash: 24f0460b)
3. [DONE] Claude: добавить preflight gate перед первой рабочей сессией (до Анкеты): проверка non-interactive запроса в provider-home, при фейле запуск login-bootstrap flow и повторная проверка перед стартом сессии (scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, `packages/core/src/provider-registry/index.ts`; expected commit message: `feat(claude): add provider-home login preflight gate`).
4. [DONE] Git Commit: `feat(claude): add provider-home login preflight gate` (hash: e40ca9cb)

### Stream: Session Start Verification
1. [DONE] Claude: проверить сценарий старта первой Анкеты в чистом provider-home (без ручного `/login`) и убедиться, что сессии пишутся в `~/.codeai-hub/providers/claude/home/.claude/projects/*`, а терминальный `HOME` остается независимым (scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `test(claude): verify provider-home auth bootstrap and session paths`).
2. [DONE] Git Commit: `test(claude): verify provider-home auth bootstrap and session paths` (hash: 58d61b9c)

### Stream: Release Build (Phase 146)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.569`) (scope: manifests; expected commit message: `chore(release): run build-all for phase146`)
2. [DONE] Git Commit: `chore(release): run build-all for phase146` (hash: 107f184b)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать VSIX `codeai-hub-1.1.569.vsix` (scope: scripts; expected commit message: `chore(release): build vsix for phase146`)
4. [DONE] Git Commit: `chore(release): build vsix for phase146` (hash: 3cc44984)
