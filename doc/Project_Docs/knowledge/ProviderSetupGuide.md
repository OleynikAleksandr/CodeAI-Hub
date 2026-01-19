# Provider Setup Guide

**Last Updated:** 2026-01-19

CodeAI Hub использует официальные CLI/SDK для каждого AI-провайдера. Расширение **автоматически устанавливает** эти инструменты глобально при первом запуске, но вы можете установить их вручную.

> **Important:** Учётные данные хранятся локально на вашем компьютере.

---

## Anthropic Claude

### Автоматическая установка
CodeAI Hub устанавливает `@anthropic-ai/claude-code` глобально при активации.

### Ручная установка
```bash
npm install -g @anthropic-ai/claude-code
```

### Аутентификация
```bash
claude login
```
Завершите OAuth flow в браузере. Credentials: `~/.claude/`.

### Проверка
```bash
claude --version
claude whoami
```

---

## OpenAI Codex

### Автоматическая установка
CodeAI Hub устанавливает `@openai/codex` глобально.

### Ручная установка
```bash
npm install -g @openai/codex
```

### Аутентификация
- **ChatGPT login (default):**
  ```bash
  codex login
  ```
- **API key (optional):** `CODEX_API_KEY=<your-key>`

Credentials: `~/.codex/auth.json` (или `~/.codeai-hub/providers/codex/home/auth.json` для изолированного режима).

### Проверка
```bash
codex --version
```

---

## Google Gemini CLI

### Автоматическая установка
CodeAI Hub устанавливает `@google/gemini-cli` и `@google/gemini-cli-core` глобально.

### Ручная установка
```bash
npm install -g @google/gemini-cli @google/gemini-cli-core
```

### Аутентификация
```bash
gemini login
```
Завершите OAuth flow. Credentials: `~/.gemini/credentials.json`.

### Проверка
```bash
gemini --version
```

---

## Auto Update

При старте ядра `ProviderAutoUpdateService` проверяет свежие версии CLI/SDK и обновляет их автоматически (если включено в Settings).

---

## Отключение провайдера

Если не планируете использовать провайдер:
- Не устанавливайте CLI
- Или выполните `<cli> logout` для инвалидации токенов
- Провайдер отобразится как `inactive` в UI

---

## Troubleshooting

### `MODULE_NOT_FOUND` при запуске
Проверьте глобальный npm prefix:
```bash
npm config get prefix
```
Должен быть в `PATH` (обычно `~/.npm-global/bin`).

### Провайдер показывает `Not connected`
1. Проверьте установку: `<cli> --version`
2. Проверьте авторизацию: `<cli> whoami` или `<cli> login`
3. Перезапустите VS Code

### Gemini: `ERR_REQUIRE_ESM`
Убедитесь, что используете Node.js 20+ (ядро включает bundled runtime).
