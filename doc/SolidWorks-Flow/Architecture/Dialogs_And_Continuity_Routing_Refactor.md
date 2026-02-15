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

**Ключ (канон):** `dialogId`.

Примечание: `stage/runSlug/providerId/workspace*` остаются важными метаданными и используются для навигации (дерево), размещения файлов и диагностики, но не являются ключом диалога в UI.

### 3.2 Provider segment
Один реальный thread/session у провайдера.

**Ключ:** `providerSessionId`.

---

## 4) Single Source of Truth: `chain.json`

Для каждого Agent Dialog должен существовать **один** `chain.json`, в котором есть **вся необходимая идентичность** и routing-информация.

### 4.0 Dialog Registry: `index.json` (обязательное)

Чтобы PM мог быстро получить список диалогов (и восстановить tabs/дерево) без сканирования диска, Core ведёт per-workspace реестр диалогов:

- `<workspaceRoot>/.codeai-hub/<workspaceSlug>/continuity/index.json`

Назначение `index.json`:
- реализация `dialog:list` (быстрый список);
- связывание `dialogId` -> `chain.json`/`historyJsonlPath`/метаданные.

`index.json` не заменяет `chain.json`. Он хранит только “каталог” (ускоритель), а все детали сегментов и routing остаются в `chain.json`.

Минимальная запись в `index.json`:
- `dialogId`
- `stage`
- `runSlug`
- `providerId`
- `chainPath`
- `historyJsonlPath`
- `updatedAt`

### 4.1 Где лежит (человекочитаемо)

Ключевой принцип: стабильный идентификатор диалога (`dialogId`) совпадает с именем накопительного JSONL истории (без расширения) и используется как ключ для continuity chain.

Пример `dialogId` (из UI history JSONL):
- `codex-65c6de0b-5f12-4373-869c-e768f21745c1-reviewer`

