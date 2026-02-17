# Knowledge Base

**Status:** Active (knowledge index)
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr + Codex


Практические руководства, справочники и KB-статьи.

---

## Структура

### `guides/` — Практические руководства

| Файл | Описание |
|------|----------|
| `ProviderSetupGuide.md` | Установка и настройка CLI/SDK провайдеров |
| `Local_Artifacts_Workflow.md` | Локальные артефакты при разработке |

### `model-reference/` — Справочники моделей

| Файл | Описание |
|------|----------|
| `Claude_Model_Aliases.md` | Алиасы моделей Claude (sonnet, opus, haiku) |
| `Codex_Model_Selection.md` | Модели Codex и reasoning levels |
| `Gemini_Model_Selection.md` | Модели Gemini CLI |

SSOT (source of truth) для выбора/алиасов моделей — **в коде**, а не в этих справочниках:
- `src/types/claude-model-registry.ts`
- `src/types/codex-model-registry.ts`
- `src/types/gemini-model-registry.ts`


### `kb/` — KB-статьи (проблемы и решения)

| Файл | Описание |
|------|----------|
| `codex-thinking-display.md` | Отображение размышлений Codex в UI |
