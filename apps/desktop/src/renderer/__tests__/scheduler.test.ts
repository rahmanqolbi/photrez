import { describe, it, expect, vi } from 'vitest';
import { RenderScheduler } from '../scheduler';

describe('RenderScheduler', () => {
  it('schedules render on requestAnimationFrame', async () => {
    const callback = vi.fn();
    const scheduler = new RenderScheduler(callback);

    scheduler.requestRender();
    expect(callback).not.toHaveBeenCalled();

    // Wait for microtasks + next animation frame mock
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(callback).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });

  it('coalesces multiple draw requests in same frame', async () => {
    const callback = vi.fn();
    const scheduler = new RenderScheduler(callback);

    scheduler.requestRender();
    scheduler.requestRender();
    scheduler.requestRender();

    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(callback).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });

  it('cancels scheduled draws successfully', async () => {
    const callback = vi.fn();
    const scheduler = new RenderScheduler(callback);

    scheduler.requestRender();
    scheduler.cancel();

    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(callback).not.toHaveBeenCalled();
    scheduler.dispose();
  });

  it('runs continuous render loop when started and stops when requested', async () => {
    const callback = vi.fn();
    const scheduler = new RenderScheduler(callback);

    expect(scheduler.isContinuous()).toBe(false);
    scheduler.startContinuousRender();
    expect(scheduler.isContinuous()).toBe(true);

    // Let it run for a couple of frame ticks
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(callback).toHaveBeenCalled();
    const callCountAfterFrame1 = callback.mock.calls.length;

    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(callback.mock.calls.length).toBeGreaterThan(callCountAfterFrame1);

    scheduler.stopContinuousRender();
    expect(scheduler.isContinuous()).toBe(false);
    const finalCallCount = callback.mock.calls.length;

    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(callback.mock.calls.length).toBe(finalCallCount);

    scheduler.dispose();
  });
});
