# Sidebar Branch Nodes Neutral Until Session — Planning Doc

**Status:** Draft (auto-approved as small hotfix follow-up to 1.2.107)
**Owner:** UI / Project Manager
**Related:** `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_ProviderTint_Architecture.md`, `Plans/Archive/Sidebar_IdleStepNeutralTone_Architecture.md`

## Problem

После 1.2.107 trunk-шаги стали корректно нейтральными для idle-state, но Development Tree branch nodes (P/C/M кубики Product Part / Cluster / Module) всё равно унаследуют tint от latest `diagram_modules` chain. Это семантически некорректно: ядро создаёт structure Development Tree из `diagram_modules` artifact, но это не означает, что эти branch-узлы уже привязаны к какому-то провайдеру. Они должны быть нейтральными до тех пор, пока для конкретного P/C/M реально не появится своя session с собственной provider attribution (`Cluster Design` / `Module Design` шаги).

Текущий код:
```ts
const branchDefault =
  resolveSidebarProviderIdForStage(snapshot, "diagram_modules", fallbackProviderId);
return {
  forBranchPart: () => branchDefault,
  forBranchCluster: () => branchDefault,
  forBranchModule: () => branchDefault,
};
```

Это даёт всем branch-узлам Claude/Codex/Gemini tint от `diagram_modules` сессии — что и видно на скриншоте пользователя (зелёные `P`/`C` маркеры и accent labels).

## Goal

`forBranchPart` / `forBranchCluster` / `forBranchModule` должны возвращать `null` для текущего поколения architecture (нет per-branch sessions). Когда real per-branch session contracts появятся, resolver расширится с точечной chain-resolution per `partId` / `clusterId` / `moduleId` — call site остаётся неизменным.

## Solution

1. `use-step-provider-resolver.ts`: убрать `branchDefault` resolution; все три branch resolvers возвращают `null` независимо от snapshot и fallback.
2. Tests: убрать assertion'ы, проверяющие inheritance от `diagram_modules`; добавить positive assertion на null-возврат.
3. SSOT: SystemArchitecture invariant 36 + Project_Manager.md обновить — branch nodes neutral until per-branch session.

## Files affected

- `src/client/project-manager/components/layout/use-step-provider-resolver.ts` (1 file)
- `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` (1 file, проверить нет ли relevant test'ов на branch-fallback — текущие тесты только trunk)
- SSOT (2 files)

## Definition of done

1. Branch nodes (P/C/M) рендерятся нейтральным цветом независимо от latest `diagram_modules` provider.
2. Trunk шаги остаются tinted по своим chain'ам (без регрессии 1.2.106 баги).
3. Релиз 1.2.108 собран.
