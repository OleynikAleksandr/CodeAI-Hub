# Refactor Architecture — Dialog UI + Continuity Routing (Core + Project Manager)

**Status:** Draft (in discussion)
**Updated:** 2026-02-14
**Owner:** Oleksandr + Codex

---

## 0) Зачем этот документ

Нужно стабилизировать два связанных, но разных поведения:

1. **Реальная отправка** следующего сообщения пользователя в **правильную живую provider-сессию** (resume / rollover) после рестартов Core, reconnect, нескольких воркспейсов.
2. **Отображение диалога** в Project Manager так, чтобы:
   - диалог всегда открывался (даже если провайдер временно недоступен),
   - история восстанавливалась после рестартов Core/PM,
   - смены provider-сегментов показывались как **один диалог агента** без дублей.

Ключевая идея: **разорвать зависимость “открыть диалог” от “успешно зарезюмить провайдера”**.

---

## 1) Наблюдаемые проблемы (симптомы)

- После перезапуска Core/PM узел `Reviewer Codex` может не открываться кликом ("ничего не происходит").
- При открытом PM и рестарте Core вкладка становится пустой (`No messages yet`), даже если на диске есть накопительный JSONL.
- Информация о том, куда отправлять следующий turn, и где лежит история, разнесена по разным местам и иногда вычисляется косвенно.

---

## 2) Цели (что считаем “правильно”)

### 2.1 UI (Project Manager)
- Клик по агенту всегда открывает диалог: сначала показываем историю, затем (опционально) подключаем live-tail.
- После рестарта Core/PM диалог восстанавливается из **накопительного JSONL** (1 агент = 1 файл).
- Дубли от reconnect/replay не засоряют диалог.

### 2.2 Routing (Core)
- Core всегда знает, в какой **текущий provider segment** отправить следующий user turn для конкретного агента.
- Resume/rollover меняет только текущий segment, но не ломает логический диалог.

### 2.3 Debuggability
- По файловой структуре на диске сразу видно: это `description/reviewer` или `description/collector` и какой провайдер.
- Все ключевые файлы (chain/history) лежат предсказуемо и читаемо.

---

## 3) Канонические сущности (простые)

### 3.1 Логический диалог агента (Agent Dialog)
Это то, что видит пользователь в PM как “одна сессия агента”, даже если реальных provider-сегментов было 5.

**Ключ:** `(workspaceSlug, stage, runSlug, providerId)`.

### 3.2 Provider segment
Один реальный thread/session у провайдера.

**Ключ:** `providerSessionId`.

---

## 4) Single Source of Truth: `chain.json`

Для каждого Agent Dialog должен существовать **один** `chain.json`, в котором есть **вся необходимая идентичность** и routing-информация.

### 4.1 Где лежит (человекочитаемо)

Предлагаемый формат каталога:

`<workspaceRoot>/.codeai-hub/<workspaceSlug>/continuity/<stage>/<rootSessionId>__<runSlug>__<providerId>/chain.json`

Пример:

`.../continuity/description/b2b1...__reviewer__codexCli/chain.json`

Правило совместимости: Core должен уметь читать legacy путь без суффикса:

`.../continuity/<stage>/<rootSessionId>/chain.json`

### 4.2 Минимальная схема `chain.json` (обязательная)

- `rootSessionId` (UUID)
- `workspaceSlug`
- `workspacePath` (нормализованный абсолютный)
- `stage` (например `description`)
- `runSlug` (например `reviewer` или `collector`)
- `providerId` (например `codexCli`)
- `dialogSessionId` (стабильный ID для UI-истории; не меняется при rollover)
- `historyJsonlPath` (абсолютный путь к накопительному JSONL)
- `segments[]`:
  - `sessionId` (segment-local id, если нужен)
  - `providerSessionId`
  - `createdAt`
  - `tokenUsage` (опционально)
- `updatedAt`

### 4.3 Инварианты

- `runSlug/providerId/dialogSessionId/historyJsonlPath` неизменны в рамках одного Agent Dialog.
- Rollover/resume добавляет элемент в `segments[]`, а “текущий сегмент” = `segments[last]`.

---

## 5) UI История: один накопительный JSONL

Путь хранится в `chain.json` (`historyJsonlPath`). Это единственный JSONL, который PM использует для восстановления.

### 5.1 Поведение PM при открытии

1. Получить метаданные диалога (минимум: `historyJsonlPath`, `dialogSessionId`, `stage/runSlug/providerId`).
2. Считать историю из JSONL и отрисовать.
3. Подключить live-tail (WS) и добавлять новые события.

Важно: шаг 3 не блокирует шаг 2.

### 5.2 Дедуп (минимум)

- Каждое UI-сообщение должно иметь стабильный `messageId`.
- При replay/reconnect PM не добавляет повторяющиеся сообщения по `messageId`.

---

## 6) Алгоритм отправки сообщения пользователя (Core)

Когда приходит user input для конкретного Agent Dialog:

1. Core читает `chain.json`.
2. Берёт текущий `providerSessionId = segments[last].providerSessionId`.
3. Пытается отправить turn как resume в этот provider segment.
4. Если провайдер недоступен/segment не resume-able:
   - создать новый segment,
   - добавить в `segments[]`,
   - повторить отправку.
5. Все новые сообщения (user/assistant/system) пишутся в `historyJsonlPath`.

---

## 7) Миграция (без остановки мира)

- Если legacy `chain.json` не содержит `runSlug/dialogSessionId/historyJsonlPath`:
  - Core делает backfill при первом чтении:
    - вычисляет/берёт `runSlug` из контекста вызова (узел/роль, который инициировал chain),
    - фиксирует `dialogSessionId` (например: `<rootSessionId>__<runSlug>`),
    - выставляет `historyJsonlPath`.
  - затем переписывает `chain.json` в новой схеме (атомарно).

---

## 8) Открытые вопросы

- Где канонично хранить реестр “диалогов” для быстрого списка в PM: сканирование `continuity/**/chain.json` или отдельный индекс-файл per-workspace.
- Стандарт имени `runSlug`: `reviewer/collector` или более детальные (`description-reviewer`).
- Единый формат JSONL-событий (минимум полей для PM) и правило генерации `messageId` (чтобы дедуп был строгим).
