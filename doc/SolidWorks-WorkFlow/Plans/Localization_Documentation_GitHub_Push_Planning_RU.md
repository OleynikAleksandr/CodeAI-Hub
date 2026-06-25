# Localization documentation and GitHub push

Дата: 2026-06-25.

Статус: accepted documentation/push scope.

## Цель

Актуализировать SSOT-документацию, которая касается UI Localization, shared runtime translation и live `Reasoning` translation после релиза `1.2.612`, затем запушить текущий release state на GitHub.

## Scope

- Уточнить, что `Localization` владеет persistent UI bundles and settings, but live reasoning overlay storage/replay remains Core/unified-session owned.
- Зафиксировать финальное `1.2.612` поведение: pending `translationState` is persisted/replayed through dialog history, visible reasoning hides English source, translated text reveals progressively, and growing translations keep a stable visible prefix.
- Уточнить, что `Перевод...` is local product-authored pending UI copy, not provider/model text.
- Не пересобирать VSIX: release artifact `codeai-hub-1.2.612.vsix` already exists and was accepted by the user.
- Push `main` to `origin` after documentation/closeout commits.

## Acceptance

- Relevant docs mention the final `1.2.612` translation-first reasoning behavior.
- `npm run plan:validate` passes.
- `git push origin main` succeeds.
