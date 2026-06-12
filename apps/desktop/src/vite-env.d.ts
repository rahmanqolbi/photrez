/// <reference types="vite/client" />

import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface HTMLAttributes<T> {
      [key: `style:${string}`]: string | number | undefined;
    }
    interface CanvasHTMLAttributes<T> {
      [key: `style:${string}`]: string | number | undefined;
    }
    interface SvgSVGAttributes<T> {
      [key: `style:${string}`]: string | number | undefined;
    }
  }
}
