// ── PFP Export Utilities for Hoodlrz ──
// All client-side, no backend required.

import { generatePFP } from "./generator";

/**
<<<<<<< HEAD
 * Convert an SVG string to a PNG Blob via an offscreen canvas.
 * Runs entirely in the browser.
=======
 * Fetch all layer SVGs and compose them into a single inline SVG string.
 * This is needed for PNG export since <image> hrefs won't render on canvas.
 */
async function composeLayers(seed: string, size: number = 400): Promise<string> {
  const { layers, variant } = generatePFP(seed);
  const bgColor = variant === "dark" ? "#000000" : "#ffffff";

  // Fetch all layer SVG contents in parallel
  const fetched = await Promise.all(
    layers.map(async (layer) => {
      try {
        const res = await fetch(layer.path);
        if (!res.ok) return "";
        const text = await res.text();
        // Extract inner content of the SVG (strip outer <svg> tags)
        const inner = text
          .replace(/<\?xml[^?]*\?>/gi, "")
          .replace(/<svg[^>]*>/i, "")
          .replace(/<\/svg>/i, "");
        return inner;
      } catch {
        return "";
      }
    })
  );

  const innerContent = fetched.filter(Boolean).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}" />
  ${innerContent}
</svg>`;
}

/**
 * Convert an SVG string to a PNG Blob via an offscreen canvas.
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
 */
export async function exportAsPNG(
  svgString: string,
  size: number = 1024
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas 2d context"));
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create PNG blob"));
        },
        "image/png",
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG as image for PNG conversion"));
    };

    img.src = url;
  });
}

/**
 * Trigger a browser file-download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
<<<<<<< HEAD
 * Generate a PFP from a seed and download it as a PNG file.
=======
 * Generate a PFP from a seed, compose layers inline, and download as PNG.
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
 */
export async function downloadPNG(
  seed: string,
  filename: string = "hoodlrz-pfp"
): Promise<void> {
<<<<<<< HEAD
  const { svg } = generatePFP(seed);
  const blob = await exportAsPNG(svg, 1024);
=======
  const inlineSvg = await composeLayers(seed, 1024);
  const blob = await exportAsPNG(inlineSvg, 1024);
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  triggerDownload(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

/**
<<<<<<< HEAD
 * Download an SVG string as a .svg file.
 */
export function downloadSVG(
  svgString: string,
  filename: string = "hoodlrz-pfp"
): void {
  const blob = new Blob([svgString], {
=======
 * Generate a PFP from a seed, compose layers inline, and download as SVG.
 */
export async function downloadSVG(
  seed: string,
  filename: string = "hoodlrz-pfp"
): Promise<void> {
  const inlineSvg = await composeLayers(seed, 400);
  const blob = new Blob([inlineSvg], {
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    type: "image/svg+xml;charset=utf-8",
  });
  triggerDownload(blob, filename.endsWith(".svg") ? filename : `${filename}.svg`);
}
