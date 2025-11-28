# Quality Gate Manager — текущее состояние (v1)

Этот документ описывает, **как сейчас устроены гейты качества в CodeAI Hub**, какие инструменты задействованы и как воспроизвести установку/настройку на новом рабочем каталоге. Здесь не описывается будущее видение модуля Quality_Gate_Manager — оно вынесено в отдельный документ.

---

## 1. Цели системы гейтов качества

В текущей конфигурации гейты качества решают несколько задач:

- **Статическое качество кода** для TypeScript/JavaScript:
  - единый стиль форматирования;
  - строгие линт‑правила (Ultracite/Biome);
  - защита от типичных ошибок (async, React/Next, a11y и т.п.).
- **Архитектурная дисциплина**:
  - файлы не более 300 строк;
  - фасадный подход (facade‑файлы как единственная точка входа в модуль);
  - отсутствие пустых директорий;
  - ограничение дублирования кода (jscpd).
- **Чистота кода и зависимостей**:
  - поиск неиспользуемых экспортов (ts-prune);
  - контроль отсутствия тяжёлых SDK внутри VSIX.
- **Качество документации**:
  - проверка ссылок в Markdown (doc/**, README).
- **Гарантия чистого репозитория перед релизом**:
  - сборочные скрипты `build-all.sh` и `build-release.sh` отказываются работать при грязном Git.

---

## 2. Текущий стек инструментов

Сейчас используются следующие инструменты:

- **Ultracite + Biome**:
  - форматирование и линтинг JS/TS;
  - интеграции с агентами (Claude, Codex, Gemini и др.);
  - конфигурация в `biome.jsonc` (preset `ultracite/core`, `ultracite/react`).
- **Husky (Git hooks)**:
  - `.husky/pre-commit` — быстрые гейты перед коммитом;
  - `.husky/pre-push` — тяжёлые проверки перед push.
- **Собственные скрипты**:
  - `scripts/check-architecture.sh` — архитектурный чек (длина файлов, фасады, пустые директории, jscpd).
  - `ts-prune` (`npm run check:tsprune`) — поиск неиспользуемых экспортов TypeScript.
  - `jscpd` (`npm run check:dup`) — проверка дублирования кода.
  - `markdown-link-check` (`npm run check:links`) — проверка ссылок в документации.
- **Сборка/релиз**:
  - `scripts/build-all.sh` — поднимает версии, пересобирает модули/ядро/UI/launcher.
  - `scripts/build-release.sh` — финальная релизная сборка VSIX (на чистом Git).

---

## 3. Установка и первичная настройка Ultracite (с нуля)

Ниже — минимальный сценарий для нового репозитория (или нового рабочего каталога), чтобы подключить Ultracite и гейты качества по текущей схеме.

### 3.1. Предусловия

- Установлен Node.js и npm.
- В корне есть:
  - `package.json` (можно создать через `npm init -y`);
  - инициализирован Git‑репозиторий (`git init -b main`).

### 3.2. Установка Ultracite и Biome

Рекомендуется сразу ставить последнюю версию Ultracite:

```bash
npm install --save-dev ultracite@latest @biomejs/biome
```

После установки в `devDependencies` появятся пакеты:

- `ultracite` (CLI);
- `@biomejs/biome` (движок форматтера/линтера).

### 3.3. Запуск визарда Ultracite

Инициализация выполняется командой:

```bash
npx ultracite@latest init
```

Визард задаёт ряд вопросов (по шагам):

1. **Frameworks**:
   - для CodeAI Hub отмечается как минимум `React`;
   - `Next.js` можно не выбирать, так как в этом репозитории нет Next‑приложения.
2. **Editors**:
   - `VSCode / Cursor / Windsurf` (значение `vscode`) — чтобы настроить `.vscode/settings.json` и автозапуск Biome.
3. **Agents**:
   - `Claude Code` (`claude`) — создаёт/дополняет `.claude/CLAUDE.md`.
   - `Codex` (`codex`) — дополняет `AGENTS.md`.
   - `Gemini CLI` (`gemini-cli`) — создаёт `GEMINI.md`.
   - при необходимости можно отметить и других агентов (Cursor, Roo Code и т.д.).
4. **Hooks**:
   - `Claude Code` — создаёт `.claude/settings.json` с hook’ом `PostToolUse` → `npx ultracite fix`.
   - (при выборе `cursor` — создаётся `.cursor/hooks.json`).
5. **Integrations**:
   - `Husky pre-commit hook` — создаёт `.husky/pre-commit`.
   - (опционально `Lefthook`, `lint-staged`, если они нужны; в текущем состоянии мы от Lefthook отказались).

Результат работы визарда:

- обновлённый/созданный `biome.jsonc` с preset’ами `ultracite/**`;
- TS‑конфиги (`tsconfig*.json`) с включённым `strictNullChecks`;
- файлы правил для агентов:
  - `.claude/CLAUDE.md`,
  - `AGENTS.md`,
  - `GEMINI.md` и т.д.;
- Husky‑хуки в `.husky/`.

После визарда мы вручную донастроили:

- `biome.jsonc` — добавили `files.includes` с `!!` для тяжёлых бандлов (`media/react-chat.js`, `media/web-client/dist/**`), чтобы Biome не пытался их анализировать.

---

## 4. Текущие Git‑хуки (Husky)

### 4.1. `.husky/pre-commit`

Сейчас pre-commit выполняет следующие шаги:

1. `npm test`  
   (пока заглушка `"No automated tests defined yet"`, но место под тесты зарезервировано).
2. `./scripts/check-architecture.sh`  
   - проверка длины TS/TSX‑файлов в `src` (лимит 300 строк);
   - подсветка файлов 250–300 строк (предупреждение);
   - поиск фасадов (`*facade.ts`/`tsx`);
   - поиск пустых директорий в `src` и `packages`;
   - jscpd по нескольким директориям (лимит 3%).
3. `npm run lint`  
   - сейчас это заглушка (`echo "lint script not configured yet"`), но при желании сюда можно повесить `npx ultracite check` или отдельный lint.
4. `npm run check:tsprune`  
   - запускает `ts-prune` для поиска неиспользуемых экспортов.
5. `npx ultracite fix` по staged‑файлам:
   - стэшит незастейдженные изменения;
   - форматирует и чинит ошибки в staged‑файлах;
   - возвращает стэш и заново добавляет отформатированные файлы;
   - если были изменения, пишет `✨ Files formatted by Ultracite`.

Если любой шаг возвращает `exit 1`, коммит блокируется.

### 4.2. `.husky/pre-push`

Pre-push сейчас выполняет:

1. `npm run -s check:dup`  
   - jscpd по `src`, порог дублирования 3%, при превышении — push блокируется.
2. `npm run -s check:links`  
   - `markdown-link-check` для всех `*.md` в `doc/`;
   - при битых ссылках push блокируется.

Эти проверки тяжёлые, поэтому вынесены на push, а не на каждый коммит.

---

## 5. Сборка и релиз: `build-all.sh` и `build-release.sh`

### 5.1. `./scripts/build-all.sh`

Назначение: **поднять версии и собрать все модули/ядро/UI/launcher под один номер**.

Основные шаги:

1. Проверка чистого дерева:
   - если `git status --porcelain` не пустой → скрипт падает.
2. Определение максимальной версии среди:
   - root `package.json`,
   - `packages/core`, `packages/Claude_Module`, `packages/Codex_Module`, `packages/Gemini_Module`, `packages/unified-session`,
   - и соответствующих манифестов.
3. Поднятие версий (patch +1) во всех этих пакетах.
4. Сборка:
   - `build-claude-module.sh`, `build-codex-module.sh`, `build-gemini-module.sh`;
   - `build-core.sh` (core runtime, завёрнутый с Node в tarball);
   - `build-ui-bundle.sh` (vscode-webview, web-client, project-manager);
   - `build-cef-launcher.sh` (C++ лаунчер).
5. Копирование артефактов в `doc/tmp/releases` и очистка лишних версий.

`build-all.sh` **не** собирает VSIX и не трогает `build-release.sh` — это отдельный шаг.

### 5.2. `./scripts/build-release.sh --use-current-version`

Назначение: **упаковать VSIX на основе уже подготовленных модулей**.

Шаги:

1. Проверка чистого Git (как в `build-all.sh`).
2. Очистка кеша (`out`, старые VSIX, dist web‑client и провайдерские SDK в `node_modules`).
3. (При отсутствии `--use-current-version` — bump patch‑версии, но в нашем сценарии мы всегда передаём `--use-current-version`).
4. Сборка UI‑bundle’ов (webview и web‑client).
5. Архитектурный чек (`check-architecture.sh`).
6. `tsc -p . --noEmit` (smoke‑typecheck).
7. `npm run compile`:
   - снова webview/web‑client,
   - `npm run typecheck:webview`,
   - `tsc -p .`.
8. Проверка и очистка SDK:
   - удаление провайдерских SDK из `node_modules`;
   - добавление путей в `.vscodeignore`.
9. Валидация артефактов в `~/.codeai-hub/releases` (модули, core, launcher) и версий в манифестах.
10. Advisory‑проверки:
    - `npm run check:links` (битые ссылки → предупреждение, не ошибка);
    - `npm run check:dup` (jscpd, тоже advisory).
11. `npm prune --omit=dev` перед упаковкой.
12. `npx vsce package` → `codeai-hub-<version>.vsix`.
13. Восстановление dev‑dependencies (`npm install`).
14. Проверка размера VSIX и вывод summary.

---

## 6. Итоговый поток работы разработчика/агента

С учётом того, что мы имеем сейчас:

1. **В процессе разработки**:
   - писать код по архитектурным и Ultracite‑правилам;
   - регулярно запускать:
     - `npm run check:architecture`,
     - `npx ultracite check`,
     - `npm run check:tsprune`,
     - `npm run check:dup`,
     - `npm run check:links`,
     - таргетные `npm run build --workspace ...`, `npm run build:webview`, `npm run typecheck:webview`.
2. **Перед коммитом**:
   - rely на Husky pre-commit:
     - архитектура + ts-prune + Ultracite fix.
3. **Перед push**:
   - Husky pre-push:
     - jscpd + markdown‑links.
4. **Перед релизом**:
   - убедиться, что git clean;
   - выполнить `./scripts/build-all.sh`;
   - закоммитить всё, что поменял `build-all.sh` (версии, манифесты);
   - на чистом Git выполнить `./scripts/build-release.sh --use-current-version`;
   - после успеха:
     - закоммитить изменения от build-release (если есть),
     - обновить todo‑plan и Session‑отчёт,
     - только после этого отдавать VSIX.

Этот документ фиксирует **фактическое состояние** гейтов качества на момент версии `1.1.315`. Будущий модуль Quality_Gate_Manager будет развивать и автоматизировать эти процессы (см. отдельный документ).

