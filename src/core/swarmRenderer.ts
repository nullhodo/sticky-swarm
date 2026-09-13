import type p5 from "p5";
import type {
  ActiveConstraintWrapper,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";
import {
  LOGICAL_SPACE_HEIGHT,
  LOGICAL_SPACE_WIDTH,
  type SwarmEngine,
} from "./swarmEngine";

type RenderTarget = p5 | p5.Graphics;

function drawArrow(
  target: RenderTarget,
  fromX: number,
  fromY: number,
  vecX: number,
  vecY: number,
  colorStr: string,
  strokeW = 4.5,
  headSize = 12,
): void {
  const lenSq = vecX * vecX + vecY * vecY;
  if (lenSq < 4) return; // Ignore tiny jitter vectors

  const toX = fromX + vecX;
  const toY = fromY + vecY;

  target.push();
  target.stroke(colorStr);
  target.strokeWeight(strokeW);
  target.line(fromX, fromY, toX, toY);

  const angle = Math.atan2(vecY, vecX);
  target.push();
  target.translate(toX, toY);
  target.rotate(angle);
  target.fill(colorStr);
  target.noStroke();
  target.triangle(
    0,
    0,
    -headSize,
    -headSize * 0.45,
    -headSize,
    headSize * 0.45,
  );
  target.pop();
  target.pop();
}

function drawSwarmConstraints(
  target: RenderTarget,
  constraints: ActiveConstraintWrapper[],
  disconnectionEnable = false,
  minAge = 5.0,
): void {
  target.strokeWeight(2);
  for (let i = 0; i < constraints.length; i++) {
    const cw = constraints[i];
    const c = cw.constraint;
    if (c.bodyA && c.bodyB) {
      if (disconnectionEnable && cw.ageSeconds > 1.0) {
        // As age approaches minAge and beyond, shift from white to warm warning amber
        const progress = Math.min(1.0, cw.ageSeconds / (minAge * 1.5));
        const r = 255;
        const g = Math.round(255 * (1 - progress * 0.45));
        const b = Math.round(255 * (1 - progress * 0.75));
        target.stroke(r, g, b, 180);
      } else {
        target.stroke(255, 120);
      }
      target.line(
        c.bodyA.position.x,
        c.bodyA.position.y,
        c.bodyB.position.x,
        c.bodyB.position.y,
      );
    }
  }
}

function drawSwarmAgents(
  target: RenderTarget,
  agents: SwarmAgent[],
  debugMode = false,
): void {
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const body = agent.physicsBody;

    target.push();
    target.translate(body.position.x, body.position.y);
    target.rotate(body.angle);

    if (debugMode) {
      target.stroke(0, 255, 0);
      target.strokeWeight(1.5);
    } else {
      target.noStroke();
    }

    for (let j = 0; j < agent.renderParts.length; j++) {
      const rp = agent.renderParts[j];
      target.push();
      target.translate(rp.localX, rp.localY);
      target.rotate(rp.localAngle);
      target.fill(rp.color);

      if (rp.type === "circle" && rp.radius) {
        target.circle(0, 0, rp.radius * 2);
      } else if (rp.type === "rect" && rp.width && rp.height) {
        // @ts-ignore
        target.rectMode(target.CENTER || "center");
        target.rect(0, 0, rp.width, rp.height);
      }
      target.pop();
    }
    target.pop();
  }
}

function drawDebugVectors(
  target: RenderTarget,
  agents: SwarmAgent[],
): void {
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const body = agent.physicsBody;

    // Velocity Vector (Cyan: 動き・速度)
    drawArrow(
      target,
      body.position.x,
      body.position.y,
      body.velocity.x * 12,
      body.velocity.y * 12,
      "#00E5FF",
      4.5,
      12,
    );

    // Force Vector (Coral/Orange: 加わる力)
    if (agent.lastAppliedForce) {
      drawArrow(
        target,
        body.position.x,
        body.position.y,
        agent.lastAppliedForce.x * 3000,
        agent.lastAppliedForce.y * 3000,
        "#FF5722",
        4.5,
        12,
      );
    }
  }
}

