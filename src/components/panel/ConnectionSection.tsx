import { LinkIcon } from "lucide-react";
import type React from "react";
import type { SwarmParameters, TargetRule } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";
import { SliderField } from "../ui/SliderField";

interface ConnectionSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
}

const TARGET_RULE_OPTIONS = [
  { label: "どこでも接着 (Any)", value: "any" },
  { label: "ボディ同士のみ (Body to Body)", value: "body_body" },
  { label: "腕同士のみ (Arm to Arm)", value: "arm_arm" },
  { label: "腕とボディのみ (Arm to Body)", value: "arm_body" },
];

export const ConnectionSection: React.FC<ConnectionSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
}) => {
  return (
    <AccordionSection
      id="connection"
      title="接着・剛体化ルール"
      icon={<LinkIcon className="w-4 h-4 text-blue-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SelectField
        label="接着する対象部位"
        value={params.targetRule}
        options={TARGET_RULE_OPTIONS}
        onChange={(val) => onParamChange("targetRule", val as TargetRule)}
      />

      <SliderField
        label="接着バネの硬さ (Stiffness)"
        value={params.stiffness}
        displayValue={params.stiffness.toFixed(2)}
        min={0.01}
        max={1.0}
        step={0.01}
        onChange={(val) => onParamChange("stiffness", val)}
      />

      <div className="pt-2 border-t border-gray-100">
        <CheckboxField
          label="一直線で複合剛体に結合 (Compound)"
          checked={params.compoundOnAlign}
          onChange={(checked) => onParamChange("compoundOnAlign", checked)}
          description="腕が揃った時点で1つの剛体に結合し、高速回転バグを防止して安定した巨大な塊を形成します"
        />
      </div>
    </AccordionSection>
  );
};
