# Diagram Modules — Module Shadow Visual Bottom Architecture

**Status:** Completed and archived after release `1.1.914`
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** corrective scope after release `1.1.913`

---

## 1. Problem

После релизов `1.1.912` и rebuild `1.1.913` пользователь подтвердил, что верхние границы `MODULE` больше не налезают на header-зоны `CLUSTER` и `PRODUCT PART`, но нижние границы всё ещё визуально режут нижние module cards.

Симптом теперь уже узкий и воспроизводимый:
- `MODULE` inside `CLUSTER` визуально упирается в нижнюю dashed-boundary cluster-а;
- standalone `MODULE` inside `PRODUCT PART` визуально упирается в нижнюю границу product part;
- проблема видна именно по нижнему срезу, при этом верхний clearance уже выглядит корректно.

---

## 2. Root Cause Hypothesis

Текущий live pipeline уже учитывает measured DOM height module card, но measured height не включает outer CSS shadow.

В `diagram-editor-facade.tsx` module card использует:
- `boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)"`

В `diagram-editor-layout-bounds.ts` это сейчас аппроксимируется как:
- `MODULE_VISUAL_BOTTOM_OVERFLOW = 12`

Это выглядит занижением, потому что реальный нижний visual tail у shadow больше, чем текущий safety budget. В итоге:
- математический container resize может быть формально корректным по border-box;
- но visual bottom shadow module card всё равно заходит на нижнюю границу owner container-а.

То есть текущий дефект уже не про header-body split и не про sibling packing, а про неверный visual-bottom contract для module card.

---

## 3. Target Contract

Вводится один shared invariant:

1. `getNodeVisualBottom(module)` обязан отражать не border-box низ карточки, а её реальный visual low edge с учётом outer shadow.
2. Один и тот же visual-bottom contract используется везде:
   - initial autolayout;
   - measured normalize pass;
   - manual drag normalize pass.
3. `CLUSTER` и `PRODUCT PART` обязаны resize-иться от deepest child visual bottom, а не от child border-box bottom.
4. Release acceptance считается достигнутым только если нижний visual overlap исчезает и для autolayout, и для shared runtime contract.

---

## 4. Implementation Strategy

### 4.1. Tighten shared visual-bottom constant

В `diagram-editor-layout-bounds.ts` заменить заниженный module bottom overflow на значение, согласованное с реальным CSS shadow модуля.

Цель не в heuristic gap-tuning, а в синхронизации code-side visual bounds с уже shipped card CSS.

### 4.2. Cover both auto and manual normalization paths

Так как `getNodeVisualBottom(...)` используется и initial measured autolayout, и manual layout normalize path, regression coverage нужно обновить в обоих направлениях:
- autolayout path;
- manual path.

### 4.3. Sync SSOT

В Diagram Modules SSOT нужно явно зафиксировать правило:
- measured DOM height module card не включает box-shadow;
- shared visual-bottom contract обязан добавлять explicit bottom shadow allowance поверх measured height.

---

## 5. Files In Scope

Code:
- `src/client/project-manager/components/diagram-editor/diagram-editor-layout-bounds.ts`
- `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`
- `src/client/project-manager/components/diagram-editor/diagram-editor-manual-layout-normalizer.test.ts`

Docs:
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `README.md`
- `CHANGELOG.md`

---

## 6. Acceptance Criteria

Scope считается закрытым только если:

1. Shared visual-bottom contract для `MODULE` учитывает реальный bottom shadow allowance.
2. Regression coverage обновлена как минимум для measured autolayout и manual normalize path.
3. Нижний visual overlap между module card и нижней границей `CLUSTER` / `PRODUCT PART` больше не воспроизводится на shipped build.
4. Собран новый release с новым `VSIX` и свежими tarball-артефактами.
