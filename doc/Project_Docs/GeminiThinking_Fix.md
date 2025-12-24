cat > doc/Project_Docs/GeminiThinking_Fix.md << 'EOF'
# Fix: Gemini Thinking Settings Application

## Проблема
Пользователь сообщает, что настройки "Размышлений" (Thinking) для Gemini, выбранные в UI, не применяются при старте сессии.

## Анализ
1. В `GeminiSessionManager.createSession` вызов `monkeyPatchGeminiClient` происходит **до** `await config.initialize()`.
2. Метод `config.initialize()` (из `gemini-cli-core`) отвечает за инициализацию клиента API.
3. Вероятно, `initialize()` пересоздает или сбрасывает экземпляр клиента, из-за чего "monkey-patch", примененный ранее, теряется.

## Решение
Перенести применение патча `monkeyPatchGeminiClient` строго **после** успешного завершения `config.initialize()`.

## Изменения в коде

### `packages/Gemini_Module/src/session/gemini-session-manager.ts`

```typescript
// Current
if (resolvedThinkingLevel) {
  const client = config.getGeminiClient();
  this.monkeyPatchGeminiClient(client, resolvedModel ?? "", resolvedThinkingLevel);
}

await config.initialize();
const client = config.getGeminiClient();

// Proposed
await config.initialize();
const client = config.getGeminiClient();

if (resolvedThinkingLevel) {
  this.monkeyPatchGeminiClient(client, resolvedModel ?? "", resolvedThinkingLevel);
}
```

## План верификации
1. Собрать расширение.
2. В логах сессии (System events) проверить, что Thinking параметры применяются (можно добавить логирование внутри патча для дебага).
3. Проверить работу `gemini-2.5` с бюджетом и `gemini-3` с уровнями.

EOF
