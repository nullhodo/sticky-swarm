import type p5 from "p5";
import { PARAMETER_COMMENTS_MAP } from "../constants/palettes";
import type { SwarmParameters } from "../types/swarm";
import { getFormattedDate } from "../utils/date";
import type { SwarmEngine } from "./swarmEngine";
import { renderSwarmScene } from "./swarmRenderer";

/**
 * Export high-resolution raster image (JPEG) and accompanying JSONC settings.
 */
export function exportHighResolutionImage(
  p5Instance: p5,
  engine: SwarmEngine,
  params: SwarmParameters,
): void {
  const multiplier = params.exportScaleMultiplier || 2;
  const targetWidth = (p5Instance.width || 1200) * multiplier;
  const targetHeight = (p5Instance.height || 900) * multiplier;

  const offscreen = p5Instance.createGraphics(targetWidth, targetHeight);
  renderSwarmScene(offscreen, engine, targetWidth, targetHeight, params);

  const timestamp = getFormattedDate();
  const baseFileName = `StickyAgentSwarm_${timestamp}_${Math.floor(targetWidth)}x${Math.floor(targetHeight)}`;

  p5Instance.save(offscreen, `${baseFileName}.jpg`);
  exportJsoncFile(params, baseFileName);

  try {
    offscreen.remove();
  } catch {
    // ignore
  }
}

/**
 * Export SVG vector graphic of the current swarm state.
 */
export function exportSvgVector(
  p5Instance: p5,
  engine: SwarmEngine,
  params: SwarmParameters,
): void {
  const targetWidth = 2000;
  const targetHeight = 2000;

  const svgGraphics = p5Instance.createGraphics(
    targetWidth,
    targetHeight,
    // @ts-expect-error p5.SVG constant provided by p5.js-svg
    p5Instance.SVG,
  );

  renderSwarmScene(svgGraphics, engine, targetWidth, targetHeight, params);

  const timestamp = getFormattedDate();
  const filename = `StickyAgentSwarm_${timestamp}_vector.svg`;
  p5Instance.save(svgGraphics, filename);

  try {
    svgGraphics.remove();
  } catch {
    // ignore
  }
}

/**
 * Export annotated JSONC settings file.
 */
export function exportJsoncFile(
  params: SwarmParameters,
  baseFileNameString?: string,
): void {
  const timestamp = getFormattedDate();
  const filename = baseFileNameString
    ? `${baseFileNameString}.jsonc`
    : `StickyAgentSwarm_Settings_${timestamp}.jsonc`;

  const jsonString = JSON.stringify(params, null, 4);
  const lines = jsonString.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/"([^"]+)":/);
    if (match?.[1]) {
      const key = match[1];
      if (PARAMETER_COMMENTS_MAP[key]) {
        lines[i] = `${line} // ${PARAMETER_COMMENTS_MAP[key]}`;
      }
    }
  }

  const finalContent = lines.join("\n");
  const blob = new Blob([finalContent], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Parse JSONC formatted string into SwarmParameters object, ignoring comments.
 */
export function parseJsoncContent(
  jsoncString: string,
): Partial<SwarmParameters> {
  // Strip single-line comments // ...
  const cleaned = jsoncString.replace(/\/\/.*$/gm, "");
  return JSON.parse(cleaned);
}
