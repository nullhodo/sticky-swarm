import { ShapesIcon } from "lucide-react";
import type React from "react";
import type { ArmPattern, SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { SelectField } from "../ui/SelectField";
import { SliderField } from "../ui/SliderField";

interface AgentSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
}

const ARM_PATTERN_OPTIONS = [
  { label: "1本 (右)", value: "one_right" },
  { label: "2本 (左右反対)", value: "left_right" },
  { label: "2本 (直角: 右と上)", value: "right_top" },
  { label: "2本 (右側に平行)", value: "right_two" },
  { label: "3本 (120度等間隔)", value: "three_120" },
];

export const AgentSection: React.FC<AgentSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
}) => {
  return (
    <AccordionSection
      id="agent"
      title="エージェント形状"
      icon={<ShapesIcon className="w-4 h-4 text-emerald-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SliderField
        label="ボディの基本半径"
        value={params.baseRadius}
        displayValue={`${params.baseRadius}px`}
        min={5}
        max={40}
        step={1}
        onChange={(val) => onParamChange("baseRadius", Math.round(val))}
      />

      <SliderField
        label="腕の長さ"
        value={params.armLength}
        displayValue={`${params.armLength}px`}
        min={10}
        max={80}
        step={1}
        onChange={(val) => onParamChange("armLength", Math.round(val))}
      />

      <SliderField
        label="腕の太さ"
        value={params.armThickness}
        displayValue={`${params.armThickness}px`}
        min={2}
        max={20}
        step={1}
        onChange={(val) => onParamChange("armThickness", Math.round(val))}
      />

      <SelectField
        label="腕の配置パターン"
        value={params.armPattern}
        options={ARM_PATTERN_OPTIONS}
        onChange={(val) => onParamChange("armPattern", val as ArmPattern)}
      />
    </AccordionSection>
  );
};
