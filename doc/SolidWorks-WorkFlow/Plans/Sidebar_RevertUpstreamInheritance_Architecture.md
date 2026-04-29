# Sidebar Revert Upstream Inheritance — Planning Doc

**Status:** Draft (auto-approved hotfix follow-up to 1.2.109)
**Owner:** UI / Project Manager

## Problem

В 1.2.109 я добавил upstream-наследование в `useStepProviderResolver.forStage` (VS → Description, DM → VS chain → Description), решив что это согласуется с `StageConfirmationCard` preselect логикой. Это ОШИБКА. Пользователь чётко говорит: idle step без собственной session должен оставаться нейтральным независимо от upstream attribution. `StageConfirmationCard` показывает inherited provider как **подсказку/preselect**, а не как фактическое привязывание — пользователь может выбрать другого провайдера.

На скриншоте: Description started by Claude → Description tinted Claude orange (✓). Но Virtual Simulation и Diagram Modules тоже подсветились Claude orange — потому что они унаследовали от Description chain. Это неверно — VS/DM ещё не имеют своих сессий, должны быть нейтральными.

## Goal

Каждый стейдж тинтуется только по СВОЕЙ continuity chain. Description дополнительно может использовать `description.primarySession.providerId` как fallback (это его own session, а не upstream inheritance). Никакого VS-from-Description или DM-from-VS/Description наследования.

## Solution

В `resolveStageProviderId`:
- `description` — own chain → `description.primarySession.providerId` → `null`
- `virtual_simulation` — own chain → `null` (БЕЗ description fallback)
- `diagram_modules` — own chain → `null` (БЕЗ VS/description fallback)

## Files affected

- `src/client/project-manager/components/layout/use-step-provider-resolver.ts` (1 file)
- `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` (1 file — invert upstream inheritance tests)
- SystemArchitecture.md + Project_Manager.md (2 files)

## Definition of done

1. Description started by Claude → Description tinted Claude. VS/DM остаются нейтральными.
2. Selected VS на этом workspace → нейтральная selection (без Claude orange fill/border).
3. Релиз 1.2.110.
