import type p5 from "p5";
import { PARAMETER_COMMENTS_MAP } from "../constants/palettes";
import type { SwarmParameters } from "../types/swarm";
import { getFormattedDate } from "../utils/date";
import {
  LOGICAL_SPACE_HEIGHT,
  LOGICAL_SPACE_WIDTH,
  type SwarmEngine,
} from "./swarmEngine";

function drawSwarmToGraphics(
  graphics: p5.Graphics,
  engine: SwarmEngine,
  targetWidth: number,
  targetHeight: number,
  params: SwarmParameters,
): void {
  graphics.background(params.backgroundColor);

  const scaleFactor = Math.min(
    targetWidth / LOGICAL_SPACE_WIDTH,
    targetHeight / LOGICAL_SPACE_HEIGHT,
  );
  const offsetX = (targetWidth - LOGICAL_SPACE_WIDTH * scaleFactor) / 2;
  const offsetY = (targetHeight - LOGICAL_SPACE_HEIGHT * scaleFactor) / 2;

  graphics.push();
  graphics.translate(offsetX, offsetY);
  graphics.scale(scaleFactor);

  // Draw connections
  graphics.stroke(255, 100);
  graphics.strokeWeight(2);
  for (let i = 0; i < engine.activeConstraints.length; i++) {
    const c = engine.activeConstraints[i].constraint;
    if (c.bodyA && c.bodyB) {
      graphics.line(
        c.bodyA.position.x,
        c.bodyA.position.y,
        c.bodyB.position.x,
        c.bodyB.position.y,
      );
    }
  }

  // Draw agents
  graphics.noStroke();
  for (let i = 0; i < engine.agents.length; i++) {
    const agent = engine.agents[i];
    const body = agent.physicsBody;

    graphics.push();
    graphics.translate(body.position.x, body.position.y);
    graphics.rotate(body.angle);

    for (let j = 0; j < agent.renderParts.length; j++) {
      const rp = agent.renderParts[j];
      graphics.push();
      graphics.translate(rp.localX, rp.localY);
      graphics.rotate(rp.localAngle);
      graphics.fill(rp.color);

      if (rp.type === "circle" && rp.radius) {
        graphics.circle(0, 0, rp.radius * 2);
      } else if (rp.type === "rect" && rp.width && rp.height) {
        graphics.rectMode(graphics.CENTER);
        graphics.rect(0, 0, rp.width, rp.height);
      }
      graphics.pop();
    }
    graphics.pop();
  }

  graphics.pop();
}

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
  drawSwarmToGraphics(
    offscreen,
    engine,
    targetWidth,
    targetHeight,
    params,
  );

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

  drawSwarmToGraphics(
    svgGraphics,
    engine,
    targetWidth,
    targetHeight,
    params,
  );

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
 * Parse JSON or JSONC file content into SwarmParameters.
 */
export function parseJsoncContent(rawText: string): SwarmParameters {
  const cleaned = rawText
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(cleaned) as SwarmParameters;
}
