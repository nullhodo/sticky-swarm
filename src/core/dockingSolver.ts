import type Matter from "matter-js";
import type {
  RenderPart,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export interface PartReference {
  partLabel?: string;
  renderPartIndex?: number;
  parent: Matter.Body;
  position: Matter.Vector;
}

interface DockingCalculationResult {
  targetDistance: number;
  initialLength: number;
  initialLocalAngleToB: number;
  targetLocalAngleToB: number;
  initialAngleDiff: number;
  targetAngleDiff: number;
  alignGroupId: number;
}

function findRenderPart(
  agent: SwarmAgent,
  part: PartReference,
): RenderPart | null {
  if (
    part.renderPartIndex !== undefined &&
    agent.renderParts[part.renderPartIndex]
  ) {
    return agent.renderParts[part.renderPartIndex];
  }

  let bestDist = Number.POSITIVE_INFINITY;
  let bestRp: RenderPart | null = null;
  const cos = Math.cos(agent.physicsBody.angle);
  const sin = Math.sin(agent.physicsBody.angle);

  for (let i = 0; i < agent.renderParts.length; i++) {
    const candidate = agent.renderParts[i];
    const wx =
      agent.physicsBody.position.x +
      (candidate.localX * cos - candidate.localY * sin);
    const wy =
      agent.physicsBody.position.y +
      (candidate.localX * sin + candidate.localY * cos);
    const d = Math.hypot(wx - part.position.x, wy - part.position.y);
    if (d < bestDist) {
      bestDist = d;
      bestRp = candidate;
    }
  }
  return bestRp;
}

export function calculateDockingTarget(
  agentA: SwarmAgent,
  agentB: SwarmAgent,
  partA: PartReference,
  partB: PartReference,
  params: SwarmParameters,
): DockingCalculationResult | null {
  const rpA = findRenderPart(agentA, partA);
  const rpB = findRenderPart(agentB, partB);
  if (!rpA || !rpB) return null;

  const rigidBodyA = agentA.physicsBody;
  const rigidBodyB = agentB.physicsBody;

  const angleA = rigidBodyA.angle;
  const posA = rigidBodyA.position;
  const cosA = Math.cos(angleA);
  const sinA = Math.sin(angleA);

  const radius = params.baseRadius;
  const armLen = params.armLength;

  const labelA =
    partA.partLabel || (rpA.type === "circle" ? "body" : "arm");
  const labelB =
    partB.partLabel || (rpB.type === "circle" ? "body" : "arm");

  let targetAngleB = rigidBodyB.angle;
  let targetAngleDiff = rigidBodyB.angle - angleA;
  let targetAgentB_posX = rigidBodyB.position.x;
  let targetAgentB_posY = rigidBodyB.position.y;

  if (labelA === "arm" && labelB === "arm") {
    const armAWorldAngle = angleA + rpA.localAngle;
    const armAWorldX = posA.x + (rpA.localX * cosA - rpA.localY * sinA);
    const armAWorldY = posA.y + (rpA.localX * sinA + rpA.localY * cosA);

    if (params.targetRule === "arm_tip_any_angle") {
      // Free relative angle: retain current orientation of Agent B
      targetAngleB = rigidBodyB.angle;
      targetAngleDiff = targetAngleB - angleA;

      const cosB = Math.cos(targetAngleB);
      const sinB = Math.sin(targetAngleB);

      const armBWorldAngle = targetAngleB + rpB.localAngle;
      const armBWorldX =
        rigidBodyB.position.x + (rpB.localX * cosB - rpB.localY * sinB);
      const armBWorldY =
        rigidBodyB.position.y + (rpB.localX * sinB + rpB.localY * cosB);

      // Tip A (outer tip of arm A)
      const tipAX = armAWorldX + Math.cos(armAWorldAngle) * (armLen / 2);
      const tipAY = armAWorldY + Math.sin(armAWorldAngle) * (armLen / 2);

      // Tip B (outer tip of arm B)
      const tipBX = armBWorldX + Math.cos(armBWorldAngle) * (armLen / 2);
      const tipBY = armBWorldY + Math.sin(armBWorldAngle) * (armLen / 2);

      const tipDist = Math.hypot(tipAX - tipBX, tipAY - tipBY);
      // Require collision to occur near the tips (within 1.25x arm length)
      if (tipDist > armLen * 1.25) {
        return null;
      }

      // Tip of Arm B must meet Tip of Arm A seamlessly at any relative angle
      const targetArmBWorldX =
        tipAX - Math.cos(armBWorldAngle) * (armLen / 2);
      const targetArmBWorldY =
        tipAY - Math.sin(armBWorldAngle) * (armLen / 2);

      const armBOffset_x = rpB.localX * cosB - rpB.localY * sinB;
      const armBOffset_y = rpB.localX * sinB + rpB.localY * cosB;

      targetAgentB_posX = targetArmBWorldX - armBOffset_x;
      targetAgentB_posY = targetArmBWorldY - armBOffset_y;
    } else {
      // Collinear tip-to-tip orientation: arm B points in exact opposite direction
      const targetArmBWorldAngle = armAWorldAngle + Math.PI;
      targetAngleB = targetArmBWorldAngle - rpB.localAngle;
      targetAngleDiff = targetAngleB - angleA;

      // Tip A meets Tip B seamlessly
      const targetArmBWorldX =
        armAWorldX + Math.cos(armAWorldAngle) * armLen;
      const targetArmBWorldY =
        armAWorldY + Math.sin(armAWorldAngle) * armLen;

      const cosB = Math.cos(targetAngleB);
      const sinB = Math.sin(targetAngleB);
      const armBOffset_x = rpB.localX * cosB - rpB.localY * sinB;
      const armBOffset_y = rpB.localX * sinB + rpB.localY * cosB;

      targetAgentB_posX = targetArmBWorldX - armBOffset_x;
      targetAgentB_posY = targetArmBWorldY - armBOffset_y;
    }
  } else if (labelA === "arm" && labelB === "body") {
    const armAWorldAngle = angleA + rpA.localAngle;
    const armAWorldX = posA.x + (rpA.localX * cosA - rpA.localY * sinA);
    const armAWorldY = posA.y + (rpA.localX * sinA + rpA.localY * cosA);

    const targetCircleBWorldX =
      armAWorldX + Math.cos(armAWorldAngle) * (armLen / 2 + radius);
    const targetCircleBWorldY =
      armAWorldY + Math.sin(armAWorldAngle) * (armLen / 2 + radius);

    targetAngleB = rigidBodyB.angle;
    targetAngleDiff = targetAngleB - angleA;

    const cosB = Math.cos(targetAngleB);
    const sinB = Math.sin(targetAngleB);
    const circleBOffset_x = rpB.localX * cosB - rpB.localY * sinB;
    const circleBOffset_y = rpB.localX * sinB + rpB.localY * cosB;

    targetAgentB_posX = targetCircleBWorldX - circleBOffset_x;
    targetAgentB_posY = targetCircleBWorldY - circleBOffset_y;
  } else if (labelA === "body" && labelB === "arm") {
    const circleAWorldX = posA.x + (rpA.localX * cosA - rpA.localY * sinA);
    const circleAWorldY = posA.y + (rpA.localX * sinA + rpA.localY * cosA);

    const dx = rigidBodyB.position.x - circleAWorldX;
    const dy = rigidBodyB.position.y - circleAWorldY;
    const angleToB = Math.atan2(dy, dx);

    const targetArmBWorldAngle = angleToB + Math.PI;
    targetAngleB = targetArmBWorldAngle - rpB.localAngle;
    targetAngleDiff = targetAngleB - angleA;

    const targetArmBWorldX =
      circleAWorldX + Math.cos(angleToB) * (radius + armLen / 2);
    const targetArmBWorldY =
      circleAWorldY + Math.sin(angleToB) * (radius + armLen / 2);

    const cosB = Math.cos(targetAngleB);
    const sinB = Math.sin(targetAngleB);
    const armBOffset_x = rpB.localX * cosB - rpB.localY * sinB;
    const armBOffset_y = rpB.localX * sinB + rpB.localY * cosB;

    targetAgentB_posX = targetArmBWorldX - armBOffset_x;
    targetAgentB_posY = targetArmBWorldY - armBOffset_y;
  } else {
    // body_body
    const circleAWorldX = posA.x + (rpA.localX * cosA - rpA.localY * sinA);
    const circleAWorldY = posA.y + (rpA.localX * sinA + rpA.localY * cosA);

    const dx = rigidBodyB.position.x - circleAWorldX;
    const dy = rigidBodyB.position.y - circleAWorldY;
    const angleToB = Math.atan2(dy, dx);

    const targetCircleBWorldX =
      circleAWorldX + Math.cos(angleToB) * (radius * 2);
    const targetCircleBWorldY =
      circleAWorldY + Math.sin(angleToB) * (radius * 2);

    targetAngleB = rigidBodyB.angle;
    targetAngleDiff = targetAngleB - angleA;

    const cosB = Math.cos(targetAngleB);
    const sinB = Math.sin(targetAngleB);
    const circleBOffset_x = rpB.localX * cosB - rpB.localY * sinB;
    const circleBOffset_y = rpB.localX * sinB + rpB.localY * cosB;

    targetAgentB_posX = targetCircleBWorldX - circleBOffset_x;
    targetAgentB_posY = targetCircleBWorldY - circleBOffset_y;
  }

  if (params.preventBodyOverlap) {
    const bodiesA = agentA.renderParts.filter(
      (rp) => rp.type === "circle",
    );
    const bodiesB = agentB.renderParts.filter(
      (rp) => rp.type === "circle",
    );

    const cosB = Math.cos(targetAngleB);
    const sinB = Math.sin(targetAngleB);

    for (let i = 0; i < bodiesA.length; i++) {
      const bA = bodiesA[i];
      const bAWorldX = posA.x + (bA.localX * cosA - bA.localY * sinA);
      const bAWorldY = posA.y + (bA.localX * sinA + bA.localY * cosA);
      const radA = bA.radius ?? radius;

      for (let j = 0; j < bodiesB.length; j++) {
        const bB = bodiesB[j];
        const bBWorldX =
          targetAgentB_posX + (bB.localX * cosB - bB.localY * sinB);
        const bBWorldY =
          targetAgentB_posY + (bB.localX * sinB + bB.localY * cosB);
        const radB = bB.radius ?? radius;

        const dist = Math.hypot(bAWorldX - bBWorldX, bAWorldY - bBWorldY);
        // Block docking if agent bodies overlap into each other
        if (dist < (radA + radB) * 0.92) {
          return null;
        }
      }
    }
  }

  const targetRelX = targetAgentB_posX - posA.x;
  const targetRelY = targetAgentB_posY - posA.y;
  const targetDistance = Math.hypot(targetRelX, targetRelY);
  const targetWorldAngleToB = Math.atan2(targetRelY, targetRelX);
  const targetLocalAngleToB = targetWorldAngleToB - angleA;

  const initialRelX = rigidBodyB.position.x - posA.x;
  const initialRelY = rigidBodyB.position.y - posA.y;
  const initialLength = Math.hypot(initialRelX, initialRelY);
  const initialWorldAngleToB = Math.atan2(initialRelY, initialRelX);
  const initialLocalAngleToB = initialWorldAngleToB - angleA;
  const initialAngleDiff = rigidBodyB.angle - angleA;

  const alignGroupId = -Math.floor(Math.random() * 100000 + 1);

  return {
    targetDistance,
    initialLength,
    initialLocalAngleToB,
    targetLocalAngleToB,
    initialAngleDiff,
    targetAngleDiff,
    alignGroupId,
  };
}