Где лежит история (UI SOT):
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`
  пример: `~/.codeai-hub/sessions/-Users-...-CodeAI-Hub/codexCli/<dialogId>.jsonl`

Где лежит continuity chain (workflow routing SOT):
- `<workspaceRoot>/.codeai-hub/<workspaceSlug>/continuity/<stage>/<dialogId>/chain.json`

Для отладки допускается человекочитаемый суффикс каталога (не обязателен, т.к. `dialogId` уже содержит провайдера и роль):
- `<dialogId>__<stage>/chain.json` (опционально)

Важно: Core должен уметь читать legacy путь без `dialogId`-каталога (старые UUID rootSessionId).

Правило совместимости: Core должен уметь читать legacy путь без суффикса:

`.../continuity/<stage>/<rootSessionId>/chain.json`

### 4.2 Минимальная схема `chain.json` (обязательная)

- `dialogId` (стабильный ID диалога; равен имени history JSONL без расширения)
- `workspaceSlug`
- `workspacePath` (нормализованный абсолютный)
- `stage` (например `description`)
- `runSlug` (например `reviewer` или `collector`)
- `providerId` (например `codexCli`)
- `historyJsonlPath` (абсолютный путь к накопительному JSONL: `.../<dialogId>.jsonl`)
- `segments[]`:
  - `sessionId` (segment-local id, если нужен)
  - `providerSessionId`
  - `createdAt`
  - `tokenUsage` (опционально)
- `updatedAt`

### 4.3 Инварианты

- `dialogId/runSlug/providerId/historyJsonlPath` неизменны в рамках одного Agent Dialog.
- Rollover/resume добавляет элемент в `segments[]`, а “текущий сегмент” определяется как последний элемент: `segments[segments.length - 1]`.

### 4.4 Формат `dialogId` (простое правило, без коллизий)

Используем уже проверенный паттерн, который читается человеком и не конфликтует:

- `<provider>-<uuid>-<runSlug>`

Пример:
- `codex-65c6de0b-5f12-4373-869c-e768f21745c1-reviewer`

`dialogId` назначает Core при создании нового диалога и возвращает PM. PM не генерирует `dialogId` сам.

---

## 5) UI История: один накопительный JSONL

Путь хранится в `chain.json` (`historyJsonlPath`). Это единственный JSONL, который PM использует для восстановления.

Важно: сейчас именно этот механизм (стабильное восстановление диалога из накопительного JSONL после рестартов/закрытий) работает нестабильно; конкретизация и финальный контракт чтения/гидрации будут зафиксированы отдельным подразделом ниже после разбирательства.

### 5.0 Core Writes, PM Reads (обязательное правило)

- **Пишет историю только Core.** Project Manager (CEF UI) работает с `historyJsonlPath` строго в режиме read-only.
- PM не создаёт и не модифицирует `<dialogId>.jsonl`.
- Любая запись в историю происходит в Core в результате обработки live событий/turn lifecycle.

### 5.1 Поведение PM при открытии

Тезис (целевое состояние): “показать диалог” и “уметь отправлять” разделяем.

- Показать диалог = читать накопительный `history.jsonl` и отрисовать.
- Уметь отправлять = Core маршрутизирует user turn в текущий provider segment по `chain.json`.

Важно: конкретизация механизма “показать диалог” будет в следующем подразделе (сейчас именно это место нестабильно и требует отдельного разбора/фикса).

### 5.1.0 Минимальные интерфейсы (Core <-> PM)

Чтобы алгоритм был реализуем, Core предоставляет PM минимальный набор операций, работающих по `dialogId`:

- `dialog:list` (per-workspace): список известных диалогов с метаданными (минимум `dialogId`, `stage`, `runSlug`, `providerId`, `historyJsonlPath`).
- `dialog:open` (by `dialogId`): вернуть метаданные диалога (минимум `historyJsonlPath`) и (опционально) последнюю отметку `updatedAt`.
- `dialog:history` (by `dialogId`): вернуть сообщения из `<dialogId>.jsonl` (только `message` записи).
- `dialog:send` (by `dialogId`): отправить user turn; Core сам берёт `segments[last].providerSessionId` из `chain.json` и делает resume.
- Live stream event `dialog:message` (by `dialogId`): доставка новых сообщений в PM (см. 5.4).

Черновой алгоритм (пока не канон):
1. Получить метаданные диалога (минимум: `dialogId`, `historyJsonlPath`, `stage/runSlug/providerId`).
2. Считать историю из JSONL и отрисовать.
3. Подключить live-tail (WS) и добавлять новые события.

Важно: шаг 3 не блокирует шаг 2.

### 5.1.1 Память табов (PM) и клик по дереву

У PM может не быть ни одной “runtime session” при старте (и даже после рестарта Core). Поэтому:

- PM хранит состояние вкладок (tabs) и связку “узел дерева -> dialogId” в собственной памяти и persistence (например `localStorage`).
- Клик по узлу дерева обязан:
  - определить, какой именно агент/роль требуется (например `stage=description`, `runSlug=reviewer`),
  - найти сохранённый `dialogId` для этой роли,
  - и отправить в Core **тот же `dialogId`**, который будет указан у активного tab.

Если сохранённого `dialogId` нет (первый запуск/очищена память), клик инициирует создание нового диалога (Core создаёт chain + history и возвращает `dialogId`), после чего PM открывает tab по этому `dialogId`.

Фиксируем, что “активный tab” определяется как `activeDialogId` (а не временный runtime session id).

### 5.1.2 Persistence (PM, минимум для запуска)

PM хранит и восстанавливает состояние вкладок (tabs) per-workspace из persistence (например `localStorage`):

- `openDialogIds[]`: список открытых диалогов (`dialogId`).
- `activeDialogId`: какой диалог активен сейчас.
- `treeBindings`: связка “узел дерева/роль” -> `dialogId` (чтобы клик по дереву мог открыть тот же диалог даже если runtime sessions отсутствуют).

Детали точного формата ключей/JSON значения будут уточнены на этапе реализации, но принцип неизменен: **persist хранит `dialogId`, а не `sessionId` Core**.

### 5.2 Единый пайплайн (Live + Replay)

Цель: один и тот же “путь” формирует UI диалог и в real-time, и при восстановлении из JSONL.

- Live stream: входящие события после всех фильтров/нормализации/дедупа дают каноническое UI-сообщение; этот же канонический результат отображается в UI, а запись в накопительный `<dialogId>.jsonl` выполняет Core.
- Replay (cold start/reconnect): записи из `<dialogId>.jsonl` преобразуются обратно в ту же каноническую форму и прогоняются через тот же UI-редьюсер/дедуп, как будто это live-сообщения.

Инварианты:
- Не существует “второго” способа построить диалог: оба источника обязаны проходить через один и тот же нормализатор + один и тот же append/dedup слой.
- Replay не должен повторно писать в JSONL (иначе сам себя задублирует).

### 5.3 Дедуп (минимум)

- Каждое UI-сообщение должно иметь стабильный `messageId`.
- При replay/reconnect PM не добавляет повторяющиеся сообщения по `messageId`.
- Источник `messageId` = Core (одно значение используется и в live событиях, и в записи `<dialogId>.jsonl`), поэтому replay и live совпадают по id.

### 5.4 Live Stream Routing (обязательный контракт)

Чтобы “единый пайплайн” работал, live stream события должны однозначно относиться к диалогу:

- Каждое входящее live-сообщение должно содержать `dialogId`.
- PM маршрутизирует live-сообщение в правильный tab по `dialogId` и прогоняет через тот же append/dedup слой.

Нельзя полагаться на временный `sessionId` Core как на ключ диалога: после рестарта Core он меняется и не подходит для восстановления.

---

## 6) Алгоритм отправки сообщения пользователя (Core)

Когда приходит user input для конкретного Agent Dialog:

1. Core читает `chain.json`.
2. Core вычисляет ТЕКУЩИЙ живой `providerSessionId` как последний сегмент в цепочке:
   - `providerSessionId = segments[segments.length - 1].providerSessionId`
   (для реальной отправки в провайдера Core использует именно это одно значение).
3. Core отправляет turn как resume в provider session с этим `providerSessionId`.
4. Если провайдер недоступен/segment не resume-able:
   - создать новый segment,
   - добавить в `segments[]`,
   - повторить отправку.
5. Все новые сообщения (user/assistant/system) пишутся в `historyJsonlPath`.

---

## 7) Миграция (без остановки мира)

- Если legacy `chain.json` не содержит `runSlug/dialogId/historyJsonlPath`:
  - Core делает backfill при первом чтении:
    - вычисляет/берёт `runSlug` из контекста вызова (узел/роль, который инициировал chain),
    - фиксирует `dialogId` (как basename накопительного history JSONL),
    - выставляет `historyJsonlPath`.
  - затем переписывает `chain.json` в новой схеме (атомарно).

---

## 8) Открытые вопросы

- Где канонично хранить реестр “диалогов” для быстрого списка в PM: сканирование `continuity/**/chain.json` или отдельный индекс-файл per-workspace.
- Стандарт имени `runSlug`: `reviewer/collector` или более детальные (`description-reviewer`).
- Единый формат JSONL-событий (минимум полей для PM) и правило генерации `messageId` (чтобы дедуп был строгим).

---

## 9) Contract (Approved) — Человекочитаемый `dialogId`

**Решение:** `dialogId` становится человекочитаемым и используется как ключ для:
- basename файла истории: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`
- continuity root (папка chain): `<workspaceRoot>/.codeai-hub/<workspaceSlug>/continuity/<stage>/<dialogId>/chain.json`
- ключа вкладки (tab) в Project Manager.