function drawDebugHud(
  target: RenderTarget,
  screenWidth: number,
  agentCount: number,
  constraintCount: number,
  debugVectors: boolean,
): void {
  target.push();
  const hudX = screenWidth - 240;
  const hudY = 16;
  target.fill(0, 0, 0, 180);
  target.stroke(255, 255, 255, 40);
  target.strokeWeight(1);
  target.rect(hudX, hudY, 224, debugVectors ? 135 : 64, 6);

  target.noStroke();
  target.fill(255);
  target.textSize(12);
  // @ts-ignore
  target.textAlign(target.LEFT || "left", target.TOP || "top");
  target.text(`Agents: ${agentCount}`, hudX + 12, hudY + 10);
  target.text(`Constraints: ${constraintCount}`, hudX + 12, hudY + 28);

  if (debugVectors) {
    // Cyan: Velocity
    target.stroke("#00E5FF");
    target.strokeWeight(3.5);
    target.line(hudX + 12, hudY + 54, hudX + 28, hudY + 54);
    target.noStroke();
    target.fill("#00E5FF");
    target.text("動き・速度 (Velocity)", hudX + 34, hudY + 48);

    // Coral: Force
    target.stroke("#FF5722");
    target.strokeWeight(3.5);
    target.line(hudX + 12, hudY + 74, hudX + 28, hudY + 74);
    target.noStroke();
    target.fill("#FF5722");
    target.text("加わる力 (Force)", hudX + 34, hudY + 68);

    // White: Constraint line
    target.stroke(255, 180);
    target.strokeWeight(2);
    target.line(hudX + 12, hudY + 94, hudX + 28, hudY + 94);
    target.noStroke();
    target.fill(255);
    target.text("接着バネ (Constraint)", hudX + 34, hudY + 88);

    // Green: Hull
    target.stroke(0, 255, 0);
    target.strokeWeight(1.5);
    target.noFill();
    target.rect(hudX + 12, hudY + 112, 14, 10);
    target.noStroke();
    target.fill(0, 255, 0);
    target.text("剛体 (Collision Hull)", hudX + 34, hudY + 110);
  }
  target.pop();
}

/**
 * Draw complete swarm scene (background, scaled world, agents, constraints, and optional debug overlays)
 */
export function renderSwarmScene(
  target: RenderTarget,
  engine: SwarmEngine,
  viewportWidth: number,
  viewportHeight: number,
  params: SwarmParameters,
  options?: {
    drawDebug?: boolean;
    zoomLevel?: number;
    panOffset?: { x: number; y: number };
  },
): void {
  target.background(params.backgroundColor);

  const baseScale = Math.min(
    viewportWidth / LOGICAL_SPACE_WIDTH,
    viewportHeight / LOGICAL_SPACE_HEIGHT,
  );
  const baseOffsetX =
    (viewportWidth - LOGICAL_SPACE_WIDTH * baseScale) / 2;
  const baseOffsetY =
    (viewportHeight - LOGICAL_SPACE_HEIGHT * baseScale) / 2;

  const zoom = options?.zoomLevel ?? 1.0;
  const panX = options?.panOffset?.x ?? 0;
  const panY = options?.panOffset?.y ?? 0;

  const totalScale = baseScale * zoom;
  const totalOffsetX = baseOffsetX + panX;
  const totalOffsetY = baseOffsetY + panY;

  target.push();
  target.translate(totalOffsetX, totalOffsetY);
  target.scale(totalScale);

  drawSwarmConstraints(
    target,
    engine.activeConstraints,
    params.disconnectionEnable,
    params.disconnectionMinAge,
  );
  drawSwarmAgents(target, engine.agents, params.debugMode);

  const shouldDrawDebug = options?.drawDebug ?? false;
  if (shouldDrawDebug && params.debugMode && params.debugVectors) {
    drawDebugVectors(target, engine.agents);
  }

  target.pop();

  if (shouldDrawDebug && params.debugMode) {
    drawDebugHud(
      target,
      viewportWidth,
      engine.agents.length,
      engine.activeConstraints.length,
      params.debugVectors,
    );
  }

  // Draw Zoom HUD if zoomed
  if (
    shouldDrawDebug &&
    options?.zoomLevel &&
    Math.abs(options.zoomLevel - 1.0) > 0.01
  ) {
    target.push();
    const zoomPct = Math.round(options.zoomLevel * 100);
    const zx = viewportWidth - 84;
    const zy = viewportHeight - 38;
    target.fill(0, 0, 0, 160);
    target.stroke(255, 255, 255, 40);
    target.strokeWeight(1);
    target.rect(zx, zy, 72, 24, 4);
    target.noStroke();
    target.fill(255);
    target.textSize(11);
    // @ts-ignore
    target.textAlign(target.CENTER || "center", target.CENTER || "center");
    target.text(`${zoomPct}%`, zx + 36, zy + 12);
    target.pop();
  }
}
