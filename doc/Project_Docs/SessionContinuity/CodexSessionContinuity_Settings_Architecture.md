# Codex Session Continuity — Settings Threshold (Architecture)

**Date:** 2026-02-03
**Scope:** Settings UI + Settings Snapshot (`providers.codex`) 
**Status:** Approved (Phase 94)
**Owner:** Oleksandr + Codex

---

## 1) Problem

Для Claude уже есть настройка **Session Continuity** (порог оставшегося контекстного окна в процентах), которая будет использоваться в будущем для автозавершения текущей сессии отчётом (handoff) и автоматического старта новой сессии с чтением этого отчёта.

Для Codex аналогичной настройки сейчас нет.

## 2) Goal

Добавить в Settings для Codex такой же параметр:

- **Codex Session Continuity**
- Описание (как у Claude):
  - когда remaining context window становится меньше/равно порогу, CodeAI Hub сможет автоматически завершить текущую сессию отчётом и начать новую;
- Поле ввода: **Remaining context threshold (%)**
- Значение по умолчанию: **30%**

## 3) Non-goals

- Не реализуем сам триггер/автоматизацию continuity в этой фазе.
- Не меняем логику подсчёта token usage для Codex.
- Не меняем протоколы/контракты Core Bridge.

## 4) Proposed solution

### 4.1 Settings schema (source of truth)

Добавить в settings snapshot новый блок:

- `providers.codex.sessionContinuity.remainingPercentThreshold: number`

Поведение:
- если поля нет или оно некорректно — используем default `30`;
- clamp диапазона — **min 5**, **max 80** (как у Claude), значение целочисленное.

Файл хранения: `~/.codeai-hub/settings/settings.json`.

### 4.2 Extension-side normalization

Сделать параллельно Claude:
- обновить `src/extension-module/settings/codex-settings.ts`:
  - добавить тип `CodexSessionContinuitySettings`;
  - добавить `DEFAULT_CODEX_SESSION_CONTINUITY_SETTINGS`;
  - добавить clamp/normalize для `remainingPercentThreshold`;
  - добавить поле `sessionContinuity` в `CodexSettings` и `DEFAULT_CODEX_SETTINGS`.

`DEFAULT_SETTINGS_SNAPSHOT` автоматически подхватит изменения через `DEFAULT_CODEX_SETTINGS`.

### 4.3 Webview Settings UI

В Codex табе (`SettingsView`) добавить карточку `SettingsCard`:

- Title: `Codex Session Continuity`
- Description: как у Claude (про wrap-up report и старт новой сессии)
- Input:
  - `type="number"`, `min=5`, `max=80`
  - value: `settings.providers.codex.sessionContinuity.remainingPercentThreshold`

### 4.4 Webview state model

Параллельно Claude добавить поддержку поля в webview state:

- `src/client/ui/src/components/settings/settings-state-raw.ts`
  - `RawCodexSessionContinuitySettings`
  - `RawCodexSettings.sessionContinuity?: ...`
- `src/client/ui/src/components/settings/settings-state-model.ts`
  - `CodexSettings.sessionContinuity`
  - `mapCodexContinuity()` с clamp и default
- `src/client/ui/src/components/settings/settings-state-helpers.ts`
  - `updateCodexContinuityRemainingPercentThreshold()`
- `src/client/ui/src/components/settings/use-settings-state.ts`
  - handler `handleCodexContinuityRemainingPercentThresholdChange()`

## 5) Future trigger (context)

В будущем (отдельная фаза) планируется логика:
- при достижении `remaining% <= threshold`:
  1) сформировать отчёт/handoff (сжатый контекст)
  2) завершить текущую сессию
  3) стартовать новую сессию, используя отчёт как входной контекст

Эта архитектура **не реализуется** в данной фазе — сейчас добавляем только настройку/контракт.
