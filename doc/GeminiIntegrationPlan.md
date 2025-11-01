# План обновления Gemini модуля

## 1. Концепция
Будем отходить от управления бинарём `gemini` через stdin/stdout. Вместо этого используем официальный `@google/gemini-cli-core` как библиотеку. CLI изначально построен вокруг этого core, поэтому мы получим «родную» реализацию без необходимости эмулировать терминал.

### Ключевые решения
1. **Все тяжёлые библиотеки и бинарники остаются внешними**. Как и CEF/core/Claude-модуль, `@google/gemini-cli-core` (и связанные артефакты) доставляем через скрипты установки в `~/.codeai-hub/providers/gemini/<version>/`. Внутри VSIX остаётся только UI + скрипты.
2. **Перевод `packages/Gemini_Module` на ESM**. Core — ESM, значит наш модуль тоже переходим на ESM (tsconfig/build/entrypoints). Это избавит от «танцев» с `require` и позволит напрямую импортировать API библиотеки.
3. **Используем официальную инициализацию CLI**. Вместо ручной сборки `Config`/`ContentGenerator` используем те же функции, что вызывает `gemini`:
   - `loadSettings()` — читает файлы настроек пользователя (`~/.gemini/settings.json`).
   - `loadCliConfig(settings, extensions, manager, sessionId, argv)` — готовит `Config` (workspace, tools, memory, telemetry и т.п.).
   - `config.refreshAuth('oauth-personal')` — поднимает топ-level client, используя существующие `oauth_creds.json`.
   - `config.initialize()` — загружает инструменты, память, стартует `GeminiClient`.
   - `config.getContentGenerator()` или `config.getGeminiClient()` — интерфейс для отправки сообщений.

## 2. Удачный прототип
На отдельном скрипте `/tmp/gemini_proto.mjs` (без правок в репо):

```js
import { loadSettings } from '@google/gemini-cli/dist/src/config/settings.js';
import { loadCliConfig } from '@google/gemini-cli/dist/src/config/config.js';

// Удаляем env, чтобы насильно не переходить на Vertex AI
for (const key of ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_LOCATION', 'GOOGLE_API_KEY']) {
  delete process.env[key];
}

const settings = loadSettings().merged;
const extensionManager = {
  isEnabled: () => true,
  getValue: () => true,
  validateExtensionOverrides: () => true,
};
const argv = { includeDirectories: [], outputFormat: 'json', allFiles: false };
const sessionId = 'proto-session';

const config = await loadCliConfig(settings, [], extensionManager, sessionId, argv, process.cwd());
await config.refreshAuth(settings.security?.auth?.selectedType ?? 'oauth-personal');
await config.initialize();

const generator = config.getContentGenerator();
const response = await generator.generateContent({
  model: config.getModel(),
  contents: [
    { role: 'user', parts: [{ text: 'Привет! Ответь одной фразой.' }] },
  ],
}, 'proto-prom');

console.log('Ответ:', response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(''));
```

Вывод: `Привет, чем могу быть полезен?`

Это доказало, что: 
- OAuth-токены из `~/.gemini/oauth_creds.json` корректно подхватываются.
- Core выполняет реальный запрос без CLI-процесса.
- Реализация можно перенести в наш модуль.

## 3. План действий (следующая сессия)
1. **Структура модуля**
   - Переписать `packages/Gemini_Module` на ESM/TypeScript (`module: "esnext"`, `type: "module"` в package.json).
   - Запланировать установку `@google/gemini-cli-core` в `packages/Gemini_Module` через `dependencies` (чтобы автосборщик мог вытянуть нужные файлы при упаковке). Сам CLI (`@google/gemini-cli`) остаётся глобальной зависимостью пользователя; модуль лишь валидирует его наличие.
   - Обновить скрипты сборки (`build-gemini-module.sh`), чтобы в каталог установки копировались только файлы `@google/gemini-cli-core` (по аналогии с core/SDK), а следы CLI удалялись во время упаковки.

2. **Инициализация**
   - В новом `GeminiProvider`/`GeminiSession` использовать `loadSettings`, `loadCliConfig`, `config.refreshAuth`, `config.initialize`.
   - Конфигурация `argv`: подобрать минимальный набор аргументов (минимум `outputFormat`, `allFiles=false`, `includeDirectories=[]`).
   - Extension manager: реализовать mock, который удовлетворяет требованиям (как в прототипе: isEnabled/getValue/validateExtensionOverrides).

3. **Работа с сессиями**
   - Вместо `GeminiSessionManager` → использовать `config.getGeminiClient()` / `GeminiChat`.
   - Отправка сообщений: `config.getGeminiClient().sendMessageStream(...)` или `generateContent(...)` (решить, что ближе к существующему UI).
   - Подписки на события: `sendMessageStream` эмитит chunk’и (`GeminiEventType`). Нужно транслировать их в наш формат (UI ожидает стриминг ответа).
   - Закрытие/рестарт: `GeminiClient.resetChat()` либо создавать новый `Config`/`GeminiClient` при необходимости.

4. **Интерфейс и storage**
   - `Config` уже создаёт `ChatRecordingService`, который пишет в `~/.gemini/tmp/...`. Возможно, UI сможет читать эти файлы напрямую, либо мы сами будем брать данные из `GeminiClient.getChatRecordingService()`.
   - Авторизация и storage — на базе существующих файлов CLI (не нужно ничего дублировать).

5. **Интеграция в CodeAI Hub**
   - Обновить provider/adapter, чтобы после `initialize()` он держал ссылку на `config`/`client` и организовывал слои подписки (core events → UI events).
   - Убедиться, что типы/интерфейсы совпадают с ожиданиями ядра и UI (например, eventEmitter в провайдере).

6. **Сборка и доставка**
   - После миграции: `npm run build` (модуль → dist ESM) + `build-gemini-module.sh` → новый архив (0.2.0?).
   - В release pipeline курируем установку `node_modules` в `tar.bz2`, как делаем для core.
   - Документация: README/Architecture/TODO обновить под новую архитектуру.

## 4. Сводка
- Прототип подтверждает жизнеспособность подхода через `@google/gemini-cli-core`.
- В следующей сессии: переводим модуль на ESM, импортируем `loadSettings`/`loadCliConfig`, строим новую реализацию `GeminiProvider`, проводим e2e-тест.
- Все тяжёлые зависимости живут вне VSIX (в ~/.codeai-hub), как и остальные провайдеры.
- Реализована `reporter.progress`, поэтому UI показывает этапы скачивания/установки Gemini компонентов и подчёркивает, что долгий этап выполняется только при первой установке.
