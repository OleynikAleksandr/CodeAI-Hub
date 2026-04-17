# Session 44 — Audit Cleanup 1.2.10 + Gemini 3.1 Pro High-Thinking Stabilisation (1.2.11-1.2.15)

**Date:** 2026-04-17 18:30 CEST
**Branch:** main
**Version:** 1.2.15 (released, retest passed)
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Overview

Большая сессия — **шесть последовательных релизов** 1.2.10 → 1.2.15, 41 коммит, плюс аудит кодовой базы и несколько архитектурных решений. Запустили формальный periodic audit процесс (первый прецедент), починили series багов на комбинации `Gemini 3.1 Pro Preview + thinkingLevel=high + Description Agent` которая стабильно валила стоковую конфигурацию. По итогам — Gemini на high-thinking полностью работает end-to-end (создание Final_Description.md, ответы на уточняющие вопросы, корректировка документа), label в SESSION panel стабилен от первого фрейма, Core больше не падает при cli-core self-abort.

## 1.1. 1.2.10 — Audit Cleanup (первый формальный periodic audit)

Пользователь попросил полный аудит кодовой базы с предложениями. Запустили двух Explore sub-agents параллельно (dead-code + broken-docs-links) + baseline-прогон существующих гейтов (`check:knip`, `check:links`, `check:dup`). Классификация duplications — отдельно через top-20 jscpd клонов.

**4 направления:**
- **A. Docs + config verification.** Три audit-flag'а investigated — ни один НЕ является code bug'ом. `Docs_Index.md:80-82` bundled template paths корректны (agent перепутал `BUNDLED_TEMPLATE_SOURCES` destinationRelativePath с workspace instance paths). `knip.json` exclusion для diagram-DSL parser chain intentional. `spec-creator` TODO в третьей published пакете, not actionable. Docs_Index.md расширен документированием per-workspace instance layout — чтобы следующие audit'ы не повторили ту же ошибку.
- **B. Localization cleanup.** Python-скрипт `/tmp/audit-loc-keys.py` прошёл 278 ключей через three-pass grep (exact / parent-prefix / last-segment). Результат: 204 alive, 67 suspicious (partial dynamic match), **7 certainly-dead**. Удалены 7: `workflow_terms_policy.keep_english_label/translate_label` (ui_labels), `do_not_translate_terms.validation.latin_letter/reserved_sequence/too_long` + `workflow_terms_policy.keep_english_description/translate_description` (ui_helper_text). 67 suspicious оставлены без изменений. Dry-run отчёт `Plans/Archive/Audit_Cleanup_1.2.10_DryRun_LocKeys.md` сохранён как методологический reference.
- **C. Duplication refactor (scope-bounded).** Top-20 из 233 jscpd клонов классифицированы: 11 LEGIT-PROVIDER, 4 LEGIT-BOUNDARY, 2 LEGIT-SIMILAR-BUT-DIVERGING, 1 EXTRACT-EASY, 3 EXTRACT-COMPLEX, 1 WITHIN-FILE-BUG. Выполнено **три extract'а**: (C1) `useBootstrapSettings` → `src/client/ui/src/shared-hooks/` (после fix'а tsconfig rootDir); (C2) `createWorkspaceFileHandler` factory в `workspace-file-service.ts`; (C3) `idea-collector-schema-utils.ts` импортирует из `packages/agents/shared/src/schema-utils/`. `check:dup` на `src/`: 2.06% → 1.97%.
- **D. Process formalization.** Новый `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` — чек-лист периодического аудита (cadence, sub-agent workflow, 6-категорийный rubric, three-pass grep protocol, scope approval flow). Новый SSOT **Invariant 29** "Acceptable parallel-scaffolding duplication" — формализует что ~200 клонов в репо архитектурно оправданы и рефакторить их НЕЛЬЗЯ.

**Commits 1.2.10:** 14 (`a84a43490` ... `168f51277`), включая один in-cycle fix `62f559954` для перемещения shared-hook в webview-exclude zone (tsc rootDir issue на release build).

## 1.2. 1.2.11 — Gemini Initial-Leg Watchdog Bump

На 1.2.10 retest пользователь обнаружил: Gemini 3.1 Pro Preview + `thinkingLevel=high` на первом turn'е Description Agent **стабильно валится через 60с** с `Gemini stream stalled after 60s without progress.` 

Root cause: `DEFAULT_STALLED_TURN_WATCHDOG_MS = 60_000` в `gemini-session-lifecycle.ts` был одинаковый для всех thinking levels. Gemini 3.1 Pro на high уходит в silent deep-reasoning фазу на больших prompt'ах (Description Agent system-instruction + questionnaire) и перестаёт слать events на stream больше минуты — наш watchdog режет живое reasoning как hung.

