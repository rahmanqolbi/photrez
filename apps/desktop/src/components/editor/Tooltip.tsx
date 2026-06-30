import { JSX, createSignal, onMount, onCleanup, createEffect, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { clsx } from "clsx";

interface TooltipProps {
  content: string;
  shortcut?: string;
  disabled?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  children: JSX.Element;
}

export function Tooltip(props: TooltipProps) {
  let triggerRef!: HTMLDivElement;
  let tooltipRef!: HTMLDivElement;

  const [visible, setVisible] = createSignal(false);
  const [coords, setCoords] = createSignal({ x: 0, y: 0 });
  const [measured, setMeasured] = createSignal(false);

  let hoverTimer: number | null = null;
  let lastClickTime = 0;
  const uniqueId = `tooltip-${Math.random().toString(36).substring(2, 9)}`;

  const showTooltip = (instant = false) => {
    if (props.disabled) return;
    // Don't show tooltip right after a click (blocks UI during rapid tool switch)
    if (Date.now() - lastClickTime < 400) return;
    if (hoverTimer) clearTimeout(hoverTimer);

    if (instant) {
      setVisible(true);
    } else {
      hoverTimer = window.setTimeout(() => {
        setVisible(true);
      }, 400);
    }
  };

  const handleMouseDown = () => {
    lastClickTime = Date.now();
  };

  const hideTooltip = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      hideTooltip();
    }
  };

  // reference. Inline `() => showTooltip(false)` lambdas in onMount
  // were leak-cleanup blind — onCleanup could only remove the one
  // listener (window keydown) whose reference it held.
  const onTargetEnter = () => showTooltip(false);
  const onTargetLeave = hideTooltip;
  const onTargetFocus = () => showTooltip(true);
  const onTargetBlur = hideTooltip;

  createEffect(() => {
    if (visible() && tooltipRef && triggerRef) {
      const target = triggerRef.firstElementChild as HTMLElement;
      if (!target) return;

      target.setAttribute("aria-describedby", uniqueId);

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.getBoundingClientRect();

      let x = 0;
      let y = 0;
      const placement = props.placement || "top";
      const gap = 6;

      if (placement === "top") {
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.top - tooltipRect.height - gap;
      } else if (placement === "bottom") {
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.bottom + gap;
      } else if (placement === "left") {
        x = targetRect.left - tooltipRect.width - gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      } else if (placement === "right") {
        x = targetRect.right + gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      }

      // Keep within viewport boundaries
      const padding = 6;
      x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
      y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

      setCoords({ x, y });
      setMeasured(true);
    } else if (triggerRef) {
      const target = triggerRef.firstElementChild as HTMLElement;
      if (target) {
        target.removeAttribute("aria-describedby");
      }
      setMeasured(false);
    }
  });

  onMount(() => {
    const target = triggerRef.firstElementChild as HTMLElement;
    if (target) {
      target.addEventListener("mouseenter", onTargetEnter);
      target.addEventListener("mouseleave", onTargetLeave);
      target.addEventListener("focusin", onTargetFocus);
      target.addEventListener("focusout", onTargetBlur);
      target.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("keydown", handleKeyDown);
    }
  });

  onCleanup(() => {
    if (hoverTimer) clearTimeout(hoverTimer);
    const target = triggerRef?.firstElementChild as HTMLElement;
    if (target) {
      target.removeEventListener("mouseenter", onTargetEnter);
      target.removeEventListener("mouseleave", onTargetLeave);
      target.removeEventListener("focusin", onTargetFocus);
      target.removeEventListener("focusout", onTargetBlur);
      target.removeEventListener("mousedown", handleMouseDown);
      target.removeAttribute("aria-describedby");
    }
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <>
      <div ref={triggerRef} class="contents">
        {props.children}
      </div>
      <Show when={visible()}>
        <Portal mount={document.body}>
          <div
            ref={tooltipRef}
            id={uniqueId}
            role="tooltip"
            class={clsx(
              "fixed z-[100] pointer-events-none px-2 py-1 text-[11px] font-sans text-editor-text",
              "bg-[#181818] border border-white/10 rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
              "transition-opacity duration-100 ease-out",
              measured() ? "opacity-100" : "opacity-0"
            )}
            style={{
              left: `${coords().x}px`,
              top: `${coords().y}px`,
            }}
          >
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <span>{props.content}</span>
              <Show when={props.shortcut}>
                <kbd class="ml-1 px-1 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-mono font-semibold border border-white/5 uppercase leading-none">
                  {props.shortcut}
                </kbd>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
