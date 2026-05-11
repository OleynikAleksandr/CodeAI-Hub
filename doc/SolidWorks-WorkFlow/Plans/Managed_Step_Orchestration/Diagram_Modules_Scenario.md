# Diagram Modules Scenario

**Status:** active planning scenario.
**Scope:** managed orchestration behavior for the `diagram_modules` workflow step.

## Target Shape

Diagram Modules should stay incremental. Core does not seed every future phase at bootstrap. It creates the next executable microtask only when the current result proves what should happen next.

## Scenario

1. Core starts the step with one microtask: create `product-parts.index.md`.
2. Agent writes the Product Part index and stops for Core.
3. Core validates the index.
4. If the index is accepted, Core commits it and derives the ordered Product Part list.
5. Core injects the next Product Part microtask and its paired `Git Commit:`.
6. Agent materializes only the named Product Part artifact and stops for Core.
7. Core validates that Product Part.
8. If accepted, Core commits it and injects the next Product Part microtask, or, when all parts are accepted, opens the post-completion user-return phase.

## Correction Turns

If Core rejects any Diagram Modules result, Core must create a repair microtask before sending provider-visible feedback.

Required sequence:

1. Core detects validation failure.
2. Core injects `diagram-modules.<target>.repairN.task1`.
3. Core injects the paired `Git Commit:`.
4. Core sends the repair feedback to the agent.
5. Agent replies.
6. Core commits the attempt result.

The attempt commit must exist even if the agent failed to fix the artifact. If no accepted artifact diff exists, Core must write tracked attempt evidence: target, validation errors, agent outcome, and next required repair. The attempt must not live only in `.codeai-hub/**/workflow/state.json` or session jsonl.

## Post-Completion User Return

After every Product Part is accepted, Core opens a persistent user-return phase for Diagram Modules.

In this phase:

- every user-return message that asks to revise Diagram Modules becomes a tracked microtask with a paired `Git Commit:`;
- agent output is committed as either accepted artifact changes or tracked attempt evidence;
- Core records the result but does not need a generalized semantic approval engine in the first implementation;
- the next workflow step can remain active, but the user can return to Diagram Modules and generate a new tracked revision task.

## Out Of Scope For This Scenario

- visual graph layout details;
- Quality Gates behavior;
- generalized cross-step runtime until Diagram Modules and Application Skeleton scenarios are accepted.
