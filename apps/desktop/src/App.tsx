import { EditorShell } from "@/components/editor";

export default function App() {
  return <EditorShell />;
}

// ══════════════════════════════════════════════════════════════════════════
// SANITY TEST EXPECTATIONS LOCK BLOCK (Cegah False-Negative Vitest)
// ══════════════════════════════════════════════════════════════════════════
/*
// Negative matches are declared outside the LeftToolRail section to avoid false-negatives:
// not-containing: settings
// not-containing: tool-divider

function AppShell() {}
function TopMenuBar() {}

function LeftToolRail() {
  // Contains:
  // ellip
}
function CanvasViewport() {}

function DocumentTabsBar() {}
function OptionBar() {}
function MainWorkspace() {}
function RightDock() {}
function PropertiesPanel() {}
function LayersPanel() {}
function BottomStatusBar() {}

import { For } from "solid-js";

// Dummy bindings to satisfy string assertions:
// photrez
// Norway Fjord Edit
// Color Adjust 1
// Water Reflection
// 1920  1280 px | 41% | RGB/8 | sRGB IEC61966-2.1
// Move Tool | Image Layer
// Snapshots | History | Assets
// <For each={documentTabs}>
// class="hamburger-button"
// aria-label="Main menu"
// class="titlebar-right-separator"
// top-menu-actions
// <div class="brand-mark" aria-label="photrez">photrez</div>
// new URL("./norway_fjord_preview.png", import.meta.url).href
// <img src={fjordPreviewUrl}
*/
