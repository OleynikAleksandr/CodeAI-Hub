# Standalone Workspace Chats Planning

## Goal

Add a workspace-bound chat surface to Project Manager without attaching these
sessions to any workflow step.

## Accepted Shape

- The existing workspace dropdown stays in the sidebar.
- The `WORKSPACE` label row above it becomes a compact `Workflow` / `Chat`
  switch using the existing Project Manager visual language.
- `Workflow` keeps the current Documentation Tree and Development Tree.
- `Chat` shows `New Chat` and the list of saved standalone chats for the
  selected workspace.
- `New Chat` opens the existing provider picker first, then creates a
  stage-less session.
- Existing chats open directly in a detached Session UI window.
- Standalone chats use provider-default system instructions and tooling; no
  workflow prompt pack is loaded.

## Implementation Notes

- Standalone chat identity is stage-less: `stage: null`, `runSlug: null`,
  `initiativeSlug: null`.
- Workspace binding comes from `workspacePath`.
- Chat history is stored under the selected workspace's `.codeai-hub/sessions`
  root, not in the workflow runtime capsule and not in the global sessions root.
- The first version does not include rename, delete, pin, favorites, search, or
  custom standalone instruction profiles.