Initially предлагал adaptive-per-thinking-level (30/60/120/180с), но пользователь попросил simple bump на 240с для всех. Сделано: `DEFAULT_STALLED_TURN_WATCHDOG_MS = 60_000 → 240_000`, post-tool 120_000 оставлен.

**Commits 1.2.11:** 5 (`73a2d3b00` ... `83dfd2ea1`).

## 1.3. 1.2.12 — Abort-Crash Suppression + Mis-Routed Thinking Reroute

1.2.11 retest проявил **ещё два** бага:

**Bug A — Core daemon crash.** После retest с thinking=high: `@google/gemini-cli-core` `GeminiClient.processTurn` (client.js:539) внутри себя вызывает `controller.abort()` на loop-detection. Resulting AbortError rejects в background Promise chain cli-core+node-fetch, параллельно нашему `runTurn` iterator → `uncaughtException` → крах daemon. Native `gemini` CLI выживает потому что его `submitQuery` имеет внешний try/catch игнорирующий `error.name === "AbortError"`.

**Bug B — Mis-routed thinking.** Gemini 3.1 Pro + high на больших prompt'ах эмитит свой internal meta-prompt (`sthought`, `CRITICAL INSTRUCTION 1:`, `Related tools:`, `Plan:`, `Drafting the content`) через `Content` events вместо `Thought` events. Наш normalizer корректно писал это в assistant bubble → юзер видел 10k+ символьный английский meta-prompt в dialog'е.

