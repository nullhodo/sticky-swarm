import Matter from "matter-js";
import type {
  ActiveConstraintWrapper,
  RenderPart,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";

export const LOGICAL_SPACE_WIDTH = 2000;
export const LOGICAL_SPACE_HEIGHT = 2000;

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function darkenHex(hex: string, amount = 0.35): string {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = Number.parseInt(clean, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

export class SwarmEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public agents: SwarmAgent[] = [];
  public activeConstraints: ActiveConstraintWrapper[] = [];
  public connectedPairsSet = new Set<string>();
  private agentIdCounter = 0;

  private uniformBodyColor: string | null = null;
  private uniformArmColor: string | null = null;

  public currentParams: SwarmParameters;
  public noiseFunction: (t: number) => number = Math.sin;

  constructor(initialParams: SwarmParameters) {
    this.currentParams = initialParams;
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.x = 0;
    this.world.gravity.y = 0;

    Matter.Events.on(this.engine, "collisionStart", (event) => {
      this.handleCollisions(event);
    });

    Matter.Events.on(this.engine, "beforeUpdate", () => {
      this.enforceRigidConnection();
    });
  }

  public setNoiseFunction(fn: (t: number) => number) {
    this.noiseFunction = fn;
  }

  public reset(params: SwarmParameters) {
    this.currentParams = params;
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);

    this.agents = [];
    this.activeConstraints = [];
    this.connectedPairsSet.clear();
    this.agentIdCounter = 0;

    const colors =
      params.availableObjectColors.length > 0
        ? params.availableObjectColors
        : ["#FFFFFF", "#000000"];

    if (params.uniformColor) {
      this.uniformBodyColor =
        colors[Math.floor(Math.random() * colors.length)];
      this.uniformArmColor =
        colors[Math.floor(Math.random() * colors.length)];
    } else {
      this.uniformBodyColor = null;
      this.uniformArmColor = null;
    }

    for (let i = 0; i < params.agentCount; i++) {
      const x =
        LOGICAL_SPACE_WIDTH * 0.1 +
        Math.random() * (LOGICAL_SPACE_WIDTH * 0.8);
      const y =
        LOGICAL_SPACE_HEIGHT * 0.1 +
        Math.random() * (LOGICAL_SPACE_HEIGHT * 0.8);
      this.agentIdCounter++;
      this.createSingleAgent(x, y, `agent_${this.agentIdCounter}`);
    }
  }

  public createSingleAgent(
    positionX: number,
    positionY: number,
    agentIdentifier: string,
  ): SwarmAgent {
    const params = this.currentParams;
    const radius = params.baseRadius;
    const armLen = params.armLength;
    const armThick = params.armThickness;
    const pattern = params.armPattern;

    const bodyPartsArray: Matter.Body[] = [];

    const centerBody = Matter.Bodies.circle(positionX, positionY, radius, {
      partLabel: "body",
      parentAgentId: agentIdentifier,
    } as Matter.IBodyDefinition);
    bodyPartsArray.push(centerBody);

    const armConfigs: {
      angle: number;
      offsetX: number;
      offsetY: number;
    }[] = [];
    const offsetDistance = radius + armLen / 2;

    if (pattern === "one_right") {
      armConfigs.push({ angle: 0, offsetX: offsetDistance, offsetY: 0 });
    } else if (pattern === "left_right") {
      armConfigs.push({ angle: 0, offsetX: offsetDistance, offsetY: 0 });
      armConfigs.push({
        angle: Math.PI,
        offsetX: -offsetDistance,
        offsetY: 0,
      });
    } else if (pattern === "right_top") {
      armConfigs.push({ angle: 0, offsetX: offsetDistance, offsetY: 0 });
      armConfigs.push({
        angle: -Math.PI / 2,
        offsetX: 0,
        offsetY: -offsetDistance,
      });
    } else if (pattern === "right_two") {
      const localY = radius * 0.45;
      const baseX = Math.sqrt(
        Math.max(0, radius * radius - localY * localY),
      );
      const localX = baseX + armLen / 2;
      armConfigs.push({ angle: 0, offsetX: localX, offsetY: -localY });
      armConfigs.push({ angle: 0, offsetX: localX, offsetY: localY });
    } else if (pattern === "three_120") {
      for (let i = 0; i < 3; i++) {
        const currentAngle = ((Math.PI * 2) / 3) * i;
        armConfigs.push({
          angle: currentAngle,
          offsetX: Math.cos(currentAngle) * offsetDistance,
          offsetY: Math.sin(currentAngle) * offsetDistance,
        });
      }
    }

    for (let i = 0; i < armConfigs.length; i++) {
      const config = armConfigs[i];
      const armPart = Matter.Bodies.rectangle(
        positionX + config.offsetX,
        positionY + config.offsetY,
        armLen,
        armThick,
        {
          angle: config.angle,
          partLabel: "arm",
          parentAgentId: agentIdentifier,
        } as Matter.IBodyDefinition,
      );
      bodyPartsArray.push(armPart);
    }

    const compositeAgent = Matter.Body.create({
      parts: bodyPartsArray,
      frictionAir: 0.02,
      restitution: 0.8,
    });

    const colors =
      params.availableObjectColors.length > 0
        ? params.availableObjectColors
        : ["#FFFFFF", "#000000"];

    const baseBodyColorStr =
      params.uniformColor && this.uniformBodyColor
        ? this.uniformBodyColor
        : colors[Math.floor(Math.random() * colors.length)];

    let finalArmColorStr: string;
    if (params.darkerArmColor) {
      finalArmColorStr = darkenHex(baseBodyColorStr, 0.35);
    } else {
      finalArmColorStr =
        params.uniformColor && this.uniformArmColor
          ? this.uniformArmColor
          : colors[Math.floor(Math.random() * colors.length)];
    }

    const renderParts: RenderPart[] = [];
    for (let i = 1; i < compositeAgent.parts.length; i++) {
      const p = compositeAgent.parts[i];
      const localX = p.position.x - compositeAgent.position.x;
      const localY = p.position.y - compositeAgent.position.y;
      const localAngle = p.angle - compositeAgent.angle;

      const anyP = p as unknown as { partLabel: string };
      if (anyP.partLabel === "body") {
        renderParts.push({
          type: "circle",
          localX,
          localY,
          localAngle,
          radius,
          color: baseBodyColorStr,
        });
      } else if (anyP.partLabel === "arm") {
        renderParts.push({
          type: "rect",
          localX,
          localY,
          localAngle,
          width: armLen,
          height: armThick,
          color: finalArmColorStr,
        });
      }
    }

    const newAgentData: SwarmAgent = {
      physicsBody: compositeAgent,
      id: agentIdentifier,
      renderParts,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
      noiseOffsetTorque: Math.random() * 1000,
    };

    this.agents.push(newAgentData);
    Matter.World.add(this.world, compositeAgent);

    return newAgentData;
  }

  private handleCollisions(
    event: Matter.IEventCollision<Matter.Engine>,
  ): void {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const partA = pair.bodyA as unknown as {
        parentAgentId?: string;
        partLabel?: string;
        parent: Matter.Body;
        position: Matter.Vector;
      };
      const partB = pair.bodyB as unknown as {
        parentAgentId?: string;
        partLabel?: string;
        parent: Matter.Body;
        position: Matter.Vector;
      };

      const parentAgentA = partA.parentAgentId;
      const parentAgentB = partB.parentAgentId;

      if (parentAgentA && parentAgentB && parentAgentA !== parentAgentB) {
        const pairId =
          parentAgentA < parentAgentB
            ? `${parentAgentA}-${parentAgentB}`
            : `${parentAgentB}-${parentAgentA}`;

        if (this.connectedPairsSet.has(pairId)) continue;

        const labelA = partA.partLabel;
        const labelB = partB.partLabel;
        const rule = this.currentParams.targetRule;

        let shouldConnect = false;
        if (rule === "any") {
          shouldConnect = true;
        } else if (
          rule === "body_body" &&
          labelA === "body" &&
          labelB === "body"
        ) {
          shouldConnect = true;
        } else if (
          rule === "arm_arm" &&
          labelA === "arm" &&
          labelB === "arm"
        ) {
          shouldConnect = true;
        } else if (
          rule === "arm_body" &&
          ((labelA === "arm" && labelB === "body") ||
            (labelA === "body" && labelB === "arm"))
        ) {
          shouldConnect = true;
        }

        if (shouldConnect) {
          this.createConnectionBetweenAgents(
            partA,
            partB,
            pairId,
            parentAgentA,
            parentAgentB,
          );
        }
      }
    }
  }

  private createConnectionBetweenAgents(
    partA: {
      partLabel?: string;
      parent: Matter.Body;
      position: Matter.Vector;
    },
    partB: {
      partLabel?: string;
      parent: Matter.Body;
      position: Matter.Vector;
    },
    pairIdentifier: string,
    agentIdA: string,
    agentIdB: string,
  ): void {
    const rigidBodyA = partA.parent;
    const rigidBodyB = partB.parent;

    const dx = rigidBodyB.position.x - rigidBodyA.position.x;
    const dy = rigidBodyB.position.y - rigidBodyA.position.y;
    const initialLength = Math.sqrt(dx * dx + dy * dy);

    const originalAngleDiff = rigidBodyB.angle - rigidBodyA.angle;
    const angleToB = Math.atan2(dy, dx);
    const localAngleToB = angleToB - rigidBodyA.angle;

    let targetLocalAngleToB = localAngleToB;
    let targetAngleDiff = originalAngleDiff;
    let doAlign = false;

    if (
      this.currentParams.targetRule === "arm_arm" &&
      partA.partLabel === "arm" &&
      partB.partLabel === "arm"
    ) {
      doAlign = true;
      const dxA = partA.position.x - rigidBodyA.position.x;
      const dyA = partA.position.y - rigidBodyA.position.y;
      const localAngleA = Math.atan2(dyA, dxA) - rigidBodyA.angle;

      const dxB = partB.position.x - rigidBodyB.position.x;
      const dyB = partB.position.y - rigidBodyB.position.y;
      const localAngleB = Math.atan2(dyB, dxB) - rigidBodyB.angle;

      targetLocalAngleToB = localAngleA;
      targetAngleDiff = localAngleA - localAngleB + Math.PI;
    }

    const newConstraint = Matter.Constraint.create({
      bodyA: rigidBodyA,
      bodyB: rigidBodyB,
      stiffness: this.currentParams.stiffness,
      length: initialLength,
      damping: 0.1,
      render: { visible: false },
    });
    Matter.World.add(this.world, newConstraint);

    this.activeConstraints.push({
      constraint: newConstraint,
      pairId: pairIdentifier,
      agentAId: agentIdA,
      agentBId: agentIdB,
      originalLength: initialLength,
      alignProgress: doAlign ? 0.0 : 1.0,
      initialLocalAngleToB: localAngleToB,
      targetLocalAngleToB,
      currentLocalAngleToB: localAngleToB,
      initialAngleDiff: originalAngleDiff,
      targetAngleDiff,
      currentAngleDiff: originalAngleDiff,
    });

    this.connectedPairsSet.add(pairIdentifier);
  }

  private enforceRigidConnection(): void {
    const stiffness = this.currentParams.stiffness;
    const correctionFactor = Math.min(stiffness * 0.5, 0.3);
    if (correctionFactor <= 0.001) return;

    for (let i = 0; i < this.activeConstraints.length; i++) {
      const cw = this.activeConstraints[i];
      const bodyA = cw.constraint.bodyA;
      const bodyB = cw.constraint.bodyB;
      if (!bodyA || !bodyB) continue;

      if (cw.alignProgress < 1.0) {
        cw.alignProgress += 0.02;
        if (cw.alignProgress > 1.0) cw.alignProgress = 1.0;

        const t = 1 - (1 - cw.alignProgress) ** 3;
        cw.currentLocalAngleToB = lerpAngle(
          cw.initialLocalAngleToB,
          cw.targetLocalAngleToB,
          t,
        );
        cw.currentAngleDiff = lerpAngle(
          cw.initialAngleDiff,
          cw.targetAngleDiff,
          t,
        );
      }

      if (this.currentParams.compoundOnAlign && cw.alignProgress >= 1.0) {
        continue;
      }

      const currentCorrection =
        cw.alignProgress < 1.0 ? correctionFactor * 0.5 : correctionFactor;
      const currentAngleDiff = bodyB.angle - bodyA.angle;
      let diffError = cw.currentAngleDiff - currentAngleDiff;
      while (diffError > Math.PI) diffError -= 2 * Math.PI;
      while (diffError < -Math.PI) diffError += 2 * Math.PI;

      const totalInertia = bodyA.inertia + bodyB.inertia;
      if (totalInertia > 0 && totalInertia !== Number.POSITIVE_INFINITY) {
        const correctionA =
          -(diffError * (bodyB.inertia / totalInertia)) *
          currentCorrection;
        const correctionB =
          diffError * (bodyA.inertia / totalInertia) * currentCorrection;

        Matter.Body.setAngularVelocity(
          bodyA,
          bodyA.angularVelocity + correctionA,
        );
        Matter.Body.setAngularVelocity(
          bodyB,
          bodyB.angularVelocity + correctionB,
        );
      }

      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const currentAngleToB = Math.atan2(dy, dx);

      const targetAngleToB = bodyA.angle + cw.currentLocalAngleToB;
      let dirError = targetAngleToB - currentAngleToB;
      while (dirError > Math.PI) dirError -= 2 * Math.PI;
      while (dirError < -Math.PI) dirError += 2 * Math.PI;

      const targetDist = cw.constraint.length || 0;
      if (targetDist > 0.1) {
        const targetPosX =
          bodyA.position.x + Math.cos(targetAngleToB) * targetDist;
        const targetPosY =
          bodyA.position.y + Math.sin(targetAngleToB) * targetDist;

        const errX = targetPosX - bodyB.position.x;
        const errY = targetPosY - bodyB.position.y;

        const totalMass = bodyA.mass + bodyB.mass;
        if (totalMass > 0 && totalMass !== Number.POSITIVE_INFINITY) {
          const velCorrB_x =
            errX * (bodyA.mass / totalMass) * currentCorrection;
          const velCorrB_y =
            errY * (bodyA.mass / totalMass) * currentCorrection;
          const velCorrA_x =
            -errX * (bodyB.mass / totalMass) * currentCorrection;
          const velCorrA_y =
            -errY * (bodyB.mass / totalMass) * currentCorrection;

          Matter.Body.setVelocity(bodyA, {
            x: bodyA.velocity.x + velCorrA_x,
            y: bodyA.velocity.y + velCorrA_y,
          });
          Matter.Body.setVelocity(bodyB, {
            x: bodyB.velocity.x + velCorrB_x,
            y: bodyB.velocity.y + velCorrB_y,
          });
        }
      }
    }
  }

  private processConnections(): void {
    if (!this.currentParams.compoundOnAlign) return;

    for (let i = this.activeConstraints.length - 1; i >= 0; i--) {
      const cw = this.activeConstraints[i];

      if (cw.alignProgress >= 1.0) {
        const agentA = this.agents.find((a) => a.id === cw.agentAId);
        const agentB = this.agents.find((a) => a.id === cw.agentBId);

        if (agentA && agentB) {
          this.mergeIntoCompound(agentA, agentB, cw);
        } else {
          Matter.World.remove(this.world, cw.constraint);
        }
        this.activeConstraints.splice(i, 1);
      }
    }
  }

  private mergeIntoCompound(
    agentA: SwarmAgent,
    agentB: SwarmAgent,
    cw: ActiveConstraintWrapper,
  ): void {
    Matter.World.remove(this.world, agentA.physicsBody);
    Matter.World.remove(this.world, agentB.physicsBody);
    Matter.World.remove(this.world, cw.constraint);

    const indexA = this.agents.findIndex((a) => a.id === agentA.id);
    if (indexA !== -1) this.agents.splice(indexA, 1);
    const indexB = this.agents.findIndex((a) => a.id === agentB.id);
    if (indexB !== -1) this.agents.splice(indexB, 1);

    const newBodies: Matter.Body[] = [];
    this.agentIdCounter++;
    const newAgentId = `agent_compound_${this.agentIdCounter}`;

    const extractParts = (agent: SwarmAgent) => {
      for (let i = 1; i < agent.physicsBody.parts.length; i++) {
        const p = agent.physicsBody.parts[i];
        const rp = agent.renderParts[i - 1];

        let cloneBody: Matter.Body | null = null;
        if (rp.type === "circle" && rp.radius) {
          cloneBody = Matter.Bodies.circle(
            p.position.x,
            p.position.y,
            rp.radius,
            {
              partLabel: "body",
              parentAgentId: newAgentId,
            } as Matter.IBodyDefinition,
          );
        } else if (rp.type === "rect" && rp.width && rp.height) {
          cloneBody = Matter.Bodies.rectangle(
            p.position.x,
            p.position.y,
            rp.width,
            rp.height,
            {
              angle: p.angle,
              partLabel: "arm",
              parentAgentId: newAgentId,
            } as Matter.IBodyDefinition,
          );
        }

        if (cloneBody) {
          (
            cloneBody as unknown as { customRenderData: RenderPart }
          ).customRenderData = { ...rp };
          newBodies.push(cloneBody);
        }
      }
    };

    extractParts(agentA);
    extractParts(agentB);

    const compoundBody = Matter.Body.create({
      parts: newBodies,
      frictionAir: 0.02,
      restitution: 0.8,
    });

    const finalRenderParts: RenderPart[] = [];
    for (let i = 1; i < compoundBody.parts.length; i++) {
      const p = compoundBody.parts[i];
      const rp = (p as unknown as { customRenderData?: RenderPart })
        .customRenderData;
      if (rp) {
        const localX = p.position.x - compoundBody.position.x;
        const localY = p.position.y - compoundBody.position.y;
        const localAngle = p.angle - compoundBody.angle;

        finalRenderParts.push({
          type: rp.type,
          localX,
          localY,
          localAngle,
          radius: rp.radius,
          width: rp.width,
          height: rp.height,
          color: rp.color,
        });
      }
    }

    const newAgentData: SwarmAgent = {
      physicsBody: compoundBody,
      id: newAgentId,
      renderParts: finalRenderParts,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
      noiseOffsetTorque: Math.random() * 1000,
    };

    this.agents.push(newAgentData);
    Matter.World.add(this.world, compoundBody);
  }

  private spawnAgentsDynamically(): void {
    const params = this.currentParams;
    if (!params.spawnNewAgents) return;

    if (params.maintainPopulation) {
      if (this.agents.length >= params.agentCount) return;
    }

    const spawnProbability = params.spawnRate / 60.0;
    if (Math.random() < spawnProbability) {
      const margin = 100;
      let spawnX: number;
      let spawnY: number;

      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        spawnX = Math.random() * LOGICAL_SPACE_WIDTH;
        spawnY = -margin;
      } else if (edge === 1) {
        spawnX = LOGICAL_SPACE_WIDTH + margin;
        spawnY = Math.random() * LOGICAL_SPACE_HEIGHT;
      } else if (edge === 2) {
        spawnX = Math.random() * LOGICAL_SPACE_WIDTH;
        spawnY = LOGICAL_SPACE_HEIGHT + margin;
      } else {
        spawnX = -margin;
        spawnY = Math.random() * LOGICAL_SPACE_HEIGHT;
      }

      this.agentIdCounter++;
      const newAgent = this.createSingleAgent(
        spawnX,
        spawnY,
        `agent_${this.agentIdCounter}`,
      );

      const centerX = LOGICAL_SPACE_WIDTH / 2;
      const centerY = LOGICAL_SPACE_HEIGHT / 2;
      const dx = centerX - spawnX;
      const dy = centerY - spawnY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const forceMag = 0.015;
      Matter.Body.applyForce(
        newAgent.physicsBody,
        newAgent.physicsBody.position,
        {
          x: (dx / dist) * forceMag,
          y: (dy / dist) * forceMag,
        },
      );
    }
  }

  private applyRandomForcesToAgents(): void {
    const speedMultiplier = this.currentParams.movementSpeed;
    const rotSpeedMultiplier = this.currentParams.rotationSpeed;

    for (let index = 0; index < this.agents.length; index++) {
      const agentData = this.agents[index];
      const body = agentData.physicsBody;

      const nx = this.noiseFunction(agentData.noiseOffsetX) - 0.5;
      const ny = this.noiseFunction(agentData.noiseOffsetY) - 0.5;

      const forceX = nx * 0.008 * speedMultiplier * body.mass;
      const forceY = ny * 0.008 * speedMultiplier * body.mass;

      agentData.noiseOffsetX += 0.01;
      agentData.noiseOffsetY += 0.01;

      Matter.Body.applyForce(body, body.position, {
        x: forceX,
        y: forceY,
      });

      const nTorque =
        this.noiseFunction(agentData.noiseOffsetTorque) - 0.5;
      const torqueAmount =
        nTorque * 1.5 * speedMultiplier * rotSpeedMultiplier * body.mass;
      body.torque += torqueAmount;

      agentData.noiseOffsetTorque += 0.01;
    }
  }

  public applyMouseInteraction(
    logicalMouseX: number,
    logicalMouseY: number,
  ): void {
    if (!this.currentParams.interactionEnable) return;

    const mode = this.currentParams.interactionMode;
    const forceMag = this.currentParams.interactionForce * 0.002;
    const interactionRadius = 800;

    for (let i = 0; i < this.agents.length; i++) {
      const agentData = this.agents[i];
      const body = agentData.physicsBody;

      const dx = logicalMouseX - body.position.x;
      const dy = logicalMouseY - body.position.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist > 1 && dist < interactionRadius) {
        const strength =
          (1 - dist / interactionRadius) * forceMag * body.mass;
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
      }
    }
  }

  private keepAgentsWithinBounds(): void {
    const marginSize = 50;
    const forceMagnitude = 0.005;

    for (let index = 0; index < this.agents.length; index++) {
      const body = this.agents[index].physicsBody;
      const position = body.position;
      const repulseForce = forceMagnitude * body.mass * 0.5;

      if (position.x < marginSize) {
        Matter.Body.applyForce(body, position, { x: repulseForce, y: 0 });
      } else if (position.x > LOGICAL_SPACE_WIDTH - marginSize) {
        Matter.Body.applyForce(body, position, { x: -repulseForce, y: 0 });
      }

      if (position.y < marginSize) {
        Matter.Body.applyForce(body, position, { x: 0, y: repulseForce });
      } else if (position.y > LOGICAL_SPACE_HEIGHT - marginSize) {
        Matter.Body.applyForce(body, position, { x: 0, y: -repulseForce });
      }
    }
  }

  public step(params: SwarmParameters): void {
    this.currentParams = params;
    Matter.Engine.update(this.engine, 1000 / 60);

    this.spawnAgentsDynamically();
    this.applyRandomForcesToAgents();
    this.processConnections();
    this.keepAgentsWithinBounds();
  }
}
