import assert from "node:assert/strict";
import test from "node:test";
import { ProjectManagerSocketLifecycle } from "./project-manager-api-lifecycle";

type RestoreTarget = "clearTimeout" | "setTimeout" | "WebSocket";
type SocketEventHandler = ((event: Event) => void) | null;
type SocketMessageHandler = ((event: MessageEvent) => void) | null;

interface ScheduledTimer {
  callback: () => void;
  cleared: boolean;
  readonly delayMs: number;
}

interface TestWebSocketInstance {
  closeCount: number;
  onclose: SocketEventHandler;
  onerror: SocketEventHandler;
  onmessage: SocketMessageHandler;
  onopen: SocketEventHandler;
  readyState: number;
  readonly sent: readonly string[];
  readonly url: string;
  close: () => void;
  failWithError: () => void;
  open: () => void;
  receive: (data: string) => void;
  send: (serialized: string) => void;
  serverClose: () => void;
}

const STREAM_URL = "ws://127.0.0.1:8080/api/v1/stream";

const restoreGlobalProperty = (
  name: RestoreTarget,
  descriptor: PropertyDescriptor | undefined
): void => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, name);
};

const installTimerHarness = (): {
  readonly restore: () => void;
  readonly runNext: () => void;
  readonly scheduled: readonly ScheduledTimer[];
} => {
  const originalSetTimeout = Object.getOwnPropertyDescriptor(
    globalThis,
    "setTimeout"
  );
  const originalClearTimeout = Object.getOwnPropertyDescriptor(
    globalThis,
    "clearTimeout"
  );
  const scheduled: ScheduledTimer[] = [];
  const fakeSetTimeout = ((
    callback: (...args: unknown[]) => void,
    delayMs?: number
  ): ScheduledTimer => {
    const timer: ScheduledTimer = {
      callback: () => callback(),
      cleared: false,
      delayMs: Number(delayMs ?? 0),
    };
    scheduled.push(timer);
    return timer;
  }) as unknown as typeof setTimeout;
  const fakeClearTimeout = ((timer: ScheduledTimer): void => {
    timer.cleared = true;
  }) as unknown as typeof clearTimeout;

  Object.defineProperty(globalThis, "setTimeout", {
    configurable: true,
    value: fakeSetTimeout,
  });
  Object.defineProperty(globalThis, "clearTimeout", {
    configurable: true,
    value: fakeClearTimeout,
  });

  return {
    restore: () => {
      restoreGlobalProperty("setTimeout", originalSetTimeout);
      restoreGlobalProperty("clearTimeout", originalClearTimeout);
    },
    runNext: () => {
      const timer = scheduled.find((entry) => !entry.cleared);
      if (!timer) {
        return;
      }
      timer.cleared = true;
      timer.callback();
    },
    scheduled,
  };
};

const installWebSocketHarness = (): {
  readonly restore: () => void;
  readonly sockets: readonly TestWebSocketInstance[];
} => {
  const originalWebSocket = Object.getOwnPropertyDescriptor(
    globalThis,
    "WebSocket"
  );
  const sockets: TestWebSocketInstance[] = [];

  class TestWebSocket implements TestWebSocketInstance {
    static readonly CLOSED = 3;
    static readonly CLOSING = 2;
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;

    closeCount = 0;
    onclose: SocketEventHandler = null;
    onerror: SocketEventHandler = null;
    onmessage: SocketMessageHandler = null;
    onopen: SocketEventHandler = null;
    readyState = TestWebSocket.CONNECTING;
    readonly sent: string[] = [];

    constructor(readonly url: string) {
      sockets.push(this);
    }

    close(): void {
      this.closeCount += 1;
      this.readyState = TestWebSocket.CLOSED;
    }

    failWithError(): void {
      this.onerror?.(new Event("error"));
    }

    open(): void {
      this.readyState = TestWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }

    receive(data: string): void {
      this.onmessage?.({ data } as MessageEvent);
    }

    send(serialized: string): void {
      this.sent.push(serialized);
    }

    serverClose(): void {
      this.readyState = TestWebSocket.CLOSED;
      this.onclose?.(new Event("close"));
    }
  }

  Object.defineProperty(globalThis, "WebSocket", {
    configurable: true,
    value: TestWebSocket,
  });

  return {
    restore: () => restoreGlobalProperty("WebSocket", originalWebSocket),
    sockets,
  };
};

