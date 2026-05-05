/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
  interface Window {
    __fmLenis?: import('lenis').default;
  }
}

export {};
