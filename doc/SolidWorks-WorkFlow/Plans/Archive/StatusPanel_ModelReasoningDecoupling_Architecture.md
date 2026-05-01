# Status Panel — Decoupling Model and Reasoning (Architecture)

**Status:** Draft (awaiting approval)
**Date:** 2026-05-01
**Provider scope:** Claude (`session:claude:model-switch`, релиз 1.2.119), Codex (`session:codex:model-switch`, релиз 1.2.118)
**Predecessors:**
- `Plans/Archive/Claude_StatusPanel_ModelSwitch_Architecture.md`
- `Plans/Archive/Codex_StatusPanel_ModelSwitch_Architecture.md`

---

## 1) Проблема

В Status Panel у Claude и Codex есть две кнопки: имя модели и имя reasoning/thinking. Каждая открывает свою карту-popup. На текущий момент карта и транспорт связали `model` и `reasoning` так, что независимое переключение невозможно.

### 1.1 UI bugs

- **Карта выбора модели показывает reasoning рядом с каждой моделью.** Источник: `src/client/ui/src/session/status-panel-model-picker.tsx:207-224`. Для каждого пункта вычисляется `nextReasoning` и рендерится во второй `<span>`. На скриншоте это три "max" напротив Sonnet/Opus/Haiku.
- **Карта выбора reasoning показывает текстовое слово "active" рядом с активной опцией.** Источник: `src/client/ui/src/session/status-panel-model-picker.tsx:194`. Это разовая текстовая метка, без визуальной подсветки.
- **Активный выбор не подсвечен провайдерным цветом.** Кнопки Status Panel получают tinted-класс (`session-status-button--claude/--codex/--gemini`) в `status-panel.tsx:40-44`, но опции внутри карт-popup рендерятся через локальный `optionStyle` без provider-tint и без active-state.

### 1.2 Backend coupling

- **Payload транспортной команды требует обе части.** `packages/core/src/remote-bridge/session-stream-contracts.ts`: `ClaudeModelSwitchRequestPayload.targetModelId` обязателен, `thinkingEnabled` обязателен; для Codex `targetModelId` обязателен. Чтобы поменять только reasoning, UI вынужден присылать модель.
- **UI карта модели всегда докидывает reasoning.** `status-panel-model-picker.tsx:217`: `onSelectModel?.(model.id, nextReasoning)`. Любой клик по новой модели заодно переписывает reasoning.
- **PM controller при смене reasoning читает модель из snapshot, который может быть stale.** `use-project-manager-dialog-session-controller.ts:438-453` (Codex) и `:469-484` (Claude через `resolveDialogClaudeSwitchRequest`) — оба используют `snapshots[id]?.status.models?.[0]?.modelId` как `visibleModelId`. Если binding обновился в Core, а PM ещё не обработал `session:model:update`, в payload летит старая модель и backend перезаписывает binding на неё. Это и есть наблюдаемый симптом "при смене reasoning модель меняется".
- **Backend handlers сами по себе корректны** (`session-request-handler-claude-model-switch.ts`, `session-request-handler-codex-model-switch.ts`): при отсутствии `targetReasoningEffort` берут его из `previousBinding`. Проблема не в handler-логике, а в том, что транспорт не позволяет UI выразить "трогаю только одно поле".

---

## 2) Целевое поведение

- Карта выбора модели рендерит **только** имена моделей. Активная подсвечена провайдерным цветом (border + soft fill в провайдерных токенах). Клик по любой опции мгновенно подсвечивает её и закрывает карту, как у нажатой кнопки.
- Карта выбора reasoning рендерит **только** значения reasoning/thinking (включая `off` для Claude). Активная подсвечена провайдерным цветом. Слова "active" нет.
- Переключение модели не трогает reasoning. Reasoning остаётся таким, каким был до клика. Если новая модель не поддерживает текущий reasoning — backend сам нормализует через capability registry (это уже работает, см. `resolveTargetReasoningEffort`/`resolveTargetThinkingEffort`).
- Переключение reasoning не трогает модель. На любых snapshots/binding race-conditions модель обязана сохраниться.
- Контракт остаётся один на провайдера, но транспорт явно отделяет "что меняется".

