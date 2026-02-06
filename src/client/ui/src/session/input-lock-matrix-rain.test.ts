import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMatrixColumnCount,
  createInputLockMatrixRain,
} from "./input-lock-matrix-rain";

type ResizeObserverCallback = () => void;

type FakeCanvasContext = {
  fillStyle: string;
  textBaseline: string;
  font: string;
  clearRect: (...args: number[]) => void;
  fillRect: (...args: number[]) => void;
  fillText: (text: string, x: number, y: number) => void;
  setTransform: (...args: number[]) => void;
};

type FakeCanvas = {
  className: string;
  width: number;
  height: number;
  style: Record<string, string>;
  remove: () => void;
  removed: boolean;
  getContext: (kind: string) => FakeCanvasContext | null;
};

type FakeClassList = {
  add: (name: string) => void;
  remove: (name: string) => void;
  toggle: (name: string, force?: boolean) => boolean;
  contains: (name: string) => boolean;
};

type FakeContainer = {
  rect: { width: number; height: number };
  classList: FakeClassList;
  prepend: (node: FakeCanvas) => void;
  getBoundingClientRect: () => DOMRect;
  children: FakeCanvas[];
};

type FakeEnvironment = {
  container: FakeContainer;
  canvas: FakeCanvas;
  rafRequests: number;
  rafCancels: number;
  resizeCallbacks: ResizeObserverCallback[];
  cleanup: () => void;
};

const createFakeEnvironment = (): FakeEnvironment => {
  const globalScope = globalThis as Record<string, unknown>;
  const previousWindow = globalScope.window;
  const previousDocument = globalScope.document;
  const previousResizeObserver = globalScope.ResizeObserver;
  const previousRequestAnimationFrame = globalScope.requestAnimationFrame;
  const previousCancelAnimationFrame = globalScope.cancelAnimationFrame;

  let rafId = 0;
  let rafRequests = 0;
  let rafCancels = 0;
  const resizeCallbacks: ResizeObserverCallback[] = [];

  const fakeCanvasContext: FakeCanvasContext = {
    fillStyle: "",
    textBaseline: "",
    font: "",
    clearRect: () => {
      // noop
    },
    fillRect: () => {
      // noop
    },
    fillText: () => {
      // noop
    },
    setTransform: () => {
      // noop
    },
  };

  const fakeCanvas: FakeCanvas = {
    className: "",
    width: 0,
    height: 0,
    style: {},
    removed: false,
    getContext: (kind: string) => (kind === "2d" ? fakeCanvasContext : null),
    remove: () => {
      fakeCanvas.removed = true;
    },
  };

  const classSet = new Set<string>();
  const fakeClassList: FakeClassList = {
    add: (name: string) => {
      classSet.add(name);
    },
    remove: (name: string) => {
      classSet.delete(name);
    },
    contains: (name: string) => classSet.has(name),
    toggle: (name: string, force?: boolean) => {
      if (force === undefined) {
        if (classSet.has(name)) {
          classSet.delete(name);
          return false;
        }
        classSet.add(name);
        return true;
      }
      if (force) {
        classSet.add(name);
        return true;
      }
      classSet.delete(name);
      return false;
    },
  };

  const fakeContainer: FakeContainer = {
    rect: { width: 320, height: 120 },
    classList: fakeClassList,
    children: [],
    prepend: (node: FakeCanvas) => {
      fakeContainer.children.unshift(node);
    },
    getBoundingClientRect: () =>
      ({
        width: fakeContainer.rect.width,
        height: fakeContainer.rect.height,
        top: 0,
        left: 0,
        bottom: fakeContainer.rect.height,
        right: fakeContainer.rect.width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  };

  class FakeResizeObserver {
    readonly #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
      resizeCallbacks.push(this.#callback);
    }

    observe(): void {
      // noop
    }

    disconnect(): void {
      // noop
    }
  }

  const fakeWindow = {
    devicePixelRatio: 1,
    matchMedia: () => ({
      matches: false,
    }),
    requestAnimationFrame: () => {
      rafId += 1;
      rafRequests += 1;
      return rafId;
    },
    cancelAnimationFrame: () => {
      rafCancels += 1;
    },
    addEventListener: () => {
      // noop
    },
    removeEventListener: () => {
      // noop
    },
  };

  globalScope.window = fakeWindow;
  globalScope.document = {
    createElement: () => fakeCanvas,
  };
  globalScope.ResizeObserver = FakeResizeObserver;
  globalScope.requestAnimationFrame = fakeWindow.requestAnimationFrame;
  globalScope.cancelAnimationFrame = fakeWindow.cancelAnimationFrame;

  return {
    container: fakeContainer,
    canvas: fakeCanvas,
    resizeCallbacks,
    get rafRequests() {
      return rafRequests;
    },
    get rafCancels() {
      return rafCancels;
    },
    cleanup: () => {
      globalScope.window = previousWindow;
      globalScope.document = previousDocument;
      globalScope.ResizeObserver = previousResizeObserver;
      globalScope.requestAnimationFrame = previousRequestAnimationFrame;
      globalScope.cancelAnimationFrame = previousCancelAnimationFrame;
    },
  };
};

test("computeMatrixColumnCount clamps values by min and max bounds", () => {
  assert.equal(computeMatrixColumnCount(10), 10);
  assert.equal(computeMatrixColumnCount(260), 20);
  assert.equal(computeMatrixColumnCount(5000), 140);
});

test("matrix rain controller manages RAF lifecycle without duplicate loops", () => {
  const environment = createFakeEnvironment();
  try {
    const controller = createInputLockMatrixRain(
      environment.container as unknown as HTMLElement
    );

    controller.setActive(true);
    controller.setActive(true);
    assert.equal(environment.rafRequests, 1);

    controller.setActive(false);
    assert.equal(environment.rafCancels >= 1, true);

    controller.dispose();
    assert.equal(environment.canvas.removed, true);
  } finally {
    environment.cleanup();
  }
});

test("matrix rain controller updates canvas size after resize callback", () => {
  const environment = createFakeEnvironment();
  try {
    const controller = createInputLockMatrixRain(
      environment.container as unknown as HTMLElement
    );
    assert.equal(environment.canvas.style.width, "308px");
    assert.equal(environment.canvas.style.height, "108px");

    environment.container.rect.width = 780;
    environment.container.rect.height = 200;
    for (const callback of environment.resizeCallbacks) {
      callback();
    }

    assert.equal(environment.canvas.style.width, "768px");
    assert.equal(environment.canvas.style.height, "188px");
    controller.dispose();
  } finally {
    environment.cleanup();
  }
});
