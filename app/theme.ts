// Follow the user's theme. bb exposes the palette as CSS variables; when
// --primary is a real colour (ayu gold, dracula purple) the plugin's accent
// becomes it, and when it is neutral (the default black/white theme) the
// accent stays Tinkerer green. Measured, not guessed: the variable is
// resolved through a canvas so oklch(), color-mix() and hex all work.
import { useEffect } from "react";

const PROP = "--tk-accent";

function resolveColor(value: string): [number, number, number] | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === undefined || a < 200) return null;
  return [r! / 255, g! / 255, b! / 255];
}

/** HSL saturation and lightness of an sRGB triple. */
function saturationLightness([r, g, b]: [number, number, number]): [number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [s, l];
}

/** The theme's --primary if it is chromatic enough to carry an accent, else null. */
export function measureThemeAccent(): string | null {
  const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!primary) return null;
  const rgb = resolveColor(primary);
  if (!rgb) return null;
  const [s, l] = saturationLightness(rgb);
  return s >= 0.3 && l >= 0.22 && l <= 0.85 ? primary : null;
}

export function applyThemeAccent(): void {
  const accent = measureThemeAccent();
  const root = document.documentElement;
  if (accent) root.style.setProperty(PROP, accent);
  else root.style.removeProperty(PROP);
}

/** Keep --tk-accent in step with theme changes for as long as one instance is mounted. */
export function useThemeAccent(): void {
  useEffect(() => {
    applyThemeAccent();
    const observer = new MutationObserver(() => applyThemeAccent());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-bb-theme"] });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyThemeAccent);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", applyThemeAccent);
    };
  }, []);
}
