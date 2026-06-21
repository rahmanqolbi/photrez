import {
  Show,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type JSX,
  type ParentProps,
} from "solid-js";
import { Portal } from "solid-js/web";
import { clsx } from "clsx";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

export interface AlertDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface DialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
}

type DialogRequest =
  | { kind: "confirm"; options: ConfirmDialogOptions; resolve: (result: boolean) => void }
  | { kind: "alert"; options: AlertDialogOptions; resolve: () => void };

const isDangerRequest = (request: DialogRequest) => (
  request.kind === "confirm" && request.options.tone === "danger"
);

const cancelLabelFor = (request: DialogRequest) => (
  request.kind === "confirm" ? request.options.cancelLabel ?? "Cancel" : "Cancel"
);

const DialogContext = createContext<DialogContextValue>();

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used within DialogProvider");
  return value;
}

export function DialogProvider(props: ParentProps) {
  const [current, setCurrent] = createSignal<DialogRequest | null>(null);
  const queue: DialogRequest[] = [];
  let dialogRef!: HTMLDivElement;
  let cancelRef!: HTMLButtonElement;
  let confirmRef!: HTMLButtonElement;
  let restoreFocusTo: HTMLElement | null = null;

  const showNext = () => {
    if (current() || queue.length === 0) return;
    restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCurrent(queue.shift()!);
  };

  const confirm = (options: ConfirmDialogOptions) => new Promise<boolean>((resolve) => {
    queue.push({ kind: "confirm", options, resolve });
    showNext();
  });

  const alert = (options: AlertDialogOptions) => new Promise<void>((resolve) => {
    queue.push({ kind: "alert", options, resolve });
    showNext();
  });

  const complete = (accepted: boolean) => {
    const request = current();
    if (!request) return;
    if (request.kind === "confirm") request.resolve(accepted);
    else request.resolve();
    setCurrent(null);
    queueMicrotask(() => {
      restoreFocusTo?.focus();
      restoreFocusTo = null;
      showNext();
    });
  };

  createEffect(() => {
    const request = current();
    if (!request) return;
    queueMicrotask(() => {
      if (request.kind === "confirm") cancelRef?.focus();
      else confirmRef?.focus();
    });
  });

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    event.stopPropagation();
    const request = current();
    if (!request) return;
    if (event.key === "Escape") {
      event.preventDefault();
      complete(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  onCleanup(() => {
    const request = current();
    if (request?.kind === "confirm") request.resolve(false);
    else request?.resolve();
    for (const queued of queue.splice(0)) {
      if (queued.kind === "confirm") queued.resolve(false);
      else queued.resolve();
    }
  });

  const value: DialogContextValue = { confirm, alert };

  return (
    <DialogContext.Provider value={value}>
      {props.children}
      <Show when={current()}>
        {(request) => (
          <Portal mount={document.body}>
            <div
              class="fixed inset-0 z-[89] bg-black/55"
              data-dialog-backdrop
              onPointerDown={() => complete(false)}
            />
            <div
              ref={dialogRef}
              role={isDangerRequest(request()) ? "alertdialog" : "dialog"}
              aria-modal="true"
              aria-labelledby="photrez-dialog-title"
              aria-describedby="photrez-dialog-description"
              data-dialog-kind={request().kind}
              class="fixed left-1/2 top-1/2 z-[90] w-[min(390px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] border border-editor-divider bg-editor-panel shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
              onKeyDown={handleKeyDown}
            >
              <div class="border-b border-editor-divider px-5 py-4">
                <h2 id="photrez-dialog-title" class="text-[14px] font-semibold text-editor-text">
                  {request().options.title}
                </h2>
              </div>
              <p
                id="photrez-dialog-description"
                class="whitespace-pre-line px-5 py-4 text-[12px] leading-5 text-editor-text-dim"
              >
                {request().options.message}
              </p>
              <div class="flex items-center justify-end gap-2 border-t border-editor-divider bg-editor-field/35 px-4 py-3">
                <Show when={request().kind === "confirm"}>
                  <button
                    ref={cancelRef}
                    type="button"
                    data-dialog-cancel
                    class="min-h-7 rounded-[4px] border border-editor-field-border bg-editor-field px-3 text-[12px] text-editor-text outline-none hover:bg-white/[0.06] focus-visible:border-editor-accent"
                    onClick={() => complete(false)}
                  >
                    {cancelLabelFor(request())}
                  </button>
                </Show>
                <button
                  ref={confirmRef}
                  type="button"
                  data-dialog-confirm
                  class={clsx(
                    "min-h-7 rounded-[4px] border px-3 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-editor-accent/45",
                    isDangerRequest(request())
                      ? "border-editor-accent bg-editor-accent text-white hover:bg-editor-accent/90"
                      : "border-editor-field-border bg-editor-field text-editor-text hover:bg-white/[0.06]",
                  )}
                  onClick={() => complete(true)}
                >
                  {request().options.confirmLabel ?? "OK"}
                </button>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </DialogContext.Provider>
  );
}
