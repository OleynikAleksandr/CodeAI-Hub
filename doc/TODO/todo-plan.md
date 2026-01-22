# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/SessionUI_Panels_Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)
4. `doc/Sessions/Session040.md`

---

## Phase 68 — Session UI Panels Cleanup & Enhancement (owner: Oleksandr, updated: 2026-01-22)

### Stream 1: Hide TodoPanel
**Goal:** Закомментировать отображение TodoPanel (возможно уберём позже совсем).

1. [DONE] Fix(ui): закомментировать рендеринг TodoPanel в session-view.tsx — scope: `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): hide TodoPanel from session view`
2. [DONE] Git Commit: `fix(ui): hide TodoPanel from session view` (hash: 62117cc0)

### Stream 2: InfoPanel — single line
**Goal:** Сделать InfoPanel в одну строку: "Session ID: <uuid>"

1. [DONE] Fix(ui): переделать InfoPanel на single-line layout — scope: `src/client/ui/src/session/info-panel.tsx`; expected commit message: `fix(ui): make InfoPanel single-line`
2. [DONE] Git Commit: `fix(ui): make InfoPanel single-line` (hash: 2793f04c)

### Stream 3: SessionTabs — add stage name
**Goal:** Добавить к имени провайдера короткое имя агента (Description Codex, Reviewer Claude).

1. [DONE] Fix(ui): добавить stage prefix в SessionTabs (использовать session.stage) — scope: `src/client/ui/src/session/session-tabs.tsx`; expected commit message: `fix(ui): add stage name to session tabs`
2. [DONE] Git Commit: `fix(ui): add stage name to session tabs` (hash: 20672f82)

### Stream 4: StatusPanel — Models instead of Providers (Вариант B — расширение SessionStatusInfo)
**Goal:** Расширить архитектуру для передачи информации о моделях и показывать реальную модель с reasoning level.

**Архитектурное решение:**
- Добавить тип `ModelInfo` в `session.ts`
- Расширить `SessionStatusInfo` полем `models?: readonly ModelInfo[]`
- Изменить `createInitialSnapshot` в `helpers.ts` для приёма settings и формирования models
- Обновить StatusPanel для отображения models вместо providerSummary

**Структура ModelInfo:**
```typescript
type ModelInfo = {
  readonly providerId: ProviderStackId;
  readonly providerName: string;    // "Claude", "Codex", "Gemini"
  readonly modelId: string;         // "claude-opus-4-5", "gpt-5.2-codex"
  readonly modelDisplayName: string; // "Claude Opus 4.5", "GPT-5.2 Codex"
  readonly reasoning?: string;       // "high", "medium" (для Codex/Gemini)
};
```

1. [DONE] Fix(types): добавить тип ModelInfo и расширить SessionStatusInfo — scope: `src/types/session.ts`; expected commit message: `feat(types): add ModelInfo type to SessionStatusInfo`
2. [DONE] Git Commit: `feat(types): add ModelInfo type to SessionStatusInfo` (hash: 3dbd2839)
3. [DONE] Fix(ui/helpers): изменить createInitialSnapshot для приёма settings и формирования models — scope: `src/client/ui/src/session/helpers.ts`, `src/client/ui/src/session/model-info-builder.ts`; expected commit message: `feat(ui): populate models in createInitialSnapshot`
4. [DONE] Git Commit: `feat(ui): populate models in createInitialSnapshot` (hash: a1c57041)
5. [DEFERRED] Fix(ui): обновить вызовы createInitialSnapshot с передачей settings — требует прокидывания settings через многие компоненты, отложено до отдельной Phase
6. [SKIPPED] Git Commit: skipped — settings prокидывание отложено
7. [DONE] Fix(ui): обновить StatusPanel для отображения models — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `feat(ui): display model names with reasoning in StatusPanel`
8. [DONE] Git Commit: `feat(ui): display model names with reasoning in StatusPanel` (hash: 7e07f682)

### Stream 5: StatusPanel — remove Status row
**Goal:** Убрать статичную строку "Status" и сократить высоту панели.

1. [DONE] Fix(ui): удалить строку "Status" из StatusPanel — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): remove static Status row from StatusPanel`
2. [DONE] Git Commit: `fix(ui): remove static Status row from StatusPanel` (hash: 0998dd61)

---

## Notes

- Stream 4 требует исследования — нужно понять, откуда брать информацию о реальной модели.
- После Phase 68 можно рассмотреть полное удаление TodoPanel (сейчас только комментируем).
