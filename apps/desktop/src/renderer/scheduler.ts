export class RenderScheduler {
  private framePending = false;
  private renderCallback: (() => void) | null = null;
  private rafId: number | null = null;

  constructor(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  requestRender(): void {
    if (this.framePending) return;
    this.framePending = true;

    this.rafId = requestAnimationFrame(() => {
      this.framePending = false;
      this.renderCallback?.();
    });
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.framePending = false;
  }

  dispose(): void {
    this.cancel();
    this.renderCallback = null;
  }
}
