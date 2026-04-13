# Thinking Translation Overlay Architecture

**Status:** Proposed  
**Created:** 2026-04-13  
**Updated:** 2026-04-13  
**Owner:** Oleksandr + Codex  
**Scope:** Убрать смешанный English/Russian поток в visible reasoning/thinking, не задерживать live output, сохранить native transcript как канонический SSOT и добавить persisted translation overlay с поздней подменой только в отображении.

---

## 1. Problem

Текущий live-thinking path даёт пользователю смешанный язык в одном и том же диалоге:

- часть reasoning/thinking bubbles приходит на английском;
- часть уже на языке `Messages for the User`;
- при быстрых переключениях между шагами/сессиями история сначала приходит как source text и не умеет переиспользовать уже готовый перевод;
- система не умеет поздно заменить уже показанный source fragment локализованной версией.

Фактическая причина по текущему baseline:

- `Gemini`, `Codex` и `Claude` делают live translation provider-local, а не через Core-owned history/display contract:
  - `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
  - `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`
  - `packages/Claude_Module/src/messaging/claude-thought-translation-adapter.ts`
- translation engine для visible reasoning сейчас хардкодится в provider adapters как `google-gtx`, а не берётся из shared localization settings:
  - `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
  - `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`
  - `packages/Claude_Module/src/messaging/claude-thought-translation-adapter.ts`
- Core и UI работают append-only и не имеют first-class update contract для уже показанного message:
  - `packages/core/src/session-manager/index.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
  - `src/client/project-manager/components/sessions/session-message-dedupe.ts`
- runtime history и dialog history отдают только canonical content и не умеют merge-ить translation overlay:
  - `packages/core/src/unified-session/storage.ts`
  - `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`
  - `packages/core/src/remote-bridge/handlers/http-api-session-routes.ts`
- dialog-mode UI ещё и переписывает stable history identity в synthetic `timestamp::role::messageId`, из-за чего поздний patch не сможет адресоваться по каноническому `messageId`:
  - `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`

Следствие: если перевод не успел или упал, английский fragment уже append-нут в историю/рендер и больше никогда не заменяется.

---

## 2. Product Goal

Пользователь должен видеть reasoning/thinking сразу, без искусственной задержки final assistant reply, но при этом система должна уметь тихо локализовать уже показанный source fragment позже.

Целевой UX:

1. Provider присылает visible thinking/reasoning fragment.
2. UI показывает его немедленно в original language.
3. Core асинхронно переводит fragment на язык `Messages for the User`.
4. Когда перевод готов, UI заменяет только отображаемый текст этого message, не переписывая canonical transcript.
5. Если пользователь снова открывает эту же сессию или dialog chain позже, уже сохранённый overlay подхватывается сразу при history load, без промежуточного показа английского текста.

---

## 3. Non-Goals

- Не делаем re-translation старых диалогов после смены translation engine.
- Не переписываем основной session transcript задним числом.
- Не создаём отдельные файлы на каждое сообщение.
- Не строим DOM-only hack, который подменяет текст без storage/runtime contract.
- Не задерживаем final assistant output ради ожидания translation.
- Не расширяем этот scope на generic UI localization.
- Не трогаем non-thinking text paths, кроме тех мест, где они технически мешают новому stable message identity contract.

---

## 4. Factual Baseline To Respect

### 4.1. Shared runtime translation уже существует, но живёт не в том слое

- `@codeai-hub/translation` уже является engine-neutral facade:
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `packages/translation/src/translation-facade.ts`
- shared settings уже содержат `general.localization.engineId`:
  - `src/extension-module/settings/general-settings.ts`
- Core сейчас читает только `messagesForTheUserLanguage`, но не translation engine:
  - `packages/core/src/config/provider-settings-snapshot.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`

### 4.2. Canonical session storage уже append-only и это нужно сохранить

- canonical session records живут в `packages/unified-session/src/index.ts`
- runtime append/read path живёт в `packages/core/src/unified-session/storage.ts`
- этот append-only инвариант нельзя ломать; overlay должен стать отдельным persisted слоем, а не rewrite существующего transcript

### 4.3. Session UI нельзя нагружать file-level lookup логикой

Пользователь уже отдельно отметил риск гонок и тормозов при переключении между шагами. Следовательно:

- UI не должен читать native transcript и sidecar отдельно по кускам;
- merge canonical history + translation overlay должен происходить в Core/history layer;
- рендерер должен оставаться тупым и работать по правилу `localizedContent ?? content`.

### 4.4. Session UI status/usage panels не должны быть затронуты поведением перевода

Нижняя status bar и `Session ID + Usage Limits` остаются на своих truth-lines:

- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`

