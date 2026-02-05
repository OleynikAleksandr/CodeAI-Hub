# Flow Node Continuity — Resume

Read the latest continuity report:
- `{{reportPath}}`

Continue work in node `{{nodeId}}` as role `{{role}}`.

Hard rules (MUST):
- Do NOT write or update any continuity report files on your own.
- The ONLY time you may write a continuity report is when Core sends an explicit instruction titled "Flow Node Continuity — Create Report ..." AND it includes BOTH a temp path and a final report path to write.
- If you did not receive that Create Report instruction, you MUST NOT create/update any files under `.codeai-hub/**/flow/nodes/**/continuity/reports/`.
- Do NOT invent timestamps/paths for reports.
- Do NOT send any user-facing chat messages.
- When ready, reply with EXACTLY ONE line: `__CODEAIHUB_INTERNAL_CONTINUITY_ACK__`.