---

## 3) Архитектурное решение

### 3.1 Транспорт: разделить switch на model-switch и reasoning-switch

Сейчас один тип сообщения тащит оба поля. Решение — разделить на две команды на каждого провайдера:

- `session:claude:model-switch` — payload: `{ sessionId, targetModelId }`. Reasoning не передаётся; backend сохраняет existing `reasoningEffort` и `thinkingEnabled` из `previousBinding`. Если новая модель не поддерживает текущий effort — нормализуется через `findClaudeModelCapabilities`.
- `session:claude:thinking-switch` (новая команда) — payload: `{ sessionId, thinkingEnabled, targetReasoningEffort? }`. Модель не передаётся; backend сохраняет existing `baseModelId`.
- `session:codex:model-switch` — payload: `{ sessionId, targetModelId }`. Аналогично.
- `session:codex:reasoning-switch` (новая команда) — payload: `{ sessionId, targetReasoningEffort }`. Модель не передаётся.

Преимущества: контракт явно отражает intent, race-condition по stale-модели физически исключён, backend handler упрощается (одна ответственность на handler).

### 3.2 UI Status Panel — independent pickers

- `StatusPanelModelPicker` теряет prop `currentReasoning`-зависимое вычисление `nextReasoning`. В model-mode рендерится только список моделей. В reasoning-mode — только список reasoning, считанных из current model.
- `onSelectModel` сигнатура: `(modelId: string) => void`. Без второго параметра.
- `onSelectReasoning` сигнатура: без изменений.
- В `status-panel.tsx` `handlePickerSelectModel` вызывает provider-specific callback без reasoning. PM controller вызывает соответствующую команду transport (`requestClaudeModelSwitch`/`requestCodexModelSwitch` с одной моделью; `requestClaudeThinkingSwitch`/`requestCodexReasoningSwitch` с одним reasoning).

### 3.3 UI: provider-tinted active highlight в обеих картах

- Каждый `<button>` опции получает атрибут `data-provider="claude|codex|gemini"` и `data-active="true"` для активного выбора.
- CSS-правила в `media/session-view.css` (или соответствующем bundle CSS) для `.session-status-picker [data-active="true"][data-provider="..."]` задают border + soft-fill в провайдерных токенах (те же RGBA, что и для `.session-status-button--claude/codex/gemini`, чтобы визуально совпадало с активной кнопкой). Без active-state — стандартный `optionStyle`.
- Слово "active" удаляется. Текст "max" из карты модели удаляется.

### 3.4 PM controller — убрать чтение модели из snapshot для reasoning-switch

- `requestCodexReasoningSwitch`, `requestClaudeThinkingSwitch` больше не вычисляют модель. Они отправляют новую команду transport, в которой модель отсутствует.
- `resolveDialogClaudeSwitchRequest` и `resolveDialogCodexBaseModelId` остаются, но используются только в model-switch ветке (где UI знает явный `targetModelId` от клика по конкретной модели).

---

## 4) Контракт изменений (по слоям)

### 4.1 Transport (Core)

