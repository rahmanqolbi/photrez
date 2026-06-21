---
target: History tab UI
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-21T14-12-43Z
slug: pps-desktop-src-components-editor-historypanel-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Current state is visible, but the tab and status-bar signals use different emphasis. |
| 2 | Match System / Real World | 3 | The history metaphor is familiar. |
| 3 | User Control and Freedom | 4 | Users can move between history states and return to Layers. |
| 4 | Consistency and Standards | 2 | History uses an inset card while Layers uses structural, edge-to-edge bands. |
| 5 | Error Prevention | 3 | Current/future states are distinguished. |
| 6 | Recognition Rather Than Recall | 3 | Labels and icons are scannable. |
| 7 | Flexibility and Efficiency | 2 | Switching to History removes Navigator; tab arrow-key behavior is not evident. |
| 8 | Aesthetic and Minimalist Design | 1 | A full-height bordered void dominates the sparse baseline state. |
| 9 | Error Recovery | 2 | Not meaningfully observable from this surface. |
| 10 | Help and Documentation | 1 | The baseline-only state does not explain that edits will appear here. |
| **Total** | | **24/40** | **Acceptable, but the dock composition needs correction.** |

#### Anti-Patterns Verdict

The application does not look generically AI-generated. Its workbench is disciplined, dense, and appropriately restrained. The History surface is the exception: it renders a permanent dock like a large rounded web card, producing a large framed black void around one row.

The deterministic detector was attempted against both relevant files but could not run because its bundled detector engine is absent. The runtime screenshots therefore provide the strongest evidence: inset card geometry, excess empty framed area, and inconsistent gray-tab versus amber-status selection signals.

#### Overall Impression

The tabs themselves are correct. The oddness comes from replacing the Layers panel's edge-to-edge mechanical anatomy with a padded, rounded, full-height container containing only `Open`. It reads as unfinished rather than intentionally empty.

#### What's Working

- `Layers | History` is explicit and discoverable.
- Compact history rows and human-readable action labels suit a professional editor.
- Restrained graphite surfaces and amber accents keep attention on the canvas.

#### Priority Issues

1. **[P1] Full-height inset card exaggerates emptiness**
   - Why it matters: one baseline row floats above a large framed void, making the feature appear incomplete.
   - Fix: remove the rounded outer card and extra padding; render the history list edge-to-edge with structural row dividers.

2. **[P1] Tab contents do not share stable dock anatomy**
   - Why it matters: Layers contains controls, stack, actions, and Navigator, while History replaces everything with one list. The dock changes role when switching tabs.
   - Fix: decide whether Navigator is a persistent canvas instrument. Recommended: keep it outside the mutually exclusive Layers/History content region.

3. **[P2] Baseline-only state is unexplained**
   - Why it matters: `Open` alone does not confirm that the feature is functioning.
   - Fix: add quiet inline text such as `Edits appear here` only while no edit states exist.

4. **[P2] Active-state vocabulary conflicts**
   - Why it matters: the tab underline is gray, the status action is amber, and the current row mixes both.
   - Fix: use amber for the active tab indicator, keep the row highlight neutral, and reduce duplicate emphasis in the status bar.

#### Persona Red Flags

- **Alex, power user:** History hides Navigator, forcing repeated tab switching during iterative checks.
- **Jordan, first-timer:** a single `Open` row in a huge framed empty area looks broken; no cue explains what happens next.
- **Sam, keyboard user:** tab semantics exist, but roving focus and arrow-key navigation are not evident in the implementation.

#### Minor Observations

- History receives bottom padding from the tab panel and its own inset padding, reinforcing the floating-card effect.
- The `Open` row resembles a boxed header because it touches the card border.
- The tabs have good target size and should be preserved.

#### Questions to Consider

- Is Navigator fundamentally a Layers tool, or a persistent canvas instrument?
- Should an empty History surface disappear into the dock background instead of announcing its emptiness with a large frame?
