const MATRIX_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[]{}<>+-=";
const MATRIX_BASE_RGB = "0, 255, 65";
const COLUMN_WIDTH = 13;
const MIN_COLUMNS = 10;
const MAX_COLUMNS = 140;
const FRAME_INTERVAL_MS = 1000 / 30;
const GLYPH_LINE_HEIGHT = 14;

type MatrixColumn = {
  x: number;
  y: number;
  speed: number;
  length: number;
  glyphSeed: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const resolveReduceMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const buildColumns = (width: number, height: number): MatrixColumn[] => {
  if (width <= 0 || height <= 0) {
    return [];
  }

  const columnCount = clamp(
    Math.floor(width / COLUMN_WIDTH),
    MIN_COLUMNS,
    MAX_COLUMNS
  );
  const spacing = width / columnCount;

  return Array.from({ length: columnCount }, (_, index) => ({
    x: Math.floor(index * spacing + spacing * 0.5),
    y: randomBetween(0, height),
    speed: randomBetween(24, 64),
    length: Math.floor(randomBetween(7, 16)),
    glyphSeed: Math.floor(randomBetween(0, 10_000)),
  }));
};

const isGlyphVisible = (glyphY: number, height: number): boolean =>
  glyphY >= -GLYPH_LINE_HEIGHT && glyphY <= height + GLYPH_LINE_HEIGHT;

const resolveGlyphAlpha = (row: number): number =>
  row === 0 ? 0.36 : Math.max(0.08, 0.3 - row * 0.025);

const resolveGlyph = (column: MatrixColumn, row: number): string => {
  const glyphIndex =
    (column.glyphSeed + Math.floor(column.y / GLYPH_LINE_HEIGHT) + row * 5) %
    MATRIX_GLYPHS.length;
  return MATRIX_GLYPHS[glyphIndex] ?? "0";
};

const drawColumn = (options: {
  context: CanvasRenderingContext2D;
  column: MatrixColumn;
  height: number;
}): void => {
  for (let row = 0; row < options.column.length; row += 1) {
    const glyphY = options.column.y - row * GLYPH_LINE_HEIGHT;
    if (!isGlyphVisible(glyphY, options.height)) {
      continue;
    }

    options.context.fillStyle = `rgba(${MATRIX_BASE_RGB}, ${resolveGlyphAlpha(
      row
    ).toFixed(3)})`;
    options.context.fillText(
      resolveGlyph(options.column, row),
      options.column.x,
      glyphY
    );
  }
};

const advanceColumn = (options: {
  column: MatrixColumn;
  deltaSeconds: number;
  height: number;
}): void => {
  options.column.y += options.column.speed * options.deltaSeconds;
  if (
    options.column.y - options.column.length * GLYPH_LINE_HEIGHT <=
    options.height
  ) {
    return;
  }
  options.column.y = -randomBetween(GLYPH_LINE_HEIGHT, options.height * 0.35);
  options.column.speed = randomBetween(24, 64);
  options.column.length = Math.floor(randomBetween(7, 16));
  options.column.glyphSeed = Math.floor(randomBetween(0, 10_000));
};

export type InputLockMatrixRainController = {
  setActive: (active: boolean) => void;
  dispose: () => void;
};

export const createInputLockMatrixRain = (
  container: HTMLElement
): InputLockMatrixRainController => {
  const canvas = document.createElement("canvas");
  canvas.className = "session-input__matrix-rain";
  container.prepend(canvas);

  const context = canvas.getContext("2d");
  const reducedMotion = resolveReduceMotion();

  let width = 0;
  let height = 0;
  let isActive = false;
  let lastFrameAt = 0;
  let rafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let columns: MatrixColumn[] = [];

  const applyCanvasSize = (): void => {
    const rect = container.getBoundingClientRect();
    const nextWidth = Math.max(0, Math.floor(rect.width - 12));
    const nextHeight = Math.max(0, Math.floor(rect.height - 12));
    if (nextWidth === width && nextHeight === height) {
      return;
    }

    width = nextWidth;
    height = nextHeight;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio ?? 1));
    canvas.width = Math.max(1, width * dpr);
    canvas.height = Math.max(1, height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textBaseline = "top";
      context.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    }

    columns = buildColumns(width, height);
  };

  const clearCanvas = (): void => {
    if (!(context && width > 0 && height > 0)) {
      return;
    }
    context.clearRect(0, 0, width, height);
  };

  const drawFrame = (deltaSeconds: number): void => {
    if (!(context && width > 0 && height > 0 && columns.length > 0)) {
      return;
    }

    context.fillStyle = "rgba(2, 8, 5, 0.12)";
    context.fillRect(0, 0, width, height);

    for (const column of columns) {
      drawColumn({ context, column, height });
      advanceColumn({ column, deltaSeconds, height });
    }
  };

  const stopLoop = (): void => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (timestamp: number): void => {
    if (!isActive || reducedMotion) {
      return;
    }
    if (lastFrameAt === 0) {
      lastFrameAt = timestamp;
    }

    const elapsed = timestamp - lastFrameAt;
    if (elapsed >= FRAME_INTERVAL_MS) {
      lastFrameAt = timestamp;
      drawFrame(elapsed / 1000);
    }
    rafId = window.requestAnimationFrame(tick);
  };

  const setActive = (active: boolean): void => {
    if (isActive === active) {
      return;
    }
    isActive = active;
    container.classList.toggle(
      "session-input__container--matrix-active",
      active
    );
    if (!active) {
      stopLoop();
      clearCanvas();
      return;
    }
    applyCanvasSize();
    if (reducedMotion) {
      return;
    }
    lastFrameAt = 0;
    stopLoop();
    rafId = window.requestAnimationFrame(tick);
  };

  applyCanvasSize();
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      applyCanvasSize();
    });
    resizeObserver.observe(container);
  } else {
    window.addEventListener("resize", applyCanvasSize);
  }

  return {
    setActive,
    dispose: () => {
      setActive(false);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", applyCanvasSize);
      }
      canvas.remove();
      container.classList.remove("session-input__container--matrix-active");
    },
  };
};
