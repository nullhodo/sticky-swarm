import type { ColorPalette, SwarmParameters } from "../types/swarm";

export const PREDEFINED_PALETTES: ColorPalette[] = [
  {
    title: "Retro Sunny Living",
    colors: ["#A6171C", "#D6D0C5", "#F1C045"],
  },
  {
    title: "Citrus Breeze",
    colors: ["#C3E7F1", "#519CAB", "#FFC64F", "#20373B"],
  },
  {
    title: "Dreamy Sunset",
    colors: ["#FAD6A5", "#F593C4", "#B8AEE3", "#77CAE3", "#11476C"],
  },
  {
    title: "Bold Modernism",
    colors: ["#FF4777", "#36434A", "#E5D4C8"],
  },
  {
    title: "Fresh Orange",
    colors: ["#A3DFF1", "#FEE4B8", "#FFC065", "#FFA43A"],
  },
  {
    title: "Classic Marine",
    colors: ["#7C170D", "#141A45", "#ECE1D5"],
  },
  {
    title: "Retro Sci-Fi",
    colors: ["#7B161E", "#EF3E18", "#94EEE3", "#33C6BA", "#2E5C58"],
  },
  {
    title: "Bauhaus Geometry",
    colors: ["#1E459F", "#CF2A2A", "#FABD32", "#E1DCCA"],
  },
  {
    title: "Dynamic Sport",
    colors: ["#2267B1", "#F7D232", "#F36F36", "#5DC3AB"],
  },
  {
    title: "Fruit Salad",
    colors: ["#9EB6F8", "#386CD4", "#292E4F", "#E2AD3E", "#F3D959"],
  },
];

export const DEFAULT_SWARM_PARAMETERS: SwarmParameters = {
  agentCount: 80,
  movementSpeed: 1.5,
  rotationSpeed: 0.2,
  spawnNewAgents: true,
  maintainPopulation: true,
  spawnRate: 1.0,
  debugMode: false,
  debugVectors: true,

  interactionEnable: false,
  interactionMode: "attract",
  interactionForce: 5.0,

  baseRadius: 25,
  armLength: 20,
  armThickness: 6,
  armPattern: "three_120",

  targetRule: "arm_arm",
  stiffness: 0.1,

  compoundOnAlign: true,

  paletteIndex: 0,
  backgroundColor: "#292E4F",
  availableObjectColors: ["#A6171C", "#D6D0C5", "#F1C045"],
  uniformColor: true,
  darkerArmColor: true,

  exportScaleMultiplier: 2,
};

export const PARAMETER_COMMENTS_MAP: Record<string, string> = {
  agentCount: "生成するエージェントの総数",
  movementSpeed: "エージェントがランダムに動く速度の係数",
  rotationSpeed: "エージェントの回転速度の係数",
  spawnNewAgents: "画面外から新たなエージェントを継続的に登場させるか",
  maintainPopulation: "現在数が初期agentCountを下回った場合のみ登場させる",
  spawnRate: "新たなエージェントが登場する頻度 (1秒あたりの平均登場数)",
  debugMode: "物理エンジンのコリジョンを表示するデバッグモード",
  debugVectors: "物理演算の動き（速度）や力を矢印ベクトルで可視化する",
  baseRadius: "エージェントの体の半径",
  armLength: "腕の長さ",
  armThickness: "腕の太さ",
  armPattern:
    "腕の配置パターン (one_right, left_right, right_top, right_two, three_120)",
  targetRule: "接着する対象のルール (any, body_body, arm_arm, arm_body)",
  stiffness: "接着時のバネの硬さ",
  interactionEnable: "マウスインタラクションを有効にするか",
  interactionMode: "マウスカーソルへの反応モード (attract/repel)",
  interactionForce: "マウスインタラクションの力の強さ",
  compoundOnAlign:
    "腕が一直線に揃った時点で、物理的に1つの巨大な剛体に結合する",
  paletteIndex: "使用するカラーパレットのインデックス",
  backgroundColor: "背景色",
  uniformColor: "全てのエージェントを同じ色で統一する",
  darkerArmColor: "腕の色をボディより少し暗い色にする",
  exportScaleMultiplier: "画像書き出し時の解像度倍率",
};