const createLifecycle = (events: string[]): ProjectManagerSocketLifecycle =>
  new ProjectManagerSocketLifecycle({
    onClose: () => events.push("close"),
    onError: () => events.push("error"),
    onMessage: (data) => events.push(`message:${data}`),
    onOpen: () => events.push("open"),
    streamUrl: STREAM_URL,
  });

test("ProjectManagerSocketLifecycle reuses an in-flight socket and closes it intentionally", () => {
  const timerHarness = installTimerHarness();
  const webSocketHarness = installWebSocketHarness();
  const events: string[] = [];

  try {
    const lifecycle = createLifecycle(events);

    lifecycle.connect();
    lifecycle.connect();

    assert.equal(webSocketHarness.sockets.length, 1);
    const socket = webSocketHarness.sockets[0];
    assert.ok(socket);
    assert.equal(socket.url, STREAM_URL);
    assert.equal(lifecycle.send('{"type":"projects:list"}'), false);

    socket.open();
    socket.receive('{"type":"core:state"}');

    assert.deepEqual(events, ["open", 'message:{"type":"core:state"}']);
    assert.equal(lifecycle.send('{"type":"projects:list"}'), true);
    assert.deepEqual(socket.sent, ['{"type":"projects:list"}']);

    lifecycle.disconnect();

    assert.equal(socket.closeCount, 1);
    assert.equal(socket.onopen, null);
    assert.equal(socket.onmessage, null);
    assert.equal(socket.onclose, null);
    assert.equal(socket.onerror, null);
    assert.equal(timerHarness.scheduled.length, 0);
  } finally {
    webSocketHarness.restore();
    timerHarness.restore();
  }
});

test("ProjectManagerSocketLifecycle schedules one reconnect for error and close from the same socket", () => {
  const timerHarness = installTimerHarness();
  const webSocketHarness = installWebSocketHarness();
  const events: string[] = [];

  try {
    const lifecycle = createLifecycle(events);
    lifecycle.connect();
    const firstSocket = webSocketHarness.sockets[0];
    assert.ok(firstSocket);

    firstSocket.failWithError();
    firstSocket.serverClose();

    assert.deepEqual(events, ["error", "close"]);
    assert.equal(timerHarness.scheduled.length, 1);
    assert.equal(timerHarness.scheduled[0]?.delayMs, 2000);

    timerHarness.runNext();

    assert.equal(webSocketHarness.sockets.length, 2);
    const secondSocket = webSocketHarness.sockets[1];
    assert.ok(secondSocket);
    assert.equal(secondSocket.url, STREAM_URL);

    secondSocket.open();

    assert.deepEqual(events, ["error", "close", "open"]);
  } finally {
    webSocketHarness.restore();
    timerHarness.restore();
  }
});

test("ProjectManagerSocketLifecycle clears pending reconnect work on disconnect", () => {
  const timerHarness = installTimerHarness();
  const webSocketHarness = installWebSocketHarness();
  const events: string[] = [];

  try {
    const lifecycle = createLifecycle(events);
    lifecycle.connect();
    const firstSocket = webSocketHarness.sockets[0];
    assert.ok(firstSocket);

    firstSocket.serverClose();

    assert.deepEqual(events, ["close"]);
    assert.equal(timerHarness.scheduled.length, 1);
    assert.equal(timerHarness.scheduled[0]?.cleared, false);

    lifecycle.disconnect();
    timerHarness.runNext();

    assert.equal(timerHarness.scheduled[0]?.cleared, true);
    assert.equal(webSocketHarness.sockets.length, 1);
  } finally {
    webSocketHarness.restore();
    timerHarness.restore();
  }
});
