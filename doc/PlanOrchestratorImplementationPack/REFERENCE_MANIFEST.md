# Reference Manifest

Пакет содержит зеркала фактических файлов реализации.
Ссылки ниже относительные к этой папке.

## Hooks

- [reference/hooks/pre-commit](reference/hooks/pre-commit)
- [reference/hooks/commit-msg](reference/hooks/commit-msg)
- [reference/hooks/post-commit](reference/hooks/post-commit)
- [reference/hooks/pre-push](reference/hooks/pre-push)
- [reference/hooks/post-checkout](reference/hooks/post-checkout)

## Agent Instructions

- [reference/agent-instructions/AGENTS_SESSION_ORCHESTRATION_EXCERPT.md](reference/agent-instructions/AGENTS_SESSION_ORCHESTRATION_EXCERPT.md)

## Plan Orchestrator Scripts

- [reference/scripts/plan-orchestrator/plan-cli.mjs](reference/scripts/plan-orchestrator/plan-cli.mjs)
- [reference/scripts/plan-orchestrator/plan-closeout.mjs](reference/scripts/plan-orchestrator/plan-closeout.mjs)
- [reference/scripts/plan-orchestrator/plan-commit.mjs](reference/scripts/plan-orchestrator/plan-commit.mjs)
- [reference/scripts/plan-orchestrator/plan-complete.mjs](reference/scripts/plan-orchestrator/plan-complete.mjs)
- [reference/scripts/plan-orchestrator/plan-debt.mjs](reference/scripts/plan-orchestrator/plan-debt.mjs)
- [reference/scripts/plan-orchestrator/plan-git-state.mjs](reference/scripts/plan-orchestrator/plan-git-state.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-branch-advisory.mjs](reference/scripts/plan-orchestrator/plan-hook-branch-advisory.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-commit-msg.mjs](reference/scripts/plan-orchestrator/plan-hook-commit-msg.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-post-commit.mjs](reference/scripts/plan-orchestrator/plan-hook-post-commit.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-pre-commit.mjs](reference/scripts/plan-orchestrator/plan-hook-pre-commit.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-pre-push.mjs](reference/scripts/plan-orchestrator/plan-hook-pre-push.mjs)
- [reference/scripts/plan-orchestrator/plan-markdown-updater.mjs](reference/scripts/plan-orchestrator/plan-markdown-updater.mjs)
- [reference/scripts/plan-orchestrator/plan-repair.mjs](reference/scripts/plan-orchestrator/plan-repair.mjs)
- [reference/scripts/plan-orchestrator/plan-snapshot.mjs](reference/scripts/plan-orchestrator/plan-snapshot.mjs)
- [reference/scripts/plan-orchestrator/plan-state-parser.mjs](reference/scripts/plan-orchestrator/plan-state-parser.mjs)
- [reference/scripts/plan-orchestrator/plan-state-types.mjs](reference/scripts/plan-orchestrator/plan-state-types.mjs)
- [reference/scripts/plan-orchestrator/plan-task-locator.mjs](reference/scripts/plan-orchestrator/plan-task-locator.mjs)
- [reference/scripts/plan-orchestrator/plan-transaction.mjs](reference/scripts/plan-orchestrator/plan-transaction.mjs)
- [reference/scripts/plan-orchestrator/plan-validator.mjs](reference/scripts/plan-orchestrator/plan-validator.mjs)

## Plan Orchestrator Tests

