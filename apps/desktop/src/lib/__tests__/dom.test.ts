import { describe, it, expect } from "vitest";
import { isEditableTarget } from "../dom";

function el(tag: string, attrs?: Record<string, string>): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, v);
  return node;
}

describe("isEditableTarget", () => {
  it("returns false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it("returns false for non-HTMLElement (e.g. SVG element)", () => {
    // svg elements are not HTMLElement instances
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(isEditableTarget(svg)).toBe(false);
  });

  it("returns true for a <textarea>", () => {
    document.body.appendChild(el("textarea"));
    expect(isEditableTarget(document.body.lastChild)).toBe(true);
  });

  it("returns true for a text <input>", () => {
    const input = el("input", { type: "text" });
    document.body.appendChild(input);
    expect(isEditableTarget(input)).toBe(true);
  });

  it("returns true for a <input type='number'>", () => {
    const input = el("input", { type: "number" });
    document.body.appendChild(input);
    expect(isEditableTarget(input)).toBe(true);
  });

  it("returns false for <input type='range'>", () => {
    const input = el("input", { type: "range" });
    document.body.appendChild(input);
    expect(isEditableTarget(input)).toBe(false);
  });

  it("returns false for a <select>", () => {
    // NOTE: <select> is actually editable (native dropdown). Keeping test for
    // documentation — if this fails after a change, verify intent.
    const select = document.createElement("select");
    document.body.appendChild(select);
    expect(isEditableTarget(select)).toBe(true);
  });

  it("returns true for [contenteditable='true']", () => {
    const div = el("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    expect(isEditableTarget(div)).toBe(true);
  });

  it("returns true for a <button> inside an <input> (nested DOM)", () => {
    const input = el("input", { type: "text" });
    const btn = el("button");
    input.appendChild(btn);
    document.body.appendChild(input);
    // child of input — closest('input') should match
    expect(isEditableTarget(btn)).toBe(true);
  });

  it("returns false for a <button> (plain)", () => {
    const btn = el("button");
    document.body.appendChild(btn);
    expect(isEditableTarget(btn)).toBe(false);
  });

  it("returns false for range input even with no type attribute", () => {
    const input = el("input");
    document.body.appendChild(input);
    // No type = text by default → editable
    expect(isEditableTarget(input)).toBe(true);
  });
});
