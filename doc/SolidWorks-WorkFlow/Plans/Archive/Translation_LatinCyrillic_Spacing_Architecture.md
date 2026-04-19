# Translation And Session Text Formatting Architecture

**Date:** 2026-04-19
**Status:** Proposed
**Scope:** bugfix for translated provider overlays, shared session message formatting, and UI markdown rendering

---

## 1. Problem

В текущем runtime/translation path наблюдаются две связанные formatting-проблемы.

### 1.1. Script spacing loss in translated overlays

В translated user-facing text периодически пропадает пробел на границе латиницы и кириллицы.

Типовые примеры:
- `parallelдля`
- `вродеpwd`
- `lsилиsed`

Паттерн общий:
- если латиница сразу переходит в кириллицу, нужен пробел;
- если кириллица сразу переходит в латиницу, нужен пробел.

Проблема не привязана к одному провайдеру. Она возникает на слое translated output, поэтому потенциально затрагивает Claude, Codex и Gemini одинаково.

### 1.2. Paragraph boundary loss before standalone bold section titles in session messages

В session messages section-like markdown titles иногда прилипают к предыдущему предложению, вместо того чтобы начинаться с нового абзаца.

Типовой observed пример:
- `... storage for local project data.**Clarifying Project Manager term**`

Пользовательский эффект:
- заголовок визуально оказывается в той же строке, что и предыдущий абзац;
- структура ответа или reasoning block читается хуже;
- проблема заметна и в live thinking, и в обычных assistant replies, поэтому shared guard нужен не только для одного типа сообщений и не только для одного провайдера.

### 1.3. Inflated blank spacing inside nested markdown lists in ordinary assistant messages

В обычных assistant replies nested markdown lists местами рендерятся с лишними пустыми вертикальными интервалами между подпунктами и перед возвратом к следующему пункту верхнего уровня.

Observed пример:
- исходный assistant message содержит компактный nested list без пустых строк;
- в UI список `проектные артефакты / артефакты всего приложения` визуально разъезжается на большие пустые блоки.

Это уже не thinking-path и не translation-path. Корректный текст приходит в session JSONL, а дефект появляется именно на markdown/render layer.

---

## 2. Root Cause Hypothesis

Текущий shared translation path не делает отдельную post-normalization обработку для границ `latin <-> cyrillic`.

Из-за этого:
- translation engine может вернуть текст без нужных пробелов;
- Core overlay сохраняет такой текст как есть в `localizedContent`;
- UI уже не должен «догадываться» и чинить текст локально, потому что это привело бы к provider/UI drift.

Для second formatting issue корень на observed Codex path такой:
- reasoning summary parts от `codex app-server` приходят отдельными section blocks;
- текущий runtime/display path может потерять paragraph boundary между соседними blocks;
- в shared Core/UI path нет общего guard'а, который восстанавливает standalone bold section titles как отдельные абзацы.

Для ordinary assistant nested lists observed root cause другой:
- raw assistant markdown уже корректен и не содержит лишних пустых строк;
- session dialog renderer применяет style rules, которые сохраняют structural whitespace внутри `li` слишком агрессивно;
- в результате nested list layout раздувается уже на UI layer.

Значит, правильный слой фикса — shared text-format normalizer, который:
- применяется в `packages/translation` к translated output;
- повторно используется в Core для assistant/thinking display content и localized overlays;
- не перекладывает repair в UI-only слой.

Для nested markdown list spacing фикс должен жить именно в UI renderer/CSS layer, потому что upstream content уже корректен.

---

## 3. Constraints

Фикс **не должен** слепо вставлять пробелы по всему тексту.

Нельзя ломать:
- fenced code blocks;
- inline code в обратных кавычках;
- URL;
- file paths / command-line fragments, если они уже явно находятся внутри code span;
- markdown structure.

Следовательно, нормализация должна работать только по обычным текстовым сегментам, а protected spans обязана пропускать.

---

## 4. Accepted Design

### 4.1. Placement

Добавляется shared text-format post-processor в `packages/translation/`.

Он становится canonical path:
- для translation outputs всех провайдеров и всех translation engines;
- для Core-side normalization assistant/thinking content, который отображается пользователю.

