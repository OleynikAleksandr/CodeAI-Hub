# Архитектура: Claude live text + видимый thinking на Opus 4.7

**Status:** Accepted (2026-04-16)
**Created:** 2026-04-16
**Updated:** 2026-04-16
**Owner:** Oleksandr + Codex
**Scope:** Убрать многоминутные паузы в unified session dialog при Claude turn'ах и сделать `Thinking` видимым на Opus 4.7.

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_StopResume_And_LiveThinking_Architecture.md` (prior scope)

---

## 1. Проблема

В v1.1.997 при длинном Claude turn'е с `Write`/`Edit` tool_use пользователь видит многоминутную тишину в unified session, хотя Claude SDK шлёт события нормально. Session 036 закрыла crash-путь `Stop`, но не закрыла visibility.

**Дефект A — двухминутная тишина на pre-tool text.** Первое ассистентское сообщение с видимым текстом приходит в `handleAssistantMessageInternal` и кладётся в `pendingAssistantTextBySession`. Оттуда оно эмитится только когда прилетает `message_delta.delta.stop_reason = "tool_use"`. Между text и tool_use Claude может 2 минуты стримить `input_json_delta` с большим payload (например `content` для `Write` файла 2000+ chars). Весь этот промежуток pending висит молча в памяти.

**Дефект B — невидимый thinking на Opus 4.7.** Наш код шлёт `thinking: { type: "adaptive" }` без поля `display`. `@anthropic-ai/claude-agent-sdk@0.2.111` по дефолту для Opus 4.7 прячет reasoning за encrypted `signature_delta` (0 chars plain text); plain-text `thinking_delta` открывается только при явном `display: "summarized"`. На Opus 4.7 Phase 2.1 live thinking buffer из Session 035-036 никогда не срабатывает.

**Дефект C — UI показывает устаревшую версию модели.** `src/types/claude-model-registry.ts` содержит `displayName: "Sonnet 4.5" / "Opus 4.5" / "Haiku 4.5"`, но SDK резолвит alias `opus` на `claude-opus-4-7`. Пользователь в Settings видит «Opus 4.5» при работающем 4.7.

**Дефект D — отсутствует `xhigh` effort.** SDK поддерживает 5 уровней: `low | medium | high | xhigh | max`, где `xhigh` — «Deeper than high (Opus 4.7 only; falls back to 'high' elsewhere)». В наших Settings только 4 уровня (`low | medium | high | max`), `xhigh` обрезается до `high` на ранних этапах resolver'а.

---

## 2. Подтверждённые факты

### 2.1. Real session anatomy (Session 036 retest)

По сопоставлению трёх файлов (native Claude JSONL, наш SDK diagnostic log, unified session) в турне от 15:30:17 до 15:36:43:
- `15:33:28.6` — Claude прислал text[165c] «I'll read the questionnaire…».
- `15:35:27.1` — Claude прислал tool_use:Write.
- Между ними — 2 минуты стриминга `input_json_delta` для body файла `Final_Description.md`.
- В unified session текст появился ровно в 15:35:27 — то есть в момент, когда router получил `stop_reason="tool_use"` и сделал `flushPendingAssistantText`.

### 2.2. SDK streaming эмпирически

10 probe-прогонов (`/tmp/claude-streaming-probe/summary.json`, `summary2.json`, `summary3.json`, `summary4.json`) подтвердили:
- `includePartialMessages: true` обязателен; без него dielta событий нет.
- `text_delta` идёт **всегда** для всех моделей (`opus` / `sonnet` / `haiku`), 18-37 фрагментов на turn, первый фрагмент через 2-5 секунд, далее каждые ~400мс.
- `thinking_delta` для Opus 4.7 приходит **только** при `thinking.display: "summarized"`. Effort `high`/`xhigh`/`max` одинаково открывают thinking (5-11 дельт), главный ключ — `display`.
- Наш собственный diagnostic SDK log всегда фильтрует `content_block_delta` (`shouldSkipClaudeSDKMessageLog`) — это корректно, но вводило в заблуждение при ретроспективной отладке Session 036.

### 2.3. Alias resolution

`@codeai-hub/core/src/config/provider-defaults-resolver.ts:32` держит `CLAUDE_MODEL_ALIAS_SET = { default, sonnet, opus, haiku }`. SDK принимает эти алиасы и маппит на свежую версию (`opus` → `claude-opus-4-7` на момент написания). Фиксировать числовую версию в UI не нужно и технически неверно.

### 2.4. Effort в SDK

Из `sdk.d.ts` `@anthropic-ai/claude-agent-sdk@0.2.111`:
- `effort?: ('low' | 'medium' | 'high' | 'xhigh' | 'max') | number`
- `'xhigh' — Deeper than high (Opus 4.7 only; falls back to 'high' elsewhere)`
- `'max' — Maximum effort (select models only)`
- Порядок: `low < medium < high < xhigh < max`. `xhigh` специально создан для Opus 4.7.

---

## 3. Цели

### 3.1. Обязательные
1. Любой видимый assistant text (включая pre-tool) должен начинать появляться в unified session не позднее ~1 секунды после того, как Claude начал его стримить, и дополняться live-фрагментами.
2. `thinking` видимый для пользователя должен включаться на Opus 4.7 без перевода на `effort: "max"`: достаточно `Thinking in dialog = on` при любом effort.
3. UI Settings не должен зашивать числовую версию модели Claude: пользователь выбирает `Opus / Sonnet / Haiku`, SDK резолвит последнюю версию.
4. В Settings Claude должен быть уровень `xhigh` между `high` и `max`, с явной пометкой «Opus only; falls back to high elsewhere».

### 3.2. Не цели
- Менять contract pending buffer для non-thinking pre-tool text — локальный провайдерный перевод (`thoughtTranslator`) для user-facing pre-tool text остаётся.
- Вводить per-model min/max effort capability discovery в runtime (отдельный будущий scope).
- Переписывать session JSONL формат.

---

## 4. Архитектурное решение

### 4.1. Live text_delta ingestion

Расширяем существующий `ClaudeThinkingStreamHandler` в отдельный кластер:
- `claude-thinking-live-buffer.ts` остаётся как есть.
- `claude-text-live-buffer.ts` — новый per-session accumulator с той же моделью `appendDelta` / `flushRemaining` / `consumeFinal`, но для видимого text. Ключевые отличия от thinking-buffer: (a) flush-threshold существенно ниже (порядок 80-120 символов), чтобы пользователь видел печатание по фразам; (b) separate session key для разделения thinking и text контекстов.
- `claude-thinking-stream-handler.ts` переименовывается в `claude-content-stream-handler.ts` (микро-класс всё ещё владеет `thinkingBuffer`, добавляется `textBuffer`). В router добавляется ветка `handleTextDelta` по аналогии с `handleDelta`.
- Router: при `content_block_start` type=text → `reset(textBuffer)`. При `content_block_delta/text_delta` → `appendDelta`, emit readable segment как append-only `dialog_message` с `role: "assistant"` (без `tag: "thinking"`). При `content_block_stop` type=text → `flushRemaining`.

### 4.2. Pending buffer — remove for live text path

`pendingAssistantTextBySession` остаётся только для одной цели: **локальный провайдерный перевод pre-tool assistant text** (`thoughtTranslator.translateUserFacingText` в `resolvePendingAssistantText`). Если thinking live-buffer уже полностью отэмитил text как append-only bubbles, дальнейший pending больше не нужен — при `handleAssistantMessage` с видимым text блоком:
- если `textLiveBuffer.consumeFinal(sessionKey, assembledText)` вернул unseen tail нулевой длины — skip (всё уже в UI);
- если tail non-empty — эмитим только tail;
- translation-для-pre-tool-text остаётся: она применяется на tail или на полный assembled text, не на строящиеся на лету фрагменты.

Вторая половина fix'а: `flushPendingAssistantText("tool_use_preamble")` больше не блокирует видимость. Live emit через buffer доходит до пользователя сразу, независимо от того, когда прилетит `stop_reason`.

### 4.3. Thinking display switch

В `resolveThinkingOptions` в `claude-sdk-manager.ts` дополняем payload:
- при `thinkingEnabled === true` → `thinking: { type: "adaptive", display: "summarized" }` (было без `display`).
- при `thinkingEnabled === false` → `thinking: { type: "disabled" }` (без изменений).

`display: "summarized"` — безопасный default: для моделей, которые уже отдавали plain-text thinking (Sonnet 4.5, Opus 4.5/4.6), поведение не меняется; для Opus 4.7 открывается plain-text reasoning при любом effort.

### 4.4. xhigh effort

Расширяем `ClaudeThinkingEffort` union на `"xhigh"`:
- `packages/core/src/config/provider-defaults-resolver.ts` — добавить `"xhigh"` в `CLAUDE_EFFORT_SET`.
- `packages/Claude_Module` — resolver `resolveClaudeThinkingEffort` пропускает `"xhigh"` как валидное значение.
- `src/client/ui/src/components/settings/claude-thinking-state.ts` и Claude effort dropdown в Settings — добавить опцию `xhigh` с label `"x-High (Opus)"` между `High` и `Max`, subtext `"Opus only; falls back to High elsewhere"`.

### 4.5. UI — убрать версии

`src/types/claude-model-registry.ts` — `displayName` меняется с `"Sonnet 4.5"/"Opus 4.5"/"Haiku 4.5"` на `"Sonnet"/"Opus"/"Haiku"`. Ярлыки в Settings следуют displayName автоматически.

---

## 5. Структура файлов

Новые:
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`