Новый scope меняет только dialog/history display contract, а не session/provider identity, model sync или usage-limits flow.

---

## 5. Core Decision

### 5.1. Translation ownership переносится из providers в Core overlay pipeline

Это ключевое архитектурное решение данного scope.

После rollout:

- providers больше не должны ждать live translation перед emit visible thinking fragment;
- providers должны emit-ить native/source visible thinking сразу;
- Core должен стать единственным владельцем:
  - translation policy resolution;
  - async translation execution;
  - overlay persistence;
  - history merge;
  - live translation patch broadcast.

Причины:

- shared `Translation Engine` из Localization должен реально влиять на новый live-thinking path;
- смешанный язык является проблемой display/history orchestration, а не provider transport;
- Core уже умеет хранить transcript и обслуживать history/read models, значит overlay должен жить рядом с ним.

### 5.2. Canonical transcript остаётся native-only

Основной JSONL transcript продолжает хранить только source/provider text:

- `packages/unified-session/src/index.ts`
- `packages/core/src/unified-session/storage.ts`

Перевод становится persisted display overlay, а не частью canonical truth.

### 5.3. Translation overlay хранится отдельным per-session sidecar

Для каждой runtime session вводится один translation sidecar рядом с canonical transcript:

- canonical file: `<sessionId>.jsonl`
- overlay file: `<sessionId>.translations.jsonl`

Оба файла должны лежать в том же workspace/provider directory, который уже строится через:

- `packages/unified-session/src/index.ts`
- `packages/core/src/unified-session/storage.ts`

### 5.4. Stable message identity становится обязательным end-to-end contract

Чтобы поздний translation patch мог адресоваться к уже показанному message, `messageId` должен сохраняться от provider emit до UI snapshot без подмены на случайный/synthetic id.

Это потребует правок в:

- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/session-manager/index.ts`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`

### 5.5. История должна приходить в UI уже с merge-нутым overlay

При открытии runtime session или dialog chain Core должен:

1. прочитать canonical transcript;
2. прочитать translation sidecar;
3. собрать overlay map по `messageId`;
4. вернуть UI сообщения уже с optional `localizedContent`.

Это правило покрывает и runtime history, и dialog history:

