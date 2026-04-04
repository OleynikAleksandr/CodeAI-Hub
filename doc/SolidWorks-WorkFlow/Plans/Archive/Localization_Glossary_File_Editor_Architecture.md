# Localization Glossary File Editor Architecture

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex

---

## 1. Problem

The current `Do-not-translate terms` UI still behaves like a temporary inline draft editor inside the Settings webview:

- terms are edited one by one;
- the draft is kept in browser local storage;
- the user cannot comfortably manage a longer product glossary;
- the editable surface is disconnected from the real user-space localization storage.

This makes glossary curation slow and hides the actual storage boundary from the user.

---

## 2. Decision

CodeAI Hub should replace the inline draft-first glossary editing UX with a user-space text file that opens directly in the current VS Code window.

Accepted behavior:

1. User glossary overrides live in a plain-text file under `~/.codeai-hub/localization/glossary/`.
2. The Settings webview keeps the glossary card, but its primary action opens that file in VS Code instead of editing terms inline one by one.
3. The file uses one term per line.
4. Empty lines and comment lines are ignored.
5. On first open, CodeAI Hub creates the file with:
   - short header comments describing the format;
   - a seeded list of already-known product/provider/workflow terms that are expected to stay in English.
6. Runtime localization reads preserve terms from that text file only; legacy JSON continuity is intentionally out of scope for this iteration.

---

## 3. Scope

1. `@codeai-hub/localization`
   - support plain-text glossary overrides as the primary editable surface;
   - expose an `ensure/open`-ready path for the editable glossary file.
2. Extension settings bridge
   - add a settings message that ensures the glossary file exists and opens it in the active VS Code editor.
3. Settings webview
   - replace the inline add/edit/remove draft UI with file-editor guidance plus an open action.
4. Source copy
   - update helper/label strings so the glossary card describes the file-based workflow.

---

## 4. Seed Terms

The initial editable glossary file should include already-known English terms that users are likely to want preserved:

- product/provider names: `CodeAI Hub`, `Project Manager`, `Claude`, `Codex`, `Gemini`, `Core`
- workflow names: `Description`, `Virtual Simulation`, `Diagram Modules`, `Diagram Facades`
- technical/product tokens already used in the app/runtime such as `VS Code`, `CLI`, `SDK`, `JSON`, `TypeScript`, `Markdown`, `CODEX_HOME`, `GEMINI_HOME`, `settings.json`, `config.toml`, `auth.json`, `module-map.md`, `facade-map.md`, `Final_Description.md`, `questionnaire.md`

This seed is only the starting point; users may freely edit the file afterward.

---

## 5. Non-goals

- No external-editor preference system in this scope.
- No forced launch of a separate VS Code instance through `code`.
- No redesign of the localization category model.
- No automatic preservation of every workflow/product term without explicit glossary authoring.
- No migration or fallback path for legacy glossary JSON files.

---

## 6. Validation

- `npm run build --workspace @codeai-hub/localization`
- `npm run build:webview`
- `npm run compile`
- manual smoke:
  - open Settings -> Localization -> `Do-not-translate terms`
  - trigger the open action
  - confirm the glossary file opens in the current VS Code editor
  - confirm seeded terms are present on first open
  - confirm edited terms are read by the localization runtime after save/reload