Переименовываем:
- `packages/Claude_Module/src/messaging/claude-thinking-stream-handler.ts` → `claude-content-stream-handler.ts`

Изменяем:
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts` — подключить text-path.
- `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts` — новые тесты на live text + dedupe.
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts` — `thinking.display: "summarized"`.
- `packages/core/src/config/provider-defaults-resolver.ts` — `xhigh` в effort enum.
- `src/client/ui/src/components/settings/claude-thinking-state.ts` и effort dropdown — `xhigh`.
- `src/types/claude-model-registry.ts` — displayName без версий.

---

## 6. Проверка

### 6.1. Автоматические
- `npx tsx --test packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`
- `npx tsx --test packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`
- `npx tsc -p tsconfig.webview.json --noEmit`
- `npm run lint`
- `npm run typecheck:webview`

### 6.2. Ручные
1. Turn с длинным `Write`: видимый text должен печататься пословно с задержкой ≤ 1 сек от старта stream, не накапливаясь в pending.
2. Opus 4.7 + thinking on + effort high: thinking bubbles должны появляться, не ждать `effort: max`.
3. Settings Claude: в dropdown моделей только `Opus / Sonnet / Haiku`, без цифр. В effort — 5 уровней, `x-High` между `High` и `Max` с подписью про Opus-only.
4. Stop/Resume не должен регрессировать — live text/thinking прерываются на shutdown, buffer'ы очищаются.

---

## 7. Execution split

1. Live text ingestion (text_delta path, buffer + handler + router wiring + tests).
2. Finalization dedupe для text + удаление ненужной задержки pending при уже-отэмитенном text.
3. `thinking.display: "summarized"` в SDK options.
4. `xhigh` effort end-to-end (core resolver + UI).
5. UI cleanup — убрать версии из `displayName`.
6. SSOT sync.
7. Release build (build-all + build-release).
