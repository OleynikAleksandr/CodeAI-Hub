# Codex Model Selection (CodeAI Hub)

**Status:** Active (reference; SSOT in code)
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr + Codex

---

## 1) Source of truth

В CodeAI Hub список поддерживаемых/рекомендуемых Codex-моделей и уровней reasoning хранится **в коде**, а не в документации:

- `src/types/codex-model-registry.ts`
  - `CODEX_SETTINGS_MODELS` — модели, которые показываются в Settings UI.
  - `DEFAULT_CODEX_MODEL_ID` — дефолт.
  - `CODEX_REASONING_LEVELS` / `DEFAULT_CODEX_REASONING_LEVEL` — уровни reasoning.

Этот документ — справка по тому, **как устроен выбор** и где он хранится.

---

## 2) Где хранится выбор

**Settings file:** `~/.codeai-hub/settings/settings.json`

Ключи:
- `providers.codex.defaultModel` — модель по умолчанию (например `gpt-5.3-codex`).
- `providers.codex.reasoningByModel` — per-model reasoning (например `high` для одной модели и `medium` для другой).

Пример:
```json
{
  "providers": {
    "codex": {
      "defaultModel": "gpt-5.3-codex",
      "reasoningByModel": {
        "gpt-5.3-codex": "high",
        "gpt-5.2": "medium"
      }
    }
  }
}
```

---

## 3) Reasoning levels

Канон уровней reasoning и их смысл — `CODEX_REASONING_LEVELS` в `src/types/codex-model-registry.ts`.

Значения:
- `low`
- `medium` (default)
- `high`
- `xhigh`

---

## 4) Maintenance note

Если список моделей/описания/рекомендации меняются — обновляем **только** `src/types/codex-model-registry.ts` и убеждаемся, что Settings UI и запуск новых сессий используют те же значения.
