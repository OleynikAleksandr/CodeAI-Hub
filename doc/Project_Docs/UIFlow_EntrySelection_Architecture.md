# UI Flow — Entry Selection (Simple Chat vs Flow Stages)

**Version:** 1.1.1
**Date:** 2026-01-07
**Status:** Implemented (UI refactor)

---

## 1. Проблема

Текущий UX запуска новой сессии был построен вокруг «быстрых действий» в верхней панели (Action Bar) и/или выбора провайдера как первого шага.

Это мешает «поставить Flow в центр» интерфейса:
- Пользователь сначала думает о провайдере, а не о задаче/этапе.
- Для Flow этапов нужен Structured Output, поэтому список провайдеров должен зависеть от выбранного этапа.

---

## 2. Цель

Сделать старт сессии **step-first** и встроить его прямо в верхнюю панель:

1) **Action Bar** заменяет прежние 4 кнопки (`New Session`, `Last Session`, `Clear Session`, `Old Sessions`) на 5 кнопок старта (EN):
   - **Simple Chat**
   - **Idea**
   - **Spec**
   - **Plan**
   - **Execute**

2) После выбора кнопки пользователь выбирает провайдера:
   - Для **Simple Chat** — любой из доступных (Codex / Claude / Gemini).
   - Для **Flow этапов** — только **Codex** и **Claude** (т.к. нужен Structured Output).

2.1) Навигация в provider picker:
   - Если picker открыт после клика по **Action Bar** (stage задан извне) — вторичная кнопка закрывает picker (не возвращает к Flow wizard).
   - Если picker открыт в legacy-сценарии без заданного stage — доступен возврат к выбору stage (Flow wizard) через Back.

3) Далее поведение остаётся прежним:
   - Для **Idea** после создания сессии запускается Idea Collector и показывается анкета.
   - Для **Spec/Plan/Execute** пока стартуется обычная сессия (без отдельного UI-пайплайна), как подготовка к будущей интеграции.

---

## 3. Non-goals (не делаем в этом изменении)

- Не реализуем полноценные этапы Spec/Plan/Execute (контракты, артефакты, UI экран).
- Не меняем API ядра и контракты провайдеров.
- Не трогаем **project-manager** (отдельный UI для управления проектами).

---

## 4. Затронутые UI пакеты

Один кодовый слой UI используется и для:
- **vscode-webview** (`src/client/ui`) — панель в VS Code.
- **web-client** (`src/client/web-client`) — PWA/CEF (подхватывает тот же UI через import).

---

## 5. Модель состояния (UI)

### Сущности
- `selectedStage: 'chat' | 'idea' | 'spec' | 'plan' | 'execute' | null`

### Правила отображения
- Если `providerPicker` открыт и `selectedStage === null` → показываем fallback **выбор шага** (Flow wizard).
- Если `providerPicker` открыт и `selectedStage !== null` → показываем **выбор провайдера**.

### Ограничения провайдеров
- `selectedStage === 'chat'` → показываем все доступные провайдеры.
- `selectedStage !== 'chat'` → показываем только `codexCli` и `claudeCodeCli`.

---

## 6. Интеграция с Idea Collector

Для `selectedStage === 'idea'`:
- Перед подтверждением провайдера ставится флаг «pending questionnaire».
- После создания сессии UI запускает `IdeaCollectorService.startCollection(sessionId)`.
- Далее анкета, review и сохранение артефактов работают как раньше.

---

## 7. Дальнейшие шаги

- Подключить `@codeai-hub/spec-creator` (контракт + артефакты + UI) к этапу **Spec**.
- Добавить Plan Builder и Execute пайплайн.
- Перенести полноценный Flow UI в **project-manager** и синхронизировать UX.
