# UI Localization Glossary Baseline

**Status:** Proposed planning companion doc
**Created:** 2026-04-01
**Owner:** Oleksandr + Codex
**Scope:** Baseline protected-terms and user-override glossary contract for the UI localization scope

---

## 1. Purpose

This document complements:

- `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_And_Local_Glossary_Architecture.md`

It defines the baseline glossary shape needed before UI localization can be implemented safely on top of the current `google-gtx` translation path.

The glossary exists because machine translation is acceptable for generic UI copy but unreliable for:

- provider names;
- product-specific terms;
- workflow labels;
- file names;
- environment variables;
- branded technical names.

---

## 2. Baseline Rule Types

The first implementation wave needs only these glossary rule types.

### 2.1 `preserve`

The source term must survive translation unchanged.

Example:

- `Gemini` -> `Gemini`

### 2.2 `preferred_translation`

The term may be translated, but the final output must use an approved product translation rather than whatever the engine returned.

Example:

- `workflow` -> approved final form chosen by product policy

### 2.3 `user_preserve`

A user-added English term that must not be translated.

Example:

- user adds `Artifact Viewer`
- translation pipeline must preserve `Artifact Viewer` exactly as written

---

## 3. Baseline Protected Terms

The following terms should be seeded in the bundled baseline glossary as `preserve` unless a later implementation stream proves otherwise.

### Provider and product names

- `Claude`
- `Codex`
- `Gemini`
- `CodeAI Hub`
- `Project Manager`
- `Core`

### Technical brands and frameworks

- `React Flow`
- `VS Code`
- `CLI`
- `SDK`
- `JSON`
- `TypeScript`
- `Markdown`

### Environment and config tokens

- `CODEX_HOME`
- `GEMINI_HOME`
- `settings.json`
- `config.toml`
- `auth.json`

### Workflow artifacts and file names

- `module-map.md`
- `facade-map.md`
- `Final_Description.md`
- `questionnaire.md`

### Product workflow labels that are unsafe for blind translation

- `Description`
- `Virtual Simulation`
- `Diagram Modules`
- `Diagram Facades`

These workflow labels still participate in `workflowTermsPolicy`, but the glossary must be able to preserve them when the user selects `keep_english`.

---

## 4. User-Managed Overrides

The glossary system must allow the user to extend the protected-term list.

Minimum product capability:

1. The user opens a glossary editor from localization settings.
2. The user enters one or more English terms.
3. Each entered term becomes a `user_preserve` rule.
4. Subsequent translations preserve those terms exactly.

The first implementation wave does not require advanced morphology or regex support.

Only exact-term protection is required at first.

---

## 5. Storage Contract

Bundled glossary sources:

- `assets/localization/glossary/base.json`
- `assets/localization/glossary/<language>.json`

User-owned glossary source:

- `~/.codeai-hub/localization/glossary/user-overrides.json`

Recommended first-wave user override shape:

```json
{
  "preserve": [
    "Artifact Viewer",
    "Workspace Tree",
    "Custom Step Name"
  ]
}
```

This file is user data.
Application updates must not overwrite it.

---

## 6. Merge Order

Glossary resolution order must be deterministic.

Recommended order:

1. bundled base glossary
2. bundled language-specific glossary
3. category policy from settings
4. user overrides

The last matching rule wins.

This guarantees that the user can override bundled defaults where needed.

---

## 7. Validation Rules

User-entered terms must be validated before they are accepted.

Minimum validation:

1. term must be non-empty after trim
2. term must contain at least one Latin letter
3. exact duplicates must be removed
4. maximum term length must be bounded
5. marker-reserved sequences must be rejected

This avoids malformed rules that could break the protection pipeline.

---

## 8. Invalidation Rule

Any change in:

- bundled glossary;
- language-specific glossary;
- user overrides;
- workflow term policy

must invalidate affected localization bundles and trigger incremental regeneration for impacted categories/languages.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_And_Local_Glossary_Architecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