**Fix A:** `process.on("uncaughtException", handler)` в `packages/core/src/index.ts` с selective AbortError suppression для `@google/gemini-cli-core` stacks через allowlist `PROVIDER_ABORT_SUPPRESSION_STACKS`. Любой другой uncaughtException re-thrown (сохраняется crash-safety для реальных bug'ов).

**Fix B:** `hasMisroutedThinkingPrefix(text)` detector в `gemini-assistant-event-normalizer.ts` + routing через существующий `emitInlineThoughtAsThinking` overlay path (тот же который используется для 1.2.9 inline `[Thought: true]` splitter).

Новый SSOT **Invariant 30** "Provider uncaughtException safety". Invariant 7 (Provider dialog segment preservation) Gemini branch расширен.

**Commits 1.2.12:** 7 (`d5e700c57` ... `12b25baa3`).

## 1.4. 1.2.13 — Model Label Flicker Fix (Core-side)

Пользователь скриншотами показал UI label мерцает в SESSION status panel между `Gemini 3.1 Pro Preview (thinking high)` и `Gemini 3.1 Pro Preview (high)` внутри одного turn'а.

Root cause: **два разных broadcast пути** `session:model:update` шлют modelId в **разных формах**. `broadcastRuntimeModelUpdate` в `session-provider-event-router.ts` форвардит raw `data.model` от SDK `model_info` events (без effective suffix'а); `session-request-handler-message-dispatch.ts` шлёт полную effective identity (`"gemini-3.1-pro-preview thinking:high"`). UI renderer в `model-info-builder.ts` парсит их по-разному — одна форма даёт `(thinking high)`, другая (через settings fallback) — `(high)`.

**Fix:** `SessionRequestHandlerAppliedTurnConfig.resolveEffectiveModelId(providerId, targetModelId)` публичный helper; `SessionProviderEventRouter` получает optional dependency; `broadcastRuntimeModelUpdate` обогащает raw modelId effective id'ом перед broadcast'ом. Invariant 14 расширен broadcast-contract'ом.

**Commits 1.2.13:** 5 (`fbe731f00` ... `859edee48`).

## 1.5. 1.2.14 — Post-Tool Watchdog Bump

1.2.13 retest: **ровно через 120с** после успешного initial turn'а с 2 `read_file` tool_calls, post-tool leg killed: `Provider turn failed: Gemini stream stalled after 120s without progress.` Но Gemini был жив — после timeout'а пользователь написал "Продолжай" и модель ответила в течение минуты.

1.2.11 rationale "follow-up legs уже учитывают nested reasoning, 120с хватит" — оказался неверным. Gemini 3.1 Pro на high может silent'ить в post-tool leg'е так же долго как в initial.

**Fix:** `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 120_000 → 240_000`. Симметрично с initial. Adaptive-per-thinking-level по-прежнему deferred.

**Discussion:** пользователь задал важный вопрос "есть ли у Gemini API keepalive/health signal чтобы отличать 'busy' от 'dead'?" — ответ: **нет** на уровне SDK. HTTP/2 PING frames обрабатываются node-fetch internally и не доходят до cli-core. Единственный signal живости — фактические stream events. Обсудили future UX: soft-warn вместо hard-kill watchdog, с кнопкой Stop у юзера + hard-threshold safety net на большой таймаут (10 мин). Отложено в pending follow-ups.

**Commits 1.2.14:** 5 (`53ae28f2e` ... `dd34dd0e9`).

## 1.6. 1.2.15 — Client Label Fallback Fix (Client-side)

1.2.14 retest показал что label мерцает ещё раз — **клиент-сайд fallback** в `resolveModelReasoning` возвращал raw level из settings (`"high"`) вместо prefixed формы (`"thinking high"`), что давало разные label'ы при initial render (до первого `session:model:update` от Core) vs после broadcast'а. 1.2.13 починил только Core-side, клиент-сайд я пропустил.

**Fix:** для Gemini fallback → `thinking ${level}`, для Codex → `reasoning ${level}`. Claude keeps own convention (`"thinking off"` / raw effort). Invariant 14 client-side extension добавлен.

**Commits 1.2.15:** 5 (`86ac44c78` ... `57e1cd7a9`).

## 1.7. Retest verdict

Пользователь протестировал 1.2.15:
- **Gemini ответил через 2 минуты** на follow-up turn — post-tool watchdog больше не режет живое reasoning.
- **Label стабилен от первого фрейма** — обе стороны (Core + client) выдают consistent `(thinking high)`.
- Мерцаний больше не наблюдает.

Gemini 3.1 Pro Preview + thinkingLevel=high + Description Agent теперь **полностью рабочая комбинация** end-to-end.

## Git commits (этой сессии)

(REFERENCE ONLY: 41 commit, reference-only для исторической трассировки. Следующая сессия не обязана перечитывать все коммиты.)

### 1.2.10 cycle (released, 14 commits)
- `a84a43490 docs: prepare 1.2.10 release notes for audit cleanup`
- `237fa47b8 chore: direction A audit verification`
- `8315cbcb8 docs: record 1.2.10 localization cleanup dry-run report`
- `98a662b1d chore(loc): remove 7 certainly-dead localization keys from approved dicts`
- `a41f14422 refactor(client): extract useBootstrapSettings to shared hook`
- `23fd8a874 refactor(core): DRY workspace-file-service handlers via createWorkspaceFileHandler factory`
- `6e9368b54 refactor(client): consolidate schema-utils imports from agents/shared`
- `3e1f13a85 docs: add PeriodicAudit checklist for recurring codebase hygiene`
- `aeccdc602 docs: promote acceptable-duplication invariant to SSOT`
- `b533a01db docs: archive 1.2.10 audit cleanup planning doc + dry-run appendix`
- `1a0c73b34 docs: mark 1.2.10 streams 1-9 DONE in todo-plan`
- `04208b8a4 chore: bump version to 1.2.10`
- `62f559954 fix(client): move shared bootstrap hook into webview exclude zone` (in-cycle fix)
- `168f51277 docs: close 1.2.10 todo-plan after build`

### 1.2.11 cycle (released, 5 commits)
- `73a2d3b00 docs: prepare 1.2.11 release notes`
- `7a0eaf18d fix(gemini): bump initial-leg stalled-turn watchdog to 240s`
- `e7e415af3 docs: archive 1.2.11 Gemini initial-watchdog planning doc`
- `60629b17a chore: bump version to 1.2.11`
- `83dfd2ea1 docs: close 1.2.11 todo-plan after build`

### 1.2.12 cycle (released, 7 commits)
- `d5e700c57 docs: prepare 1.2.12 release notes`
- `5c7239fcc fix(core): suppress Gemini cli-core AbortError to prevent daemon crash`
- `36c0c60de fix(gemini): reroute misrouted thinking content`
- `1ff87a385 docs: promote Gemini abort-crash + misrouted-thinking contracts to SSOT`
- `421b6c881 docs: archive 1.2.12 planning doc`
- `118c71b35 chore: bump version to 1.2.12`
- `12b25baa3 docs: close 1.2.12 todo-plan after build`

### 1.2.13 cycle (released, 5 commits)
- `fbe731f00 docs: prepare 1.2.13 release notes`
- `7dd868f2f fix(core): broadcast effective modelId on runtime model update to stabilise UI label`
- `540e2cce4 docs: extend Invariant 26 + archive 1.2.13 plan`
- `126ebc2e0 chore: bump version to 1.2.13`
- `859edee48 docs: close 1.2.13 todo-plan after build`

### 1.2.14 cycle (released, 5 commits)
- `53ae28f2e docs: prepare 1.2.14 release notes`
- `81c64c58b fix(gemini): bump post-tool stalled-turn watchdog to 240s`
- `785aeeb1b docs: archive 1.2.14 planning doc`
- `a46a6fb0d chore: bump version to 1.2.14`
- `dd34dd0e9 docs: close 1.2.14 todo-plan after build`

### 1.2.15 cycle (released, retest PASSED, 5 commits)
- `86ac44c78 docs: prepare 1.2.15 release notes`
- `f7772a221 fix(client): wrap Gemini/Codex settings fallback with provider-specific label prefix`
- `c4aa07c22 docs: archive 1.2.15 planning doc`
- `23fa20868 chore: bump version to 1.2.15`
- `57e1cd7a9 docs: close 1.2.15 todo-plan after build`

## Artifacts

- VSIX `codeai-hub-1.2.15.vsix` (2.2M) в корне репозитория.
- Tarballs 1.2.15 в `doc/tmp/releases/` и `~/.codeai-hub/releases/`: claude-module, codex-module, gemini-module, codeai-hub-core-darwin-arm64, CodeAIHubLauncher-macos-arm64, vscode-webview, project-manager.
- Новая cheklist `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` — первый precedent periodic audit'а.
- Новые SSOT invariants: **29** (Acceptable parallel-scaffolding duplication, 1.2.10) и **30** (Provider uncaughtException safety, 1.2.12). Invariants 7 (Gemini misrouted thinking), 14 (effective model identity broadcast + client fallback) расширены.
- Archived planning docs: Audit_Cleanup_1.2.10 + DryRun appendix, Gemini_InitialWatchdog_Bump_1.2.11, Gemini_AbortCrash_And_MisroutedThinking_1.2.12, ModelLabel_FlickerFix_1.2.13, Gemini_PostToolWatchdog_Bump_1.2.14, ClientLabelFallback_Fix_1.2.15.
- Archived todo-plans: по одному per cycle в `doc/TODO/Archive/`.

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем согласовать с пользователем новый scope.
- После этого открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Pending follow-ups (decisions made during Session044, explicitly deferred)

- **Adaptive watchdog per thinking level** для Gemini. Текущие defaults `240s/240s` для initial и post-tool leg'ов. Если retest'ы покажут что для `low`/`off` это слишком долго или для `high` ещё недостаточно — стоит перейти на adaptive: `high → 300s / medium → 180s / low → 60s / off → 30s`. См. archived 1.2.11 planning doc.
- **Soft-warn UX вместо hard-kill watchdog.** Обсуждалось во время 1.2.14: вместо auto-kill при тишине, показать UI warning "Модель долго думает (N секунд), продолжать ждать?" с кнопкой Stop. Hard-kill только на safety-net threshold (например 10 мин). Требует UI + Core wire-work, отдельный scope.
- **Провайдер health probe** для Gemini. Опционально опрашивать `cloudaicompanion.googleapis.com`/health во время watchdog silence чтобы различать "модель busy" vs "infra down". Idea, not priorиtised.
- **`MISROUTED_THINKING_PREFIXES` расширение** при появлении новых маркеров в retest'ах (Gemini quirk может эволюционировать).
- **Провайдер-level "beta/risky" флаг в Settings** — продуктовая идея из 1.2.14 discussion, чтобы пользователь видел "Gemini в бете, возможны затяжки" без полного отключения. Отложено.

## Процессные заметки

- **Audit-first подход работает.** Первый полноценный periodic audit (1.2.10) показал, что статические гейты (`knip`/`check:links`/`check:dup`) сами по себе недостаточны — нужен sub-agent'ский сfetch с классификацией top-N клонов. `PeriodicAudit.md` checklist формализовал процесс на будущее.
- **Retest-driven development на Gemini 3.1 Pro.** Серия 1.2.11 → 1.2.15 — это классический retest loop: fix → test → find adjacent bug → fix → repeat. Каждый релиз раскрывал следующий слой проблемы. Отдельные маленькие релизы лучше одного раздутого — даёт пользователю immediate retest, диагностика точная.
- **Invariant expansion как сигнал зрелости.** За сессию добавлено 2 новых invariant'а (29, 30) + расширено 3 существующих (7, 14, 26). Это не "documentation overhead" — это реальные archit contracts которые следующая сессия может просто следовать без re-discovery.
- **Два-путь bug pattern.** 1.2.13 + 1.2.15 — один и тот же functional bug (label flicker) имел два разных источника (Core broadcast + client fallback). Важный урок: fix должен покрывать **все пути** формирования observable output'а, не только первый найденный. Проверять ВСЕ callsites перед closing.
- **Google инференс реально медленный на high.** 2+ минуты silent reasoning — это нормальная latency сейчас. Watchdog defaults должны это учитывать.
- **Claude/Codex не страдают от Gemini-специфичных багов.** Все 6 релизов фиксят только Gemini quirks. Claude и Codex остаются полностью рабочими; пользователь может продолжать на них если Gemini нестабилен.
