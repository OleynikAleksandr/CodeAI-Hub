# Session 077 — Release 1.1.174 and persistent core follow-up

**Дата:** 09.11.2025 10:05 — Madrid (UTC+0100)  
**Ветка:** main  
**Версия:** 1.1.174

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/Project_Docs/UnifiedSessionArchitecture.md`
- `doc/Project_Docs/knowledge/Settings_Architecture_Guide.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`
- `doc/Sessions/Session076.md`

## Что произошло
1. Обновил README и CHANGELOG под релиз 1.1.174 и закрепил описание, что ядро остаётся живым между запуском VS Code и лаунчером, если версия совпадает.
2. Актуализировал все архитектурные документы и TODO-планы (Architecture, SystemArchitecture, UnifiedSessionArchitecture, Settings Guide, todo-plan, todo-critical) с упоминанием модели `detectRunning()`, сохранения сессий и новой persist-стратегии.
3. Собрал проект (`npm install`, `npm run compile`, `./scripts/build-all.sh`), регенерировал манифесты версии 1.1.174 и получил артефакты: `codeai-hub-1.1.174.vsix`, `CodeAIHubLauncher-macos-arm64-1.1.174.tar.bz2`, `claude-module-1.1.174.tar.bz2`, `codex-module-1.1.174.tar.bz2`, `gemini-module-1.1.174.tar.bz2`, `codeai-hub-core-darwin-arm64-1.1.174.tar.bz2`.
4. Подготовил релизный коммит с актуальными document updates и сформировал список задач на следующую сессию.

## План на следующую сессию
1. Продолжить ручную проверку: запустить лаунчер, создать сессии, закрыть оба клиента и затем открыть VS Code, чтобы убедиться, что лаунчер сохраняет старые сессии и core не рестартится.
2. При необходимости собрать дополнительные журналы, обновить документацию (например, добавить наблюдения в doc/TODO) и подтвердить, что сценарий полностью покрыт.
