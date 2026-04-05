import {
  type CodexRolloutParsedEvent,
  createCodexRolloutSegmentId,
} from "./codex-rollout-event-parser";

export class CodexRolloutDedupe {
  private readonly seenSegmentIds = new Set<string>();

  filterNew(
    events: readonly CodexRolloutParsedEvent[]
  ): CodexRolloutParsedEvent[] {
    return events.filter((event) => this.remember(event));
  }

  remember(event: CodexRolloutParsedEvent): boolean {
    const segmentId = createCodexRolloutSegmentId(event);
    if (this.seenSegmentIds.has(segmentId)) {
      return false;
    }
    this.seenSegmentIds.add(segmentId);
    return true;
  }

  clear(): void {
    this.seenSegmentIds.clear();
  }
}
