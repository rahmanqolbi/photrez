import { describe, it, expect, vi, beforeEach } from "vitest";
import { ViewportCamera, MIN_ZOOM, MAX_ZOOM } from "@/viewport/viewportCamera";

describe("Keyboard Zoom Animation", () => {
  let camera: ViewportCamera;

  beforeEach(() => {
    camera = new ViewportCamera({ x: 0, y: 0, zoom: 1 });
    camera.setViewportSize(1000, 700);
  });

  const tickToCompletion = (camera: ViewportCamera, maxIterations = 100) => {
    const startTime = performance.now();
    let iterations = 0;
    while (camera.isAnimating() && iterations < maxIterations) {
      camera.tick(startTime + 200); // Fast-forward past 150ms duration
      iterations++;
    }
    return iterations;
  };

  describe("Zoom In (Ctrl++)", () => {
    it("starts animation when zoom in is triggered", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      // Simulate animateZoomToPoint call
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      
      expect(camera.isAnimating()).toBe(true);
    });

    it("completes animation and reaches target zoom level", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.isAnimating()).toBe(false);
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });

    it("calls onAnimationStart callback when animation begins", () => {
      const onStart = vi.fn();
      camera.onAnimationStart = onStart;
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("calls onAnimationEnd callback when animation completes", () => {
      const onEnd = vi.fn();
      camera.onAnimationEnd = onEnd;
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it("updates zoom progressively during animation", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      
      const startTime = performance.now();
      camera.tick(startTime + 50); // 1/3 of duration
      const midZoom = camera.getState().zoom;
      
      expect(midZoom).toBeGreaterThan(1);
      expect(midZoom).toBeLessThan(1.25);
    });
  });

  describe("Zoom Out (Ctrl+-)", () => {
    it("starts animation when zoom out is triggered", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(0.8, 500, 350, 150, (t) => t);
      
      expect(camera.isAnimating()).toBe(true);
    });

    it("completes animation and reaches target zoom level", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(0.8, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.isAnimating()).toBe(false);
      expect(camera.getState().zoom).toBeCloseTo(0.8, 2);
    });
  });

  describe("Actual Size (Ctrl+1)", () => {
    it("animates from zoomed state back to 1.0", () => {
      camera.setState({ x: 100, y: 80, zoom: 2.5 });
      
      const currentZoom = camera.getState().zoom;
      const factor = 1 / currentZoom; // Should be 0.4
      
      camera.animateZoomToPoint(factor, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.getState().zoom).toBeCloseTo(1.0, 2);
    });

    it("animates from zoomed out state to 1.0", () => {
      camera.setState({ x: 50, y: 30, zoom: 0.5 });
      
      const currentZoom = camera.getState().zoom;
      const factor = 1 / currentZoom; // Should be 2.0
      
      camera.animateZoomToPoint(factor, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.getState().zoom).toBeCloseTo(1.0, 2);
    });
  });

  describe("Edge Cases", () => {
    it("cancels previous animation when new animation starts", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      // Start first animation
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      const startTime = performance.now();
      camera.tick(startTime + 50); // Partially complete
      
      const midZoom = camera.getState().zoom;
      expect(midZoom).toBeGreaterThan(1);
      expect(midZoom).toBeLessThan(1.25);
      
      // Start second animation before first completes
      camera.animateZoomToPoint(0.8, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      // Should reach second animation target, not first
      expect(camera.getState().zoom).toBeCloseTo(midZoom * 0.8, 2);
    });

    it("respects MIN_ZOOM constraint", () => {
      camera.setState({ x: 0, y: 0, zoom: 0.02 }); // Near minimum (MIN_ZOOM = 0.01)
      
      // Try to zoom out further
      camera.animateZoomToPoint(0.5, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      const finalZoom = camera.getState().zoom;
      expect(finalZoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    });

    it("respects MAX_ZOOM constraint", () => {
      camera.setState({ x: 0, y: 0, zoom: 90 }); // Near maximum (MAX_ZOOM = 100)
      
      // Try to zoom in further
      camera.animateZoomToPoint(2, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      const finalZoom = camera.getState().zoom;
      expect(finalZoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it("handles rapid successive zoom commands", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const onEnd = vi.fn();
      camera.onAnimationEnd = onEnd;
      
      // Rapid zoom in commands
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      
      tickToCompletion(camera);
      
      // Only last animation should complete
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(camera.isAnimating()).toBe(false);
    });

    it("does not break when tick is called without active animation", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const startTime = performance.now();
      const result = camera.tick(startTime);
      
      expect(result).toBe(false); // Should return false when no animation
      expect(camera.getState().zoom).toBe(1); // State unchanged
    });

    it("handles animation cancellation via setState", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const onEnd = vi.fn();
      camera.onAnimationEnd = onEnd;
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      expect(camera.isAnimating()).toBe(true);
      
      // Cancel by setting state directly
      camera.setState({ x: 0, y: 0, zoom: 2 });
      
      expect(camera.isAnimating()).toBe(false);
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(camera.getState().zoom).toBe(2);
    });

    it("handles animation cancellation via pan", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const onEnd = vi.fn();
      camera.onAnimationEnd = onEnd;
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      expect(camera.isAnimating()).toBe(true);
      
      // Cancel by panning
      camera.pan(50, 30);
      
      expect(camera.isAnimating()).toBe(false);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it("handles animation cancellation via zoomToPoint", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const onEnd = vi.fn();
      camera.onAnimationEnd = onEnd;
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      expect(camera.isAnimating()).toBe(true);
      
      // Cancel by instant zoom (e.g., Ctrl+Scroll)
      camera.zoomToPoint(0.8, 500, 350);
      
      expect(camera.isAnimating()).toBe(false);
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(camera.getState().zoom).toBeCloseTo(0.8, 2);
    });

    it("completes animation even with very small duration", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 1, (t) => t); // 1ms duration
      tickToCompletion(camera);
      
      expect(camera.isAnimating()).toBe(false);
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });

    it("handles zero duration gracefully", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 0, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.isAnimating()).toBe(false);
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });

    it("maintains pointer-anchored zoom during animation", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      const anchorX = 500;
      const anchorY = 350;
      
      camera.animateZoomToPoint(2, anchorX, anchorY, 150, (t) => t);
      tickToCompletion(camera);
      
      // Position should change to maintain anchor point
      const finalState = camera.getState();
      expect(finalState.x).not.toBe(0);
      expect(finalState.y).not.toBe(0);
      expect(finalState.zoom).toBeCloseTo(2, 2);
    });

    it("does not leak animation state after completion", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      tickToCompletion(camera);
      
      expect(camera.isAnimating()).toBe(false);
      
      // Second animation should work normally
      camera.animateZoomToPoint(0.8, 500, 350, 150, (t) => t);
      expect(camera.isAnimating()).toBe(true);
      
      tickToCompletion(camera);
      expect(camera.isAnimating()).toBe(false);
    });

    it("handles missing onAnimationStart callback gracefully", () => {
      camera.onAnimationStart = undefined;
      
      expect(() => {
        camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
        tickToCompletion(camera);
      }).not.toThrow();
      
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });

    it("handles missing onAnimationEnd callback gracefully", () => {
      camera.onAnimationEnd = undefined;
      
      expect(() => {
        camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
        tickToCompletion(camera);
      }).not.toThrow();
      
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });
  });

  describe("Animation Timing", () => {
    it("respects easing function", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      // Linear easing
      const linearEasing = (t: number) => t;
      camera.animateZoomToPoint(2, 500, 350, 150, linearEasing);
      
      const startTime = performance.now();
      camera.tick(startTime + 75); // Exactly half duration
      
      const midZoom = camera.getState().zoom;
      // With linear easing at 50% time, should be at 50% progress
      expect(midZoom).toBeCloseTo(1.5, 1); // (1 + 2) / 2 = 1.5
    });

    it("applies easeOutCubic correctly", () => {
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      // easeOutCubic: 1 - (1-t)^3
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      camera.animateZoomToPoint(2, 500, 350, 150, easeOutCubic);
      
      const startTime = performance.now();
      
      // Early in animation (25% time) - should be more than 25% progress due to cubic easing
      camera.tick(startTime + 37.5);
      const earlyZoom = camera.getState().zoom;
      expect(earlyZoom).toBeGreaterThan(1.25); // More than linear progress
      
      // Late in animation (75% time) - should be close to target
      camera.tick(startTime + 112.5);
      const lateZoom = camera.getState().zoom;
      expect(lateZoom).toBeGreaterThan(1.9); // Very close to 2.0
    });
  });

  describe("Integration with syncFromCamera", () => {
    it("does not break animation when syncFromCamera skips engine sync", () => {
      // This tests the fix for the circular loop issue
      camera.setState({ x: 0, y: 0, zoom: 1 });
      
      camera.animateZoomToPoint(1.25, 500, 350, 150, (t) => t);
      
      const startTime = performance.now();
      let tickCount = 0;
      
      while (camera.isAnimating() && tickCount < 20) {
        camera.tick(startTime + tickCount * 10);
        // Simulate syncFromCamera checking isAnimating
        if (camera.isAnimating()) {
          // Should skip engine.setViewport() during animation
        }
        tickCount++;
      }
      
      expect(camera.isAnimating()).toBe(false);
      expect(camera.getState().zoom).toBeCloseTo(1.25, 2);
    });
  });
});
