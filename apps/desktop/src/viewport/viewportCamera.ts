import { EasingFn } from "./easing";

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface ImageTransformState {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  pivotScreen: { x: number; y: number } | null;
  pivotDocument: { x: number; y: number } | null;
}

export interface AnimationState {
  from: CameraState;
  to: CameraState;
  startTime: number;
  duration: number;
  easing: EasingFn;
}

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 100.0;

export class ViewportCamera {
  private current: CameraState = { x: 0, y: 0, zoom: 1.0 };
  private animation: AnimationState | null = null;
  private viewportWidth = 800;
  private viewportHeight = 600;
  private imageTransform: ImageTransformState = {
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1.0,
    pivotScreen: null,
    pivotDocument: null,
  };

  public onAnimationStart?: () => void;
  public onAnimationEnd?: () => void;
  public isModernCropActive = false;

  constructor(initial?: Partial<CameraState>) {
    if (initial) {
      this.current = {
        x: initial.x ?? 0,
        y: initial.y ?? 0,
        zoom: initial.zoom ?? 1.0,
      };
    }
  }

  public getState(): CameraState {
    return { ...this.current };
  }

  public setState(state: CameraState): void {
    this.current = {
      x: state.x,
      y: state.y,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom)),
    };
    if (this.animation) {
      this.animation = null;
      this.onAnimationEnd?.();
    }
  }

  public setViewportSize(w: number, h: number): void {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  public getViewportSize(): { width: number; height: number } {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  public isAnimating(): boolean {
    return this.animation !== null;
  }

  public pan(dx: number, dy: number): void {
    this.current.x += dx;
    this.current.y += dy;
    if (this.animation) {
      this.animation = null;
      this.onAnimationEnd?.();
    }
  }

  public zoomToPoint(factor: number, screenX: number, screenY: number): void {
    const oldZoom = this.current.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));

    // Anchor: the document position under the screen point must remain invariant.
    // docX = (screenX - camera.x) / oldZoom
    // camera.x_new = screenX - docX * newZoom
    this.current.x = screenX - ((screenX - this.current.x) / oldZoom) * newZoom;
    this.current.y = screenY - ((screenY - this.current.y) / oldZoom) * newZoom;
    this.current.zoom = newZoom;
    if (this.animation) {
      this.animation = null;
      this.onAnimationEnd?.();
    }
  }

  public animateZoomToPoint(
    factor: number,
    screenX: number,
    screenY: number,
    duration: number,
    easing: EasingFn
  ): void {
    const oldZoom = this.current.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));

    const targetX = screenX - ((screenX - this.current.x) / oldZoom) * newZoom;
    const targetY = screenY - ((screenY - this.current.y) / oldZoom) * newZoom;

    this.animateTo({ x: targetX, y: targetY, zoom: newZoom }, duration, easing);
  }

  public animateTo(target: CameraState, duration: number, easing: EasingFn): void {
    this.animation = {
      from: { ...this.current },
      to: {
        x: target.x,
        y: target.y,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target.zoom)),
      },
      startTime: performance.now(),
      duration,
      easing,
    };

    if (this.onAnimationStart) {
      this.onAnimationStart();
    }
  }

  public tick(now: number): boolean {
    if (!this.animation) return false;

    const elapsed = now - this.animation.startTime;
    const t = Math.max(0, Math.min(1, elapsed / this.animation.duration));
    const eased = this.animation.easing(t);

    this.current.x = this.animation.from.x + (this.animation.to.x - this.animation.from.x) * eased;
    this.current.y = this.animation.from.y + (this.animation.to.y - this.animation.from.y) * eased;
    this.current.zoom = this.animation.from.zoom + (this.animation.to.zoom - this.animation.from.zoom) * eased;

    if (t >= 1) {
      this.current = { ...this.animation.to };
      this.animation = null;
      if (this.onAnimationEnd) {
        this.onAnimationEnd();
      }
      return false;
    }

    return true;
  }

  public getViewProjectionMatrix(canvasW?: number, canvasH?: number): Float32Array {
    if (canvasW !== undefined) this.viewportWidth = canvasW;
    if (canvasH !== undefined) this.viewportHeight = canvasH;

    const { x, y, zoom } = this.current;
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const m = new Float32Array(16);
    
    // Orthographic Matrix components combined with camera transform
    m[0]  = (2 * zoom) / w;
    m[5]  = (-2 * zoom) / h;   // Y-flip (screen top = 0)
    m[10] = 1;
    m[12] = -1 + (x * 2) / w;  // Translation X
    m[13] =  1 + (y * -2) / h; // Translation Y
    m[15] = 1;
    
    return m;
  }

  public screenToDocument(screenX: number, screenY: number): { x: number; y: number } {
    const { x, y, zoom } = this.current;
    return {
      x: (screenX - x) / zoom,
      y: (screenY - y) / zoom,
    };
  }

  public documentToScreen(docX: number, docY: number): { x: number; y: number } {
    const { x, y, zoom } = this.current;
    return {
      x: docX * zoom + x,
      y: docY * zoom + y,
    };
  }
}
