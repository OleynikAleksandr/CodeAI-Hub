# Client Label Fallback Fix 1.2.15 — Planning Doc

## 1. Problem

1.2.13 починил мерцание model label в SESSION status panel **только для Core-side пути** (через `broadcastRuntimeModelUpdate`). Но клиент формирует `ModelInfo` ещё и **локально, прямо из settings** — при initial render сессии до того, как первый `session:model:update` от Core прилетел. В этом fallback-пути label получался неконсистентный.

В [`src/client/ui/src/session/model-info-builder.ts`](src/client/ui/src/session/model-info-builder.ts:98) `resolveModelReasoning` возвращает для Gemini `settings.providers.gemini.thinkingLevelByModel[modelId]` — просто `"high"` строку без prefix'а. А когда label берётся через `parseEffectiveModelId(modelId)` на effective id с суффиксом `thinking:high`, возвращается `"thinking high"` (с prefix'ом). Две формы label'а:
- Через effective id: `Gemini 3.1 Pro Preview (thinking high)` ✓
- Через settings fallback: `Gemini 3.1 Pro Preview (high)` ✗

Пользователь на 1.2.13 retest поймал момент мерцания при старте (и даже на tmp session в первые секунды), что подтверждает — initial render идёт через fallback, потом Core broadcast заменяет на effective id.

Аналогичная проблема в Codex branch того же `resolveModelReasoning` — возвращает `reasoningByModel[modelId]` (`"medium"` без `"reasoning "` prefix'а).

Claude branch уже использует special string `"thinking off"` для disabled и просто `effort` для enabled — собственная convention, не трогаем.

## 2. Solution

В `resolveModelReasoning` для **Gemini** и **Codex** веток оборачивать raw level в соответствующий префикс:
- Gemini: `thinking ${level}` (совпадает с form'ой которую даёт `parseEffectiveModelId`)
- Codex: `reasoning ${level}` (совпадает с `parseEffectiveModelId` для codex effective id `foo reasoning:medium`)

Оба возвращают `undefined` если level не найден (нет в settings) — чтобы UI не показывал пустые скобки `(undefined)`.

После fix оба пути (effective id из Core и settings fallback на клиенте) дают одну и ту же form'у label'а, мерцание полностью исчезает.

## 3. Structure

Одна функция в одном файле. Без новых классов.

## 4. Contracts

**Invariant 14** (Effective model identity SSOT) client-side extension: клиентский ModelInfo builder обязан возвращать label в той же form'е которую эмитит Core через effective id — т.е. с префиксом `thinking ` / `reasoning ` / соответствующим провайдеру. Любой fallback path к settings должен оборачивать raw level значение в provider-specific prefix.

## 5. Release

1.2.15 VSIX + tarballs. Косметический fix symmetric с 1.2.13.

## 6. Out of scope

- Claude label convention review — у них особая "thinking off" semantic, отдельный scope если нужно.
- Другие ModelInfo consumers вне `model-info-builder.ts` (если есть) — не обнаружены в codebase grep'ом.
