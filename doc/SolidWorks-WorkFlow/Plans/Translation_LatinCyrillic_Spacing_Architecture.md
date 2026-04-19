# Translation Latin/Cyrillic Spacing Architecture

**Date:** 2026-04-19
**Status:** Proposed
**Scope:** bugfix for translated provider overlays and shared translation outputs

---

## 1. Problem

В translated user-facing text периодически пропадает пробел на границе латиницы и кириллицы.

Типовые примеры:
- `parallelдля`
- `вродеpwd`
- `lsилиsed`

Паттерн общий:
- если латиница сразу переходит в кириллицу, нужен пробел;
- если кириллица сразу переходит в латиницу, нужен пробел.

Проблема не привязана к одному провайдеру. Она возникает на слое translated output, поэтому потенциально затрагивает Claude, Codex и Gemini одинаково.

---

## 2. Root Cause Hypothesis

Текущий shared translation path не делает отдельную post-normalization обработку для границ `latin <-> cyrillic`.

Из-за этого:
- translation engine может вернуть текст без нужных пробелов;
- Core overlay сохраняет такой текст как есть в `localizedContent`;
- UI уже не должен «догадываться» и чинить текст локально, потому что это привело бы к provider/UI drift.

Значит, правильный слой фикса — shared translation module, после получения `translatedText`, но до возврата финального `TranslationResult`.

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

Добавляется shared post-processor в `packages/translation/`.

Он становится единым canonical path для translation outputs всех провайдеров и всех translation engines.

### 4.2. Segmentation model

Новый helper должен разбивать текст на сегменты двух типов:
- `protected`
- `normal`

В `protected` попадают минимум:
- fenced code blocks ```...```
- inline code `` `...` ``

В `normal` сегментах применяется spacing normalization.

### 4.3. Normalization rule

Для `normal` сегментов применяется двусторонняя вставка пробела на границе:
- `([A-Za-z])([А-Яа-яЁё])` -> `$1 $2`
- `([А-Яа-яЁё])([A-Za-z])` -> `$1 $2`

Дополнительно нормализация должна быть idempotent:
- повторный прогон не должен создавать двойные пробелы;
- если пробел уже есть, текст не меняется.

### 4.4. Integration point

`TranslationFacade` после получения translated result от engine прогоняет `translatedText` через shared spacing normalizer и только затем собирает `TranslationResult.finalText`.

Это гарантирует:
- единый результат для Claude/Codex/Gemini overlays;
- отсутствие UI-side patching;
- одинаковое поведение для Google GTX и Codex translation engine.

---

## 5. File-Level Plan

### Stream A — Shared normalizer
- `packages/translation/src/translation-script-spacing-normalizer.ts`
- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/translation-facade.test.ts`

### Stream B — Bug/documentation sync
- `doc/BugRegistry.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md` only if translation contract wording needs explicit note
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
- targeted build: `npm run build --workspace @codeai-hub/translation`
- downstream confidence build: `npm run build --workspace @codeai-hub/core`

---

## 7. Outcome Contract

После фикса translated user-facing prose обязана иметь корректный пробел на границе латиницы и кириллицы вне protected code spans.

UI, Core session overlay и provider modules не должны иметь собственных локальных «spacing hacks» для этого кейса.
