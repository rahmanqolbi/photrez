import { createUniqueId, onCleanup, onMount, type JSX, type ParentProps } from "solid-js";
import { clsx } from "clsx";

interface DesktopDialogProps extends ParentProps {
  title: string;
  actions: JSX.Element;
  role?: "dialog" | "alertdialog";
  kind?: string;
  tone?: "default" | "danger";
  widthClass?: string;
  bodyClass?: string;
  manageFocus?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  dialogRef?: (element: HTMLDivElement) => void;
  onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent>;
  onBackdropPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent>;
}

export function DesktopDialog(props: DesktopDialogProps) {
  const id = createUniqueId();
  const titleId = `photrez-dialog-title-${id}`;
  const descriptionId = `photrez-dialog-description-${id}`;
  let dialogElement!: HTMLDivElement;
  let restoreFocusTo: HTMLElement | null = null;

  onMount(() => {
    if (!props.manageFocus) return;
    restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => {
      const initial = dialogElement.querySelector<HTMLElement>(
        "[data-dialog-initial-focus], button:not(:disabled), input:not(:disabled), select:not(:disabled)",
      );
      initial?.focus();
    });
  });

  onCleanup(() => {
    if (props.manageFocus) restoreFocusTo?.focus();
  });

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || !props.manageFocus) return;
    if (event.key === "Escape" && props.dismissible !== false) {
      event.preventDefault();
      props.onDismiss?.();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogElement.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])",
    ));
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

  return (
    <>
      <div
        class="fixed inset-0 z-[89] bg-black/45"
        data-dialog-backdrop
        onPointerDown={props.onBackdropPointerDown}
      />
      <div
        ref={(element) => {
          dialogElement = element;
          props.dialogRef?.(element);
        }}
        role={props.role ?? "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-dialog-kind={props.kind}
        data-dialog-tone={props.tone ?? "default"}
        data-photrez-dialog
        class={clsx(
          "fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] border border-editor-field-border bg-editor-panel shadow-[0_8px_24px_rgba(0,0,0,0.48)]",
          props.widthClass ?? "w-[min(360px,calc(100vw-24px))]",
        )}
        onKeyDown={handleKeyDown}
      >
        <div
          data-dialog-titlebar
          class="flex h-9 items-center gap-2 border-b border-editor-divider bg-editor-topbar px-3"
        >
          <div
            aria-hidden="true"
            class="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] bg-editor-brand text-[8px] font-bold lowercase tracking-tight text-white"
          >
            pz
          </div>
          <h2 id={titleId} class="text-[12px] font-medium tracking-[0.01em] text-editor-text">
            {props.title}
          </h2>
        </div>
        <div
          id={descriptionId}
          data-dialog-body
          class={clsx("px-4 py-4 text-[12px] leading-[18px] text-editor-text-dim", props.bodyClass)}
        >
          {props.children}
        </div>
        <div
          data-dialog-actions
          class="flex min-h-11 items-center justify-end gap-2 border-t border-editor-divider bg-editor-topbar/65 px-3 py-2"
        >
          {props.actions}
        </div>
      </div>
    </>
  );
}

interface DesktopDialogButtonProps extends ParentProps {
  onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  ref?: (element: HTMLButtonElement) => void;
  class?: string;
  [key: `data-${string}`]: string | boolean | undefined;
}

export function DesktopDialogButton(props: DesktopDialogButtonProps) {
  return (
    <button
      ref={props.ref}
      type={props.type ?? "button"}
      disabled={props.disabled}
      class={clsx(
        "h-7 min-w-16 rounded-[4px] border px-3 text-[11px] font-medium outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-editor-accent/50",
        props.variant === "primary"
          ? "border-editor-accent bg-editor-accent text-editor-bg hover:bg-editor-accent/90"
          : "border-editor-field-border bg-editor-field text-editor-text hover:bg-white/[0.06] focus-visible:border-editor-accent",
        props.class,
      )}
      onClick={props.onClick}
      {...Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith("data-")))}
    >
      {props.children}
    </button>
  );
}

export const desktopDialogFieldClass =
  "h-7 w-full rounded-[4px] border border-editor-field-border bg-editor-field px-2 text-[12px] text-editor-text outline-none focus:border-editor-accent focus:ring-1 focus:ring-editor-accent/30 disabled:cursor-not-allowed disabled:opacity-40";