- `packages/core/src/remote-bridge/session-stream-contracts.ts`:
  - Добавить `ClaudeThinkingSwitchRequestPayload = { sessionId; thinkingEnabled; targetReasoningEffort? }`.
  - Добавить `CodexReasoningSwitchRequestPayload = { sessionId; targetReasoningEffort }`.
  - Сократить `ClaudeModelSwitchRequestPayload` до `{ sessionId; targetModelId }` (оставить тип `ClaudeModelSwitchThinkingEffort`/alias `targetModelId` экспортированными, т.к. они используются в registry).
  - Сократить `CodexModelSwitchRequestPayload` до `{ sessionId; targetModelId }`.
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts`: маршрутизация двух новых типов на новые handler-методы.

### 4.2 Core handlers

- `session-request-handler-claude-model-switch.ts`: `handle()` теряет ветвь reasoning. Берёт previous `reasoningEffort` и `thinkingEnabled` напрямую из `session.modelBinding`. `buildModelBinding` остаётся, но target теперь несёт только `targetModelId`.
- Новый `session-request-handler-claude-thinking-switch.ts`: меняет только `reasoningEffort` и `thinkingEnabled`, оставляет `baseModelId` из previous binding. Использует тот же `buildProviderEffectiveModelId` для пересчёта `modelId`.
- `session-request-handler-codex-model-switch.ts`: аналогично — только модель.
- Новый `session-request-handler-codex-reasoning-switch.ts`: только reasoning. Сохраняет логику `pendingModelSwitchInjection = true`, чтобы Codex `<model_switch>` injection отрабатывал на следующий turn.
- Оба новых handler-а broadcast-ят `session:model:update` с обновлённым полным binding (контракт UI без изменений).

### 4.3 PM Client API

- `src/client/project-manager/api.ts`:
  - `requestClaudeModelSwitch(sessionId, targetModelId)` — без `thinkingEnabled` и `targetReasoningEffort`.
  - Новый `requestClaudeThinkingSwitch(sessionId, thinkingEnabled, targetReasoningEffort?)`.
  - `requestCodexModelSwitch(sessionId, targetModelId)` — без reasoning.
  - Новый `requestCodexReasoningSwitch(sessionId, targetReasoningEffort)`.
- `src/client/project-manager/components/sessions/project-manager-dialog-model-switch-helpers.ts`:
  - `resolveDialogClaudeSwitchRequest` упрощается до `{ session, requestedModelId } -> { sessionId, modelId }`.
  - Удалить ветку, которая использует `visibleModelId` для reasoning-switch.
  - Аналогично `resolveDialogCodexBaseModelId` остаётся только для model-switch ветки и уходит из reasoning-switch helper.
- `use-project-manager-dialog-session-controller.ts`:
  - `requestCodexReasoningSwitch` вызывает новый api без чтения snapshot.
  - `requestClaudeThinkingSwitch` — то же.
  - `requestClaudeModelSwitch`, `requestCodexModelSwitch` остаются, но передают только модель.

### 4.4 Status Panel UI

- `src/client/ui/src/session/status-panel-model-picker.tsx`:
  - `onSelectModel` теперь `(modelId: string) => void` — без второго параметра.
  - В model-branch удалить `nextReasoning` вычисление и второй `<span>`.
  - В reasoning-branch удалить `<span>active</span>`.
  - Каждой `<button>` опции добавить `data-provider={providerId}` и `data-active={String(isActive)}` для CSS.
- `src/client/ui/src/session/status-panel.tsx`:
  - `handlePickerSelectModel` принимает только `modelId`. Provider-specific callback `onSelectClaudeModel`/`onSelectModel` (Codex) сигнатура: `(modelId) => void` — без второго параметра.
  - Соответственно `StatusPanelProps` для `onSelectClaudeModel` и `onSelectModel`.
- CSS (вероятно `media/session-view.css` или эквивалент):
  - `.session-status-picker button[data-active="true"][data-provider="claude"]` — border + soft-fill в Claude tokens.
  - Аналогично для `codex` и `gemini`. Реюзаем те же RGBA, что и в `session-status-button--*` правилах, чтобы выбранный пункт визуально совпадал с активной кнопкой Status Panel.
- `SessionView` callbacks (если они посредники между Status Panel и dialog controller) — обновить сигнатуры, убрать второй параметр у model-switch.

### 4.5 Tests

- `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.test.ts`:
  - Сократить до проверки model-only switch'а: модель меняется, reasoning сохраняется из previous binding, `thinkingEnabled` сохраняется.
  - Удалить кейсы с `targetReasoningEffort`/`thinkingEnabled` в payload — они переезжают в новый test файл.
- Новый `session-request-handler-claude-thinking-switch.test.ts`: thinking on/off, effort → effort, модель сохраняется на любых combos.
- `session-request-handler-codex-model-switch.test.ts`: аналогично, model-only.
- Новый `session-request-handler-codex-reasoning-switch.test.ts`: reasoning меняется, модель сохраняется, `pendingModelSwitchInjection = true`.
- `src/client/project-manager/components/sessions/project-manager-dialog-model-switch-helpers.test.ts`: переписать под упрощённые сигнатуры.
- `src/client/ui/src/session/status-panel-model-picker.test.tsx`: тесты "model click does not affect reasoning" и "reasoning click does not affect model" + `data-active` highlight check.
- Не снимать coverage с провайдерных Claude/Codex applied-turn-config тестов — они проверяют, что binding (и frozen identity) корректно резолвится в SDK options. Изменения транспорта их не затрагивают, но прогнать обязательно.

---

## 5) Out of scope

- Gemini Status Panel: у него сейчас нет picker'ов вообще (`canOpenPicker = providerId === "codexCli" || "claudeCodeCli"`). Не трогаем.
- `session.pendingModelSwitchInjection` для Codex остаётся внутренним механизмом. Поддержка инъекции `<model_switch>` после reasoning-switch (если нужно) сохраняется как есть — оба новых handler-а одинаково взводят флаг.
- Persistence binding в continuity: SMB-001/SMB-002 уже покрывают это, изменения транспорта не трогают continuity путь.
- Native request capture / Settings UI: scope касается только runtime status-panel switch.

---

## 6) Open questions

1. **Один transport-message с discriminator vs два отдельных типа?** Два типа явнее и меньше invariant'ов в handler-логике; discriminator-вариант более компактен. Рекомендую два типа (`*-model-switch` + `*-thinking-switch`/`*-reasoning-switch`) — это лучше переживает добавление новых полей в любую из веток.
2. **Backwards compat для уже отправленных old-style payload?** В монорепо PM и Core версионируются вместе и поставляются одним VSIX. Хвостов на сервере нет. Старый `targetReasoningEffort` в model-switch payload предлагаю просто игнорировать на handler-стороне (warn-log + drop), не ломая клиента, который ещё не пересобрался — это страховка на время разворачивания, не контракт.
3. **Подсветка active в picker — точные RGBA?** Использовать те же значения, что в `session-status-button--claude/--codex/--gemini` для border и `--row-fill`/`--row-soft` (определены в `DesignSystem/CorporateDesign.html` § Provider color tokens). Если в `session-view.css` они ещё не переиспользуются как CSS-токены — вынести их в общий блок per-provider до использования в picker.
4. **Capability mismatch на model-switch (новая модель не поддерживает текущий reasoning).** Поведение backend уже корректно: capability registry приведёт effort к `defaultThinkingEffort` для Claude или к `options[0]` для Codex. UI узнаёт об этом через broadcast `session:model:update`. Дополнительной UX-нотации (тост/инфо) не делаем — это вне scope.

---

## 7) Acceptance checklist

- Карта модели не показывает reasoning ни в каком виде. Видно только имя модели.
- Карта reasoning не показывает слово "active". Видно только имена reasoning-уровней.
- В обеих картах активная опция подсвечена провайдерным цветом (border + soft-fill, идентично кнопке).
- Клик по любой модели в карте: модель меняется, reasoning **остаётся** (verified by direct test и retest на 1.2.119+ build).
- Клик по любому reasoning в карте: reasoning меняется, модель **остаётся** (verified by direct test и retest).
- На быстрых toggle'ах model→reasoning→model→reasoning ни одна из частей не "съезжает" обратно к default.
- Native request capture для Claude/Codex (Settings → General) показывает, что следующий turn идёт с правильной effective identity (модель + effort), без regress.

---

## 8) Implementation order (для будущего todo-plan)

Stream A — Transport contracts: split payload types + router + один общий validator.
Stream B — Core handlers split (Claude model-switch + thinking-switch).
Stream C — Core handlers split (Codex model-switch + reasoning-switch).
Stream D — PM API + dialog controller + helpers.
Stream E — Status Panel UI cleanup (remove reasoning suffix, remove "active" word, decouple onSelectModel signature).
Stream F — Status Panel UI active-highlight (data-provider/data-active + CSS).
Stream G — Tests rewrite (Core x2 + helpers + picker).
Stream H — Release prep (README/CHANGELOG для будущей версии, build-all + build-release).

Каждый Stream разбивается на микро-задачи ≤3 файлов согласно `CLAUDE.md` правилам, каждая с парным `Git Commit:` пунктом. После Stream H — closeout по `Plans/` (этот документ переезжает либо в `Archive/`, либо итоги мигрируют в SystemArchitecture/Modules/Session_UI SSOT).