### 9.1 Формат
`<providerSlug>-<uuid>-<agentRole>`

Примеры:
- `codex-7ef982bd-1eea-4cf9-b7a4-455dee496bd9-reviewer`
- `claude-52fe963a-9b59-402c-9adb-47a50dd7f2d8-collector`

### 9.2 Нормализация
- Все символы — lowercase.
- Допустимые символы: `a-z0-9-`.
- `providerSlug` вычисляется из providerId (например `codexCli -> codex`, `claudeCodeCli -> claude`, `geminiCli -> gemini`).
- `agentRole` берётся из `runSlug/sessionKind` (например `reviewer|collector`), иначе `agent`.

### 9.3 Backward compatibility
- Legacy `dialogId` вида «только uuid» поддерживаются для открытия/истории.
- Для UI отображения допускается friendly label, но каноничный ключ остаётся `dialogId`.

---

## 10) Contract (Approved) — Segment meta в `<dialogId>.jsonl` (replay-safe UI)

**Проблема:** после закрытия/переоткрытия вкладки и после рестартов Core/PM диалог восстанавливается из JSONL, но вспомогательная информация (границы сегментов + `#1 (..%) | #2 (..%)`) не должна зависеть от runtime chain.

**Решение:** Core пишет минимальные метаданные **один раз на старт нового provider-сегмента** (rollover/новый providerSessionId), а UI считывает их при `dialog:history`.

### 10.1 UI placement (фиксировано)
- Divider сегмента показываем **в ленте диалога** (как визуальный разделитель).
- Summary `#1 (..%) | #2 (..%)` показываем **в правой нижней Status панели**.

### 10.2 Запись в JSONL (однократно на старт сегмента)
Core дописывает в `<dialogId>.jsonl` **одну** запись `role=system` (однократно на старт сегмента). В `content` — многострочный payload:
1) Line 1: `__CODEAIHUB_SEGMENT_BOUNDARY__` (marker)
2) Line 2: видимый label (например `Новая сессия`)
3) Line 3: `__CODEAIHUB_SEGMENT_META__:` + JSON (segment summary)

UI:
- распознаёт divider по `messageId` с префиксом `segment-boundary:` **или** по marker в `content`;
- отображает в ленте только label (Line 2), не показывая служебные строки;
- восстанавливает summary `#1 (..%) | #2 (..%)` из `segment meta` при `dialog:history`.

Частота записи: только на старт сегмента (не на каждый апдейт token usage).

### 10.3 Live updates
Во время активной сессии token usage и прочий статус продолжают обновляться текущими механизмами (live stream / snapshots). JSONL meta используется только для восстановления после reopen/restart.
