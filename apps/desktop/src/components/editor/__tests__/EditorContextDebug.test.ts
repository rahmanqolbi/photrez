import { describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { shouldExposeEditorDebugHandle, useEditor } from "../EditorContext";

describe("EditorContext debug handle exposure", () => {
  it("exposes window.__photrezEditor in dev and test modes", () => {
    expect(shouldExposeEditorDebugHandle({ DEV: true, MODE: "development" })).toBe(true);
    expect(shouldExposeEditorDebugHandle({ DEV: false, MODE: "test" })).toBe(true);
  });

  it("does not expose window.__photrezEditor in production by default", () => {
    expect(shouldExposeEditorDebugHandle({ DEV: false, MODE: "production" })).toBe(false);
  });

  it("allows an explicit debug override when needed", () => {
    expect(shouldExposeEditorDebugHandle({
      DEV: false,
      MODE: "production",
      VITE_PHOTREZ_DEBUG_EDITOR: "1",
    })).toBe(true);
  });
});

describe("useEditor provider contract", () => {
  it("fails loudly when used outside EditorProvider", () => {
    const container = document.createElement("div");
    function Probe() {
      useEditor();
      return null;
    }

    expect(() => render(() => Probe(), container)).toThrow(
      "useEditor must be used within an EditorProvider",
    );
  });
});
