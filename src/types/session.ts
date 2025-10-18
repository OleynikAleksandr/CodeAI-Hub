import type { ProviderStackId } from "./provider";

export type SessionMessageRole = "system" | "assistant" | "user";

export type SessionMessage = {
  readonly id: string;
  readonly role: SessionMessageRole;
  readonly content: string;
  readonly createdAt: number;
};

export type SessionTodoItem = {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
};

export type SessionStatusInfo = {
  readonly providerSummary: string;
  readonly tokenUsage: {
    readonly used: number;
    readonly limit: number;
  };
  readonly connectionState: "idle" | "running" | "blocked";
  readonly updatedAt: number;
};

export type SessionRecord = {
  readonly id: string;
  readonly title: string;
  readonly providerIds: readonly ProviderStackId[];
  readonly createdAt: number;
};

export type SessionSnapshot = {
  readonly messages: readonly SessionMessage[];
  readonly todos: readonly SessionTodoItem[];
  readonly status: SessionStatusInfo;
  readonly draft: string;
};
