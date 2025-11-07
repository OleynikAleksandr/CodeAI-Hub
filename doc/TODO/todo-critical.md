# Critical Bugfix Plan (P0)

## Auto-shutdown & Port Ownership
- [DONE] Send `/api/v1/shutdown` before запуск нового core, ждать graceful stop, при необходимости убивать PID/lock, чтобы старые версии не блокировали запуск 1.1.161+.
- [DONE] При занятости `CORE_PORT` автоматически переключаться на следующий свободный порт (8080 → 8081 → …), фиксировать выбор в runtime registry/ENV и продолжать startup без участия пользователя.

## Provider Isolation
- [DONE] Любая ошибка Claude/Gemини CLI должна помечать провайдера в состоянии `failed/degraded`, но не завершать orchestrator. UI выводит предупреждение, остальные провайдеры работают.

## Unified Session Regression
- [DONE] Проследить slug-путь (ENV → runtime registry → UnifiedSessionStorage) и убедиться, что JSONL пишутся в `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub/` для обоих клиентов.
- [DONE] После фикса перезапустить Extension + launcher, создать новые сессии и документировать реальные пути (см. свежий лог `codexCli/validation-<timestamp>.jsonl`).
