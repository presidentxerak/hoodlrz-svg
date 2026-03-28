// ── PFP Export Utilities for Hoodlrz ──
// All client-side, no backend required.

import { generatePFP } from "./generator";

/**
 * Convert an SVG string to a PNG Blob via an offscreen canvas.
 * Runs entirely in the browser.
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
 * Generate a PFP from a seed and download it as a PNG file.
 */
export async function downloadPNG(
  seed: string,
  filename: string = "hoodlrz-pfp"
): Promise<void> {
  const { svg } = generatePFP(seed);
  const blob = await exportAsPNG(svg, 1024);
  triggerDownload(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

/**
 * Download an SVG string as a .svg file.
 */
export function downloadSVG(
  svgString: string,
  filename: string = "hoodlrz-pfp"
): void {
  const blob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  triggerDownload(blob, filename.endsWith(".svg") ? filename : `${filename}.svg`);
}
