# Session 071 — Release 1.1.717 Workspace Identity Stabilization

**Date:** 2026-03-12 16:20 (CET)
**Branch:** main
**Version:** 1.1.717

---

# 1. Work Done in This Session

## Work summary
- Подготовлены release-facing документы под `v1.1.717`: `README.md` и `CHANGELOG.md` синхронизированы с rollout workspace identity stabilization.
- Успешно выполнен `./scripts/build-all.sh`: unified version поднята с `1.1.716` до `1.1.717`, пересобраны provider modules, Core, UI bundles и CEF launcher; release tarballs подтверждены в `doc/tmp/releases/`.
- Успешно выполнен `./scripts/build-release.sh --use-current-version`: собран VSIX `codeai-hub-1.1.717.vsix`, пройдены architecture check, full type-check, compile, SDK exclusion validation, markdown link check и final packaging.
- Release artefacts готовы локально:
  - VSIX: `codeai-hub-1.1.717.vsix`
  - Tarballs: `doc/tmp/releases/*.tar.bz2`

## Verification
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- В выводе `build-release.sh` подтверждены этапы `Verifying SDK exclusions`, `Removing dev dependencies...`, `Package created`.
- Финальный VSIX: `codeai-hub-1.1.717.vsix` (размер около `1.2M`).

## Git commits
- `781ed5c1 docs(release): prepare workspace identity stabilization release notes`
- `662b717c build(release): stage workspace identity stabilization artifacts`
- `a65a9a87 build(release): ship workspace identity stabilization`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session070.md`
6. `doc/Sessions/Session071.md` (THIS REPORT)

## Plans for next session
- При следующем старте сначала проверить установленный локально `codeai-hub-1.1.717.vsix` и smoke-test для workspace identity stabilization в Project Manager.
- Если release smoke зелёный, решить, нужен ли отдельный post-release cleanup/doc pass или можно открывать следующий design stream вне stabilization MVP.
- Не возвращаться к dynamic provider/model switching до отдельной утверждённой design phase.
