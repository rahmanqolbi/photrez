import fjord from "@/assets/fjord.jpg";

export function CanvasViewport() {
  return (
    <div class="flex flex-1 items-center justify-center overflow-hidden bg-editor-canvas p-3">
      <img
        src={fjord}
        alt="Norway fjord edit"
        class="max-h-full max-w-full object-contain shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
