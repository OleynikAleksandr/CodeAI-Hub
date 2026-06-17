import {
  type GlmTokenUsage,
  parseGlmSseData,
  readSseDataFrames,
} from "./glm-native-sse-parser";

export interface GlmStreamHandlers {
  readonly onAssistant: (content: string) => void;
  readonly onThinking: (content: string) => void;
  readonly onUsage: (usage: GlmTokenUsage) => void;
}

export interface GlmStreamReadResult {
  readonly content: string;
  readonly emittedUsefulEvent: boolean;
  readonly reasoningContent: string;
}

export const readGlmStreamResponse = async (
  body: AsyncIterable<Uint8Array>,
  handlers: GlmStreamHandlers
): Promise<GlmStreamReadResult> => {
  let assistantContent = "";
  let emittedUsefulEvent = false;
  let reasoningContent = "";
  for await (const data of readSseDataFrames(body)) {
    const chunk = parseGlmSseData(data);
    if (!chunk) {
      continue;
    }
    emittedUsefulEvent = true;
    if (chunk.reasoning) {
      reasoningContent += chunk.reasoning;
      handlers.onThinking(chunk.reasoning);
    }
    if (chunk.content) {
      assistantContent += chunk.content;
      handlers.onAssistant(chunk.content);
    }
    if (chunk.usage) {
      handlers.onUsage(chunk.usage);
    }
  }
  return { content: assistantContent, emittedUsefulEvent, reasoningContent };
};
