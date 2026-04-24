# Native Request Capture Runtime Hotfix 1.2.63

**Status:** Active hotfix plan
**Date:** 2026-04-24
**Owner:** Codex

---

## 1. Problem

В релизе `1.2.62` кнопки `Settings -> General -> Native Request Capture` создают `.jsonl` и `.md` артефакты, но артефакты почти пустые:

- Claude: `runtime_failed`, затем поздний `timeout`, без тела native request.
- Codex: `timeout`, без подключения клиента к proxy.

Фактический лог Core для Codex показывает первопричину:

```text
TypeError: Cannot read properties of undefined (reading 'captureNativeRequest')
```

Ошибка возникает при вызове `adapter.captureNativeRequest` из Core: метод берется из adapter object как функция и вызывается без class receiver. В provider adapters этот метод использует `this.nativeRequestCaptureService`, поэтому при unbound-вызове `this === undefined`.

---

## 2. Root Cause

Core `NativeRequestCaptureFacade` сохраняет метод adapter в переменную:

```ts
const captureNativeRequest = adapter?.captureNativeRequest;
```

После этого facade вызывает `captureNativeRequest(...)` уже не как метод adapter object. Для class-based provider adapters это ломает `this`.

Дополнительные проблемы наблюдаемости:

1. Runtime error provider-запуска проглатывается и не попадает в `.jsonl` / `.md`.
2. При раннем provider failure proxy timeout остается активным и может позже дописать второй `capture_end`.

---

## 3. Hotfix Scope

Цель hotfix: сделать live-test снова полезным и самодиагностируемым.

### Required changes

1. В Core вызывать `captureNativeRequest` через bound adapter receiver.
2. Записывать provider runtime error в JSONL и Markdown, если provider-запуск падает до capture.
3. При остановке proxy очищать pending capture timeout, чтобы ранний failure не создавал поздний `timeout`.
4. Добавить regression test с class-style adapter методом, который зависит от `this`.

### Out of scope

- Не менять UI-контракт кнопок.
- Не менять provider-specific capture services, пока Core bug не исправлен.
- Не менять target rules для Claude/Codex без нового live evidence после hotfix.

---

## 4. Expected Result

После установки `1.2.63` повторный click-through должен дать один из двух полезных результатов:

- либо captured native request с headers/body/system/tools/messages;
- либо диагностический artifact, где явно видно, почему provider runtime не дошел до network request.

---

## 5. Verification

- `npm run build --workspace @codeai-hub/core`
- regression test для `NativeRequestCaptureFacade`
- full release build:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