- [reference/scripts/plan-orchestrator/plan-closeout.test.mjs](reference/scripts/plan-orchestrator/plan-closeout.test.mjs)
- [reference/scripts/plan-orchestrator/plan-complete.test.mjs](reference/scripts/plan-orchestrator/plan-complete.test.mjs)
- [reference/scripts/plan-orchestrator/plan-dogfood.test.mjs](reference/scripts/plan-orchestrator/plan-dogfood.test.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-branch-advisory.test.mjs](reference/scripts/plan-orchestrator/plan-hook-branch-advisory.test.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-post-commit.test.mjs](reference/scripts/plan-orchestrator/plan-hook-post-commit.test.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-pre-commit.test.mjs](reference/scripts/plan-orchestrator/plan-hook-pre-commit.test.mjs)
- [reference/scripts/plan-orchestrator/plan-hook-pre-push.test.mjs](reference/scripts/plan-orchestrator/plan-hook-pre-push.test.mjs)
- [reference/scripts/plan-orchestrator/plan-markdown-updater.test.mjs](reference/scripts/plan-orchestrator/plan-markdown-updater.test.mjs)
- [reference/scripts/plan-orchestrator/plan-repair.test.mjs](reference/scripts/plan-orchestrator/plan-repair.test.mjs)
- [reference/scripts/plan-orchestrator/plan-snapshot.test.mjs](reference/scripts/plan-orchestrator/plan-snapshot.test.mjs)
- [reference/scripts/plan-orchestrator/plan-state-parser.test.mjs](reference/scripts/plan-orchestrator/plan-state-parser.test.mjs)
- [reference/scripts/plan-orchestrator/plan-transaction.test.mjs](reference/scripts/plan-orchestrator/plan-transaction.test.mjs)
- [reference/scripts/plan-orchestrator/plan-validator.test.mjs](reference/scripts/plan-orchestrator/plan-validator.test.mjs)

## Planning References

- [reference/planning/Plan_Orchestrator_Architecture.md](reference/planning/Plan_Orchestrator_Architecture.md)
- [reference/planning/Plan_Orchestrator_Deferred_Verification_Architecture.md](reference/planning/Plan_Orchestrator_Deferred_Verification_Architecture.md)
- [reference/planning/Plan_Orchestrator_Closeout_Replacement_Architecture.md](reference/planning/Plan_Orchestrator_Closeout_Replacement_Architecture.md)

## Evidence References

- [reference/evidence/session-recovery-check.md](reference/evidence/session-recovery-check.md)
- [reference/evidence/commit-workflow-check.md](reference/evidence/commit-workflow-check.md)
- [reference/evidence/mixed-workflow-acceptance.md](reference/evidence/mixed-workflow-acceptance.md)
- [reference/evidence/pre-push-guard-check.md](reference/evidence/pre-push-guard-check.md)
- [reference/evidence/snapshot-automation-check.md](reference/evidence/snapshot-automation-check.md)
- [reference/evidence/closeout-command-check.md](reference/evidence/closeout-command-check.md)
- [reference/evidence/branch-hooks-check.md](reference/evidence/branch-hooks-check.md)
- [reference/evidence/deferred-workflow-acceptance.md](reference/evidence/deferred-workflow-acceptance.md)
- [reference/evidence/closeout-replacement-check.md](reference/evidence/closeout-replacement-check.md)
- [reference/evidence/closeout-replacement-acceptance.md](reference/evidence/closeout-replacement-acceptance.md)

## Archived Plans

Эти файлы не являются runtime dependency.
Они нужны как examples/fixtures для человека, который переносит систему: по ним видно, как выглядит tracked closeout archive после завершения scope, какие поля state сохраняются, как записывается acceptance, planning source disposition и active plan copy.

- [reference/archives/todo-plan-mixed-orchestrator-test-2026-05-04.md](reference/archives/todo-plan-mixed-orchestrator-test-2026-05-04.md)
- [reference/archives/todo-plan-closeout-plan-orchestrator-deferred-verification-2026-05-04.md](reference/archives/todo-plan-closeout-plan-orchestrator-deferred-verification-2026-05-04.md)
- [reference/archives/todo-plan-closeout-plan-orchestrator-closeout-replacement-2026-05-04.md](reference/archives/todo-plan-closeout-plan-orchestrator-closeout-replacement-2026-05-04.md)
