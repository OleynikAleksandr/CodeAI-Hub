# Sidebar + Stage Card Tint Alignment — Planning Doc

**Status:** Draft (auto-approved hotfix follow-up to 1.2.108)
**Owner:** UI / Project Manager

## Problems (3 issues)

1. **Selected idle step shows legacy green fill/border**, not neutral. На скриншоте Virtual Simulation (idle, без своего chain) выбран в сайдбаре и подсвечивается legacy `--pm-accent-strong` зелёным fill+border, потому что `data-provider` атрибут отсутствует и срабатывает legacy `.pm-tree__item--selected` правило. Idle item должен быть полностью нейтральным даже в selected state.

2. **Resolver не учитывает upstream-inherited провайдера** для stages, у которых ещё нет своей continuity chain. Пример: Description сделан Claude, Virtual Simulation ещё не запущен — на скриншоте StageConfirmationCard Claude уже preselected как inherited из previous step через `resolveInheritedProviderId`. Сайдбар обязан показывать VS в Claude tint (warm peach), а не зелёным/нейтральным. Тоже для Diagram Modules — наследует от VS или Description.

3. **Stage Confirmation Card provider buttons** (Claude / Codex / Gemini radio-pills) сейчас при selected state используют hardcoded `rgba(95, 227, 186, 0.10)` fill + `var(--pm-accent-strong)` text (зелёный). Должны быть tinted per provider — Claude warm peach, Codex cyan, Gemini cool lavender.

## Goals

1. Selected step без `[data-provider]` → нейтральный fill (`rgba(255,255,255,0.04)`) + нейтральный border (`rgba(255,255,255,0.18)`) + текст `var(--pm-text-primary)`.
2. `useStepProviderResolver.forStage` для idle stage делает upstream inheritance: VS → Description; DM → VS → Description. Это семантически совпадает с `resolveInheritedProviderId` из `workflow-provider-resolver.ts`. Только если upstream пуст — возвращается `null` (truly fresh workspace).
3. Stage Confirmation Card провайдер-pills используют corporate tokens из `DesignSystem/CorporateDesign.html` (та же палитра, что в info-card чипах и sidebar).

## Files affected

- `packages/ui/project-manager/styles.css` (1 file — neutral selected idle rule)
- `src/client/project-manager/components/layout/use-step-provider-resolver.ts` (1 file — upstream inheritance)
- `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` (1 file — new cases)
- `src/client/project-manager/components/shared/stage-confirmation-card.tsx` (1 file — provider-tinted radio pills)
- SSOT (2 files: SystemArchitecture invariant 36 + Project_Manager.md)

## Definition of done

1. Fresh workspace (без chains): Description selected → нейтральная подсветка, без зелёного.
2. Description done by Claude, VS idle: VS label и selection — Claude warm peach.
3. Stage Confirmation Card: Claude pill в warm peach, Codex в cyan, Gemini в cool lavender.
4. Релиз 1.2.109.
