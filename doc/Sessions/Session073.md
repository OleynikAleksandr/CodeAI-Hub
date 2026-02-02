# Session 73 — Release 1.1.497 (build-all + build-release)

**Date:** 2026-02-02 16:21 (CET)
**Branch:** main
**Version:** 1.1.497

---

# 1. Work Done in This Session

## Work summary
- Стабилизация Phase 88: `workspace-activate` resume больше не требует `sessionKind`, `runSlug` нормализуется (best-effort resume).
- Для чистого релиза добавлен ignore для локального `.tmp/`.
- Выполнен релизный пайплайн:
  - `./scripts/build-all.sh` → поднял версии до `1.1.497`, пересобрал Core/Providers/UI/Launcher и скопировал tarball’ы в `doc/tmp/releases/`.
  - `./scripts/build-release.sh --use-current-version` → собрал `codeai-hub-1.1.497.vsix` в корне репозитория.
- Обновлены release docs: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`.

## Artifacts (local)
- VSIX (root): `codeai-hub-1.1.497.vsix`
- Tarballs (`doc/tmp/releases/`):
  - `CodeAIHubLauncher-macos-arm64-1.1.497.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.1.497.tar.bz2`
  - `claude-module-1.1.497.tar.bz2`
  - `codex-module-1.1.497.tar.bz2`
  - `gemini-module-1.1.497.tar.bz2`
  - `vscode-webview-1.1.497.tar.bz2`
  - `project-manager-1.1.497.tar.bz2`

## Verification status
- ✅ Release gates прошли в рамках `build-release.sh` (architecture, typecheck/compile, SDK exclusions, links, duplication, VSIX packaging).
- ⚠️ Manual verification Phase 88 (core-driven auto-resume lastActive) всё ещё pending (см. `doc/Sessions/Session072.md`).

## Git commits
- `8827ac38 fix(core): relax workspace activate resume runSlug`
- `8dc9894e chore(git): ignore .tmp workspace cache`
- `4e242556 docs(todo): add Phase 89 release + stabilization`
- `4face963 chore(release): build-all next version`
- `56686540 docs(todo): record Phase 89 build-all hash`
- `2216e4af docs(todo): mark Phase 89 build-release done`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session072.md` (Phase 88 manual verification)
5. `doc/Sessions/Session073.md` (THIS REPORT)

## Plans for next session
- Выполнить ручной чеклист Phase 88 (auto-resume после рестарта, запрет cross-workspace resume, поведение при очистке workspace-local `.codeai-hub/<workspaceSlug>/**`).
- После ручной верификации закрыть пункты 13–14 в Phase 88 (`doc/TODO/todo-plan.md`) отдельным коммитом.
