# Refactor Architecture — Dialog UI + Continuity Routing (Core + Project Manager)

**Status:** Active (implemented baseline)
**Updated:** 2026-02-15 (release 1.1.606)
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

Важно: в Core каждый provider segment представлен отдельной runtime‑сессией с id `sessionId`
(и этот `sessionId` меняется при rollover). UI использует `dialogId` для сообщений и `sessionId`
для live status/usage/lock.

---

## 4) Single Source of Truth: `chain.json`

Для каждого Agent Dialog должен существовать **один** `chain.json`, в котором есть **вся необходимая идентичность** и routing-информация.

### 4.0 Dialog Registry: `index.json` (обязательное)

Чтобы PM мог быстро получить список диалогов (и восстановить tabs/дерево) без сканирования диска, Core ведёт per-workspace реестр диалогов:

- `<workspaceRoot>/.codeai-hub/<workspaceSlug>/continuity/index.json`

Назначение `index.json`:
- реализация `dialog:list` (быстрый список);
- связывание `dialogId` -> метаданные continuity chain + best‑effort runtime binding.

`index.json` не заменяет `chain.json`. Он хранит только “каталог” (ускоритель), а все детали сегментов и routing остаются в `chain.json`.

Минимальная запись в `index.json` (как есть в реализации):
- `stage`
- `rootSessionId`
- `dialogId`
- `updatedAt`
- `latestSessionId` (core session id последнего сегмента; best‑effort)
- `providerId` (последний сегмент; best‑effort)
- `providerSessionId` (последний сегмент; best‑effort)

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

- `rootSessionId` (id первого сегмента в цепочке; legacy ключ)
- `dialogId` (опционально; стабильный UI ключ. Для legacy chains может отсутствовать → трактуем как `rootSessionId`)
- `workspaceSlug`
- `stage` (например `description`)
- `segments[]`:
  - `sessionId` (core runtime session id сегмента)
  - `providerId`
  - `providerSessionId` (provider-native id)
  - `createdAt`
  - `tokenUsage` (опционально)
- `updatedAt`

### 4.3 Инварианты

- `dialogId` неизменен в рамках одного Agent Dialog.
- Rollover/resume добавляет элемент в `segments[]`, а “текущий сегмент” определяется как последний элемент: `segments[segments.length - 1]`.

### 4.4 Формат `dialogId` (простое правило, без коллизий)

Используем уже проверенный паттерн, который читается человеком и не конфликтует:

- `<provider>-<uuid>-<runSlug>`

Пример:
- `codex-65c6de0b-5f12-4373-869c-e768f21745c1-reviewer`

`dialogId` назначает Core при создании нового диалога и возвращает PM. PM не генерирует `dialogId` сам.

---

## 5) UI История: один накопительный JSONL

Путь **не хранится** в `chain.json`. Он вычисляется детерминированно из:
- `workspaceKey = sanitize(workspaceRoot)`
- `providerId`
- `dialogId` (sanitize-safe)

Канонический путь unified-session истории:
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`

Это единственный источник правды для сообщений в панели диалога (PM).

### 5.0 Core Writes, PM Reads (обязательное правило)

- **Пишет историю только Core.** Project Manager (CEF UI) получает историю **только** через `dialog:history` (read‑only).
- PM не создаёт и не модифицирует `<dialogId>.jsonl`.
- Любая запись в историю происходит в Core в результате обработки live событий/turn lifecycle.

### 5.1 Поведение PM при открытии

Тезис (целевое состояние): “показать диалог” и “уметь отправлять” разделяем.

- Показать диалог = читать накопительный `history.jsonl` и отрисовать.
- Уметь отправлять = Core маршрутизирует user turn в текущий provider segment по `chain.json`.

Важно: конкретизация механизма “показать диалог” будет в следующем подразделе (сейчас именно это место нестабильно и требует отдельного разбора/фикса).

### 5.1.0 Минимальные интерфейсы (Core <-> PM)

Чтобы алгоритм был реализуем, Core предоставляет PM минимальный набор операций, работающих по `dialogId`:

- `dialog:list` (per-workspace): список известных диалогов как `ContinuityIndexEntry[]`
  (включая `dialogId`, `stage`, `updatedAt`, а также `latestSessionId/providerId/providerSessionId` как best‑effort поля для binding).
- `dialog:open` (by `dialogId`): вернуть `ContinuityIndexEntry` (или `null`, если диалог не найден).
- `dialog:history` (by `dialogId`, optional `cursor`): вернуть сообщения из `<dialogId>.jsonl` + `lastCursor` (для tail‑догонки).
- `dialog:send` (by `dialogId`): отправить user turn; Core сам резолвит последний сегмент и обеспечивает runtime session для отправки.
- Live stream event `dialog:message` (by `dialogId`): доставка новых сообщений (уже записанных Core в unified-session JSONL).

Алгоритм:
1. Получить `ContinuityIndexEntry` через `dialog:open(dialogId)` (или взять из `dialog:list`).
2. Считать историю через `dialog:history(dialogId)` и отрисовать.
3. Подключить live-tail (WS) и добавлять `dialog:message` события по `dialogId`.

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

### 5.5 Hybrid binding (Dialog messages ≠ Runtime status)

Панель Sessions в PM содержит несколько независимых UI‑слоёв:
- **Dialog panel** (лента сообщений) — грузится и обновляется **только** по `dialogId` через `dialog:history` + live `dialog:message`.
- **Status/Usage/Lock/Binding/Models** — грузится и обновляется по **runtime session id**.

Контракт binding:
- `dialog:list`/`dialog:open` возвращает `latestSessionId` (core session id последнего сегмента).
- PM привязывает status подписки (`workspace:snapshot` / `session:stream`) к `latestSessionId`.

Именно это разделение устраняет класс регрессий “в диалоге одно, в статусе другое” и позволяет показывать реальную выбранную модель (например `GPT-5.3-Codex (medium)`), а не только provider label.

---

## 6) Алгоритм отправки сообщения пользователя (Core)

Когда приходит user input для конкретного Agent Dialog (`dialog:send`):

1. Core находит continuity chain по `dialogId` и берёт последний сегмент (`segments.at(-1)`).
2. Core обеспечивает наличие runtime session для `(providerId, providerSessionId)` последнего сегмента:
   - если runtime session уже существует в SessionManager — переиспользует;
   - иначе создаёт/resume runtime session и привязывает её к `rootSessionId=dialogId`.
3. Core применяет send-guard: если идёт continuity rollover/resume bootstrap (`awaitingBootstrapTurn`), запрос отклоняется (чтобы UI не отправил “в никуда”).
4. Core диспатчит сообщение как обычный `session:message` в найденную runtime session.
5. Все новые сообщения (user/assistant/thinking/system) append’ятся Core в unified-session JSONL `<dialogId>.jsonl` и транслируются в UI как live `dialog:message`.

---

## 7) Миграция (без остановки мира)

- Legacy chains без `dialogId` поддерживаются: `dialogId` трактуется как `rootSessionId`.
- Legacy `continuity/index.json` без поля `latestSessionId` backfill’ится через сканирование `chain.json` (best‑effort).

---

## 8) Открытые вопросы

- Стандарт имени ролей в `dialogId`: сейчас поддерживаем `reviewer/collector`, но нужно зафиксировать policy для новых ролей.
- Cursor semantics: сейчас `cursor` в `dialog:history` = индекс записи в JSONL (replay‑safe), важно не “переизобретать” другой offset.

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
- `agentRole` берётся из `runSlug` (например `reviewer|collector`), иначе из `stage` (например `description`), иначе `agent`.

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
- восстанавливает summary `#1 (..%) | #2 (..%)` из `segment meta` при `dialog:history` (и в Project Manager, и в “основной” вкладке SessionView);
- **не добавляет** дополнительных “implicit” разделителей (включая старый UI‑хак “divider после thinking”), если в истории уже есть explicit boundary‑сообщения.

