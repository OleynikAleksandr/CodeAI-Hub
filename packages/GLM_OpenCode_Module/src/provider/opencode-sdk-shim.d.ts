declare module "@opencode-ai/sdk/v2" {
  export interface OpenCodeEventStreamEnvelope {
    readonly data: unknown;
  }

  export interface OpenCodeEventSubscription {
    readonly stream: AsyncIterable<OpenCodeEventStreamEnvelope>;
  }

  export interface OpencodeClient {
    readonly event: {
      subscribe(params: {
        readonly directory?: string;
      }): Promise<OpenCodeEventSubscription>;
    };
    readonly session: {
      abort(params: {
        readonly directory?: string;
        readonly sessionID: string;
      }): Promise<unknown>;
      create(params: {
        readonly directory?: string;
        readonly title?: string;
      }): Promise<{ readonly data?: { readonly id?: unknown } }>;
      delete(params: {
        readonly directory?: string;
        readonly sessionID: string;
      }): Promise<unknown>;
      promptAsync(params: {
        readonly directory?: string;
        readonly model?: {
          readonly modelID: string;
          readonly providerID: string;
        };
        readonly parts: Array<{
          readonly text: string;
          readonly type: "text";
        }>;
        readonly sessionID: string;
      }): Promise<{
        readonly data?: unknown;
        readonly error?: {
          readonly data?: {
            readonly message?: string;
            readonly ref?: string;
          };
          readonly name?: string;
        };
        readonly response?: {
          readonly ok?: boolean;
          readonly status?: number;
        };
      }>;
    };
  }

  export const createOpencodeClient: (options: {
    readonly baseUrl: string;
  }) => OpencodeClient;
}
