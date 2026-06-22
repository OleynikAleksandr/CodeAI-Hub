import type { SessionMessageRecord } from "@codeai-hub/unified-session";

const isLiveAssistantRecord = (record: SessionMessageRecord): boolean =>
  record.role === "assistant" && record.tag === "live";

export const coalesceLiveAssistantMessageRecords = (
  records: readonly SessionMessageRecord[]
): SessionMessageRecord[] => {
  const coalesced: SessionMessageRecord[] = [];
  let pending: SessionMessageRecord | null = null;

  const flush = () => {
    if (!pending) {
      return;
    }
    const { tag: _tag, ...message } = pending;
    coalesced.push(message);
    pending = null;
  };

  for (const record of records) {
    if (!isLiveAssistantRecord(record)) {
      flush();
      coalesced.push(record);
      continue;
    }
    if (pending) {
      const current: SessionMessageRecord = pending;
      pending = { ...current, content: `${current.content}${record.content}` };
      continue;
    }
    pending = { ...record };
  }
  flush();
  return coalesced;
};
