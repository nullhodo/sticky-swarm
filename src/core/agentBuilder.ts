import Matter from "matter-js";
import type {
  RenderPart,
  SwarmAgent,
  SwarmParameters,
} from "../types/swarm";

export function darkenHex(hex: string, amount = 0.35): string {
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

export function createSingleAgent(
  positionX: number,
  positionY: number,
  agentIdentifier: string,
  params: SwarmParameters,
  uniformBodyColor: string | null = null,
  uniformArmColor: string | null = null,
): SwarmAgent {
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
  } else if (pattern === "four_90") {
    for (let i = 0; i < 4; i++) {
      const currentAngle = (Math.PI / 2) * i;
      armConfigs.push({
        angle: currentAngle,
        offsetX: Math.cos(currentAngle) * offsetDistance,
        offsetY: Math.sin(currentAngle) * offsetDistance,
      });
    }
  } else if (pattern === "six_60") {
    for (let i = 0; i < 6; i++) {
      const currentAngle = (Math.PI / 3) * i;
      armConfigs.push({
        angle: currentAngle,
        offsetX: Math.cos(currentAngle) * offsetDistance,
        offsetY: Math.sin(currentAngle) * offsetDistance,
      });
    }
  } else if (pattern === "two_random_cardinal") {
    const cardinalAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    const idx1 = Math.floor(Math.random() * 4);
    let idx2 = Math.floor(Math.random() * 3);
    if (idx2 >= idx1) idx2++;
    const chosenAngles = [cardinalAngles[idx1], cardinalAngles[idx2]];
    for (const currentAngle of chosenAngles) {
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

  const chosenColor =
    uniformBodyColor || params.uniformColorHex || colors[0];

  const baseBodyColorStr = params.uniformColor
    ? chosenColor
    : colors[Math.floor(Math.random() * colors.length)];

  let finalArmColorStr: string;
  if (params.darkerArmColor) {
    finalArmColorStr = darkenHex(baseBodyColorStr, 0.35);
  } else {
    finalArmColorStr =
      params.uniformColor && uniformArmColor
        ? uniformArmColor
        : params.uniformColor
          ? chosenColor
          : colors[Math.floor(Math.random() * colors.length)];
  }

  const renderParts: RenderPart[] = [];
  for (let i = 1; i < compositeAgent.parts.length; i++) {
    const p = compositeAgent.parts[i];
    const localX = p.position.x - compositeAgent.position.x;
    const localY = p.position.y - compositeAgent.position.y;
    const localAngle = p.angle - compositeAgent.angle;

    (p as unknown as { renderPartIndex: number }).renderPartIndex = i - 1;

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

  return {
    physicsBody: compositeAgent,
    id: agentIdentifier,
    renderParts,
    noiseOffsetX: Math.random() * 1000,
    noiseOffsetY: Math.random() * 1000,
    noiseOffsetTorque: Math.random() * 1000,
    lastAppliedForce: { x: 0, y: 0 },
  };
}
