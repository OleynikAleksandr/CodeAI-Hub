# Flow Node Continuity — Create Report (Doc Node)

Create a short continuity report for node `{{nodeId}}` (`{{role}}`) and save it to:
- `{{reportPath}}`

Hard rules:
- Do NOT include chat history.
- Do NOT paste large parts of artifacts (no full docs/code/diffs).
- Use only short bullets and file paths.
- Atomic write: write to a temporary file first, then rename to the final path.
- Create EXACTLY ONE report per Create Report instruction.
- Do NOT create or update any other continuity reports unless Core sends another explicit Create Report instruction with explicit temp/final paths.

Required structure:

# Continuity Report — {{nodeId}} / {{role}}

## Canonical Artifact
- {{canonicalArtifactPath}}

## References To Read (only if needed)
- <path>: <why>

## Pending From User
- <question or expectation>
