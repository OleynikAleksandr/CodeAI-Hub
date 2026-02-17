# Gemini Model Selection (CodeAI Hub)

**Status:** Active (reference; SSOT in code)
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr + Codex

---

## 1) Source of truth

В CodeAI Hub список рекомендуемых Gemini-моделей и поддерживаемых уровней thinking хранится **в коде**:

- `src/types/gemini-model-registry.ts`
  - `GEMINI_RECOMMENDED_MODELS`
  - `DEFAULT_GEMINI_MODEL_ID`
  - `GEMINI_THINKING_LEVELS` / `DEFAULT_GEMINI_THINKING_LEVEL`

Этот документ — справка по тому, **как устроен выбор**, и где он хранится.

---

## 2) Где хранится выбор

**Settings file:** `~/.codeai-hub/settings/settings.json`

Ключи:
- `providers.gemini.defaultModel` — модель по умолчанию.
- `providers.gemini.thinkingLevelByModel` — per-model thinking level.

Пример:
```json
{
  "providers": {
    "gemini": {
      "defaultModel": "gemini-3-pro-preview",
      "thinkingLevelByModel": {
        "gemini-3-pro-preview": "high",
        "gemini-3-flash-preview": "medium"
      }
    }
  }
}
```

---

## 3) Thinking levels

Канон уровней thinking и их смысл — `GEMINI_THINKING_LEVELS` в `src/types/gemini-model-registry.ts`.

Значения:
- `off`
- `minimal`
- `low` (default)
- `medium`
- `high`

Важно: конкретная модель может поддерживать не все уровни (см. `supportedThinkingLevels` в `GEMINI_RECOMMENDED_MODELS`).

---

## 4) Maintenance note

Если Google меняет доступные модели/семейства/названия — обновляем **только** `src/types/gemini-model-registry.ts` и убеждаемся, что Settings UI показывает ровно этот список.
