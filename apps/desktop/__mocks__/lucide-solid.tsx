/**
 * Mock for lucide-solid — prevents "Client-only API called on server side" error
 * in SolidJS + jsdom test environment.
 *
 * lucide-solid's SVG icon components trigger SolidJS's SSR detection check
 * when rendered in jsdom, throwing "Client-only API called on the server side".
 * This mock replaces all icon components with simple SolidJS <svg> elements
 * that work correctly in jsdom.
 *
 * IMPORTANT: Keep the export list in sync with apps/desktop/src/components/editor/icons.tsx
 * whenever new icons are added.
 */

import { type Component, type JSX } from "solid-js";

export type LucideIcon = Component<JSX.SvgSVGAttributes<SVGSVGElement> & { size?: number }>;
export type LucideProps = JSX.SvgSVGAttributes<SVGSVGElement> & { size?: number };

function createMockIcon(name: string): LucideIcon {
  return (props: LucideProps) => {
    const { size = 24, ...rest } = props;
    return (
      <svg
        data-lucide-mock={name}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width={2}
        stroke-linecap="round"
        stroke-linejoin="round"
        {...rest}
      />
    ) as unknown as JSX.Element;
  };
}

// ─── All icons used by apps/desktop/src/components/editor/icons.tsx ───
export const AlignCenterHorizontal = createMockIcon("align-center-h");
export const AlignCenterVertical = createMockIcon("align-center-v");
export const AlignStartHorizontal = createMockIcon("align-start-h");
export const AlignEndHorizontal = createMockIcon("align-end-h");
export const AlignStartVertical = createMockIcon("align-start-v");
export const AlignEndVertical = createMockIcon("align-end-v");
export const ArrowLeftRight = createMockIcon("arrow-left-right");
export const Aperture = createMockIcon("aperture");
export const Box = createMockIcon("box");
export const Brush = createMockIcon("brush");
export const Camera = createMockIcon("camera");
export const ChartSpline = createMockIcon("chart-spline");
export const Check = createMockIcon("check");
export const ChevronDown = createMockIcon("chevron-down");
export const ChevronRight = createMockIcon("chevron-right");
export const ChevronUp = createMockIcon("chevron-up");
export const Circle = createMockIcon("circle");
export const Columns2 = createMockIcon("columns-2");
export const Contrast = createMockIcon("contrast");
export const Copy = createMockIcon("copy");
export const Crop = createMockIcon("crop");
export const Eraser = createMockIcon("eraser");
export const Eye = createMockIcon("eye");
export const FlipHorizontal = createMockIcon("flip-h");
export const FlipVertical = createMockIcon("flip-v");
export const FolderPlus = createMockIcon("folder-plus");
export const Grid2X2 = createMockIcon("grid-2x2");
export const Grid3X3 = createMockIcon("grid-3x3");
export const History = createMockIcon("history");
export const ImageIcon = createMockIcon("image");
export { ImageIcon as Image };
export const ImagePlus = createMockIcon("image-plus");
export const Layers = createMockIcon("layers");
export const Link = createMockIcon("link");
export const Lock = createMockIcon("lock");
export const Maximize2 = createMockIcon("maximize-2");
export const Minus = createMockIcon("minus");
export const MoreHorizontal = createMockIcon("more-h");
export const MousePointer2 = createMockIcon("mouse-pointer-2");
export const Move = createMockIcon("move");
export const PaintBucket = createMockIcon("paint-bucket");
export const Palette = createMockIcon("palette");
export const PanelRightClose = createMockIcon("panel-right-close");
export const PanelRightOpen = createMockIcon("panel-right-open");
export const Pen = createMockIcon("pen");
export const Pipette = createMockIcon("pipette");
export const Plus = createMockIcon("plus");
export const RectangleHorizontal = createMockIcon("rect-h");
export const Redo2 = createMockIcon("redo-2");
export const RotateCcw = createMockIcon("rotate-ccw");
export const RotateCw = createMockIcon("rotate-cw");
export const Slice = createMockIcon("slice");
export const Sliders = createMockIcon("sliders");
export const Sparkles = createMockIcon("sparkles");
export const SplitSquareHorizontal = createMockIcon("split-square-h");
export const Square = createMockIcon("square");
export const SquareDashed = createMockIcon("square-dashed");
export const SquarePen = createMockIcon("square-pen");
export const Stamp = createMockIcon("stamp");
export const StretchHorizontal = createMockIcon("stretch-h");
export const Sun = createMockIcon("sun");
export const SwatchBook = createMockIcon("swatch-book");
export const Trash2 = createMockIcon("trash-2");
export const Type = createMockIcon("type");
export const Undo2 = createMockIcon("undo-2");
export const Unlock = createMockIcon("unlock");
export const X = createMockIcon("x");
