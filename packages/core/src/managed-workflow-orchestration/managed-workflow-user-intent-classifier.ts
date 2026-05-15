import type { ManagedWorkflowUserMessageReceivedEvent } from "./managed-workflow-events";

export type ManagedWorkflowUserIntent =
  ManagedWorkflowUserMessageReceivedEvent["intent"];

const ACCEPT_INTENT_RE =
  /\b(accept|accepted|approve|approved|confirm|confirmed|go ahead|looks good|ok|okay)\b|(^|\s)(да|ок|окей|подтверждаю|подтверждено|принимаю|принято|согласен|согласна)(\s|[.!?。]|$)|давай дальше|все хорошо|всё хорошо/iu;
const REVISION_INTENT_RE =
  /\b(change|fix|revise|revision|update|remove|add|rename|correct)\b|исправ|измени|изменить|добав|убери|удали|переимен|поправ|правк|замечан|нужно|надо|сделай/iu;

export const classifyManagedWorkflowUserIntent = (
  content: string
): ManagedWorkflowUserIntent => {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return "unknown";
  }
  if (REVISION_INTENT_RE.test(normalizedContent)) {
    return "revision_request";
  }
  if (ACCEPT_INTENT_RE.test(normalizedContent)) {
    return "accept";
  }
  return "unknown";
};
