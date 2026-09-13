import type Matter from "matter-js";

export type ArmPattern =
  | "one_right"
  | "left_right"
  | "right_top"
  | "right_two"
  | "three_120";

export type TargetRule = "any" | "body_body" | "arm_arm" | "arm_body";

export type InteractionMode = "attract" | "repel";

export interface ColorPalette {
  title: string;
  colors: string[];
}

export interface SwarmParameters {
  // System
  agentCount: number;
  movementSpeed: number;
  rotationSpeed: number;
  spawnNewAgents: boolean;
  maintainPopulation: boolean;
  spawnRate: number;
  debugMode: boolean;
  debugVectors: boolean;

  // Interaction
  interactionEnable: boolean;
  interactionMode: InteractionMode;
  interactionForce: number;

  // Agent Settings
  baseRadius: number;
  armLength: number;
  armThickness: number;
  armPattern: ArmPattern;

  // Connection Rules
  targetRule: TargetRule;
  stiffness: number;

  // Disconnection (Breakage by Age)
  disconnectionEnable: boolean;
  disconnectionMinAge: number;
  disconnectionChance: number;

  // Experimental
  compoundOnAlign: boolean;

  // Colors & Palette
  paletteIndex: number;
  backgroundColor: string;
  availableObjectColors: string[];
  uniformColor: boolean;
  darkerArmColor: boolean;

  // Export
  exportScaleMultiplier: number;
}

export interface RenderPart {
  type: "circle" | "rect";
  localX: number;
  localY: number;
  localAngle: number;
  radius?: number;
  width?: number;
  height?: number;
  color: string;
}

export interface SwarmAgent {
  id: string;
  physicsBody: Matter.Body;
  renderParts: RenderPart[];
  noiseOffsetX: number;
  noiseOffsetY: number;
  noiseOffsetTorque: number;
  lastAppliedForce: { x: number; y: number };
}

export interface ActiveConstraintWrapper {
  constraint: Matter.Constraint;
  pairId: string;
  agentAId: string;
  agentBId: string;
  originalLength: number;
  targetDistance: number;
  alignProgress: number;
  initialLocalAngleToB: number;
  targetLocalAngleToB: number;
  currentLocalAngleToB: number;
  initialAngleDiff: number;
  targetAngleDiff: number;
  currentAngleDiff: number;
  ageSeconds: number;
}