- `packages/core/src/unified-session/storage.ts`
- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`
- `packages/core/src/remote-bridge/handlers/http-api-session-routes.ts`

### 5.6. Live patch должен быть отдельным bridge event, не новым fake message

Нельзя публиковать translation как новое `dialog_message`, иначе история снова станет визуально двоиться.

Нужен отдельный bridge contract:

- `session:message_translation`
- `dialog:message_translation`

Он должен адресоваться к существующему `messageId` и обновлять только отображаемый текст.

---

## 6. Target Architecture

### 6.1. New Core module family

Новый scope должен вводить отдельный Core module, а не раздувать существующие handler-файлы.

Предлагаемая структура:

- `packages/core/src/session-translation/session-translation-facade.ts`
  - единая точка входа для live translation scheduling, persistence и history overlay merge
- `packages/core/src/session-translation/session-translation-policy-resolver.ts`
  - читает язык `Messages for the User` и active `Translation Engine` из shared settings snapshot
- `packages/core/src/session-translation/session-translation-dispatcher.ts`
  - решает, какие incoming dialog messages требуют async translation
- `packages/core/src/session-translation/session-translation-history-assembler.ts`
  - merge canonical messages + persisted overlays в history/read models
- `packages/core/src/session-translation/session-translation-event-broadcaster.ts`
  - выпускает `session:message_translation` и `dialog:message_translation`

Эти файлы должны оставаться маленькими и с single responsibility.

### 6.2. New unified-session sidecar storage module

Чтобы не раздувать `packages/unified-session/src/index.ts`, sidecar storage должен быть выделен в отдельный module/facade:

- `packages/unified-session/src/session-translation-overlay-store.ts`

Facade этого модуля должен владеть:

- sidecar path resolution;
- append translation record;
- read translation records;
- map build by `messageId`.

`packages/unified-session/src/index.ts` должен только переэкспортировать публичный facade и типы.

### 6.3. UI message overlay module

На UI стороне нужен отдельный маленький модуль, который будет делать upsert translation overlay в snapshots без раздувания existing helpers:

- `src/client/ui/src/session/session-message-localization-facade.ts`

Facade должен владеть:

- apply translation event to runtime snapshots;
- apply translation event to dialog snapshots;
- merge behavior по `messageId`;
- правилом `localizedContent ?? content`.

---

## 7. Data Contracts

### 7.1. Canonical message contract

Runtime/session message остаётся source-oriented, но должен сохранить stable `messageId`.

Core session message contract должен принять внешний `messageId`, если provider его прислал.

Affected files:

- `packages/core/src/session-manager/index.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`

### 7.2. Translation sidecar record

Новый persisted record в sidecar:

```ts
interface SessionMessageTranslationRecord {
  readonly type: "message-translation";
  readonly messageId: string;
  readonly targetLanguage: string;
  readonly sourceHash: string;
  readonly translatedContent: string;
  readonly timestamp: string;
}
```

`sourceHash` нужен только для защиты от устаревшего patch на тот же `messageId`, если source content был изменён/переэмитился.

Для hash можно использовать тот же базовый `sha256` path, который уже применяется в проекте:

- `packages/localization/src/localization-facade.ts`
- `packages/localization/src/localization-materializer.ts`

### 7.3. UI/session message contract

`SessionMessage` и browser bridge types должны получить optional localized field:

```ts
interface SessionMessage {
  readonly id: string;
  readonly role: SessionMessageRole;
  readonly content: string;
  readonly localizedContent?: string;
  readonly createdAt: number;
  readonly tag?: string;
}
```

Affected files:

- `src/types/session.ts`
- `src/client/ui/src/core-bridge/types.ts`
- `src/client/ui/src/core-bridge/normalizers.ts`

### 7.4. Bridge event contract

Новые Core events:

```ts
type SessionBridgeEvent =
  | { type: "session:message_translation"; payload: ... }
  | ...

type DialogBridgeEvent =
  | { type: "dialog:message_translation"; payload: ... }
  | ...
```

Affected files:

- `packages/core/src/remote-bridge/session-stream-contracts.ts`
- `packages/core/src/remote-bridge/types.ts`
- `src/client/ui/src/core-bridge/server-message-handler.ts`
- `src/client/ui/src/app-host/webview-message-types.ts`
- `src/client/ui/src/app-host/webview-message-dispatcher.ts`
- `src/client/project-manager/components/sessions/session-stream.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`

---

## 8. Message Identity Rules

### 8.1. Providers must stop being translation owners, but keep stable ids

Provider responsibilities after rollout:

- format visible reasoning text as they do today;
- emit native/source content immediately;
- keep or derive stable ids for those visible reasoning chunks;
- stop waiting for translation before emitting visible thinking.

Affected provider files:

- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`
- `packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`
- `packages/Claude_Module/src/messaging/claude-thinking-dialog-emitter.ts`

### 8.2. Core must preserve provider-supplied ids

Сейчас `dialog_message` payload несёт `uuid`, но Core его игнорирует и генерирует новый random id.

Это нужно исправить в:

- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/session-manager/index.ts`

### 8.3. Dialog-mode UI must stop rewriting ids

`project-manager-dialog-session-view-helpers.ts` сейчас строит synthetic stable id через `timestamp::role::messageId`.

Для translation overlay это недопустимо: dialog view должен использовать канонический `messageId` как `SessionMessage.id`.

Affected file:

- `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`

---

## 9. History Load And Session Switching

Это отдельный критичный UX requirement из обсуждения с пользователем.

### 9.1. No UI-side file walking

При переключении между шагами/сессиями UI не должен:

- отдельно читать source transcript;
- отдельно искать перевод в sidecar;
- склеивать это по одному message прямо в браузере.

Вся эта работа должна жить в Core.

### 9.2. Core returns merged history

Runtime session history:

- `packages/core/src/unified-session/storage.ts`
- `packages/core/src/remote-bridge/handlers/http-api-session-routes.ts`

Dialog chain history:

- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`

Оба пути должны возвращать сообщения уже с `localizedContent`, если overlay найден и `sourceHash` совпадает.

### 9.3. Optional memory cache is allowed inside Core only

Чтобы не парсить sidecar заново при быстром hopping между шагами, Core translation facade может держать in-memory translation map per `sessionId`.

Это optimisation detail, а не внешний продуктовый контракт.

---

## 10. Rendering Rules

UI не должен становиться translation orchestrator.

Минимальные правила рендера:

- bubble display text = `message.localizedContent ?? message.content`
- existing thinking merge logic остаётся presentation-only, но должна конкатенировать display text, а не только canonical content

Affected UI files:

- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `src/client/ui/src/session/helpers.ts`
- `src/client/project-manager/components/sessions/session-message-dedupe.ts`
- `src/client/project-manager/components/sessions/runtime-session-auto-select.ts`

---

## 11. Translation Settings Contract

Этот scope не должен поддерживать migration старых overlays между разными engines.

Но новые live translations обязаны следовать текущему shared setting `general.localization.engineId`.

Следовательно Core translation policy resolver должен читать:

- `messagesForTheUserLanguage`
- `engineId`

из общего settings snapshot:

- `packages/core/src/config/provider-settings-snapshot.ts`
- `src/extension-module/settings/general-settings.ts`

Provider-applied turn config не обязан протаскивать `engineId` дальше в providers для этого scope, если translation ownership окончательно перенесён в Core.

---

## 12. Claude Packaging Follow-Up

Даже после переноса live thinking translation в Core, в Claude provider остаётся translation-backed user-facing text path (`translateUserFacingText`) до отдельного cleanup scope.

Следовательно надо закрыть существующий packaging gap:

- `scripts/build-claude-module.sh` должен vendor-ить `@codeai-hub/translation` так же, как это уже делается для Codex и Gemini
- `scripts/build-release.sh` должен валидировать bundled shared translation package и для Claude runtime bundle

Это не основной алгоритм overlay, но это обязательная release-safety часть, чтобы не оставить в продукте известный runtime gap.

---

## 13. Documentation Sync Targets After Implementation

После реализации этот planning scope обязан синхронно обновить реализованные SSOT:

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`

Ожидаемый результат после rollout:

- `Gemini_ThoughtTranslation.md` больше не должен описывать provider-local “wait for translation before final emit” как канонический baseline;
- system/module docs должны явно фиксировать новый Core-owned overlay contract.

---

## 14. Implementation Boundary Summary

Минимально достаточный change set для реализации этого scope:

1. Ввести Core-owned session translation facade и per-session overlay sidecar.
2. Протянуть stable `messageId` end-to-end без random/synthetic rewrite.
3. Перевести runtime/session history и dialog history на merge canonical content + localized overlay.
4. Добавить отдельные bridge events для live translation patch.
5. Упростить providers: emit native thinking immediately, translation больше не their live responsibility.
6. Обновить UI snapshots/render на `localizedContent ?? content`.
7. Закрыть Claude translation packaging gap в build/release pipeline.

Это и есть approved implementation boundary для будущего `doc/TODO/todo-plan.md`.
