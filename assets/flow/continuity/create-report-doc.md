# Flow Node Continuity — Create Report (Doc Node)

Create a short continuity report for node `{{nodeId}}` (`{{role}}`) and save it to:
- `{{reportPath}}`

Hard rules:
- Do NOT include chat history.
- Do NOT paste large parts of artifacts (no full docs/code/diffs).
- Write ONLY the report file (atomic write: tmp -> rename).
- Do NOT send any user-facing chat messages.
- When done, reply with EXACTLY ONE line: `__CODEAIHUB_INTERNAL_CONTINUITY_ACK__`.

Required structure:

# Continuity Report — {{nodeId}} / {{role}}

## Canonical Artifact
- {{canonicalArtifactPath}}

## References To Read (only if needed)
- <path>: <why>

## Pending From User
- <question or expectation>
