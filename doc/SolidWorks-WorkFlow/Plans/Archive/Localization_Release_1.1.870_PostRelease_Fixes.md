# Localization Release `1.1.870` — Post-Release Fix Scope

**Status:** Approved for execution (2026-04-03)
**Created:** 2026-04-03
**Updated:** 2026-04-03
**Owner:** Oleksandr + Codex
**Target release:** follow-up fix release after `1.1.870`

---

## 1. Trigger

Packaged release testing of `1.1.870` showed that switching:

- `UI Helper Text` to Russian;
- `Artifacts for the User` to Russian;

changes much less visible copy than expected from the approved four-category model.

The immediate user-reported symptom is not "translation engine failed globally".

The stronger hypothesis is:

- some user-facing surfaces are still hardcoded and never enter localization lookup;
- some tested surfaces belong to a different approved category than the tester expected;
- release acceptance needs one more packaged pass after the missing markers are added.

---

## 2. Accepted Diagnostic Rules

### 2.1. Do not treat every unchanged text as a bug

The approved category model remains unchanged:

1. `UI Labels`
2. `UI Helper Text`
3. `Messages for the User`
4. `Artifacts for the User`

Large help panels and runtime guidance are still expected to follow `Messages for the User`, not `UI Helper Text`.

`Artifacts for the User` is still expected to affect:

- questionnaire / form shell text;
- final user-facing workflow outputs;
- artifact-oriented user-facing staged text.

It is not a blanket switch for the whole Project Manager shell.

### 2.2. Missing localization is still a release bug when user-facing text is hardcoded

If a user-facing string is still authored directly in a React component or helper and does not go through an explicit category marker plus dictionary lookup, that is a release bug for this scope.

### 2.3. This scope is additive

This fix scope must not redesign the category model again.

It must:

- keep the approved four-category model;
- keep `Internal Agent Instructions` English-only;
- patch missing category markers and source dictionary entries;
- rebuild and retest the packaged release.

---

## 3. Confirmed Gaps To Address First

Initial audit already confirms missing localization ownership in these surface groups:

1. Localization Settings shell copy that still lives directly in `localization-settings-card.tsx`.
2. Localization glossary editor validation and helper/status copy.
3. Description provider picker shell/status copy.
4. Project Manager shell placeholders and panel/container labels.
5. Add-workspace modal copy.
6. Status-bar copy.
7. Shared artifact repair CTA/error copy.
8. Other remaining packaged PM/settings surfaces found during the same audit pass.

---

## 4. Execution Shape

The follow-up TODO must use a dedicated stream for post-release localization fixes and keep tasks at `<= 3` touched files per micro-task.

Each micro-task must include:

- the code surface being marked/localized;
- the specific English source dictionary being backfilled;
- `doc/TODO/todo-plan.md`.

The active session report must record:

- the user-reported packaged-release symptom;
- which gaps were fixed in this session;
- which packaged surfaces still need manual validation afterward.

This is required so a compacted or interrupted session can resume from the repo state alone.

---

## 5. Acceptance For The Follow-Up Release

The follow-up release is acceptable only if:

1. packaged `Settings -> Localization` visibly responds to `UI Helper Text` with more than the already-known minimal baseline;
2. packaged `Artifacts for the User` visibly affects questionnaire/form shell text and generated user-facing outputs;
3. newly localized PM shell surfaces resolve through explicit categories instead of inline strings;
4. `Internal Agent Instructions` remain English-only;
5. the follow-up packaged VSIX is tested from the installed surface, not only from the workspace checkout.
