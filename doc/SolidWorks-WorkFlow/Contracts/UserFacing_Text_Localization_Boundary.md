# User-Facing Text Localization Boundary (SSOT)

**Status:** Active
**Updated:** 2026-04-03
**Owner:** Oleksandr + Codex

---

## 1. Purpose

This contract exists to stop a recurring class of regressions:

- new UI/features ship with hardcoded English product copy;
- product-owned text is added without an explicit localization category;
- internal prompts and user-facing copy get mixed into the same translation path.

Every change that adds product-authored text must classify that text before implementation is considered complete.

---

## 2. Mandatory Authoring Rule

If CodeAI Hub authors, renders, stores, or updates a text that the product owns, that text must have an explicit localization ownership decision.

Allowed outcomes are only:

1. `UI Labels`
2. `UI Helper Text`
3. `Messages for the User`
4. `Artifacts for the User`
5. `Internal Agent Instructions` (English-only boundary)

Automatic guessing is not allowed.

Inline hardcoded product copy inside React components, view helpers, workflow presenters, or template builders is not an acceptable steady state.

---

## 3. Classification Rules

### 3.1. `UI Labels`

Use for short interface terms such as:

- button labels;
- tab names;
- section titles;
- form labels;
- menu items;
- short shell placeholders.

### 3.2. `UI Helper Text`

Use for explanatory interface copy such as:

- helper paragraphs under a setting or control;
- onboarding hints;
- short descriptions that clarify what an option does;
- inline setting guidance that is not an error/warning/status.

### 3.3. `Messages for the User`

Use for user-addressed runtime communication such as:

- warnings;
- errors;
- validation messages;
- empty states;
- status lines;
- success/failure notices;
- larger help panels and runtime guidance blocks.

### 3.4. `Artifacts for the User`

Use for product-authored content that the user edits, reviews, or exports, such as:

- questionnaires;
- structured forms authored by the product;
- staged workflow artifact shell text;
- final user-facing generated artifact scaffolding owned by the product.

### 3.5. `Internal Agent Instructions`

Use for:

- agent prompts;
- system instructions;
- hidden technical templates;
- internal routing/authoring text that is not shown to the user.

This boundary stays English-only unless a separate explicit contract changes it.

---

## 4. Implementation Rules

When adding or changing user-facing product copy:

1. Add or reuse a stable message id in the appropriate English source dictionary.
2. Resolve the text through the shared localization runtime instead of making the component/template the source of truth.
3. Keep fallback strings only as bootstrap safety, not as the primary authoring location.
4. Do not place user-facing copy inside provider/internal prompt assets unless that surface is intentionally an internal English-only boundary.
5. If one surface contains multiple text kinds, split them by category instead of forcing one category onto the whole file.

---

## 5. Review Checklist

Before closing a task that adds text, verify:

1. Which exact category owns each new string?
2. Is any new user-facing product copy still hardcoded in a component/helper/template builder?
3. Does the source dictionary now contain the canonical English text?
4. Does the rendered surface read through localization lookup/runtime payload?
5. Did any internal-only text accidentally become user-localizable?

If any answer is unclear, the task is not complete.

---

## 6. Non-Negotiable Invariants

1. Product-owned localizable copy is authored in bundled English dictionaries, not directly in UI components.
2. User-facing text and internal agent instructions must not share an implicit translation path.
3. New product surfaces must declare localization ownership during implementation, not as a later cleanup pass.
4. Release acceptance for UI work includes verifying that new text surfaces react to the correct localization category.

---

## 7. Related SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Plans/Localization_Release_1.1.870_PostRelease_Fixes.md`

