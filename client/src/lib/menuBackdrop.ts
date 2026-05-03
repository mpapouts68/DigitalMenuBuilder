import type { CSSProperties } from "react";

/** CSS variable name set on the menu root for reuse (e.g. sticky header strip). */
export const MENU_BG_TILE_VAR = "--menu-bg-tile";

/** Tiled vertical strip on the menu shell; exposes `var(--menu-bg-tile)` for the header. */
export function menuBackdropStyle(imageUrl: string): CSSProperties {
  const u = (imageUrl || "/backgrnd.PNG").trim() || "/backgrnd.PNG";
  const tile = `url(${JSON.stringify(u)})`;
  return {
    [MENU_BG_TILE_VAR]: tile,
    backgroundColor: "#f4f1ea",
    backgroundImage: `var(${MENU_BG_TILE_VAR})`,
    backgroundRepeat: "repeat-x",
    backgroundSize: "auto 100%",
    backgroundAttachment: "fixed",
    backgroundPosition: "top center",
    minHeight: "100vh",
  } as CSSProperties;
}

/** Same tile as parent (inherits `--menu-bg-tile`); compact bar height. */
export function menuHeaderBackdropStyle(): CSSProperties {
  return {
    backgroundImage: `var(${MENU_BG_TILE_VAR})`,
    backgroundRepeat: "repeat-x",
    backgroundSize: "auto 100%",
    backgroundAttachment: "fixed",
    backgroundPosition: "top center",
  };
}
