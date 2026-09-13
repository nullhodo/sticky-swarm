import Matter from "matter-js";
import type {
  ActiveConstraintWrapper,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";
import { createSingleAgent } from "./agentBuilder";
import { mergeAgentsIntoCompound } from "./compoundMerger";
import {
  type PartReference,
  calculateDockingTarget,
  lerpAngle,
} from "./dockingSolver";
import {
  applyMouseInteraction,
  applyNoiseForces,
  clampAgentVelocities,
  keepAgentsWithinBounds,
} from "./forces";

export const LOGICAL_SPACE_WIDTH = 2000;
export const LOGICAL_SPACE_HEIGHT = 2000;

export class SwarmEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public agents: SwarmAgent[] = [];
  public activeConstraints: ActiveConstraintWrapper[] = [];
  public connectedPairsSet = new Set<string>();
  private disconnectionCooldowns = new Map<string, number>();
  private debugLogCooldowns = new Map<string, number>();
  private agentIdCounter = 0;

  public isSpawnThrottledByFps = false;
  public currentFps = 60;

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

  public setNoiseFunction(fn: (t: number) => number): void {
    this.noiseFunction = fn;
  }

  public reset(params: SwarmParameters): void {
    this.currentParams = params;
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);

    this.agents = [];
    this.activeConstraints = [];
    this.connectedPairsSet.clear();
    this.disconnectionCooldowns.clear();
    this.debugLogCooldowns.clear();
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
    const newAgent = createSingleAgent(
      positionX,
      positionY,
      agentIdentifier,
      this.currentParams,
      this.uniformBodyColor,
      this.uniformArmColor,
    );
    this.agents.push(newAgent);
    Matter.World.add(this.world, newAgent.physicsBody);
    return newAgent;
  }

  private handleCollisions(
    event: Matter.IEventCollision<Matter.Engine>,
  ): void {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const partA = pair.bodyA as unknown as PartReference & {
        parentAgentId?: string;
      };
      const partB = pair.bodyB as unknown as PartReference & {
        parentAgentId?: string;
      };

      const parentAgentA = partA.parentAgentId;
      const parentAgentB = partB.parentAgentId;

      if (parentAgentA && parentAgentB && parentAgentA !== parentAgentB) {
        const pairId =
          parentAgentA < parentAgentB
            ? `${parentAgentA}-${parentAgentB}`
            : `${parentAgentB}-${parentAgentA}`;

        if (this.connectedPairsSet.has(pairId)) continue;
        if ((this.disconnectionCooldowns.get(pairId) ?? 0) > 0) continue;

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
    partA: PartReference,
    partB: PartReference,
    pairIdentifier: string,
    agentIdA: string,
    agentIdB: string,
  ): void {
    const agentA = this.agents.find((a) => a.id === agentIdA);
    const agentB = this.agents.find((a) => a.id === agentIdB);
    if (!agentA || !agentB) return;

    const docking = calculateDockingTarget(
      agentA,
      agentB,
      partA,
      partB,
      this.currentParams,
    );
    if (!docking) return;

    const rigidBodyA = agentA.physicsBody;
    const rigidBodyB = agentB.physicsBody;

    // Disable mutual collision between connecting bodies while aligning so arms don't push each other sideways
    rigidBodyA.collisionFilter.group = docking.alignGroupId;
    rigidBodyB.collisionFilter.group = docking.alignGroupId;
    for (let i = 0; i < rigidBodyA.parts.length; i++) {
      rigidBodyA.parts[i].collisionFilter.group = docking.alignGroupId;
    }
    for (let i = 0; i < rigidBodyB.parts.length; i++) {
      rigidBodyB.parts[i].collisionFilter.group = docking.alignGroupId;
    }

    const newConstraint = Matter.Constraint.create({
      bodyA: rigidBodyA,
      bodyB: rigidBodyB,
      stiffness: this.currentParams.stiffness,
      length: docking.initialLength,
      damping: 0.1,
      render: { visible: false },
    });
    Matter.World.add(this.world, newConstraint);

    this.activeConstraints.push({
      constraint: newConstraint,
      pairId: pairIdentifier,
      agentAId: agentIdA,
      agentBId: agentIdB,
      originalLength: docking.initialLength,
      targetDistance: docking.targetDistance,
      alignProgress: 0.0,
      initialLocalAngleToB: docking.initialLocalAngleToB,
      targetLocalAngleToB: docking.targetLocalAngleToB,
      currentLocalAngleToB: docking.initialLocalAngleToB,
      initialAngleDiff: docking.initialAngleDiff,
      targetAngleDiff: docking.targetAngleDiff,
      currentAngleDiff: docking.initialAngleDiff,
      ageSeconds: 0.0,
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

      // If compounding is enabled and disconnection is disabled, don't keep running constraint physics after alignment
      if (
        this.currentParams.compoundOnAlign &&
        !this.currentParams.disconnectionEnable &&
        cw.alignProgress >= 1.0
      ) {
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
    for (let i = this.activeConstraints.length - 1; i >= 0; i--) {
      const cw = this.activeConstraints[i];
      cw.ageSeconds += 1 / 60;

      // Check age-dependent probabilistic disconnection
      if (this.currentParams.disconnectionEnable) {
        if (cw.ageSeconds >= this.currentParams.disconnectionMinAge) {
          const overAge =
            cw.ageSeconds - this.currentParams.disconnectionMinAge;
          const probPerSec =
            this.currentParams.disconnectionChance * (1 + overAge * 0.25);
          const probThisFrame = probPerSec / 60;

          if (Math.random() < probThisFrame) {
            // Sever the connection
            Matter.World.remove(this.world, cw.constraint);
            this.connectedPairsSet.delete(cw.pairId);
            this.disconnectionCooldowns.set(cw.pairId, 120); // 2-second reconnect cooldown

            const bodyA = cw.constraint.bodyA;
            const bodyB = cw.constraint.bodyB;
            if (bodyA && bodyB) {
              bodyA.collisionFilter.group = 0;
              bodyB.collisionFilter.group = 0;
              for (let p = 0; p < bodyA.parts.length; p++) {
                bodyA.parts[p].collisionFilter.group = 0;
              }
              for (let p = 0; p < bodyB.parts.length; p++) {
                bodyB.parts[p].collisionFilter.group = 0;
              }

              // Apply gentle parting impulse so they separate smoothly
              const dx = bodyB.position.x - bodyA.position.x;
              const dy = bodyB.position.y - bodyA.position.y;
              const dist = Math.hypot(dx, dy) || 1;
              const sepForce = 0.003 * Math.min(bodyA.mass, bodyB.mass);
              Matter.Body.applyForce(bodyA, bodyA.position, {
                x: -(dx / dist) * sepForce,
                y: -(dy / dist) * sepForce,
              });
              Matter.Body.applyForce(bodyB, bodyB.position, {
                x: (dx / dist) * sepForce,
                y: (dy / dist) * sepForce,
              });
            }

            this.activeConstraints.splice(i, 1);
            continue;
          }
        }
      }

      // Merge into compound only when compounding is enabled AND disconnection is disabled
      if (
        this.currentParams.compoundOnAlign &&
        !this.currentParams.disconnectionEnable &&
        cw.alignProgress >= 1.0
      ) {
        const agentA = this.agents.find((a) => a.id === cw.agentAId);
        const agentB = this.agents.find((a) => a.id === cw.agentBId);

        if (agentA && agentB) {
          this.agentIdCounter++;
          const newAgentId = `agent_compound_${this.agentIdCounter}`;
          mergeAgentsIntoCompound(
            this.world,
            this.agents,
            agentA,
            agentB,
            cw,
            newAgentId,
            this.currentParams,
          );
        } else {
          Matter.World.remove(this.world, cw.constraint);
        }
        this.activeConstraints.splice(i, 1);
      }
    }
  }

  private spawnAgentsDynamically(): void {
    const params = this.currentParams;
    if (!params.spawnNewAgents) {
      this.isSpawnThrottledByFps = false;
      return;
    }

    // Check FPS safety limit (30 or 60 fps)
    if (params.fpsSafetyLimit && params.fpsSafetyLimit > 0) {
      const threshold =
        params.fpsSafetyLimit === 60 ? 58 : params.fpsSafetyLimit;
      if (this.currentFps > 0 && this.currentFps < threshold) {
        this.isSpawnThrottledByFps = true;
        return;
      }
    }
    this.isSpawnThrottledByFps = false;

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

  public applyMouseInteraction(
    logicalMouseX: number,
    logicalMouseY: number,
  ): void {
    applyMouseInteraction(
      this.agents,
      logicalMouseX,
      logicalMouseY,
      this.currentParams,
    );
  }

  public step(params: SwarmParameters, currentFps = 60): void {
    this.currentParams = params;
    this.currentFps = currentFps;
    Matter.Engine.update(this.engine, 1000 / 60);

    // Decrement disconnection cooldowns
    for (const [pairId, cd] of this.disconnectionCooldowns.entries()) {
      if (cd <= 1) {
        this.disconnectionCooldowns.delete(pairId);
      } else {
        this.disconnectionCooldowns.set(pairId, cd - 1);
      }
    }

    this.spawnAgentsDynamically();
    applyNoiseForces(
      this.agents,
      this.activeConstraints,
      this.currentParams,
      this.noiseFunction,
    );
    this.processConnections();
    keepAgentsWithinBounds(
      this.agents,
      LOGICAL_SPACE_WIDTH,
      LOGICAL_SPACE_HEIGHT,
    );

    if (this.currentParams.debugMode) {
      this.checkLargeForcesAndRotations();
    }

    clampAgentVelocities(this.agents, this.currentParams);
  }

  private checkLargeForcesAndRotations(): void {
    const now = performance.now();
    const speedThreshold =
      3.5 * Math.max(1, this.currentParams.movementSpeed);
    const angularThreshold =
      0.07 * Math.max(1, this.currentParams.rotationSpeed);

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const body = agent.physicsBody;

      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      const angVel = Math.abs(body.angularVelocity);
      const forceMag = Math.hypot(
        agent.lastAppliedForce.x,
        agent.lastAppliedForce.y,
      );
      const acc = forceMag / (body.mass || 1);

      const isHighSpeed = speed > speedThreshold || acc > 0.015;
      const isHighRotation = angVel > angularThreshold;

      if (isHighSpeed || isHighRotation) {
        const lastLog = this.debugLogCooldowns.get(agent.id) ?? 0;
        if (now - lastLog < 800) continue; // Rate-limit to once every 800ms per agent

        this.debugLogCooldowns.set(agent.id, now);

        // Analyze and identify the physical situation
        let situation = "🌪️ ランダム外力・衝突反動";
        const cw = this.activeConstraints.find(
          (c) => c.agentAId === agent.id || c.agentBId === agent.id,
        );

        if (cw) {
          if (cw.alignProgress < 1.0) {
            situation = `🎯 ドッキング引き寄せ (アライメント進捗: ${Math.round(cw.alignProgress * 100)}%)`;
          } else {
            situation = `🔗 結合クラスター剛体追従 (拘束ID: ${cw.pairId})`;
          }
        } else {
          // Check if recently disconnected
          for (const [
            pairId,
            cd,
          ] of this.disconnectionCooldowns.entries()) {
            if (pairId.includes(agent.id) && cd > 90) {
              situation = "✂️ 経年切断の離反インパルス";
              break;
            }
          }
          // Check if near boundaries
          if (
            body.position.x < 80 ||
            body.position.x > LOGICAL_SPACE_WIDTH - 80 ||
            body.position.y < 80 ||
            body.position.y > LOGICAL_SPACE_HEIGHT - 80
          ) {
            situation = "🔲 画面外周の境界反発力";
          }
        }

        const typeLabel =
          isHighSpeed && isHighRotation
            ? "巨大な力 & 急激な回転"
            : isHighSpeed
              ? "大きな力・速度サージ"
              : "急激な高速回転";

        const angDeg = (angVel * 180) / Math.PI;

        console.warn(
          `%c[Swarm Debug]%c ⚠️ ${typeLabel}検知 | %c${agent.id}%c | 状況: %c${situation}%c | 速度: ${speed.toFixed(2)} px/f | 角速度: ${angDeg.toFixed(1)}°/f (ω=${angVel.toFixed(3)}) | 力/質量: ${(acc * 1000).toFixed(2)}mN`,
          "background: #D97706; color: #FFF; font-weight: bold; border-radius: 3px; padding: 1px 5px;",
          "color: #FCD34D;",
          "color: #38BDF8; font-weight: bold;",
          "color: #FCD34D;",
          "color: #FB7185; font-weight: bold;",
          "color: #E2E8F0;",
        );
      }
    }
  }
}
