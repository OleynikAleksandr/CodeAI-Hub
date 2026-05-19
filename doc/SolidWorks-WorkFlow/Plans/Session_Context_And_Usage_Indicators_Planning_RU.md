# Планирование: индикатор контекстного окна и лимиты провайдеров

**Статус:** Active planning source  
**Дата:** 2026-05-19  
**Scope:** Session UI / Core telemetry / provider usage limits

## 1. Цель

Нужно подготовить следующий implementation scope после завершения Kimi provider module:

- уточнить и стабилизировать процент контекстного окна в нижней status panel интерфейса сессии;
- привести плашку `providerSessionId` / usage limits к ожидаемому виду для 5-часовых и недельных лимитов;
- не смешивать источник правды UI с Core/provider telemetry: Project Manager и shared Session UI остаются projection layer.

## 2. Текущее состояние

### Context window percentage

Нижняя `SessionStatusPanel` рендерит правый chip `Токены:` из `status.tokenUsage`:

- `used` — использованные токены;
- `limit` — известный context window / model context limit;
- процент сейчас вычисляется как remaining percentage: `100 - round(used / limit * 100)`.

Основной код:

- `src/client/ui/src/session/status-panel.tsx`
- `src/types/session.ts`
- `src/client/project-manager/components/sessions/token-usage-stream.ts`

Provider events уже несут token usage разными путями:

- Claude — `/context` read после turn-а;
- Codex — `thread/tokenUsage/updated`;
- Gemini — `usageMetadata.totalTokenCount` + configured `contextWindowTokenLimit`;
- Kimi — Wire `StatusUpdate` подтвержденно несет `context_usage`, `context_tokens`, `max_context_tokens` и per-turn `token_usage`; для UI status panel source должен быть `context_tokens/max_context_tokens`.

### Provider usage limits

Верхняя `SessionIdBar` рендерит `providerSessionId` и до трех usage rows:

- `currentSession`
- `currentWeekAllModels`
- `currentWeekSonnetOnly`

Основной код:

- `src/client/ui/src/session/session-id-bar.tsx`
- `src/client/ui/src/session/helpers.ts`
- `packages/core/src/provider-usage-limits/`
- provider adapters: Claude / Codex / Gemini / Kimi

На текущем baseline Kimi adapter сознательно отдает:

- `providerScopeKey: "kimi:global"`
- `usageLimits: null`
- labels `Session / Weekly / Model Weekly`
- diagnostics `source: "kimi_unavailable"`

Discovery от 2026-05-19 подтвердил рабочий Kimi Code usage endpoint:

- `GET https://api.kimi.com/coding/v1/usages`
- Authorization: `Bearer <Kimi Code API key>`
- `usage.*` = weekly quota;
- `limits[0].window.duration = 300` minutes = rolling 5-hour window;
- `parallel.limit` = concurrency capacity.

Следовательно, текущий `unavailable` для Kimi является временным baseline, а реализация этого scope должна заменить его на live reader с fail-closed fallback.

## 3. Архитектурные инварианты

- Core/provider telemetry является источником правды; UI не должен угадывать проценты или лимиты из текста диалога.
- `SessionStatusPanel` может форматировать уже полученный token snapshot, но не должен сам читать provider state.
- `SessionIdBar` не хранит persistent cache usage limits и refresh запускает только после `binding.status === "ready"`.
- Usage limits остаются provider-scope/global contract там, где provider реально отдает account-level limits.
- Для Kimi нельзя рисовать фиктивные проценты, если Kimi CLI/Wire не дает надежного источника лимитов.
- Любая новая нормализация должна быть provider-neutral в Core, а provider-specific parsing должен жить в provider module или `packages/core/src/provider-usage-limits/providers/<provider>/`.

## 4. Открытые вопросы для implementation phase

1. Какой процент должен быть виден в status panel: remaining context window или used context window? Текущий UI показывает `used (remaining%)`; нужно зафиксировать user-facing label и tooltip.
2. Должна ли status panel показывать одновременно `used`, `remaining%`, `used%` или только один процент?
3. Какие provider raw sources реально доступны для 5-часовых и weekly limits:
   - Claude headers / OAuth reader;
   - Codex app-server rate-limit snapshot;
   - Gemini shared usage facade;
   - Kimi `api.kimi.com/coding/v1/usages` with Kimi Code API key.
4. Нужно ли переименовать rows `Session / Weekly / Model Weekly` в более явные `5h / Weekly / Model weekly`, если provider source подтверждает такой смысл.
5. Для Kimi: источник найден; нужно реализовать reader, который берет API key из already-authorized `~/.kimi/config.toml` / Kimi workspace config, не сохраняет ключ в CodeAI settings и fail-closes в `unavailable`.

## 5. Предлагаемая реализация

### Phase A — audit and contract

- Зафиксировать текущий поток `tokenUsage` от provider events до `SessionStatusPanel`.
- Зафиксировать текущий поток `usageLimits` от provider adapters/Core до `SessionIdBar`.
- Обновить Session UI docs, если фактическая семантика процентов/лимитов отличается от документации.

### Phase B — context-window UI

- Ввести явный formatter/contract для context percentage, чтобы label не был неявным.
- Добавить tests на remaining/used percentage, null/zero limit и длинные token values.
- Убедиться, что layout не ломается на narrow widths.

### Phase C — usage-limits rows

- Развести labels и semantics для 5-часовых/weekly rows.
- Подключить Kimi `coding/v1/usages`: rolling 300-minute window в `currentSession`, weekly quota в `currentWeekAllModels`, parallel limit как capacity-only diagnostic если UI row contract это поддерживает.
- Добавить provider-specific tests для нормализации labels/percent/reset.

### Phase D — verification and release

- Targeted build/test для UI и затронутых provider/core packages.
- Release build только после отдельного подтверждения пользователя.
- User workflow acceptance остается отдельным финальным Stream.

## 6. Out of scope

- Изменение provider subscription/auth модели.
- Любая попытка считать Kimi лимиты из reasoning/assistant текста.
- Автоматическое сокращение Kimi reasoning или новый Kimi prompt-control scope.
- Перестройка Session UI layout за пределами status panel и session ID usage bar.
