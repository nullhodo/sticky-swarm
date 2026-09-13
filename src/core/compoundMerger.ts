import Matter from "matter-js";
import type {
  ActiveConstraintWrapper,
  RenderPart,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";

interface WorldItem extends RenderPart {
  wx: number;
  wy: number;
  wAngle: number;
}

export function mergeAgentsIntoCompound(
  world: Matter.World,
  agents: SwarmAgent[],
  agentA: SwarmAgent,
  agentB: SwarmAgent,
  cw: ActiveConstraintWrapper,
  newAgentId: string,
  params: SwarmParameters,
): SwarmAgent {
  Matter.World.remove(world, agentA.physicsBody);
  Matter.World.remove(world, agentB.physicsBody);
  Matter.World.remove(world, cw.constraint);

  const indexA = agents.findIndex((a) => a.id === agentA.id);
  if (indexA !== -1) agents.splice(indexA, 1);
  const indexB = agents.findIndex((a) => a.id === agentB.id);
  if (indexB !== -1) agents.splice(indexB, 1);

  // Place Agent B at exact target relative position and angle
  const targetAngleB = agentA.physicsBody.angle + cw.targetAngleDiff;
  const targetWorldAngleToB =
    agentA.physicsBody.angle + cw.targetLocalAngleToB;
  const targetAgentB_posX =
    agentA.physicsBody.position.x +
    Math.cos(targetWorldAngleToB) * cw.targetDistance;
  const targetAgentB_posY =
    agentA.physicsBody.position.y +
    Math.sin(targetWorldAngleToB) * cw.targetDistance;

  Matter.Body.setAngle(agentB.physicsBody, targetAngleB);
  Matter.Body.setPosition(agentB.physicsBody, {
    x: targetAgentB_posX,
    y: targetAgentB_posY,
  });

  // Extract all parts analytically to avoid Matter.js stale part.angle bug
  const worldItems: WorldItem[] = [];

  const extractAnalyticalParts = (agent: SwarmAgent) => {
    const cos = Math.cos(agent.physicsBody.angle);
    const sin = Math.sin(agent.physicsBody.angle);
    const px = agent.physicsBody.position.x;
    const py = agent.physicsBody.position.y;
    for (let i = 0; i < agent.renderParts.length; i++) {
      const rp = agent.renderParts[i];
      const wx = px + (rp.localX * cos - rp.localY * sin);
      const wy = py + (rp.localX * sin + rp.localY * cos);
      const wAngle = agent.physicsBody.angle + rp.localAngle;
      worldItems.push({
        ...rp,
        wx,
        wy,
        wAngle,
      });
    }
  };

  extractAnalyticalParts(agentA);
  extractAnalyticalParts(agentB);

  const newBodies: Matter.Body[] = [];
  for (let i = 0; i < worldItems.length; i++) {
    const item = worldItems[i];
    let b: Matter.Body;
    if (item.type === "circle" && item.radius) {
      b = Matter.Bodies.circle(item.wx, item.wy, item.radius, {
        partLabel: "body",
        parentAgentId: newAgentId,
      } as Matter.IBodyDefinition);
    } else {
      b = Matter.Bodies.rectangle(
        item.wx,
        item.wy,
        item.width || params.armLength,
        item.height || params.armThickness,
        {
          angle: item.wAngle,
          partLabel: "arm",
          parentAgentId: newAgentId,
        } as Matter.IBodyDefinition,
      );
    }
    (b as unknown as { renderPartIndex: number }).renderPartIndex = i;
    newBodies.push(b);
  }

  const compoundBody = Matter.Body.create({
    parts: newBodies,
    frictionAir: 0.035,
    restitution: 0.2,
  });

  // Inelastic fusion: kinetic energy is partially dissipated into the rigid bond
  const totalMass = agentA.physicsBody.mass + agentB.physicsBody.mass;
  if (totalMass > 0) {
    const mergedVx =
      (agentA.physicsBody.velocity.x * agentA.physicsBody.mass +
        agentB.physicsBody.velocity.x * agentB.physicsBody.mass) /
      totalMass;
    const mergedVy =
      (agentA.physicsBody.velocity.y * agentA.physicsBody.mass +
        agentB.physicsBody.velocity.y * agentB.physicsBody.mass) /
      totalMass;
    const mergedAngVel =
      (agentA.physicsBody.angularVelocity +
        agentB.physicsBody.angularVelocity) /
      2;

    Matter.Body.setVelocity(compoundBody, {
      x: mergedVx * 0.7,
      y: mergedVy * 0.7,
    });
    Matter.Body.setAngularVelocity(compoundBody, mergedAngVel * 0.5);
  }

  // Set renderPartIndex on compoundBody.parts
  for (let i = 1; i < compoundBody.parts.length; i++) {
    (
      compoundBody.parts[i] as unknown as { renderPartIndex: number }
    ).renderPartIndex = i - 1;
  }

  // Recompute exact renderParts relative to compoundBody
  const finalRenderParts: RenderPart[] = [];
  for (let i = 0; i < worldItems.length; i++) {
    const item = worldItems[i];
    const cos = Math.cos(-compoundBody.angle);
    const sin = Math.sin(-compoundBody.angle);
    const dx = item.wx - compoundBody.position.x;
    const dy = item.wy - compoundBody.position.y;
    finalRenderParts.push({
      type: item.type,
      localX: dx * cos - dy * sin,
      localY: dx * sin + dy * cos,
      localAngle: item.wAngle - compoundBody.angle,
      radius: item.radius,
      width: item.width,
      height: item.height,
      color: item.color,
    });
  }

  const newAgentData: SwarmAgent = {
    physicsBody: compoundBody,
    id: newAgentId,
    renderParts: finalRenderParts,
    noiseOffsetX: Math.random() * 1000,
    noiseOffsetY: Math.random() * 1000,
    noiseOffsetTorque: Math.random() * 1000,
    lastAppliedForce: { x: 0, y: 0 },
  };

  agents.push(newAgentData);
  Matter.World.add(world, compoundBody);

  return newAgentData;
}
