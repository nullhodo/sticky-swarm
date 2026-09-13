import Matter from "matter-js";
import type {
  ActiveConstraintWrapper,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";

export function applyNoiseForces(
  agents: SwarmAgent[],
  activeConstraints: ActiveConstraintWrapper[],
  params: SwarmParameters,
  noiseFn: (t: number) => number,
): void {
  const speedMultiplier = params.movementSpeed;
  const rotSpeedMultiplier = params.rotationSpeed;

  // Collect IDs of agents actively aligning
  const aligningAgentIds = new Set<string>();
  for (let i = 0; i < activeConstraints.length; i++) {
    const cw = activeConstraints[i];
    if (cw.alignProgress < 1.0) {
      aligningAgentIds.add(cw.agentAId);
      aligningAgentIds.add(cw.agentBId);
    }
  }

  for (let index = 0; index < agents.length; index++) {
    const agentData = agents[index];
    const body = agentData.physicsBody;

    // If agent is actively aligning, suppress random torque and reduce noise force
    const isAligning = aligningAgentIds.has(agentData.id);
    const forceScale = isAligning ? 0.2 : 1.0;

    const bodyCount = Math.max(
      1,
      agentData.renderParts.filter((p) => p.type === "circle").length,
    );
    // Larger objects accelerate and move more slowly according to size
    const sizeSpeedFactor = 1.0 / Math.sqrt(bodyCount);
    const sizeRotFactor = 1.0 / bodyCount ** 0.75;

    const nx = noiseFn(agentData.noiseOffsetX) - 0.5;
    const ny = noiseFn(agentData.noiseOffsetY) - 0.5;

    const forceX =
      nx *
      0.008 *
      speedMultiplier *
      body.mass *
      forceScale *
      sizeSpeedFactor;
    const forceY =
      ny *
      0.008 *
      speedMultiplier *
      body.mass *
      forceScale *
      sizeSpeedFactor;

    agentData.noiseOffsetX += 0.01;
    agentData.noiseOffsetY += 0.01;

    Matter.Body.applyForce(body, body.position, {
      x: forceX,
      y: forceY,
    });
    agentData.lastAppliedForce = { x: forceX, y: forceY };

    if (!isAligning) {
      const nTorque = noiseFn(agentData.noiseOffsetTorque) - 0.5;
      const torqueAmount =
        nTorque *
        1.5 *
        speedMultiplier *
        rotSpeedMultiplier *
        body.mass *
        sizeRotFactor;
      body.torque += torqueAmount;
    }

    agentData.noiseOffsetTorque += 0.01;
  }
}

export function applyMouseInteraction(
  agents: SwarmAgent[],
  logicalMouseX: number,
  logicalMouseY: number,
  params: SwarmParameters,
): void {
  if (!params.interactionEnable) return;

  const mode = params.interactionMode;
  const forceMag = params.interactionForce * 0.002;
  const interactionRadius = 800;

  for (let i = 0; i < agents.length; i++) {
    const agentData = agents[i];
    const body = agentData.physicsBody;

    const dx = logicalMouseX - body.position.x;
    const dy = logicalMouseY - body.position.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist > 1 && dist < interactionRadius) {
      const bodyCount = Math.max(
        1,
        agentData.renderParts.filter((p) => p.type === "circle").length,
      );
      const sizeFactor = 1.0 / Math.sqrt(bodyCount);
      const strength =
        (1 - dist / interactionRadius) * forceMag * body.mass * sizeFactor;
      let forceX = (dx / dist) * strength;
      let forceY = (dy / dist) * strength;

      if (mode === "repel") {
        forceX = -forceX;
        forceY = -forceY;
      }

      Matter.Body.applyForce(body, body.position, {
        x: forceX,
        y: forceY,
      });
      agentData.lastAppliedForce.x += forceX;
      agentData.lastAppliedForce.y += forceY;
    }
  }
}

export function keepAgentsWithinBounds(
  agents: SwarmAgent[],
  boundsWidth: number,
  boundsHeight: number,
): void {
  const marginSize = 50;
  const forceMagnitude = 0.005;

  for (let index = 0; index < agents.length; index++) {
    const body = agents[index].physicsBody;
    const position = body.position;
    const repulseForce = forceMagnitude * body.mass * 0.5;

    let boundForceX = 0;
    let boundForceY = 0;

    if (position.x < marginSize) {
      boundForceX += repulseForce;
    } else if (position.x > boundsWidth - marginSize) {
      boundForceX -= repulseForce;
    }

    if (position.y < marginSize) {
      boundForceY += repulseForce;
    } else if (position.y > boundsHeight - marginSize) {
      boundForceY -= repulseForce;
    }

    if (boundForceX !== 0 || boundForceY !== 0) {
      Matter.Body.applyForce(body, position, {
        x: boundForceX,
        y: boundForceY,
      });
      agents[index].lastAppliedForce.x += boundForceX;
      agents[index].lastAppliedForce.y += boundForceY;
    }
  }
}

export function clampAgentVelocities(
  agents: SwarmAgent[],
  params: SwarmParameters,
): void {
  const baseMaxSpeed = 5.0 * Math.max(1, params.movementSpeed);
  const baseMaxAngularSpeed = 0.12 * Math.max(1, params.rotationSpeed);

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const body = agent.physicsBody;
    const bodyCount = Math.max(
      1,
      agent.renderParts.filter((p) => p.type === "circle").length,
    );

    // Scale down maximum velocity and angular velocity as compound object grows
    const sizeSpeedLimit = 1.0 / Math.sqrt(bodyCount);
    const sizeRotLimit = 1.0 / bodyCount ** 0.75;

    const maxSpeed = baseMaxSpeed * sizeSpeedLimit;
    const maxAngularSpeed = baseMaxAngularSpeed * sizeRotLimit;

    const speedSq =
      body.velocity.x * body.velocity.x +
      body.velocity.y * body.velocity.y;
    if (speedSq > maxSpeed * maxSpeed) {
      const factor = maxSpeed / Math.sqrt(speedSq);
      Matter.Body.setVelocity(body, {
        x: body.velocity.x * factor,
        y: body.velocity.y * factor,
      });
    }
    if (Math.abs(body.angularVelocity) > maxAngularSpeed) {
      Matter.Body.setAngularVelocity(
        body,
        Math.sign(body.angularVelocity) * maxAngularSpeed,
      );
    }
  }
}