### 4.2. Segmentation model

Новый helper должен разбивать текст на сегменты двух типов:
- `protected`
- `normal`

В `protected` попадают минимум:
- fenced code blocks ```...```
- inline code `` `...` ``

В `normal` сегментах применяется shared text normalization.

### 4.3. Normalization rule

Для `normal` сегментов применяется двусторонняя вставка пробела на границе:
- `([A-Za-z])([А-Яа-яЁё])` -> `$1 $2`
- `([А-Яа-яЁё])([A-Za-z])` -> `$1 $2`

Дополнительно нормализация должна быть idempotent:
- повторный прогон не должен создавать двойные пробелы;
- если пробел уже есть, текст не меняется.

### 4.4. Standalone bold section boundary rule

Для `normal` сегментов также вводится paragraph-normalization вокруг standalone bold section titles.

Целевой результат:
- `... data.**Clarifying Project Manager term**\n\nI need ...`
  превращается в
- `... data.\n\n**Clarifying Project Manager term**\n\nI need ...`

Нормализатор должен чинить только markdown-паттерны, которые выглядят как section title, а не как обычный inline emphasis внутри предложения.

### 4.5. Integration points

`TranslationFacade` после получения translated result от engine прогоняет `translatedText` через shared text normalizer и только затем собирает `TranslationResult.finalText`.

Core thinking path использует тот же helper:
- при append/display thinking content;
- при projection `localizedContent` из translation overlays.

Это гарантирует:
- единый результат для Claude/Codex/Gemini overlays;
- единый формат и для source assistant/thinking text, и для translated overlays;
- отсутствие UI-side patching;
- одинаковое поведение для Google GTX и Codex translation engine.

### 4.6. Ordinary assistant markdown list rendering

Для ordinary assistant messages upstream markdown не переписывается и не нормализуется через text post-processor.

Вместо этого session markdown renderer/CSS должен:
- collapse structural whitespace внутри nested lists;
- не создавать artificial blank blocks между подпунктами;
- не ломать обычные paragraph breaks вне списков.

---

## 5. File-Level Plan

### Stream A — Shared translation text normalizer
- `packages/translation/src/translation-text-format-normalizer.ts`
- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/index.ts`

### Stream B — Translation regression guards
- `packages/translation/src/translation-facade.test.ts`

### Stream C — Core session message display integration
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/session-translation/session-message-localization-projector.ts`

### Stream D — Core regression guards
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`
- `packages/core/src/session-translation/session-message-localization-projector.test.ts`

### Stream E — Session markdown list rendering
- `media/session-view.css`

### Stream F — Bug/documentation sync
- `doc/BugRegistry.md`
- `doc/TODO/todo-plan.md`

Release docs and packaging follow only after targeted verification.

---

## 6. Verification

Минимальные guards:
- unit test: `parallelдля` -> `parallel для`
- unit test: `вродеpwd` -> `вроде pwd`
- unit test: `lsилиsed` -> `ls или sed`
- unit test: inline code `` `lsилиsed` `` остаётся без изменений
- unit test: fenced code block остаётся без изменений
- unit test: `...data.**Clarifying ...**\n\nI need...` нормализуется в отдельный section title block
- unit test: ordinary assistant source content с таким же паттерном нормализуется до persist/broadcast
- unit test: localized overlay с таким же паттерном проходит через тот же paragraph-normalization
- targeted build: `npm run build --workspace @codeai-hub/translation`
- downstream confidence build: `npm run build --workspace @codeai-hub/core`
- UI verification: nested markdown list в ordinary assistant bubble больше не раздувается пустыми блоками

---

## 7. Outcome Contract

После фикса:
- translated user-facing prose обязана иметь корректный пробел на границе латиницы и кириллицы вне protected code spans;
- assistant/thinking display content обязано сохранять paragraph boundary перед standalone bold section titles;
- тот же paragraph contract должен применяться и к translated overlays.
- ordinary assistant markdown lists не должны получать artificial empty spacing между nested list items.

UI, Core session overlay и provider modules не должны иметь собственных локальных «spacing hacks» для этого кейса.
