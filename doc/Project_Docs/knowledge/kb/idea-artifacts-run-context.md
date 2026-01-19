# Idea-артефакты: run-контекст и синхронизация анкеты (2026-01-10)

## Контекст проблемы
- При отсутствии initiative/run контекста в UI артефакты идеи сохранялись в fallback-пути вида `.codeai-hub/initiatives/unknown-initiative/runs/000-unknown/...`.
- Анкета была только в run-папке; при запуске нового run приходилось заполнять ее заново и уточнения не сохранялись для следующих запусков.

## Решение
- UI хранит и переиспользует output paths между сессиями Idea Collector, используя sessionId и fallback на `artifactPaths` из контракта.
- Анкета переиспользуется между run-ами через initiative-level cache:
  - source of truth: `.codeai-hub/initiatives/<initiative>/idea/questionnaire.md`
  - при старте run анкета копируется в `.codeai-hub/initiatives/<initiative>/runs/<run>/idea/questionnaire.md`.
- Уточняющие вопросы и ответы после отправки анкеты автоматически дописываются в общий questionnaire.md, чтобы следующий run получал актуальную версию.

## Ожидаемое поведение
- Если Core еще не вернул initiative/run — UI не пишет артефакты и показывает понятное предупреждение.
- При повторном запуске Idea Collector анкета уже заполнена из initiative-level cache.
- Все уточнения фиксируются в анкете и сохраняются между run-ами.

## Диагностика
- Проверить наличие `session:created` контекста (initiative/run/stage) в логах Core.
- Сверить пути в `idea/questionnaire.md` и `idea/artifacts/*` внутри run директории.
