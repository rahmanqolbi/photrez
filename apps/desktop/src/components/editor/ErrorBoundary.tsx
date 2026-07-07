import { createSignal, JSX, onMount, onCleanup } from "solid-js";

interface ErrorBoundaryProps {
  fallback: (error: Error) => JSX.Element;
  children: JSX.Element;
}

/** Catches rendering errors in its child tree to prevent a total blank screen.
 *
 * SolidJS does not have React-style componentDidCatch, so this uses a
 * window-level error event handler.  When an uncaught error fires, the
 * boundary shows a fallback UI while the rest of the app continues to
 * function (tabs, toolbar, panels above the error site remain usable).
 *
 * Once an error is caught, the boundary stays in fallback mode for the
 * lifetime of this component instance.
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  // Must be signals, not plain let — SolidJS components execute once and
  // only re-render when signals change. Without createSignal, the fallback
  // JSX branch would never be reachable after mount (regression caught in
  // code review 2026-07-06).
  const [hasError, setHasError] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  const handleError = (e: ErrorEvent) => {
    if (!hasError()) {
      setHasError(true);
      setError(e.error || new Error(e.message));
      e.preventDefault();
    }
  };

  onMount(() => {
    window.addEventListener("error", handleError);
  });

  onCleanup(() => {
    window.removeEventListener("error", handleError);
  });

  if (hasError()) {
    return props.fallback(error()!);
  }

  return <>{props.children}</>;
}
