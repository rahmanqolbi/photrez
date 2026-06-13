export class RenderScheduler {
  private framePending = false;
  private continuousMode = false;
  private renderCallback: (() => void) | null = null;
  private rafId: number | null = null;
  private continuousRafId: number | null = null;

  constructor(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  requestRender(): void {
    if (this.framePending || this.continuousMode) return;
    this.framePending = true;

    this.rafId = requestAnimationFrame(() => {
      this.framePending = false;
      this.renderCallback?.();
    });
  }

  startContinuousRender(): void {
    if (this.continuousMode) return;
    this.continuousMode = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.framePending = false;
    }

    const loop = () => {
      if (!this.continuousMode) return;
      this.renderCallback?.();
      this.continuousRafId = requestAnimationFrame(loop);
    };
    this.continuousRafId = requestAnimationFrame(loop);
  }

  stopContinuousRender(): void {
    if (!this.continuousMode) return;
    this.continuousMode = false;
    if (this.continuousRafId !== null) {
      cancelAnimationFrame(this.continuousRafId);
      this.continuousRafId = null;
    }
  }

  isContinuous(): boolean {
    return this.continuousMode;
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stopContinuousRender();
    this.framePending = false;
  }

  dispose(): void {
    this.cancel();
    this.renderCallback = null;
  }
}
