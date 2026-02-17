# Claude Model Aliases (CodeAI Hub)

**Status:** Active (reference; SSOT in code)
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr + Codex

---

## 1) What CodeAI Hub treats as “Claude models”

CodeAI Hub intentionally uses **stable alias IDs** for Claude instead of hardcoding date-based model IDs.

**Source of truth (repo):** `src/types/claude-model-registry.ts`
- `ClaudeModelAliasId`: `sonnet | opus | haiku`
- `DEFAULT_CLAUDE_MODEL_ALIAS`: `sonnet`
- `CLAUDE_MODEL_ALIASES`: display names + descriptions shown in UI.

Important: CodeAI Hub does **not** persist a canonical “full model ID” list in `doc/`.
- Full model IDs are provider-owned and can change.
- The UI shows display names and descriptions from `src/types/claude-model-registry.ts`.

---

## 2) Where the selection is stored

**Settings file:** `~/.codeai-hub/settings/settings.json`
- Key: `providers.claude.defaultModel`
- Value: one of `sonnet`, `opus`, `haiku`

The VS Code extension mirrors this value into env (`CLAUDE_DEFAULT_MODEL`) so Core/provider processes pick it up consistently.

---

## 3) UX expectations

- The Claude picker renders the alias list from `src/types/claude-model-registry.ts`.
- When you pick an alias, new Claude sessions start with that alias.
- Session UI should display the effective model in the status area:
  - For Claude this often remains an alias-oriented display (provider may not expose an immutable “full ID”).

---

## 4) Getting the “real” model ID (when you really need it)

If you need to confirm which exact model a provider resolved an alias to (for debugging), do it via the provider itself:

```bash
claude -p "What is your exact model ID?" --model sonnet
claude -p "What is your exact model ID?" --model opus
claude -p "What is your exact model ID?" --model haiku
```

Treat the result as **diagnostic**, not as a stable contract to hardcode.

---

## 5) Maintenance note

Update `src/types/claude-model-registry.ts` when:
- Anthropic changes available aliases / recommended defaults;
- We want to rename the UI copy (displayName/description);
- A new family becomes the recommended “sonnet/opus/haiku” mapping.
