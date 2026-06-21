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
import { DesktopDialog, DesktopDialogButton } from "./DesktopDialog";

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
            <DesktopDialog
              dialogRef={(element) => { dialogRef = element; }}
              role={isDangerRequest(request()) ? "alertdialog" : "dialog"}
              title={request().options.title}
              kind={request().kind}
              tone={isDangerRequest(request()) ? "danger" : "default"}
              bodyClass="min-h-[68px] whitespace-pre-line"
              onBackdropPointerDown={() => complete(false)}
              onKeyDown={handleKeyDown}
              actions={<>
                <Show when={request().kind === "confirm"}>
                  <DesktopDialogButton
                    ref={(element) => { cancelRef = element; }}
                    data-dialog-cancel
                    onClick={() => complete(false)}
                  >
                    {cancelLabelFor(request())}
                  </DesktopDialogButton>
                </Show>
                <DesktopDialogButton
                  ref={(element) => { confirmRef = element; }}
                  data-dialog-confirm
                  variant={isDangerRequest(request()) ? "primary" : "secondary"}
                  onClick={() => complete(true)}
                >
                  {request().options.confirmLabel ?? "OK"}
                </DesktopDialogButton>
              </>}
            >
              <p>
                {request().options.message}
              </p>
            </DesktopDialog>
          </Portal>
        )}
      </Show>
    </DialogContext.Provider>
  );
}
