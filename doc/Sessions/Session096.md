# Session 96 — Refine provider guard + questionnaire mirror in Core

**Date:** 2026-01-12 14:28 (CET)
**Branch:** main
**Version:** 1.1.410

---

# 1. Work Done in This Session

## Work summary
- Core: добавлен fail-fast guard для Refine existing — старт сессии запрещён, если `providerId` из UI не совпадает с `run.json.providerId`.
- Core: запись `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/questionnaire.md` теперь автоматически зеркалится в `.codeai-hub/initiatives/<initiativeSlug>/idea/questionnaire.md` (live mirror).
- Документация: обновлён `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` (Refine existing provider guard + live mirror).

## Build results
- Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd`, `npm run check:links`
- Target build: `npm run build --workspace @codeai-hub/core`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `31ae4865 fix(core): fail-fast on refine provider mismatch`
- `b41126ea fix(core): mirror run questionnaire to initiative copy`
- `6cd7ab34 docs: update todo plan status`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/Architecture/Architecture.md`
4. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session096.md` (THIS REPORT)

## Plans for next session
- Ручной e2e (Refine existing): выбрать run с `run.json.providerId=<X>`, попытаться стартануть с `providerId=<Y>` и убедиться, что Core возвращает ошибку: “Refine existing run cannot change provider; start a new run to switch provider.”
- Ручной e2e (mirror): сохранить анкету в `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/questionnaire.md` и проверить обновление `.codeai-hub/initiatives/<initiativeSlug>/idea/questionnaire.md` на каждый save + append уточнений.
