# Sidebar Idle Step Neutral Tone — Planning Doc

**Status:** Draft (auto-approved as small hotfix follow-up to 1.2.106)
**Owner:** UI / Project Manager
**Related:** `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_ProviderTint_Architecture.md`

## Problem

После релиза 1.2.106 шаги Workflow Tree, у которых ещё нет ни одного continuity segment'а (никогда не запускались, не привязаны ни к одному провайдеру), всё равно отображаются с цветовой гаммой Codex. Причина: `useStepProviderResolver` всегда возвращает fallback (`"codex"` по умолчанию), и тёмно-cyan `--row-accent` применяется ко всем idle строкам.

Пример: новый workspace, где Description делал Claude, а Virtual Simulation никем ещё не работал — VS-шаг отображается циан, что не соответствует реальной атрибуции.

## Goal

Idle stages без continuity chain должны рендериться нейтрально (без `data-provider` атрибута), label-text — в существующем нейтральном `--pm-text-primary`. Цветовая гамма не применяется до тех пор, пока шаг реально не получит первого provider segment.

## Solution

1. `useStepProviderResolver`: вернуть тип `SidebarProviderId | null`. Убрать DEFAULT_FALLBACK; `fallbackProviderId` остаётся опциональным параметром, но без значения по умолчанию — caller явно решает, нужен ли fallback.
2. `workspace-tree.tsx`: передавать `data-provider={resolver.forStage(...) ?? undefined}` (React автоматически опускает атрибут при `undefined`/`null`). То же для branch row resolver'ов.
3. CSS: никаких новых правил не нужно — `.pm-tree__item[data-provider]` rules не сработают для elements без `data-provider`, и они унаследуют существующие нейтральные стили (`var(--pm-text-primary)` для label, `--pm-accent-strong` для selected — последнее остаётся как legacy fallback и в текущем scope не трогается).
4. Tests: обновить unit-тесты резолвера — некоторые проверки fallback переключить на null-возврат.
5. SSOT: обновить SystemArchitecture invariant 36 + Project_Manager.md (idle stage = no data-provider).

## Files affected (≤3 per commit)

- `src/client/project-manager/components/layout/use-step-provider-resolver.ts` (1 file)
- `src/client/project-manager/components/layout/workspace-tree.tsx` (1 file)
- `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` (1 file)
- SSOT: `SystemArchitecture.md` + `Project_Manager.md` (2 files in 1 commit)

## Definition of done

1. Idle степ без continuity chain рендерится нейтральным цветом, без cyan/orange/purple tint.
2. Все 7 unit-тестов резолвера зелёные после refactor.
3. SystemArchitecture §3 Invariant 36 явно описывает idle = neutral.
4. Релиз 1.2.107 собран.
