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
import { Slider } from "../primitives";

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

export interface QualityDialogOptions {
  title: string;
  format: "jpeg" | "webp";
  defaultQuality: number;
}

interface DialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
  quality: (options: QualityDialogOptions) => Promise<number | null>;
}

type DialogRequest =
  | { kind: "confirm"; options: ConfirmDialogOptions; resolve: (result: boolean) => void }
  | { kind: "alert"; options: AlertDialogOptions; resolve: () => void }
  | { kind: "quality"; options: QualityDialogOptions; resolve: (result: number | null) => void };

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

  const quality = (options: QualityDialogOptions) => new Promise<number | null>((resolve) => {
    queue.push({ kind: "quality", options, resolve });
    showNext();
  });

  const complete = (accepted: boolean) => {
    const request = current();
    if (!request) return;
    if (request.kind === "confirm") request.resolve(accepted);
    else if (request.kind === "quality") request.resolve(null);
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
    else if (request?.kind === "quality") request.resolve(null);
    else request?.resolve();
    for (const queued of queue.splice(0)) {
      if (queued.kind === "confirm") queued.resolve(false);
      else if (queued.kind === "quality") queued.resolve(null);
      else queued.resolve();
    }
  });

  function QualityDialogContent(props: { request: Extract<DialogRequest, { kind: "quality" }> }) {
    const [sliderValue, setSliderValue] = createSignal(
      props.request.options.defaultQuality
    );
    const handleCancel = () => {
      complete(false);
    };
    const handleSave = () => {
      props.request.resolve(sliderValue());
      setCurrent(null);
      queueMicrotask(() => {
        restoreFocusTo?.focus();
        restoreFocusTo = null;
        showNext();
      });
    };
    return (
      <DesktopDialog
        dialogRef={(element) => { dialogRef = element; }}
        role="dialog"
        title={props.request.options.title}
        kind="quality"
        tone="default"
        bodyClass="min-h-[68px]"
        onBackdropPointerDown={handleCancel}
        onKeyDown={handleKeyDown}
        actions={<>
          <DesktopDialogButton
            ref={(element) => { cancelRef = element; }}
            data-dialog-cancel
            onClick={handleCancel}
          >
            Cancel
          </DesktopDialogButton>
          <DesktopDialogButton
            ref={(element) => { confirmRef = element; }}
            data-dialog-confirm
            variant="secondary"
            onClick={handleSave}
          >
            Save
          </DesktopDialogButton>
        </>}
      >
        <div class="flex flex-col gap-4 p-2">
          <div class="flex items-center justify-between text-[11px] text-editor-text-dim">
            <label class="font-semibold uppercase tracking-wider">Quality</label>
            <span class="font-mono text-editor-text font-bold">{sliderValue()}%</span>
          </div>
          <div class="relative flex items-center h-[14px]">
            <Slider percent={sliderValue()} type="zoom" />
            <input
              type="range"
              min={1}
              max={100}
              value={sliderValue()}
              onInput={(e) => setSliderValue(parseInt(e.currentTarget.value, 10))}
              class="absolute inset-0 w-full h-[14px] opacity-0 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-editor-accent"
            />
          </div>
          <p class="text-[11px] text-editor-text-dim leading-relaxed">
            {props.request.options.format === "jpeg"
              ? "Higher quality = larger file size. 90-95% recommended for photos."
              : "Higher quality = larger file size. WebP offers good compression at 80-90%."}
          </p>
        </div>
      </DesktopDialog>
    );
  }

  const value: DialogContextValue = { confirm, alert, quality };

  return (
    <DialogContext.Provider value={value}>
      {props.children}
      <Show when={current()}>
        {(request) => {
          const r = request();
          return (
            <Portal mount={document.body}>
              {r.kind !== "quality" && (
                <DesktopDialog
                  dialogRef={(element) => { dialogRef = element; }}
                  role={isDangerRequest(r) ? "alertdialog" : "dialog"}
                  title={r.options.title}
                  kind={r.kind}
                  tone={isDangerRequest(r) ? "danger" : "default"}
                  bodyClass="min-h-[68px] whitespace-pre-line"
                  onBackdropPointerDown={() => complete(false)}
                  onKeyDown={handleKeyDown}
                  actions={<>
                    {r.kind === "confirm" && (
                      <DesktopDialogButton
                        ref={(element) => { cancelRef = element; }}
                        data-dialog-cancel
                        onClick={() => complete(false)}
                      >
                        {cancelLabelFor(r)}
                      </DesktopDialogButton>
                    )}
                    <DesktopDialogButton
                      ref={(element) => { confirmRef = element; }}
                      data-dialog-confirm
                      variant={isDangerRequest(r) ? "primary" : "secondary"}
                      onClick={() => complete(true)}
                    >
                      {(r.options as ConfirmDialogOptions | AlertDialogOptions).confirmLabel ?? "OK"}
                    </DesktopDialogButton>
                  </>}
                >
                  <p>
                    {(r.options as ConfirmDialogOptions | AlertDialogOptions).message}
                  </p>
                </DesktopDialog>
              )}
              {r.kind === "quality" && (
                <QualityDialogContent
                  request={r as Extract<DialogRequest, { kind: "quality" }>}
                />
              )}
            </Portal>
          );
        }}
      </Show>
    </DialogContext.Provider>
  );
}
