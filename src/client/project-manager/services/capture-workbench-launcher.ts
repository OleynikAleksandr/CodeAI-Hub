const DETACHED_CAPTURE_MODE = "detached-capture";
const DETACHED_CAPTURE_POPUP_FEATURES = "popup,width=1280,height=900";

interface CaptureWorkbenchLaunchContext {
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
}

type WindowOpen = (
  url: string,
  target?: string,
  features?: string
) => Window | null;

interface CaptureWorkbenchOpenOptions {
  readonly href?: string;
  readonly openWindow?: WindowOpen;
}

const resolveBrowserHref = (): string | null =>
  typeof window === "undefined" ? null : window.location.href;

const resolveBrowserOpen = (): WindowOpen | null =>
  typeof window === "undefined" ? null : window.open.bind(window);

const buildCaptureWorkbenchUrl = (
  context: CaptureWorkbenchLaunchContext,
  href?: string
): string | null => {
  if (!(context.workspacePath && context.workspaceSlug)) {
    return null;
  }

  const resolvedHref = href ?? resolveBrowserHref();
  if (!resolvedHref) {
    return null;
  }

  const base = resolvedHref.split("?")[0];
  const params = new URLSearchParams({
    mode: DETACHED_CAPTURE_MODE,
    workspacePath: context.workspacePath,
    workspaceSlug: context.workspaceSlug,
  });

  return `${base}?${params.toString()}`;
};

export const openCaptureWorkbench = (
  context: CaptureWorkbenchLaunchContext,
  options: CaptureWorkbenchOpenOptions = {}
): boolean => {
  const url = buildCaptureWorkbenchUrl(context, options.href);
  if (!url) {
    return false;
  }

  const openWindow = options.openWindow ?? resolveBrowserOpen();
  if (!openWindow) {
    return false;
  }

  openWindow(url, "_blank", DETACHED_CAPTURE_POPUP_FEATURES);
  return true;
};
