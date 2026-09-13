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
      frictionAir: 0.025,
      restitution: 0.3,
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

      (p as unknown as { renderPartIndex: number }).renderPartIndex =
        i - 1;

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
      lastAppliedForce: { x: 0, y: 0 },
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
        renderPartIndex?: number;
        parent: Matter.Body;
        position: Matter.Vector;
      };
      const partB = pair.bodyB as unknown as {
        parentAgentId?: string;
        partLabel?: string;
        renderPartIndex?: number;
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
      renderPartIndex?: number;
      parent: Matter.Body;
      position: Matter.Vector;
    },
    partB: {
      partLabel?: string;
      renderPartIndex?: number;
      parent: Matter.Body;
      position: Matter.Vector;
    },
    pairIdentifier: string,
    agentIdA: string,
    agentIdB: string,
  ): void {
    const agentA = this.agents.find((a) => a.id === agentIdA);
    const agentB = this.agents.find((a) => a.id === agentIdB);
    if (!agentA || !agentB) return;

    let rpA: RenderPart | null = null;
    if (
      partA.renderPartIndex !== undefined &&
      agentA.renderParts[partA.renderPartIndex]
    ) {
      rpA = agentA.renderParts[partA.renderPartIndex];
    }
    if (!rpA) {
      let bestDist = Number.POSITIVE_INFINITY;
      const cosA = Math.cos(agentA.physicsBody.angle);
      const sinA = Math.sin(agentA.physicsBody.angle);
      for (const candidate of agentA.renderParts) {
        const wx =
          agentA.physicsBody.position.x +
          (candidate.localX * cosA - candidate.localY * sinA);
        const wy =
          agentA.physicsBody.position.y +
          (candidate.localX * sinA + candidate.localY * cosA);
        const d = Math.hypot(wx - partA.position.x, wy - partA.position.y);
        if (d < bestDist) {
          bestDist = d;
          rpA = candidate;
        }
      }
    }

    let rpB: RenderPart | null = null;
    if (
      partB.renderPartIndex !== undefined &&
      agentB.renderParts[partB.renderPartIndex]
    ) {
      rpB = agentB.renderParts[partB.renderPartIndex];
    }
    if (!rpB) {
      let bestDist = Number.POSITIVE_INFINITY;
      const cosB = Math.cos(agentB.physicsBody.angle);
      const sinB = Math.sin(agentB.physicsBody.angle);
      for (const candidate of agentB.renderParts) {
        const wx =
          agentB.physicsBody.position.x +
          (candidate.localX * cosB - candidate.localY * sinB);
        const wy =
          agentB.physicsBody.position.y +
          (candidate.localX * sinB + candidate.localY * cosB);
        const d = Math.hypot(wx - partB.position.x, wy - partB.position.y);
        if (d < bestDist) {
          bestDist = d;
          rpB = candidate;
        }
      }
    }

    if (!rpA || !rpB) return;

    const rigidBodyA = agentA.physicsBody;
    const rigidBodyB = agentB.physicsBody;

    const angleA = rigidBodyA.angle;
    const posA = rigidBodyA.position;
    const cosA = Math.cos(angleA);
    const sinA = Math.sin(angleA);

    const radius = this.currentParams.baseRadius;
    const armLen = this.currentParams.armLength;

    const labelA =
      partA.partLabel || (rpA.type === "circle" ? "body" : "arm");
    const labelB =
      partB.partLabel || (rpB.type === "circle" ? "body" : "arm");

    let targetAngleB = rigidBodyB.angle;
    let targetAngleDiff = rigidBodyB.angle - angleA;
    let targetAgentB_posX = rigidBodyB.position.x;
    let targetAgentB_posY = rigidBodyB.position.y;
    const doAlign = true;

    if (labelA === "arm" && labelB === "arm") {
      const armAWorldAngle = angleA + rpA.localAngle;
      const armAWorldX = posA.x + (rpA.localX * cosA - rpA.localY * sinA);
      const armAWorldY = posA.y + (rpA.localX * sinA + rpA.localY * cosA);

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
      const circleAWorldX =
        posA.x + (rpA.localX * cosA - rpA.localY * sinA);
      const circleAWorldY =
        posA.y + (rpA.localX * sinA + rpA.localY * cosA);

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
      const circleAWorldX =
        posA.x + (rpA.localX * cosA - rpA.localY * sinA);
      const circleAWorldY =
        posA.y + (rpA.localX * sinA + rpA.localY * cosA);

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

    // Disable mutual collision between connecting bodies while aligning so arms don't push each other sideways
    const alignGroupId = -Math.floor(Math.random() * 100000 + 1);
    rigidBodyA.collisionFilter.group = alignGroupId;
    rigidBodyB.collisionFilter.group = alignGroupId;
    for (let i = 0; i < rigidBodyA.parts.length; i++) {
      rigidBodyA.parts[i].collisionFilter.group = alignGroupId;
    }
    for (let i = 0; i < rigidBodyB.parts.length; i++) {
      rigidBodyB.parts[i].collisionFilter.group = alignGroupId;
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
      targetDistance,
      alignProgress: doAlign ? 0.0 : 1.0,
      initialLocalAngleToB,
      targetLocalAngleToB,
      currentLocalAngleToB: initialLocalAngleToB,
      initialAngleDiff,
      targetAngleDiff,
      currentAngleDiff: initialAngleDiff,
    });

    this.connectedPairsSet.add(pairIdentifier);
  }

  private enforceRigidConnection(): void {
    for (let i = 0; i < this.activeConstraints.length; i++) {
      const cw = this.activeConstraints[i];
      const bodyA = cw.constraint.bodyA;
      const bodyB = cw.constraint.bodyB;
      if (!bodyA || !bodyB) continue;

      if (cw.alignProgress < 1.0) {
        cw.alignProgress += 0.035;
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
        cw.constraint.length =
          cw.originalLength + (cw.targetDistance - cw.originalLength) * t;
      }

      if (this.currentParams.compoundOnAlign && cw.alignProgress >= 1.0) {
        continue;
      }

      // Damped, smooth angular alignment (critical damping: no overshoot or spinning buildup)
      const targetWorldAngleB = bodyA.angle + cw.currentAngleDiff;
      let angleErrorB = targetWorldAngleB - bodyB.angle;
      while (angleErrorB > Math.PI) angleErrorB -= 2 * Math.PI;
      while (angleErrorB < -Math.PI) angleErrorB += 2 * Math.PI;

      const desiredAngVelB =
        bodyA.angularVelocity * 0.85 + angleErrorB * 0.12;
      Matter.Body.setAngularVelocity(bodyB, desiredAngVelB);
      Matter.Body.setAngularVelocity(bodyA, bodyA.angularVelocity * 0.92);

      // Positional alignment with smooth approach damping (no runaway velocity injection)
      const targetWorldAngleToB = bodyA.angle + cw.currentLocalAngleToB;
      const targetDist = cw.constraint.length || cw.targetDistance;
      const desiredPosX =
        bodyA.position.x + Math.cos(targetWorldAngleToB) * targetDist;
      const desiredPosY =
        bodyA.position.y + Math.sin(targetWorldAngleToB) * targetDist;

      const errX = desiredPosX - bodyB.position.x;
      const errY = desiredPosY - bodyB.position.y;

      const targetVx = bodyA.velocity.x * 0.85 + errX * 0.12;
      const targetVy = bodyA.velocity.y * 0.85 + errY * 0.12;
      Matter.Body.setVelocity(bodyB, {
        x: targetVx,
        y: targetVy,
      });
      Matter.Body.setVelocity(bodyA, {
        x: bodyA.velocity.x * 0.95,
        y: bodyA.velocity.y * 0.95,
      });
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

    this.agentIdCounter++;
    const newAgentId = `agent_compound_${this.agentIdCounter}`;

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
    interface WorldItem extends RenderPart {
      wx: number;
      wy: number;
      wAngle: number;
    }
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
          item.width || this.currentParams.armLength,
          item.height || this.currentParams.armThickness,
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

    // Collect IDs of agents actively aligning
    const aligningAgentIds = new Set<string>();
    for (let i = 0; i < this.activeConstraints.length; i++) {
      const cw = this.activeConstraints[i];
      if (cw.alignProgress < 1.0) {
        aligningAgentIds.add(cw.agentAId);
        aligningAgentIds.add(cw.agentBId);
      }
    }

    for (let index = 0; index < this.agents.length; index++) {
      const agentData = this.agents[index];
      const body = agentData.physicsBody;

      // If agent is actively aligning, suppress random torque and reduce noise force
      const isAligning = aligningAgentIds.has(agentData.id);
      const forceScale = isAligning ? 0.2 : 1.0;

      const nx = this.noiseFunction(agentData.noiseOffsetX) - 0.5;
      const ny = this.noiseFunction(agentData.noiseOffsetY) - 0.5;

      const forceX = nx * 0.008 * speedMultiplier * body.mass * forceScale;
      const forceY = ny * 0.008 * speedMultiplier * body.mass * forceScale;

      agentData.noiseOffsetX += 0.01;
      agentData.noiseOffsetY += 0.01;

      Matter.Body.applyForce(body, body.position, {
        x: forceX,
        y: forceY,
      });
      agentData.lastAppliedForce = { x: forceX, y: forceY };

      if (!isAligning) {
        const nTorque =
          this.noiseFunction(agentData.noiseOffsetTorque) - 0.5;
        // Dampen torque for larger compound bodies so massive structures don't spin like tops
        const massDampFactor =
          1.0 / Math.sqrt(Math.max(1, body.parts.length / 4));
        const torqueAmount =
          nTorque *
          1.5 *
          speedMultiplier *
          rotSpeedMultiplier *
          body.mass *
          massDampFactor;
        body.torque += torqueAmount;
      }

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
        agentData.lastAppliedForce.x += forceX;
        agentData.lastAppliedForce.y += forceY;
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

      let boundForceX = 0;
      let boundForceY = 0;

      if (position.x < marginSize) {
        boundForceX += repulseForce;
      } else if (position.x > LOGICAL_SPACE_WIDTH - marginSize) {
        boundForceX -= repulseForce;
      }

      if (position.y < marginSize) {
        boundForceY += repulseForce;
      } else if (position.y > LOGICAL_SPACE_HEIGHT - marginSize) {
        boundForceY -= repulseForce;
      }

      if (boundForceX !== 0 || boundForceY !== 0) {
        Matter.Body.applyForce(body, position, {
          x: boundForceX,
          y: boundForceY,
        });
        this.agents[index].lastAppliedForce.x += boundForceX;
        this.agents[index].lastAppliedForce.y += boundForceY;
      }
    }
  }

  private clampAgentVelocities(): void {
    const maxSpeed = 5.0 * Math.max(1, this.currentParams.movementSpeed);
    const maxAngularSpeed =
      0.12 * Math.max(1, this.currentParams.rotationSpeed);

    for (let i = 0; i < this.agents.length; i++) {
      const body = this.agents[i].physicsBody;
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

  public step(params: SwarmParameters): void {
    this.currentParams = params;
    Matter.Engine.update(this.engine, 1000 / 60);

    this.spawnAgentsDynamically();
    this.applyRandomForcesToAgents();
    this.processConnections();
    this.keepAgentsWithinBounds();
    this.clampAgentVelocities();
  }
}
