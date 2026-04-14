# Codex Thinking Translation Bootstrap Path Hotfix

**Status:** Approved for implementation
**Date:** 2026-04-14
**Owner:** Oleksandr + Codex
**Scope:** release hotfix for live `thinking` / `reasoning` translation in Codex workflow sessions

---

## 1. Проблема

После релиза `1.1.982` пользователь подтвердил, что:

- интерфейсная локализация и user-facing artifact language работают корректно;
- live `thinking` в Codex workflow-сессиях остаётся на английском;
- ожидаемая chunked overlay-подмена (`source-first` -> асинхронный русский overlay) не происходит вообще.

Анализ runtime-логов на workspace
`/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`
показал:

- provider действительно эмитит visible thinking;
- Core принимает эти сообщения и ставит их в translation queue;
- каждый thinking-fragment немедленно скипается с
  `skipReason = "localization_sync_pending"`;
- до `TranslationFacade.translate(...)` путь не доходит ни разу;
- `session:message_translation` / `dialog:message_translation` patches не появляются.

Следовательно, проблема находится не в chunk planner и не в UI patch apply, а в gating policy перед dispatch.

---

## 2. Корневая причина

`SessionTranslationPolicyResolver` читает persisted localization bootstrap через:

- `settingsPath = ~/.codeai-hub/settings/settings.json`
- helper `resolveCodeAiHomeDirectory(settingsPath)`
- `resolveLocalizationPaths(...)`

Но `resolveLocalizationPaths(homeDirectory)` ожидает обычный user home и сам добавляет
`.codeai-hub/localization/...`.

Текущий resolver передаёт туда уже готовый CodeAI root
`~/.codeai-hub`, из-за чего получается ложный путь:

- фактический bootstrap:
  `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`
- вычисленный resolver path:
  `~/.codeai-hub/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`

Из-за этого:

- persisted bootstrap никогда не читается;
- `persistedSnapshot === null`;
- `matchingBootstrap === false`;
- policy всегда остаётся `enabled = false` и `skipReason = "localization_sync_pending"`.

Это постоянная логическая ошибка path-resolution, а не временный startup race.

---

## 3. Граница фикса

Hotfix должен быть минимальным и не трогать:

- `@codeai-hub/translation` chunk planning;
- provider message emission;
- unified-session overlay storage;
- UI patch application;
- localization materialization contract.

Меняем только:

1. Core translation policy path resolution.
2. Regression coverage для чтения persisted bootstrap.
3. SSOT-документацию модуля runtime translation.

---

## 4. Предлагаемое решение

### 4.1. Код

Исправить `SessionTranslationPolicyResolver`, чтобы он читал bootstrap из canonical CodeAI root без двойного добавления `.codeai-hub`.

Допустимый hotfix path:

- вычислять CodeAI root как `path.dirname(path.dirname(settingsPath))`;
- строить путь к bootstrap напрямую от этого root;
- не передавать CodeAI root в `resolveLocalizationPaths(homeDirectory)`, потому что этот helper работает в координатах user home, а не CodeAI root.

### 4.2. Тесты

Добавить regression test, который поднимает temp-home layout в production-форме:

- `<tmp>/.codeai-hub/settings/settings.json`
- `<tmp>/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`

и подтверждает, что policy становится:

- `enabled = true`
- `targetLanguage = "ru"`
- `skipReason = null`

Дополнительно нужен negative-case на отсутствующий bootstrap, чтобы baseline
`localization_sync_pending` оставался корректным для реального missing-file сценария.

### 4.3. Документация

Обновить SSOT shared runtime translation модуля:

- явно зафиксировать, что thinking overlay gating опирается на persisted bootstrap snapshot;
- указать, что bootstrap read использует canonical CodeAI localization path under
  `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`.

---

## 5. Валидация

Минимальный набор валидации:

1. Unit tests для `SessionTranslationPolicyResolver`.
2. Таргетная сборка Core package.
3. Полный release cycle:
   - обновление `README.md` и `CHANGELOG.md` на будущую версию;
   - `./scripts/build-all.sh`;
   - `./scripts/build-release.sh --use-current-version`.

Ожидаемый результат после hotfix:

- в `core.log` появляются `Session translation dispatch started` и
  `Session translation completed`;
- thinking overlay начинает приходить через translation patches;
- user-facing thinking в Codex workflow-сессиях снова апгрейдится на русский по мере поступления фрагментов.

---

## 6. Release Decision

Изменение требует нового release hotfix.

Целевая версия для этого execution cycle:

- `1.1.983`