Частота записи: только на старт сегмента (не на каждый апдейт token usage).

### 10.3 Live updates
Во время активной сессии token usage и прочий статус продолжают обновляться текущими механизмами (live stream / snapshots). JSONL meta используется только для восстановления после reopen/restart.

---

## 11) Contract (Draft) — Dialog SSOT pipeline (JSONL feed для live + рестартов)

**Цель:** убрать рассинхронизации “в реальном времени одно, после reload другое” и сделать панель диалога детерминированной.

### 11.1 Единственный источник правды (SSOT)
- **Канон ленты диалога** = `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl` (append‑only).
- UI (и Project Manager, и Session UI) **не склеивает** ленту диалога из runtime chain/snapshots. Эти источники остаются только для **Status** (lock/rollover/usage/connection), но не для сообщений.

### 11.2 Модель загрузки
- **Cold start**: UI запрашивает `history(full)` (вся история диалога) и получает `lastCursor`.
- **Live**: Core после каждого append в JSONL эмитит `dialog:message` с тем же сообщением (UI при необходимости может догонять через `dialog:history(cursor)`).
- **Re-sync**: если стрим потерян/подозрение на пропуск, UI запрашивает `history(tail, cursor)` и догоняет ленту.

### 11.3 Cursor / дедупликация
- Дедупликация в UI должна опираться на монотонный `cursor` (offset/sequence), а не только на `messageId`, чтобы исключить коллизии между provider‑сегментами.
- `messageId` остаётся стабильным идентификатором, но **не должен** быть единственным ключом дедупа между сегментами.

### 11.4 Сегментные метаданные (boundary + summary)
- “Новая сессия” divider и token summary `#1 (..%) | #2 (..%) | #3 (—)` считаются частью **канонического диалога** и должны попадать в JSONL как system‑сообщение на **старт нового provider‑сегмента**.
- Запись boundary/meta должна быть **идемпотентной** по идентификатору сегмента (например `providerSessionId` + `segmentIndex`): один сегмент → одна запись.
- UI рендерит divider/summary **только** из этих explicit JSONL событий. Legacy UI‑хаки (например divider “после thinking”) не используются как источник истины.

### 11.5 Автовосстановление выбора (PM+Core cold start)
- После рестарта PM+Core UI должен восстановить last selected `dialogId` (или применить согласованный default‑выбор) и автоматически выполнить `history(full)`, чтобы не показывать “пустую” сессию до клика пользователя.

### 11.6 Разделение источников данных (Dialog vs Status)
**Dialog (лента сообщений):**
- `dialog history` / `dialog tail` (из JSONL) → единственный источник для сообщений в панели диалога.

**Status (панель статуса, блокировки, прогресс):**
- runtime `session snapshots` / `session:stream` → источник для lock/rollover/usage/connectionState и прочих статусных полей.

**Запрещено:**
- строить ленту сообщений из continuation chain/snapshots (иначе получаем “live ≠ reload”);
- выводить divider/summary из UI‑эвристик (thinking‑хаков) вместо explicit JSONL событий.
